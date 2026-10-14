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

type DisplayItem = MergeCandidate & { mergedIds?: string[] };

/** Telt een lijst hoeveelheden op per eenheid: «1 stuk», «1 stuk», «200 g» → «2 stuks + 200 g». */
function sumQuantities(quantities: readonly string[]): string {
  const parts: string[] = [];
  for (const q of quantities) {
    const at = parts.findIndex((p) => addQuantities(p, q) != null);
    if (at >= 0) parts[at] = addQuantities(parts[at], q)!;
    else parts.push(q.trim() || "1 stuk");
  }
  return parts.join(" + ");
}

/**
 * Weergave per categorie: elk product maar één keer. Hetzelfde product op verschillende dagen
 * (los of als receptingrediënt, bv. «Komkommer» woensdag én vrijdag) wordt één kaartje met de
 * opgetelde hoeveelheid; verschillende eenheden komen naast elkaar («1 stuk + 200 g»). Diepvries
 * (uit de voorraad) blijft apart. `mergedIds` = alle onderliggende items (afvinken/verwijderen doet ze allemaal).
 */
export function mergeLooseDuplicates<T extends DisplayItem>(items: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  const order: (T | string)[] = [];
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (item.fromStock || !key) {
      order.push(item);
      continue;
    }
    const group = groups.get(key);
    if (group) group.push(item);
    else {
      groups.set(key, [item]);
      order.push(key);
    }
  }
  return order.map((entry) => {
    if (typeof entry !== "string") return entry;
    const group = groups.get(entry)!;
    if (group.length === 1) return group[0];
    const [base] = group;
    return {
      ...base,
      quantity: sumQuantities(group.map((i) => i.quantity)),
      checked: group.every((i) => i.checked),
      mergedIds: group.map((i) => i.id),
    };
  });
}
