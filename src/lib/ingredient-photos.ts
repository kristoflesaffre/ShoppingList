"use client";

import * as React from "react";
import { normalizeForMatch } from "@/lib/item-photos";

// ─── Module-level caches ──────────────────────────────────────────────────────

let cachedSlugs: string[] | null = null;
let slugFetchPromise: Promise<string[]> | null = null;

let cachedSynonyms: Record<string, string> | null = null;
let synonymFetchPromise: Promise<Record<string, string>> | null = null;

// ─── Fetchers ─────────────────────────────────────────────────────────────────

function fetchSlugs(): Promise<string[]> {
  if (cachedSlugs) return Promise.resolve(cachedSlugs);
  if (slugFetchPromise) return slugFetchPromise;
  slugFetchPromise = fetch("/api/ingredient-images")
    .then((r) => r.json() as Promise<string[]>)
    .then((slugs) => {
      cachedSlugs = slugs;
      slugFetchPromise = null;
      return slugs;
    })
    .catch(() => {
      slugFetchPromise = null;
      return [];
    });
  return slugFetchPromise;
}

function fetchSynonyms(): Promise<Record<string, string>> {
  if (cachedSynonyms) return Promise.resolve(cachedSynonyms);
  if (synonymFetchPromise) return synonymFetchPromise;
  synonymFetchPromise = fetch("/ingredient-synonyms.json")
    .then((r) => r.json() as Promise<Record<string, string>>)
    .then((raw) => {
      // Normalize all keys at load time; skip the _comment entry
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (key.startsWith("_") || typeof value !== "string") continue;
        normalized[normalizeForMatch(key)] = value;
      }
      cachedSynonyms = normalized;
      synonymFetchPromise = null;
      return normalized;
    })
    .catch(() => {
      synonymFetchPromise = null;
      return {};
    });
  return synonymFetchPromise;
}

// ─── Ingredient name normalisation ───────────────────────────────────────────

/**
 * Converts a slug like "zelfrijzend_bakmeel" to a display name "Zelfrijzend bakmeel".
 */
function slugToDisplayName(slug: string): string {
  return slug.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Given an AI-provided ingredient name, tries to map it to the canonical catalog
 * name using the synonym table and slug list. Falls back to the original name.
 *
 * Examples:
 *   "ui"      → "Ajuin"        (via synonym "ui" → "ajuin")
 *   "Eieren"  → "Eieren"       (slug already exists)
 *   "blabla"  → "blabla"       (no match, keep original)
 */
export function normalizeIngredientName(
  name: string,
  slugs: string[],
  synonyms: Record<string, string>,
): string {
  if (!name.trim() || slugs.length === 0) return name;
  const normalized = normalizeForMatch(name);

  // 1. Exact synonym match
  const synonymSlug = synonyms[normalized];
  if (synonymSlug) {
    // Strip any count suffix (_1, _2, …) to get the base display name
    const base = synonymSlug.replace(/_\d+$/, "");
    return slugToDisplayName(base);
  }

  // 2. Exact slug match (already canonical — just re-capitalise)
  const exactSlug = slugs.find((s) => s.replace(/_\d+$/, "") === normalized);
  if (exactSlug) return slugToDisplayName(normalized);

  // 3. No match → return original unchanged
  return name;
}

/**
 * Hook that returns a function to normalise an AI-provided ingredient name to
 * its catalog display name. Uses the same caches as useIngredientPhotoUrl.
 */
export function useNormalizeIngredientName(): (name: string) => string {
  const [slugs, setSlugs] = React.useState<string[]>(cachedSlugs ?? []);
  const [synonyms, setSynonyms] = React.useState<Record<string, string>>(
    cachedSynonyms ?? {},
  );

  React.useEffect(() => {
    if (!cachedSlugs) void fetchSlugs().then(setSlugs);
    if (!cachedSynonyms) void fetchSynonyms().then(setSynonyms);
  }, []);

  return React.useCallback(
    (name: string) => normalizeIngredientName(name, slugs, synonyms),
    [slugs, synonyms],
  );
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Parses a leading integer from a quantity string like "4", "4 stuks", "2 el".
 * Returns null if no leading integer is found.
 */
function parseLeadingCount(quantity: string | undefined): number | null {
  if (!quantity) return null;
  const m = quantity.trim().match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Among slugs that match `base_N` (numeric-only suffix), pick the best for
 * `count`. Returns the slug whose N is the largest value ≤ count. If count
 * is below all variants, returns the lowest. If count is above all, returns
 * the highest (as requested).
 */
function pickCountVariant(
  base: string,
  slugs: string[],
  count: number,
): string | null {
  const variants = slugs
    .filter((s) => {
      if (!s.startsWith(base + "_")) return false;
      const suffix = s.slice(base.length + 1);
      return /^\d+$/.test(suffix);
    })
    .map((s) => ({ slug: s, n: parseInt(s.slice(base.length + 1), 10) }))
    .sort((a, b) => a.n - b.n);

  if (variants.length === 0) return null;

  // Largest variant whose count is ≤ requested count
  const below = [...variants].reverse().find((v) => v.n <= count);
  if (below) return below.slug;

  // count is below all variants → use the smallest
  return variants[0].slug;
}

export function matchIngredientPhotoUrl(
  itemName: string,
  slugs: string[],
  synonyms: Record<string, string>,
  size: 160 | 240 | 320 = 320,
  quantity?: string,
): string | null {
  const normalized = normalizeForMatch(itemName);
  if (!normalized || slugs.length === 0) return null;

  const url = (slug: string) => `/images/ingredients/${slug}_${size}.webp`;
  const count = parseLeadingCount(quantity);

  // 1. Exact synonym key match — if synonym points to a count-variant base and
  //    we have a quantity, use count-aware picking instead of returning _1 directly
  const synonymSlug = synonyms[normalized];
  if (synonymSlug && slugs.includes(synonymSlug)) {
    if (count !== null) {
      // Derive the base from the synonym slug (strip trailing _N if present)
      const baseMatch = synonymSlug.match(/^(.+?)_(\d+)$/);
      if (baseMatch) {
        const countMatch = pickCountVariant(baseMatch[1], slugs, count);
        if (countMatch) return url(countMatch);
      }
    }
    return url(synonymSlug);
  }

  // 2. Exact slug match — must happen BEFORE partial synonym matching to prevent
  //    e.g. "bloemkool" matching the "bloem" synonym entry
  if (slugs.includes(normalized)) return url(normalized);

  // 3. Slug starts with normalized + "_" — prefer count-variant if available
  if (count !== null) {
    const countMatch = pickCountVariant(normalized, slugs, count);
    if (countMatch) return url(countMatch);
  }
  const prefixMatch = slugs.find((s) => s.startsWith(normalized + "_"));
  if (prefixMatch) return url(prefixMatch);

  // 4. Partial synonym match — only on exact word boundaries to avoid false positives
  //    (e.g. "verse peterselie" matches synonym key "peterselie")
  for (const [synKey, synSlug] of Object.entries(synonyms)) {
    if (synKey === normalized) continue; // already checked in step 1
    // Match if the input ends with the synonym key as a full word segment
    if (
      normalized === synKey ||
      normalized.endsWith("_" + synKey) ||
      normalized.startsWith(synKey + "_")
    ) {
      if (slugs.includes(synSlug)) return url(synSlug);
    }
  }

  // 5. Normalized starts with a slug (multi-word slug: "zelfrijzend_bakmeel")
  const slugStartMatch = slugs.find(
    (s) => s.length > 3 && normalized.startsWith(s),
  );
  if (slugStartMatch) return url(slugStartMatch);

  // 6. Word-level match: each word in the input must fully match a slug or slug prefix
  const words = normalized.split("_").filter((w) => w.length > 3);
  for (const word of words) {
    const wordMatch = slugs.find(
      (s) => s === word || s.startsWith(word + "_"),
    );
    if (wordMatch) return url(wordMatch);
  }

  return null;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Raw slug bases from `/api/ingredient-images` (zelfde cache als useIngredientPhotoUrl).
 */
export function useIngredientSlugs(): string[] {
  const [slugs, setSlugs] = React.useState<string[]>(cachedSlugs ?? []);

  React.useEffect(() => {
    if (cachedSlugs) {
      setSlugs(cachedSlugs);
      return;
    }
    let cancelled = false;
    void fetchSlugs().then((result) => {
      if (!cancelled) setSlugs(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return slugs;
}

/**
 * Hook that returns a function resolving an ingredient name to its photo URL.
 * Applies synonyms from /ingredient-synonyms.json before slug matching.
 */
export function useIngredientPhotoUrl(
  size: 160 | 240 | 320 = 320,
): (name: string, quantity?: string) => string | null {
  const [slugs, setSlugs] = React.useState<string[]>(cachedSlugs ?? []);
  const [synonyms, setSynonyms] = React.useState<Record<string, string>>(
    cachedSynonyms ?? {},
  );

  React.useEffect(() => {
    if (!cachedSlugs) {
      void fetchSlugs().then(setSlugs);
    }
    if (!cachedSynonyms) {
      void fetchSynonyms().then(setSynonyms);
    }
  }, []);

  return React.useCallback(
    (name: string, quantity?: string) =>
      matchIngredientPhotoUrl(name, slugs, synonyms, size, quantity),
    [slugs, synonyms, size],
  );
}
