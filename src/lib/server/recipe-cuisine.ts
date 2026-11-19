import { readBoundedText } from "./read-bounded-text";
import { RECIPE_CUISINES, isRecipeCuisine, type RecipeCuisine } from "@/lib/recipe_library";

/**
 * Keuken van recepten met Gemini (één keer per recept; daarna aan te passen in de editor). Gemini krijgt per recept
 * enkel de naam en de eerste ingrediënten, met een kort nummer i.p.v. het id, en kiest uit de vaste lijst
 * RECIPE_CUISINES. Een antwoord buiten die lijst telt niet.
 */

export const CUISINE_MODEL_DEFAULT = "gemini-3.1-flash-lite";
/** Recepten per oproep. */
export const CUISINE_BATCH = 60;

export type CuisineInput = { id: string; name: string; ingredients: string[] };

const GUIDE: Record<RecipeCuisine, string> = {
  aziatisch: "Thais, Koreaans, Chinees, Japans, Vietnamees, Indonesisch, Taiwanees, Filipijns … (noedels, ramen, curry met kokos, saté, gyoza, kimchi, gochujang, soja, teriyaki, bami, nasi)",
  indiaas: "Indiaas en Pakistaans (tikka masala, butter chicken, biryani, tandoori, korma, dahl, samosa, naan)",
  italiaans: "pasta, pizza, risotto, lasagne, pesto, focaccia, burrata, tiramisu",
  mexicaans: "Mexicaans en Tex-Mex (taco, burrito, quesadilla, fajita, churros, margarita)",
  mediterraan: "Spaans, Grieks, Turks, Marokkaans, Libanees, Midden-Oosten (gazpacho, tapas, kefta, harissa, tzatziki, hummus, kebab)",
  amerikaans: "Amerikaans en Brits (burger, cheesecake, popcorn kip, ribs, mac and cheese, pancakes, bagels, Philly cheesesteak)",
  klassiek: "Belgisch, Frans en gewone West-Europese thuiskeuken (stoofvlees, vol-au-vent, bourguignon, stoemp, wafels, appeltaart, soep van groenten)",
  andere: "past nergens duidelijk (een tip, een saus of marinade, een drankje zonder keuken)",
};

export function cuisinePrompt(recipes: CuisineInput[]): { system: string; user: string } {
  const system = [
    "Je deelt recepten in volgens hun keuken. Kies voor elk recept precies één id uit deze lijst:",
    ...RECIPE_CUISINES.map((c) => `- ${c.id}: ${GUIDE[c.id]}`),
    "Kijk naar de naam en de ingrediënten. Een Aziatisch gerecht uit de airfryer blijft aziatisch. Desserts en ontbijt horen bij de keuken waar ze vandaan komen (cheesecake = amerikaans, wafels of appeltaart = klassiek).",
    'Antwoord enkel met JSON: {"r":[{"n":<nummer>,"c":"<id>"}, …]}, één regel per recept.',
  ].join("\n");
  const user = recipes
    .map((r, i) => `${i}. ${r.name.replace(/\s+/g, " ").slice(0, 120)}${r.ingredients.length ? ` — ${r.ingredients.slice(0, 10).join(", ").slice(0, 240)}` : ""}`)
    .join("\n");
  return { system, user };
}

/** Antwoord van Gemini → id → keuken; enkel geldige nummers en keukens uit de lijst. */
export function parseCuisineAnswer(text: string, recipes: CuisineInput[]): Map<string, RecipeCuisine> {
  const out = new Map<string, RecipeCuisine>();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return out;
  }
  const rows = (parsed as { r?: unknown })?.r;
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    const n = (row as { n?: unknown })?.n, c = (row as { c?: unknown })?.c;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n >= recipes.length || !isRecipeCuisine(c)) continue;
    out.set(recipes[n].id, c);
  }
  return out;
}

export async function classifyCuisines(recipes: CuisineInput[]): Promise<Map<string, RecipeCuisine>> {
  if (recipes.length === 0) return new Map();
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("ai-not-configured");
  const model = process.env.GEMINI_RECIPE_CUISINE_MODEL || CUISINE_MODEL_DEFAULT;
  const { system, user } = cuisinePrompt(recipes);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(40000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 40 * recipes.length + 200,
        // Flash-Lite zonder extra denken; een sterker model kent geen «minimal».
        thinkingConfig: { thinkingLevel: /flash-lite/.test(model) ? "minimal" : "low" },
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) throw new Error("ai-unavailable");
  const payload = JSON.parse(await readBoundedText(response.body, 400_000));
  const text = payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? "")).join("") ?? "";
  return parseCuisineAnswer(text, recipes);
}
