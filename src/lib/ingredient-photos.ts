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
  if (!normalized || slugs.length === 0) return null;

  const url = (slug: string) => `/images/ingredients/${slug}_${size}.webp`;

  // 1. Exact synonym key match
  const synonymSlug = synonyms[normalized];
  if (synonymSlug && slugs.includes(synonymSlug)) return url(synonymSlug);

  // 2. Exact slug match — must happen BEFORE partial synonym matching to prevent
  //    e.g. "bloemkool" matching the "bloem" synonym entry
  if (slugs.includes(normalized)) return url(normalized);

  // 3. Slug starts with normalized + "_" (e.g. "appels" → "appels_1")
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
