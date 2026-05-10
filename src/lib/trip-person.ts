/** Landal/vakantie-lijstje: wie het item betreft (tabs + «Wie» in item-formulier). */

export const TRIP_PERSON_TABS = ["Samen", "Kristof", "Chloé", "Noë"] as const;

export type TripPersonTab = (typeof TRIP_PERSON_TABS)[number];

export const DEFAULT_TRIP_PERSON_TAB: TripPersonTab = "Samen";

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
