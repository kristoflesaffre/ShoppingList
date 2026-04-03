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

/** Standaardnaam voor een nieuw lijstje, bv. "Maart week 4". */
export function defaultNewListName(date: Date = new Date()): string {
  const month = capitalizeDutchMonth(DUTCH_MONTHS[date.getMonth()]);
  const week = weekWithinCalendarMonth(date);
  return `${month} week ${week}`;
}

/** Selecteert de volledige inhoud bij focus (snel vervangen door eigen naam). */
export function selectListNameInputOnFocus(
  e: FocusEvent<HTMLInputElement>,
): void {
  requestAnimationFrame(() => {
    e.currentTarget.select();
  });
}
