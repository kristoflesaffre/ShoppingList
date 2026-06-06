/**
 * Autocomplete-treffers voor item-slugs (boodschappen + vakantie), incl. synoniemen.
 */
export function matchItemSlugsForAutocomplete(
  norm: string,
  slugs: string[],
  synonyms: Record<string, string>,
  max: number,
): string[] {
  if (!norm || !slugs.length) return [];
  const seen = new Set<string>();

  const resolveTarget = (synSlug: string): string | null => {
    if (slugs.includes(synSlug)) return synSlug;
    const exactPrefix = slugs.find((s) => s === synSlug || s.startsWith(`${synSlug}_`));
    if (exactPrefix) return exactPrefix;
    const base = synSlug.replace(/_\d+$/, "");
    return slugs.find((s) => s === base || s.startsWith(`${base}_`)) ?? null;
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
    (a, b) => (a.startsWith(norm) ? 0 : 1) - (b.startsWith(norm) ? 0 : 1),
  );
  return arr.slice(0, max);
}
