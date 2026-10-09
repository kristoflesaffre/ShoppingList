import { parseRecipeIngredientQuantity } from "@/lib/recipe_ingredient_quantity";

/**
 * Een product dat al op het lijstje staat, nog eens toevoegen = hetzelfde kaartje ophogen
 * («Komkommer, 1 stuk» + «Komkommer, 1 stuk» → één kaartje «2 stuks») in plaats van twee kaartjes.
 */
type MergeCandidate = {
  id: string;
  name: string;
  quantity: string;
  section: string;
  checked: boolean;
  recipeGroupId?: string;
  fromStock?: boolean;
};

type Incoming = { name: string; quantity: string; section: string; recipeGroupId?: string; fromStock?: boolean };

function unitKey(unit: string): string {
  const u = unit.trim().toLowerCase();
  return u === "stuks" ? "stuk" : u;
}

/** Telt twee hoeveelheden met dezelfde eenheid op; `null` als de eenheden verschillen. */
export function addQuantities(a: string, b: string): string | null {
  const qa = parseRecipeIngredientQuantity(a);
  const qb = parseRecipeIngredientQuantity(b);
  if (unitKey(qa.quantityDesc) !== unitKey(qb.quantityDesc)) return null;
  const total = qa.stepperValue + qb.stepperValue;
  const unit = unitKey(qa.quantityDesc) === "stuk" ? (total === 1 ? "stuk" : "stuks") : qa.quantityDesc;
  return `${total} ${unit}`.trim();
}

/**
 * Bestaand item waar het nieuwe in opgaat, met de nieuwe hoeveelheid. Alleen losse producten
 * (geen receptingrediënten of diepvries) met dezelfde naam op dezelfde dag. Al afgevinkt →
 * opnieuw open met de nieuwe hoeveelheid (je hebt het opnieuw nodig).
 */
export function findMergeTarget(
  existing: readonly MergeCandidate[],
  incoming: Incoming,
): { id: string; quantity: string; reopen: boolean } | null {
  if (incoming.recipeGroupId || incoming.fromStock) return null;
  const name = incoming.name.trim().toLowerCase();
  if (!name) return null;
  const matches = existing.filter(
    (i) =>
      !i.recipeGroupId &&
      !i.fromStock &&
      i.section === incoming.section &&
      i.name.trim().toLowerCase() === name,
  );
  const open = matches.find((i) => !i.checked && addQuantities(i.quantity, incoming.quantity) != null);
  if (open) return { id: open.id, quantity: addQuantities(open.quantity, incoming.quantity)!, reopen: false };
  const done = matches.find((i) => i.checked);
  if (done) return { id: done.id, quantity: incoming.quantity, reopen: true };
  return null;
}
