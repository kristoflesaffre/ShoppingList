import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtractedRecipe = {
  name: string | null;
  persons: number | null;
  steps: string;
  ingredients: Array<{ name: string; quantity: string }>;
};

/** Strip HTML tags en haal leesbare tekst op, max `maxChars` tekens. */
function extractTextFromHtml(html: string, maxChars = 30000): string {
  // Verwijder script, style, nav, footer, header blokken
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  // Vervang block-elementen door newlines zodat tekst leesbaar blijft
  text = text
    .replace(/<\/(p|li|h[1-6]|tr|div|br|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // Verwijder resterende HTML-tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decodeer HTML-entiteiten (basic)
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Normaliseer witruimte
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return text.slice(0, maxChars);
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ontbreekt op de server." },
      { status: 500 },
    );
  }

  let url: string;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) throw new Error("url is verplicht");
    new URL(url); // valideer
  } catch {
    return NextResponse.json({ error: "Ongeldige URL." }, { status: 400 });
  }

  // Scrape de webpagina
  let pageText: string;
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RecipeBot/1.0; +https://shoppinglist.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Pagina niet bereikbaar (HTTP ${pageRes.status}).` },
        { status: 400 },
      );
    }
    const html = await pageRes.text();
    pageText = extractTextFromHtml(html);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json(
      { error: `Kon pagina niet ophalen: ${msg}` },
      { status: 400 },
    );
  }

  // Stuur naar OpenAI Chat Completions
  const systemPrompt = `Je bent een recept-extractor en -vertaler. Gegeven de tekst van een webpagina, extraheer het recept en geef een JSON-object terug. Vertaal alle tekst (naam, bereidingsstappen en ingrediëntnamen) altijd naar het Nederlands, ongeacht de taal van de bronpagina. Geef een JSON-object terug met de volgende structuur:
{
  "name": "<naam van het recept in het Nederlands, of null als niet gevonden>",
  "persons": <aantal personen als getal, of null als niet gevonden>,
  "steps": "<bereidingsstappen in het Nederlands als genummerde lijst, 1 stap per regel, bv. '1. Verwarm de oven...\\n2. ...'>, leeg als niet gevonden",
  "ingredients": [
    { "name": "<ingredientnaam in het Nederlands>", "quantity": "<hoeveelheid en eenheid, bv. '200 g' of '2 stuks', leeg string als onbekend>" }
  ]
}
Geef alleen dit JSON-object terug, zonder extra tekst.`;

  let extracted: ExtractedRecipe;
  try {
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Hier is de paginatekst:\n\n${pageText}`,
            },
          ],
          temperature: 0,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      throw new Error(`OpenAI fout (${openaiRes.status}): ${text}`);
    }

    const json = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Leeg antwoord van OpenAI.");

    extracted = JSON.parse(content) as ExtractedRecipe;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    console.error("[extract-recipe] OpenAI fout:", msg);
    return NextResponse.json(
      { error: `Recept extraheren mislukt: ${msg}` },
      { status: 500 },
    );
  }

  return NextResponse.json(extracted, { status: 200 });
}
