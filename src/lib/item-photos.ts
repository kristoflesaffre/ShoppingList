"use client";

import * as React from "react";
import {
  itemPhotoUrlFromSlug as itemPhotoUrlFromSlugBase,
  matchItemPhotoUrl as matchItemPhotoUrlBase,
  normalizeForMatch,
  normalizeItemPhotoSize,
  type ItemPhotoSize,
  type MatchItemPhotoUrlOptions,
} from "@/lib/item-photo-matching";
import { tripPersonImageSuffix, type TripPersonTab } from "@/lib/trip-person";

// Module-level cache so the fetch happens at most once per page load.
let cachedSlugs: string[] | null = null;
/** Maps normalised slug → original filename base (without size suffix / extension). */
let slugToFileBase: Map<string, string> = new Map();
let fetchPromise: Promise<string[]> | null = null;

// Synonym cache: normalized item name → normalized canonical item name (for image fallback)
let cachedSynonyms: Record<string, string> | null = null;
let synonymFetchPromise: Promise<Record<string, string>> | null = null;

function fetchSynonyms(): Promise<Record<string, string>> {
  if (cachedSynonyms) return Promise.resolve(cachedSynonyms);
  if (synonymFetchPromise) return synonymFetchPromise;
  synonymFetchPromise = fetch("/api/item-synonyms")
    .then((r) => r.json() as Promise<Record<string, string>>)
    .then((data) => {
      cachedSynonyms = data;
      synonymFetchPromise = null;
      return data;
    })
    .catch(() => {
      synonymFetchPromise = null;
      return {};
    });
  return synonymFetchPromise;
}

export type { ItemPhotoSize };

export function itemPhotoUrlFromSlug(slug: string, size?: number): string {
  return itemPhotoUrlFromSlugBase(slug, size, slugToFileBase);
}

/**
 * Normaliseert ruwe slugs en bouwt een mapping: genormaliseerde naam → padprefix/bestandsnaam.
 * Input kan "items/foo_160" of "vakantie/bar_160" zijn (met subdir) of legacy "foo_160" (zonder).
 * Vakantie-assets (later in de lijst) overschrijven reguliere items met dezelfde naam.
 */
function buildSlugIndex(raw: string[]): string[] {
  const map = new Map<string, string>();
  for (const rawSlug of raw) {
    const withoutSize = String(rawSlug).replace(/_(160|240|320)$/i, "");
    // justName = alleen de bestandsnaam (zonder subdir), voor normalisatie als slug-sleutel
    const justName = withoutSize.includes("/")
      ? withoutSize.split("/").pop()!
      : withoutSize;
    const normalized = normalizeForMatch(justName);
    if (normalized) {
      // Vakantie-assets overschrijven reguliere items voor dezelfde naam
      map.set(normalized, withoutSize);
    }
  }
  slugToFileBase = map;
  return Array.from(map.keys()).sort();
}

function fetchSlugs(): Promise<string[]> {
  if (cachedSlugs) return Promise.resolve(cachedSlugs);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/item-images")
    .then((r) => r.json() as Promise<string[]>)
    .then((rawSlugs) => {
      const slugs = buildSlugIndex(rawSlugs);
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

export { normalizeForMatch };

/**
 * Returns the URL for the best-matching item photo from a list of slugs,
 * or null if no match is found.
 */
export type ItemPhotoLookupOptions = {
  tripPerson?: TripPersonTab | string | null;
};

export function matchItemPhotoUrl(
  itemName: string,
  slugs: string[],
  size?: number,
  options?: ItemPhotoLookupOptions,
  synonyms?: Record<string, string>,
): string | null {
  const matchOptions: MatchItemPhotoUrlOptions | undefined = options?.tripPerson
    ? { personImageSuffix: tripPersonImageSuffix(options.tripPerson) }
    : undefined;
  const direct = matchItemPhotoUrlBase(itemName, slugs, size, slugToFileBase, matchOptions);
  if (direct) return direct;

  // Fallback: try canonical name via synonymToCanonical
  if (synonyms) {
    const normalized = normalizeForMatch(itemName);
    const canonical = synonyms[normalized];
    if (canonical && canonical !== normalized) {
      return matchItemPhotoUrlBase(canonical, slugs, size, slugToFileBase, matchOptions);
    }
  }
  return null;
}

/**
 * Hook that exposes the raw slug list (bestandsnamen zonder extensie, genormaliseerd).
 * Shares the same fetch as useItemPhotoUrl.
 */
export function useItemSlugs(): string[] {
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

  return slugs;
}

/**
 * Hook that returns only the slugs from the /images/vakantie folder.
 * Reactive: updates once the /api/item-images fetch resolves.
 */
export function useVacationItemSlugs(): string[] {
  const allSlugs = useItemSlugs();
  return React.useMemo(
    () => allSlugs.filter((slug) => slugToFileBase.get(slug)?.startsWith("vakantie/") ?? false),
    [allSlugs],
  );
}

/**
 * Hook that fetches the available item image slugs once and returns a stable
 * `getPhotoUrl(itemName)` function. Returns null for each item until the fetch
 * resolves (typically <50 ms on localhost).
 */
export function useItemPhotoUrl(
  size?: number,
): (
  itemName: string,
  overrideSize?: number,
  options?: ItemPhotoLookupOptions,
) => string | null {
  const [slugs, setSlugs] = React.useState<string[]>(cachedSlugs ?? []);
  const [synonyms, setSynonyms] = React.useState<Record<string, string>>(cachedSynonyms ?? {});
  const normalizedSize = normalizeItemPhotoSize(size);

  React.useEffect(() => {
    if (!cachedSlugs) {
      let cancelled = false;
      void fetchSlugs().then((result) => { if (!cancelled) setSlugs(result); });
      return () => { cancelled = true; };
    } else {
      setSlugs(cachedSlugs);
    }
  }, []);

  React.useEffect(() => {
    if (!cachedSynonyms) {
      let cancelled = false;
      void fetchSynonyms().then((result) => { if (!cancelled) setSynonyms(result); });
      return () => { cancelled = true; };
    }
  }, []);

  return React.useCallback(
    (itemName: string, overrideSize?: number, options?: ItemPhotoLookupOptions) =>
      matchItemPhotoUrl(itemName, slugs, overrideSize ?? normalizedSize, options, synonyms),
    [slugs, synonyms, normalizedSize],
  );
}
