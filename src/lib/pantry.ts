import { resolveItemCategoryFromName } from "@/lib/item-ingredient-category";

/**
 * Voorraadkast (bloem, olie, koekjes, chips…): rijen in `freezerItems` met dit `type`. Zo gelden dezelfde
 * rechten en velden als voor de diepvries; elke plek die diepvriesitems toont, slaat deze rijen over.
 */
export const PANTRY_ITEM_TYPE = "voorraadkast";

export function isPantryItem(row: { type?: unknown } | null | undefined): boolean {
  return row?.type === PANTRY_ITEM_TYPE;
}

export type PantryGroup = "bakken" | "olie" | "snacks" | "overig";

/** Volgorde op de pagina. */
export const PANTRY_GROUPS: { key: PantryGroup; label: string }[] = [
  { key: "bakken", label: "Bakken en droogwaren" },
  { key: "olie", label: "Olie en sauzen" },
  { key: "snacks", label: "Snacks" },
  { key: "overig", label: "Overig" },
];

/** Soort volgt uit de productnaam, zodat je niets hoeft te kiezen bij het toevoegen. */
export function pantryGroupOf(name: string): PantryGroup {
  if (/(olie|azijn)/i.test(name)) return "olie";
  const category = resolveItemCategoryFromName(name);
  if (category === "Droogwaren & Bakproducten") return "bakken";
  if (category === "Conserven, Sauzen, Olie & Kruiden") return "olie";
  if (category === "Zoute Snacks" || category === "Snoep & Chocolade") return "snacks";
  return "overig";
}

/** Nog één pak, fles… over: zelfde drempel als in de diepvries. */
export function isPantryLow(item: { packages?: number }): boolean {
  return item.packages === 1;
}

export function pantryStatsLabel(items: { packages?: number }[]): string {
  const low = items.filter(isPantryLow).length;
  const products = `${items.length} ${items.length === 1 ? "product" : "producten"}`;
  return low > 0 ? `${products} · ${low} bijna op` : products;
}
