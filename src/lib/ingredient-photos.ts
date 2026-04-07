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

// ─── Matching ─────────────────────────────────────────────────────────────────

export function matchIngredientPhotoUrl(
  itemName: string,
  slugs: string[],
  synonyms: Record<string, string>,
  size: 160 | 240 | 320 = 320,
): string | null {
  const normalized = normalizeForMatch(itemName);
  if (!normalized) return null;

  // 1. Synonym lookup (exact normalized key)
  const synonymSlug = synonyms[normalized];
  if (synonymSlug && slugs.includes(synonymSlug)) {
    return `/images/ingredients/${synonymSlug}_${size}.webp`;
  }

  // 2. Synonym lookup via word prefix (e.g. "verse peterselie" → key "verse_peterselie")
  if (!synonymSlug) {
    // Try partial synonym match: check if any synonym key is a prefix of the input
    for (const [synKey, synSlug] of Object.entries(synonyms)) {
      if (normalized.startsWith(synKey) || synKey.startsWith(normalized)) {
        if (slugs.includes(synSlug)) {
          return `/images/ingredients/${synSlug}_${size}.webp`;
        }
      }
    }
  }

  if (slugs.length === 0) return null;

  // 3. Exact slug match
  if (slugs.includes(normalized)) {
    return `/images/ingredients/${normalized}_${size}.webp`;
  }

  // 4. Slug starts with normalized name (e.g. "appels" → "appels_1")
  const prefixMatch = slugs.find((s) => s.startsWith(normalized + "_") || s === normalized);
  if (prefixMatch) {
    return `/images/ingredients/${prefixMatch}_${size}.webp`;
  }

  // 5. Normalized name starts with slug (e.g. "zelfrijzend bakmeel" → "zelfrijzend_bakmeel")
  const partialMatch = slugs.find((s) => normalized.startsWith(s));
  if (partialMatch) {
    return `/images/ingredients/${partialMatch}_${size}.webp`;
  }

  // 6. Word-level match: any word in the input matches a slug prefix
  const words = normalized.split("_").filter((w) => w.length > 2);
  for (const word of words) {
    const wordMatch = slugs.find(
      (s) => s === word || s.startsWith(word + "_") || word.startsWith(s + "_"),
    );
    if (wordMatch) {
      return `/images/ingredients/${wordMatch}_${size}.webp`;
    }
  }

  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that returns a function resolving an ingredient name to its photo URL.
 * Applies synonyms from /ingredient-synonyms.json before slug matching.
 */
export function useIngredientPhotoUrl(
  size: 160 | 240 | 320 = 320,
): (name: string) => string | null {
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
    (name: string) => matchIngredientPhotoUrl(name, slugs, synonyms, size),
    [slugs, synonyms, size],
  );
}
