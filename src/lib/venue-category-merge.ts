/** Normaliseert itemnamen voor lookup in admin-JSON (`itemToCategory`). */
export function normalizeVenueItemKey(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type VenueJsonItem = {
  id: string;
  name: string;
  category: string;
  iconSrc?: string | null;
};

type VenueCategoryJson = {
  items?: VenueJsonItem[];
  itemToCategory?: Record<string, string>;
};

/**
 * Past categorie-overrides uit de beheerswebsite toe.
 * Als `items` in de JSON staat, bepaalt die lijst welke items zichtbaar zijn
 * (verwijderde admin-items verdwijnen uit de wizard).
 */
export function mergeVenueWizardItems<
  T extends VenueJsonItem & Record<string, unknown>,
  C extends string,
>(
  raw: readonly T[],
  json: VenueCategoryJson,
  isCategory: (value: string) => value is C,
): readonly T[] {
  const resolveCategory = (name: string, fallback: C): C => {
    const key = normalizeVenueItemKey(name);
    const fromJson = json.itemToCategory?.[key]?.trim();
    if (fromJson && isCategory(fromJson)) return fromJson;
    return fallback;
  };

  const jsonItems = json.items;
  if (!jsonItems?.length) {
    return raw.map((item) => ({
      ...item,
      category: resolveCategory(item.name, item.category as C),
    }));
  }

  const rawById = new Map(raw.map((item) => [item.id, item]));

  return jsonItems.flatMap((jsonItem) => {
    const base = rawById.get(jsonItem.id);
    if (!base) return [];

    const fallback = (jsonItem.category || base.category) as C;
    const category = resolveCategory(jsonItem.name, fallback);

    return [
      {
        ...base,
        name: jsonItem.name,
        category,
        iconSrc: jsonItem.iconSrc || base.iconSrc,
      },
    ];
  });
}
