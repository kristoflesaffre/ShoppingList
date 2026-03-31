import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtractedRecipe = {
  name: string | null;
  persons: number | null;
  steps: string;
  ingredients: Array<{ name: string; quantity: string }>;
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ontbreekt op de server." },
      { status: 500 },
    );
  }

  let images: string[];
  try {
    const body = await req.json();
    images = Array.isArray(body?.images) ? body.images : [];
    if (images.length === 0) throw new Error("Geen afbeeldingen meegestuurd.");
    if (images.length > 10) throw new Error("Maximum 10 afbeeldingen tegelijk.");
    for (const img of images) {
      if (typeof img !== "string" || !img.startsWith("data:image/")) {
        throw new Error("Ongeldige afbeeldingsdata.");
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ongeldig verzoek." },
      { status: 400 },
    );
  }

  const systemPrompt = `Je bent een recept-extractor die foto's analyseert (bv. screenshots van recepten, foto's van gerechten of receptenboeken). Analyseer alle aangeleverde afbeeldingen samen en extraheer het recept. Volg deze regels strikt:

1. Extraheer naam, aantal personen, bereidingsstappen en ingrediënten.
2. Als er geen receptnaam zichtbaar is, verzin een logische, begrijpelijke Nederlandstalige naam op basis van de zichtbare ingrediënten of het gerecht.
3. Converteer alle hoeveelheden van Amerikaans naar metrisch systeem:
   - 1 cup vloeistof = 240 ml
   - 1 cup meel = 120 g, 1 cup suiker = 200 g, 1 cup boter = 225 g
   - 1 fl oz = 30 ml, 1 oz = 28 g, 1 lb = 454 g
   - 1 tbsp = 15 ml, 1 tsp = 5 ml
   - Temperatuur: °F naar °C met formule (°F − 32) × 5/9, afgerond op 5°C
4. Als meerdere foto's overlappende informatie bevatten (bv. meerdere screenshots van hetzelfde recept), verwijder duplicaten — elk ingrediënt en elke stap mag slechts één keer voorkomen.
5. Geef bereidingsstappen als genummerde lijst terug, 1 stap per regel (bv. "1. Verwarm de oven...\n2. ...").
6. Als er geen recept in de afbeeldingen staat maar wel een gerecht zichtbaar is, beschrijf dan een eenvoudig recept op basis van wat je ziet.

Geef alleen dit JSON-object terug, zonder extra tekst of markdown:
{
  "name": "<receptnaam, nooit null>",
  "persons": <aantal personen als getal, of null als onbekend>,
  "steps": "<genummerde bereidingsstappen, 1 per regel, leeg als onbekend>",
  "ingredients": [
    { "name": "<ingredientnaam>", "quantity": "<hoeveelheid en eenheid in metrisch, leeg als onbekend>" }
  ]
}`;

  const imageContentBlocks = images.map((dataUrl) => ({
    type: "image_url" as const,
    image_url: { url: dataUrl, detail: "high" as const },
  }));

  let extracted: ExtractedRecipe;
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyseer ${images.length === 1 ? "deze foto" : `deze ${images.length} foto's`} en extraheer het recept:`,
              },
              ...imageContentBlocks,
            ],
          },
        ],
        temperature: 0,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(60000),
    });

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
    console.error("[extract-recipe-from-photos] OpenAI fout:", msg);
    return NextResponse.json(
      { error: `Recept extraheren mislukt: ${msg}` },
      { status: 500 },
    );
  }

  return NextResponse.json(extracted, { status: 200 });
}
