"use client";

import * as React from "react";

// Module-level cache so the fetch happens at most once per page load.
let cachedSlugs: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

function fetchSlugs(): Promise<string[]> {
  if (cachedSlugs) return Promise.resolve(cachedSlugs);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/item-images")
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

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Returns the URL for the best-matching item photo from a list of slugs,
 * or null if no match is found.
 */
export function matchItemPhotoUrl(
  itemName: string,
  slugs: string[],
): string | null {
  const normalized = normalizeForMatch(itemName);
  if (!normalized || slugs.length === 0) return null;

  // 1. Exact match
  if (slugs.includes(normalized)) return `/images/items/${normalized}.jpg`;

  // 2. Slug starts with normalized name (e.g. "brood" → "brood_kristof")
  const startsWith = slugs.find(
    (slug) => slug.startsWith(normalized + "_") || slug === normalized,
  );
  if (startsWith) return `/images/items/${startsWith}.jpg`;

  // 3. Normalized name starts with slug (e.g. "aardappelen gebakken" → "aardappelen")
  const prefixMatch = slugs.find(
    (slug) =>
      normalized.startsWith(slug + "_") || normalized === slug,
  );
  if (prefixMatch) return `/images/items/${prefixMatch}.jpg`;

  // 4. Word-level: any word in the normalized name exactly matches a slug
  const words = normalized.split("_").filter((w) => w.length > 3);
  for (const word of words) {
    const wordMatch = slugs.find((slug) => slug === word);
    if (wordMatch) return `/images/items/${wordMatch}.jpg`;
  }

  return null;
}

/**
 * Hook that fetches the available item image slugs once and returns a stable
 * `getPhotoUrl(itemName)` function. Returns null for each item until the fetch
 * resolves (typically <50 ms on localhost).
 */
export function useItemPhotoUrl(): (itemName: string) => string | null {
  const [slugs, setSlugs] = React.useState<string[]>(cachedSlugs ?? []);

  React.useEffect(() => {
    if (cachedSlugs) {
      setSlugs(cachedSlugs);
      return;
    }
    let cancelled = false;
    fetchSlugs().then((result) => {
      if (!cancelled) setSlugs(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return React.useCallback(
    (itemName: string) => matchItemPhotoUrl(itemName, slugs),
    [slugs],
  );
}
