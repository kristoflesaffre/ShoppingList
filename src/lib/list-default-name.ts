import type { FocusEvent } from "react";

const DUTCH_MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

/**
 * Week binnen de kalendermaand: dagen 1–7 = week 1, 8–14 = week 2, enz.
 * (zoals "April 1" op 2 april.)
 */
export function weekWithinCalendarMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

function capitalizeDutchMonth(month: string): string {
  return month.charAt(0).toUpperCase() + month.slice(1);
}

/** Standaardnaam voor een nieuw lijstje op basis van de winkeldatum, bv. "4 maart". */
export function defaultNewListName(
  date: Date = new Date(),
  _existingNames: string[] = [],
): string {
  return `${date.getDate()} ${DUTCH_MONTHS[date.getMonth()]}`;
}

/** Zet een oude automatische naam zoals "Oktober 1" om naar "1 oktober". */
export function formatDefaultListNameForDisplay(name: string): string {
  const trimmed = name.trim();
  const match = /^(\S+)\s+(\d+)$/i.exec(trimmed);
  if (!match) return name;

  const month = match[1].toLowerCase();
  if (!(DUTCH_MONTHS as readonly string[]).includes(month)) return name;

  return `${Number(match[2])} ${month}`;
}

const FRITUUR_BASE_NAMES = ["Frituur", "Frieten", "Frietjes"] as const;

/**
 * Unieke standaardnaam voor een nieuw frituurlijstje (wizard op `/lijstje/…?frituurWizard=1`).
 * Gebruikt eerst vrije basistrefwoorden, daarna "Frituur 2", "Frituur 3", …
 */
export function defaultFrituurListName(existingNames: string[]): string {
  const lower = new Set(
    existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  for (const base of FRITUUR_BASE_NAMES) {
    if (!lower.has(base.toLowerCase())) return base;
  }
  let n = 2;
  while (lower.has(`frituur ${n}`)) n += 1;
  return `Frituur ${n}`;
}

const CAFE_BASE_NAMES = ["Café", "Cafe"] as const;

/**
 * Unieke standaardnaam voor een nieuw cafélijstje (wizard op `/lijstje/…?cafeWizard=1`).
 */
export function defaultCafeListName(existingNames: string[]): string {
  const lower = new Set(
    existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  for (const base of CAFE_BASE_NAMES) {
    if (!lower.has(base.toLowerCase())) return base;
  }
  let n = 2;
  while (lower.has(`café ${n}`) || lower.has(`cafe ${n}`)) n += 1;
  return `Café ${n}`;
}

/** Unieke standaardnaam voor een nieuw Vakantie-lijstje. */
export function defaultVakantieListName(existingNames: string[]): string {
  const lower = new Set(
    existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  if (!lower.has("vakantie")) return "Vakantie";
  let n = 2;
  while (lower.has(`vakantie ${n}`)) n += 1;
  return `Vakantie ${n}`;
}

/** Unieke standaardnaam voor een nieuw Landal-lijstje. */
export function defaultLandalListName(existingNames: string[]): string {
  const lower = new Set(
    existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  if (!lower.has("landal")) return "Landal";
  let n = 2;
  while (lower.has(`landal ${n}`)) n += 1;
  return `Landal ${n}`;
}

/**
 * Herkent de automatische kalender-naam (`defaultNewListName`) voor weergave als in Figma:
 * maand als titel + weeknummer in een bol (bv. "April" + badge "3").
 * Herkent ook legacy `{Nederlandse maand} week {n}` namen.
 */
export function parseCalendarWeekListTitle(name: string): {
  displayName: string;
  weekBadge: string | null;
} {
  const trimmed = name.trim();
  const m = /^(.+?)\s+week\s+(\d+)\s*$/i.exec(trimmed);
  if (!m) {
    return {
      displayName: formatDefaultListNameForDisplay(name),
      weekBadge: null,
    };
  }
  const monthToken = m[1].trim().toLowerCase();
  if (
    !(DUTCH_MONTHS as readonly string[]).includes(
      monthToken as (typeof DUTCH_MONTHS)[number],
    )
  ) {
    return { displayName: name, weekBadge: null };
  }
  return {
    displayName: capitalizeDutchMonth(monthToken),
    weekBadge: m[2],
  };
}

/** Selecteert de volledige inhoud bij focus (snel vervangen door eigen naam). */
export function selectListNameInputOnFocus(
  e: FocusEvent<HTMLInputElement>,
): void {
  const el = e.currentTarget;
  requestAnimationFrame(() => {
    el?.select();
  });
}
