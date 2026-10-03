import { parseDutchDate, toIsoDate } from "@/lib/calendar-utils";

/**
 * Winkeldag van een lijstje. Het bestaande veld `lists.date` ("D-M-YYYY", zoals
 * `toLocaleDateString("nl-NL")`) is vanaf nu de geplande winkeldag: standaard vandaag,
 * aanpasbaar bij het aanmaken. Oudere lijstjes hebben daar hun aanmaakdatum staan.
 */

export function todayIsoDate(now: Date = new Date()): string {
  return toIsoDate(now);
}

/** "2026-10-04" → "4-10-2026" (zelfde vorm als `toLocaleDateString("nl-NL")`). */
export function isoToListDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date().toLocaleDateString("nl-NL");
  return `${d}-${m}-${y}`;
}

/** "4-10-2026" → "2026-10-04"; null als het geen geldige datum is. */
export function listDateToIso(listDate: string | null | undefined): string | null {
  const parsed = parseDutchDate(listDate ?? "");
  return parsed ? toIsoDate(parsed) : null;
}

/** Afgerond = de winkeldag ligt vóór vandaag. Zonder geldige datum: niet afgerond. */
export function isListDatePassed(listDate: string | null | undefined, now: Date = new Date()): boolean {
  const iso = listDateToIso(listDate);
  if (!iso) return false;
  return iso < todayIsoDate(now);
}
