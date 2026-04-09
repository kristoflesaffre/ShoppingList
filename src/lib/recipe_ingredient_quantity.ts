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
