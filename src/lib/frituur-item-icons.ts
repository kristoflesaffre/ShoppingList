import frituurItemCategories from "@/lib/data/frituur_item_categories.json";
import { normalizeVenueItemKey } from "@/lib/venue-category-merge";

const FRITUUR_ITEM_PLACEHOLDER_ICON_URL =
  "/images/ui/product_icons/frieten_160.webp";

type FrituurCatalogItem = {
  name: string;
  iconSrc?: string | null;
};

const FRITUUR_ITEMS_BY_NAME = new Map(
  (frituurItemCategories.items as FrituurCatalogItem[]).map((item) => [
    normalizeVenueItemKey(item.name),
    item,
  ]),
);

const FRITUUR_SYNONYM_TO_CANONICAL =
  frituurItemCategories.synonymToCanonical as Record<string, string>;

/** Dezelfde vaste catalogusfoto die op het frituurlijstje zelf wordt getoond. */
export function frituurItemIconSrc(name: string): string {
  const normalizedName = normalizeVenueItemKey(name);
  const canonicalName =
    FRITUUR_SYNONYM_TO_CANONICAL[normalizedName]?.trim() || name;
  const match = FRITUUR_ITEMS_BY_NAME.get(normalizeVenueItemKey(canonicalName));
  return match?.iconSrc || FRITUUR_ITEM_PLACEHOLDER_ICON_URL;
}
