export type ItemPhotoSize = 160 | 240 | 320;

export function normalizeItemPhotoSize(size?: number): ItemPhotoSize {
  if (!size || Number.isNaN(size)) return 240;
  if (size <= 160) return 160;
  if (size <= 240) return 240;
  return 320;
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

export function itemPhotoUrlFromSlug(
  slug: string,
  size?: number,
  fileBaseBySlug?: Map<string, string>,
): string {
  const normalizedSize = normalizeItemPhotoSize(size);
  const fileBase = fileBaseBySlug?.get(slug) ?? slug;
  return `/images/items/${fileBase}_${normalizedSize}.webp`;
}

/**
 * Returns the URL for the best-matching item photo from a list of normalized slugs,
 * or null if no match is found.
 */
export function matchItemPhotoUrl(
  itemName: string,
  slugs: string[],
  size?: number,
  fileBaseBySlug?: Map<string, string>,
): string | null {
  const normalized = normalizeForMatch(itemName);
  if (!normalized || slugs.length === 0) return null;
  const slugSet = new Set(slugs);

  const candidates = new Set<string>([normalized]);
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

  for (const c of candidateList) {
    if (slugSet.has(c)) return itemPhotoUrlFromSlug(c, size, fileBaseBySlug);
  }

  for (const c of candidateList) {
    const startsWith = slugs.find(
      (slug) => slug.startsWith(c + "_") || slug === c,
    );
    if (startsWith) return itemPhotoUrlFromSlug(startsWith, size, fileBaseBySlug);
  }

  for (const c of candidateList) {
    const prefixMatch = slugs.find(
      (slug) => c.startsWith(slug + "_") || c.startsWith(slug),
    );
    if (prefixMatch) return itemPhotoUrlFromSlug(prefixMatch, size, fileBaseBySlug);
  }

  const words = normalized.split("_").filter((w) => w.length > 3);
  for (const word of words) {
    const wordCandidates = [word];
    if (word.endsWith("en") && word.length > 4) wordCandidates.push(word.slice(0, -2));
    if (word.endsWith("s") && word.length > 3) wordCandidates.push(word.slice(0, -1));
    const wordMatch = slugs.find((slug) => wordCandidates.includes(slug));
    if (wordMatch) return itemPhotoUrlFromSlug(wordMatch, size, fileBaseBySlug);
  }

  return null;
}
