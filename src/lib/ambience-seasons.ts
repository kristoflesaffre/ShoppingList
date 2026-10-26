/** Rijen in het ambience-venster: bovenaan wat bij het seizoen (of de feestdag) past, daarna de vaste stemmingen. */

export type AmbienceShelf = { key: string; label: string; query: string };

const SEASONAL = {
  kerst: { key: "kerst", label: "Kerst", query: "christmas ambience cozy fireplace" },
  winter: { key: "winter", label: "Winter", query: "winter snow cabin ambience" },
  lente: { key: "lente", label: "Lente", query: "spring nature ambience birds 4k" },
  zomer: { key: "zomer", label: "Zomer", query: "summer evening ambience beach 4k" },
  herfst: { key: "herfst", label: "Herfst", query: "autumn ambience cozy rain" },
  halloween: { key: "halloween", label: "Halloween", query: "halloween ambience cozy" },
} as const satisfies Record<string, AmbienceShelf>;

const MOODS: AmbienceShelf[] = [
  { key: "haardvuur", label: "Haardvuur", query: "fireplace ambience 4k" },
  { key: "regen", label: "Regen", query: "rain ambience cozy cabin" },
  { key: "cafe", label: "Café", query: "cafe ambience jazz" },
  { key: "aquarium", label: "Aquarium", query: "aquarium ambience 4k" },
  { key: "natuur", label: "Natuur", query: "forest nature ambience 4k" },
];

/**
 * Seizoensrijen voor een datum (lokale tijd), belangrijkste eerst:
 * december en tot Driekoningen kerst; 15–31 oktober Halloween (met herfst als tweede rij);
 * verder de meteorologische seizoenen van het noordelijk halfrond.
 */
export function seasonalShelves(date: Date): AmbienceShelf[] {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 || (m === 1 && d <= 6)) return [SEASONAL.kerst, SEASONAL.winter];
  if (m === 10 && d >= 15) return [SEASONAL.halloween, SEASONAL.herfst];
  if (m <= 2) return [SEASONAL.winter];
  if (m <= 5) return [SEASONAL.lente];
  if (m <= 8) return [SEASONAL.zomer];
  return [SEASONAL.herfst];
}

/** Alle rijen voor het venster: seizoen bovenaan, dan de vaste stemmingen. */
export function ambienceShelves(date: Date): AmbienceShelf[] {
  return [...seasonalShelves(date), ...MOODS];
}
