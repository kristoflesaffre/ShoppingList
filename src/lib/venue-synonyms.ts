import cafeItemCategories from "@/lib/data/cafe_item_categories.json";
import frituurItemCategories from "@/lib/data/frituur_item_categories.json";
import vacationItemCategories from "@/lib/data/vacation_item_categories.json";
import ingredientCategories from "@/lib/data/ingredient_categories.json";
import { normalizeForMatch } from "@/lib/item-photo-matching";
import { normalizeVenueItemKey } from "@/lib/venue-category-merge";

type SynonymFile = { synonymToCanonical?: Record<string, string> };

/** Normaliseert synoniemen voor foto-slug lookup (`normalizeForMatch`). */
export function buildNormalizedSynonymMap(
  raw: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [syn, canonical] of Object.entries(raw ?? {})) {
    const key = normalizeForMatch(syn);
    const value = normalizeForMatch(canonical);
    if (key && value) out[key] = value;
  }
  return out;
}

/** Alle synoniemen samengevoegd voor itemfoto-zoekopdrachten. */
export function getAllItemPhotoSynonyms(): Record<string, string> {
  const sources = [
    (ingredientCategories as SynonymFile).synonymToCanonical,
    (vacationItemCategories as SynonymFile).synonymToCanonical,
    (cafeItemCategories as SynonymFile).synonymToCanonical,
    (frituurItemCategories as SynonymFile).synonymToCanonical,
  ];
  const merged: Record<string, string> = {};
  for (const raw of sources) {
    Object.assign(merged, buildNormalizedSynonymMap(raw));
  }
  return merged;
}

/** Resolveert een getypte naam naar de canonieke weergavenaam via synoniemen-JSON. */
export function resolveCanonicalNameFromSynonyms(
  name: string,
  synonyms: Record<string, string> | undefined,
): string {
  const key = normalizeVenueItemKey(name);
  const hit = synonyms?.[key]?.trim();
  return hit && hit.length > 0 ? hit : name.trim();
}

export const VACATION_SYNONYM_TO_CANONICAL: Record<string, string> =
  (vacationItemCategories as SynonymFile).synonymToCanonical ?? {};

export const CAFE_SYNONYM_TO_CANONICAL: Record<string, string> =
  (cafeItemCategories as SynonymFile).synonymToCanonical ?? {};

export const FRITUUR_SYNONYM_TO_CANONICAL: Record<string, string> =
  (frituurItemCategories as SynonymFile).synonymToCanonical ?? {};
