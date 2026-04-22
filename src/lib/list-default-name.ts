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
 * (zoals “April week 1” op 2 april.)
 */
export function weekWithinCalendarMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

function capitalizeDutchMonth(month: string): string {
  return month.charAt(0).toUpperCase() + month.slice(1);
}

/**
 * Standaardnaam voor een nieuw lijstje, bv. "Maart week 4".
 * Als `existingNames` opgegeven is, wordt een uniek volgnummer gekozen:
 * het aantal bestaande kalender-lijstjes van dezelfde maand + 1.
 */
export function defaultNewListName(
  date: Date = new Date(),
  existingNames: string[] = [],
): string {
  const month = capitalizeDutchMonth(DUTCH_MONTHS[date.getMonth()]);

  if (existingNames.length === 0) {
    const week = weekWithinCalendarMonth(date);
    return `${month} week ${week}`;
  }

  // Tel bestaande kalender-lijstjes van deze maand (elk patroon "{maand} week {n}").
  const monthPattern = new RegExp(
    `^${month}\\s+week\\s+\\d+\\s*$`,
    "i",
  );
  const existingCount = existingNames.filter((n) =>
    monthPattern.test(n.trim()),
  ).length;

  return `${month} week ${existingCount + 1}`;
}

/**
 * Herkent de automatische kalender-naam (`defaultNewListName`) voor weergave als in Figma:
 * maand als titel + weeknummer in een bol (bv. "April" + badge "3").
 * Alleen exact het patroon `{Nederlandse maand} week {n}` (na trim) wordt gesplitst.
 */
export function parseCalendarWeekListTitle(name: string): {
  displayName: string;
  weekBadge: string | null;
} {
  const trimmed = name.trim();
  const m = /^(.+?)\s+week\s+(\d+)\s*$/i.exec(trimmed);
  if (!m) {
    return { displayName: name, weekBadge: null };
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
  requestAnimationFrame(() => {
    e.currentTarget.select();
  });
}
