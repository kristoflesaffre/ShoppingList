/**
 * Normalises "stuks" ↔ "stuk" based on the leading number:
 * "1 stuks" → "1 stuk", "2 stuks" → "2 stuks", "1 stuk" → "1 stuk" (unchanged).
 */
export function normalizeQuantity(qty: string): string {
  return qty.replace(
    /^(\d+(?:[.,]\d+)?)\s+(stuks?)\b/i,
    (_, num, _unit) => {
      const n = parseFloat(num.replace(",", "."));
      return `${num} ${n === 1 ? "stuk" : "stuks"}`;
    },
  );
}

/** Telbare eenheden; g, kg, ml, el … hebben geen meervoud. */
const UNIT_PLURALS: Record<string, string> = {
  stuk: "stuks",
  pak: "pakken",
  zak: "zakken",
  fles: "flessen",
  pot: "potten",
  blik: "blikken",
  doos: "dozen",
  bak: "bakken",
  bus: "bussen",
  rol: "rollen",
  tros: "trossen",
  portie: "porties",
  snuifje: "snuifjes",
};
const UNIT_SINGULARS: Record<string, string> = Object.fromEntries(Object.entries(UNIT_PLURALS).map(([one, many]) => [many, one]));

/**
 * Hoeveelheid zoals je ze leest: «2 pak» → «2 pakken», «1 pakken» → «1 pak». Enkel voor weergave; in de
 * data blijft de eenheid staan zoals ze gekozen is (de eenheidschips en het optellen rekenen daarop).
 */
export function displayQuantity(qty: string): string {
  const match = /^(\d+(?:[.,]\d+)?)\s*(\S+)$/.exec(qty.trim());
  if (!match) return qty;
  const [, num, unit] = match;
  const key = unit.toLowerCase();
  const one = UNIT_SINGULARS[key] ?? (UNIT_PLURALS[key] ? key : null);
  if (!one) return qty;
  return `${num} ${parseFloat(num.replace(",", ".")) > 1 ? UNIT_PLURALS[one] : one}`;
}

/** Parse quantity "2 stuks" of "5 kg" naar stepper + eenheid (zelfde logica als lijstje-receptflow). */
export function parseRecipeIngredientQuantity(qty: string): {
  stepperValue: number;
  quantityDesc: string;
} {
  const match = qty.match(/^(\d+)\s*(.*)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return {
      stepperValue: Number.isNaN(num) ? 1 : num,
      quantityDesc: match[2].trim() || "stuk",
    };
  }
  return { stepperValue: 1, quantityDesc: qty.trim() || "stuk" };
}
