/**
 * Winkelkeuze per item op een Lidl / Delhaize-lijstje (canvas «Concept D · Winkelknop in de rij»).
 * Een item zonder keuze telt als «allebei» en blijft dus in elk filter zichtbaar.
 */
export type ItemStore = "lidl" | "delhaize" | "both";
export type StoreFilter = "all" | "lidl" | "delhaize";

export const LIDL_LOGO_SRC = "/logos/logos-lidl.svg";
export const DELHAIZE_LOGO_SRC = "/logos/logos-delhaize.svg";

export function parseItemStore(value: unknown): ItemStore | undefined {
  return value === "lidl" || value === "delhaize" || value === "both" ? value : undefined;
}

export function parseStoreFilter(value: unknown): StoreFilter {
  return value === "lidl" || value === "delhaize" ? value : "all";
}

export function itemMatchesStoreFilter(store: ItemStore | undefined, filter: StoreFilter): boolean {
  if (filter === "all" || store == null || store === "both") return true;
  return store === filter;
}

export function storeFilterLabel(filter: StoreFilter): string {
  return filter === "lidl" ? "Lidl" : filter === "delhaize" ? "Delhaize" : "Alle winkels";
}

/** Sleutel om een item aan een favoriet met dezelfde naam te koppelen. */
export function storeNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Winkel per product, bewaard op het Lidl / Delhaize-favorietenlijstje (`lists.ingredientStoresJson`):
 * ook voor producten die geen favoriet zijn (bv. ingrediënten van recepten).
 */
export function parseIngredientStores(json: unknown): Map<string, ItemStore> {
  const map = new Map<string, ItemStore>();
  if (typeof json !== "string" || !json.trim()) return map;
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    for (const [key, value] of Object.entries(raw)) {
      const store = parseItemStore(value);
      if (store) map.set(storeNameKey(key), store);
    }
  } catch {
    // ongeldige JSON → leeg
  }
  return map;
}

export function serializeIngredientStores(map: Map<string, ItemStore>): string {
  return JSON.stringify(Object.fromEntries(Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))));
}
