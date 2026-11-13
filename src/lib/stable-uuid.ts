/**
 * Vaste UUID uit een sleutel (bv. «films-series-meta:<groep>:<tmdbId>»): dezelfde sleutel geeft altijd dezelfde id,
 * zodat een `update` een bestaande rij overschrijft in plaats van er een nieuwe naast te zetten — ook als de
 * query met de bestaande rij nog niet geladen is. Synchroon (geen crypto.subtle), dus bruikbaar in elke handler.
 * Hash: cyrb128 (4 × 32 bit), niet cryptografisch; enkel om botsingen tussen sleutels te vermijden.
 */
export function stableUuid(key: string): string {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < key.length; i++) {
    const k = key.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
  // Versie 4 en variant 10xx, zodat het een geldige UUID is.
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Vaste id van de seriegegevens (titel, jaar, poster) van één serie binnen een films-groep. */
export function seriesMetaId(groupOwnerId: string, tmdbId: string): string {
  return stableUuid(`films-series-meta:${groupOwnerId}:${tmdbId}`);
}
