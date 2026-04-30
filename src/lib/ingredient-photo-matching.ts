import { normalizeForMatch } from "@/lib/item-photo-matching";

export type IngredientPhotoSize = 160 | 240 | 320;

export function slugToIngredientDisplayName(slug: string): string {
  return slug.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function normalizeIngredientName(
  name: string,
  slugs: string[],
  synonyms: Record<string, string>,
): string {
  if (!name.trim() || slugs.length === 0) return name;
  const normalized = normalizeForMatch(name);

  const synonymSlug = synonyms[normalized];
  if (synonymSlug) {
    const base = synonymSlug.replace(/_\d+$/, "");
    return slugToIngredientDisplayName(base);
  }

  const exactSlug = slugs.find((s) => s.replace(/_\d+$/, "") === normalized);
  if (exactSlug) return slugToIngredientDisplayName(normalized);

  return name;
}

function parseLeadingCount(quantity: string | undefined): number | null {
  if (!quantity) return null;
  const match = quantity.trim().match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function pickCountVariant(
  base: string,
  slugs: string[],
  count: number,
): string | null {
  const variants = slugs
    .filter((slug) => {
      if (!slug.startsWith(base + "_")) return false;
      const suffix = slug.slice(base.length + 1);
      return /^\d+$/.test(suffix);
    })
    .map((slug) => ({ slug, n: parseInt(slug.slice(base.length + 1), 10) }))
    .sort((a, b) => a.n - b.n);

  if (variants.length === 0) return null;

  const below = [...variants].reverse().find((variant) => variant.n <= count);
  if (below) return below.slug;

  return variants[0].slug;
}

export function matchIngredientPhotoUrl(
  itemName: string,
  slugs: string[],
  synonyms: Record<string, string>,
  size: IngredientPhotoSize = 320,
  quantity?: string,
): string | null {
  const normalized = normalizeForMatch(itemName);
  if (!normalized || slugs.length === 0) return null;

  const url = (slug: string) => `/images/ingredients/${slug}_${size}.webp`;
  const count = parseLeadingCount(quantity);

  const synonymSlug = synonyms[normalized];
  if (synonymSlug && slugs.includes(synonymSlug)) {
    if (count !== null) {
      const baseMatch = synonymSlug.match(/^(.+?)_(\d+)$/);
      if (baseMatch) {
        const countMatch = pickCountVariant(baseMatch[1], slugs, count);
        if (countMatch) return url(countMatch);
      }
    }
    return url(synonymSlug);
  }

  if (slugs.includes(normalized)) return url(normalized);

  if (count !== null) {
    const countMatch = pickCountVariant(normalized, slugs, count);
    if (countMatch) return url(countMatch);
  }
  const prefixMatch = slugs.find((slug) => slug.startsWith(normalized + "_"));
  if (prefixMatch) return url(prefixMatch);

  for (const [synKey, synSlug] of Object.entries(synonyms)) {
    if (synKey === normalized) continue;
    if (
      normalized === synKey ||
      normalized.endsWith("_" + synKey) ||
      normalized.startsWith(synKey + "_")
    ) {
      if (slugs.includes(synSlug)) return url(synSlug);
    }
  }

  const slugStartMatch = slugs.find(
    (slug) => slug.length > 3 && normalized.startsWith(slug),
  );
  if (slugStartMatch) return url(slugStartMatch);

  const words = normalized.split("_").filter((word) => word.length > 3);
  for (const word of words) {
    const wordMatch = slugs.find(
      (slug) => slug === word || slug.startsWith(word + "_"),
    );
    if (wordMatch) return url(wordMatch);
  }

  return null;
}
