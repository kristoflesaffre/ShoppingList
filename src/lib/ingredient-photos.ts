"use client";

import * as React from "react";
import { normalizeForMatch } from "@/lib/item-photo-matching";
import {
  matchIngredientPhotoUrl,
  normalizeIngredientName,
  slugToIngredientDisplayName,
} from "@/lib/ingredient-photo-matching";

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
const slugToDisplayName = slugToIngredientDisplayName;

/**
 * Given an AI-provided ingredient name, tries to map it to the canonical catalog
 * name using the synonym table and slug list. Falls back to the original name.
 *
 * Examples:
 *   "ui"      → "Ajuin"        (via synonym "ui" → "ajuin")
 *   "Eieren"  → "Eieren"       (slug already exists)
 *   "blabla"  → "blabla"       (no match, keep original)
 */
export { normalizeIngredientName };

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

export { matchIngredientPhotoUrl };

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

/** Zelfde synoniem-map als foto-matching (sleutels al genormaliseerd met `normalizeForMatch`). */
export function useIngredientSynonyms(): Record<string, string> {
  const [synonyms, setSynonyms] = React.useState<Record<string, string>>(
    () => cachedSynonyms ?? {},
  );

  React.useEffect(() => {
    if (cachedSynonyms) {
      setSynonyms(cachedSynonyms);
      return;
    }
    let cancelled = false;
    void fetchSynonyms().then((s) => {
      if (!cancelled) setSynonyms(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return synonyms;
}

/**
 * Slugs voor autocomplete bij ingrediënten: prefix op slug-woorden + treffers via synoniem-sleutels.
 */
export function matchIngredientSlugsForAutocomplete(
  norm: string,
  slugs: string[],
  synonyms: Record<string, string>,
  max: number,
): string[] {
  if (!norm || !slugs.length) return [];
  const seen = new Set<string>();

  const resolveTarget = (synSlug: string): string | null => {
    if (slugs.includes(synSlug)) return synSlug;
    const base = synSlug.replace(/_\d+$/, "");
    const exactBase = slugs.find((s) => s === base);
    if (exactBase) return exactBase;
    const numericVariants = slugs.filter((s) => {
      if (!s.startsWith(base + "_")) return false;
      const suf = s.slice(base.length + 1);
      return /^\d+$/.test(suf);
    });
    if (numericVariants.length > 0) {
      numericVariants.sort(
        (a, b) =>
          parseInt(a.slice(base.length + 1), 10) -
          parseInt(b.slice(base.length + 1), 10),
      );
      return numericVariants[0] ?? null;
    }
    return slugs.find((s) => s.startsWith(base + "_")) ?? null;
  };

  for (const slug of slugs) {
    if (slug.split("_").some((w) => w.startsWith(norm))) seen.add(slug);
  }

  for (const [synKey, synSlug] of Object.entries(synonyms)) {
    const keyHit =
      synKey.startsWith(norm) ||
      synKey.split("_").some((w) => w.startsWith(norm));
    if (!keyHit) continue;
    const resolved = resolveTarget(synSlug);
    if (resolved) seen.add(resolved);
  }

  const arr = Array.from(seen);
  arr.sort(
    (a, b) =>
      (a.startsWith(norm) ? 0 : 1) - (b.startsWith(norm) ? 0 : 1) ||
      a.localeCompare(b),
  );
  return arr.slice(0, max);
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
