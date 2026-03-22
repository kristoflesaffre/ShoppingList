/**
 * Merge class names. Filters out falsy values.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Valideert een post-login redirect uit ?next= (alleen interne paden).
 */
export function getSafeInternalPath(
  candidate: string | null | undefined,
): string | null {
  if (candidate == null) return null;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed;
}

/** iPhone/iPod: native share-sheet i.p.v. slide-in (iPad valt hier buiten). */
export function isIPhoneDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPod/i.test(navigator.userAgent);
}
