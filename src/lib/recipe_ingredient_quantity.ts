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
