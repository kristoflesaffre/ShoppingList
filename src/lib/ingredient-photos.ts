"use client";

import * as React from "react";
import { normalizeForMatch } from "@/lib/item-photos";

let cachedSlugs: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

function fetchSlugs(): Promise<string[]> {
  if (cachedSlugs) return Promise.resolve(cachedSlugs);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/ingredient-images")
    .then((r) => r.json() as Promise<string[]>)
    .then((slugs) => {
      cachedSlugs = slugs;
      fetchPromise = null;
      return slugs;
    })
    .catch(() => {
      fetchPromise = null;
      return [];
    });
  return fetchPromise;
}

export function matchIngredientPhotoUrl(
  itemName: string,
  slugs: string[],
  size: 160 | 240 | 320 = 320,
): string | null {
  const normalized = normalizeForMatch(itemName);
  if (!normalized || slugs.length === 0) return null;

  // 1. Exact match
  if (slugs.includes(normalized))
    return `/images/ingredients/${normalized}_${size}.webp`;

  // 2. Slug starts with normalized name (e.g. "appels" → "appels_1")
  const prefixMatch = slugs.find((s) => s.startsWith(normalized));
  if (prefixMatch)
    return `/images/ingredients/${prefixMatch}_${size}.webp`;

  // 3. Normalized name starts with slug (e.g. "zelfrijzend bakmeel" → "bakmeel")
  const partialMatch = slugs.find((s) => normalized.startsWith(s));
  if (partialMatch)
    return `/images/ingredients/${partialMatch}_${size}.webp`;

  // 4. Any word in the normalized name matches a slug prefix
  const words = normalized.split("_").filter(Boolean);
  for (const word of words) {
    const wordMatch = slugs.find((s) => s.startsWith(word) || word.startsWith(s));
    if (wordMatch)
      return `/images/ingredients/${wordMatch}_${size}.webp`;
  }

  return null;
}

/**
 * Hook that returns a function resolving an ingredient name to its photo URL.
 * Uses /images/ingredients/{slug}_{size}.webp.
 */
export function useIngredientPhotoUrl(
  size: 160 | 240 | 320 = 320,
): (name: string) => string | null {
  const [slugs, setSlugs] = React.useState<string[]>(cachedSlugs ?? []);

  React.useEffect(() => {
    if (cachedSlugs) return;
    void fetchSlugs().then((s) => setSlugs(s));
  }, []);

  return React.useCallback(
    (name: string) => matchIngredientPhotoUrl(name, slugs, size),
    [slugs, size],
  );
}
