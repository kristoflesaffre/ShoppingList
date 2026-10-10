/**
 * Welke ingrediënten horen bij een bereidingsstap? Afgeleid uit de staptekst: een ingrediënt hoort
 * bij een stap als (een deel van) de naam erin voorkomt. Houdt rekening met meervouden
 * («kipfilets»), samenstellingen («limoenzeste», «knoflook» ↔ «look») en kortere stapwoorden voor
 * lange productnamen («kipfilets» ↔ «kippenboutenfilet»).
 */

/** Bijvoeglijke woorden die op zich niets zeggen over het ingrediënt. */
const FILLER = new Set([
  "rode", "rood", "groene", "groen", "gele", "geel", "witte", "wit", "zwarte", "zwart",
  "verse", "vers", "gedroogde", "gemalen", "griekse", "halve", "hele", "grote", "kleine",
  "gerookte", "gekookte", "gesneden", "fijne", "grove", "zoete", "zure", "light", "bio",
  "extra", "vierge", "olijf", "voor", "met", "zonder", "van", "uit",
]);

/** Vormen waarin een product verkocht wordt: «tomatenblokjes» ↔ «tomatenstukjes» ↔ «tomaten». */
const FORM_SUFFIXES = ["blokjes", "stukjes", "plakjes", "schijfjes", "reepjes", "partjes", "snippers", "puree"];

/** Woorden die in recepten voor hetzelfde product staan (exacte woordmatch). */
const SYNONYMS: Record<string, string[]> = {
  ajuin: ["ui", "uien", "ajuinen"],
  ajuinen: ["ui", "uien"],
  ui: ["ajuin", "ajuinen", "uien"],
  look: ["knoflook", "lookteen", "lookteentjes"],
  knoflook: ["look"],
  chilipeper: ["chili", "pepers"],
  chilipepers: ["chili", "chilipeper", "pepers"],
};

export function normalizeStepText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Ruwe stam: meervouds- en verkleinvormen weg. */
function stem(word: string): string {
  return word.replace(/(jes|tjes|en|s)$/, "");
}

function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

function wordMatches(stepWord: string, key: string): boolean {
  if (key.length < 3) return false;
  const s = stem(stepWord);
  const k = stem(key);
  if (k.length < 3) return false;
  if (s === k || stepWord.startsWith(k) || s.startsWith(k)) return true;
  // «knoflook» ↔ «look», «bieslook» ↔ «look»
  if (k.length >= 4 && s.endsWith(k)) return true;
  // «kipfilets» ↔ «kippenboutenfilet»: zelfde begin én zelfde staart.
  if (k.length >= 8 && s.length >= 6 && commonPrefixLength(s, k) >= 3) {
    const tail = k.slice(-5);
    if (s.endsWith(tail)) return true;
  }
  return false;
}

/** Sleutels voor een ingrediëntnaam: de volledige naam en de betekenisvolle woorden. */
function ingredientKeys(name: string): { phrase: string; words: string[]; exact: string[] } {
  const phrase = normalizeStepText(name);
  const parts = phrase.split(" ");
  // Losse korte woorden («mix», «bio») zeggen in een langere naam te weinig.
  const minLength = parts.length > 1 ? 4 : 3;
  const words = parts.filter((w) => w.length >= minLength && !FILLER.has(w));
  const keys = words.length > 0 ? words : parts;
  const extra: string[] = [];
  const exact: string[] = [];
  for (const w of keys) {
    const suffix = FORM_SUFFIXES.find((f) => w.endsWith(f) && w.length - f.length >= 4);
    if (suffix) extra.push(w.slice(0, -suffix.length));
    exact.push(...(SYNONYMS[w] ?? []));
  }
  return { phrase, words: [...keys, ...extra], exact };
}

export function stepMentionsIngredient(step: string, ingredientName: string): boolean {
  const text = normalizeStepText(step);
  if (!text) return false;
  const { phrase, words, exact } = ingredientKeys(ingredientName);
  if (!phrase) return false;
  if (phrase.includes(" ") && ` ${text} `.includes(` ${phrase} `)) return true;
  const stepWords = text.split(" ");
  if (exact.some((key) => stepWords.includes(key))) return true;
  return words.some((key) => stepWords.some((w) => wordMatches(w, key)));
}

/** Per stap de id's van de ingrediënten die erin voorkomen (in de volgorde van de lijst). */
export function matchStepIngredients<T extends { id: string; name: string }>(steps: string[], ingredients: T[]): string[][] {
  return steps.map((step) => ingredients.filter((ing) => stepMentionsIngredient(step, ing.name)).map((ing) => ing.id));
}
