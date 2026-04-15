"use client";

import * as React from "react";

// Module-level cache so the fetch happens at most once per page load.
let cachedSlugs: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

export type ItemPhotoSize = 160 | 240 | 320;

function normalizeItemPhotoSize(size?: number): ItemPhotoSize {
  if (!size || Number.isNaN(size)) return 240;
  if (size <= 160) return 160;
  if (size <= 240) return 240;
  return 320;
}

export function itemPhotoUrlFromSlug(slug: string, size?: number): string {
  const normalizedSize = normalizeItemPhotoSize(size);
  return `/images/items/${slug}_${normalizedSize}.webp`;
}

function sanitizeItemSlugs(raw: string[]): string[] {
  const cleaned = raw
    .map((slug) =>
      String(slug)
        .replace(/_(160|240|320)$/i, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    )
    .filter(Boolean);
  return Array.from(new Set(cleaned)).sort();
}

function fetchSlugs(): Promise<string[]> {
  if (cachedSlugs) return Promise.resolve(cachedSlugs);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/item-images")
    .then((r) => r.json() as Promise<string[]>)
    .then((slugs) => {
      const sanitized = sanitizeItemSlugs(slugs);
      cachedSlugs = sanitized;
      fetchPromise = null;
      return sanitized;
    })
    .catch(() => {
      fetchPromise = null;
      return [];
    });
  return fetchPromise;
}

export function normalizeForMatch(name: string): string {
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
  size?: number,
): string | null {
  const normalizedSlugs = sanitizeItemSlugs(slugs);
  const normalized = normalizeForMatch(itemName);
  if (!normalized || normalizedSlugs.length === 0) return null;
  const slugSet = new Set(normalizedSlugs);

  const candidates = new Set<string>([normalized]);
  // Tolerantie voor simpele enkelvoud/meervoud-varianten:
  // kippenworsten -> kippenworst, tomaats -> tomaat, etc.
  if (normalized.endsWith("en") && normalized.length > 4) {
    candidates.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith("s") && normalized.length > 3) {
    candidates.add(normalized.slice(0, -1));
  }
  if (normalized.endsWith("es") && normalized.length > 4) {
    candidates.add(normalized.slice(0, -2));
  }
  const candidateList = Array.from(candidates);

  // 1. Exact match
  for (const c of candidateList) {
    if (slugSet.has(c)) return itemPhotoUrlFromSlug(c, size);
  }

  // 2. Slug starts with query (e.g. "brood" -> "brood_kristof")
  for (const c of candidateList) {
    const startsWith = normalizedSlugs.find(
      (slug) => slug.startsWith(c + "_") || slug === c,
    );
    if (startsWith) return itemPhotoUrlFromSlug(startsWith, size);
  }

  // 3. Query starts with slug (e.g. "aardappelen_gekookt" -> "aardappelen")
  for (const c of candidateList) {
    const prefixMatch = normalizedSlugs.find(
      (slug) => c.startsWith(slug + "_") || c.startsWith(slug),
    );
    if (prefixMatch) return itemPhotoUrlFromSlug(prefixMatch, size);
  }

  // 4. Word-level: any word in the normalized name exactly matches a slug
  const words = normalized.split("_").filter((w) => w.length > 3);
  for (const word of words) {
    const wordCandidates = [word];
    if (word.endsWith("en") && word.length > 4) wordCandidates.push(word.slice(0, -2));
    if (word.endsWith("s") && word.length > 3) wordCandidates.push(word.slice(0, -1));
    const wordMatch = normalizedSlugs.find((slug) => wordCandidates.includes(slug));
    if (wordMatch) return itemPhotoUrlFromSlug(wordMatch, size);
  }

  return null;
}

/**
 * Hook that exposes the raw slug list (bestandsnamen zonder extensie, genormaliseerd).
 * Shares the same fetch as useItemPhotoUrl.
 */
export function useItemSlugs(): string[] {
  const [slugs, setSlugs] = React.useState<string[]>(
    cachedSlugs ? sanitizeItemSlugs(cachedSlugs) : [],
  );

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

  return slugs;
}

/**
 * Hook that fetches the available item image slugs once and returns a stable
 * `getPhotoUrl(itemName)` function. Returns null for each item until the fetch
 * resolves (typically <50 ms on localhost).
 */
export function useItemPhotoUrl(
  size?: number,
): (itemName: string, overrideSize?: number) => string | null {
  const [slugs, setSlugs] = React.useState<string[]>(
    cachedSlugs ? sanitizeItemSlugs(cachedSlugs) : [],
  );
  const normalizedSize = normalizeItemPhotoSize(size);

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
    (itemName: string, overrideSize?: number) =>
      matchItemPhotoUrl(itemName, slugs, overrideSize ?? normalizedSize),
    [slugs, normalizedSize],
  );
}
