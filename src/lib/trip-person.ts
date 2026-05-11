/** Landal/vakantie-lijstje: wie het item betreft (tabs + «Wie» in item-formulier). */

export const TRIP_PERSON_TABS = ["Samen", "Kristof", "Chloé", "Noë"] as const;

export type TripPersonTab = (typeof TRIP_PERSON_TABS)[number];

export const DEFAULT_TRIP_PERSON_TAB: TripPersonTab = "Samen";

/** Landal-assets: `jas_man`, `jas_vrouw`, `jas_kind`, … */
export const TRIP_PERSON_IMAGE_SUFFIX = {
  Kristof: "man",
  "Chloé": "vrouw",
  "Noë": "kind",
} as const satisfies Partial<Record<TripPersonTab, string>>;

export type TripPersonImageSuffix =
  (typeof TRIP_PERSON_IMAGE_SUFFIX)[keyof typeof TRIP_PERSON_IMAGE_SUFFIX];

const TAB_SET = new Set<string>(TRIP_PERSON_TABS);

/** Bekende varianten (typfouten / ASCII) → canonieke waarde. */
const ALIASES: Record<string, TripPersonTab> = {
  Noe: "Noë",
  Chloe: "Chloé",
};

export function normalizeTripPerson(
  value: string | null | undefined,
): TripPersonTab {
  const v = String(value ?? "").trim();
  if (v.length === 0) return DEFAULT_TRIP_PERSON_TAB;
  if (TAB_SET.has(v)) return v as TripPersonTab;
  const mapped = ALIASES[v];
  if (mapped) return mapped;
  return DEFAULT_TRIP_PERSON_TAB;
}

/** `null` voor «Samen» of onbekend — dan neutrale / generieke asset. */
export function tripPersonImageSuffix(
  person: TripPersonTab | string | null | undefined,
): TripPersonImageSuffix | null {
  const normalized = normalizeTripPerson(person);
  if (normalized === DEFAULT_TRIP_PERSON_TAB) return null;
  if (normalized in TRIP_PERSON_IMAGE_SUFFIX) {
    return TRIP_PERSON_IMAGE_SUFFIX[
      normalized as keyof typeof TRIP_PERSON_IMAGE_SUFFIX
    ];
  }
  return null;
}
