/**
 * Verjaardagen in de agenda: «Bart Machilse bday 🎈», «Bart Machilsen verjaardag» en
 * «Bart Machilsen Bday» zijn dezelfde verjaardag. We herkennen de synoniemen (NL + EN), halen de
 * naam eruit, tonen ze één keer als «🎂 Bart Machilsen verjaardag» en laten emoji's weg.
 */

import { agendaEventIcon, isDeathRemembrance } from "./agenda_event_icons";

// Via `new RegExp`: de `u`-vlag mag niet als letterlijke regex bij het huidige TypeScript-target.
const BIRTHDAY_WORD = new RegExp(
  String.raw`\b(?:happy\s+)?(?:b-?days?|birth-?days?|bdays?|verjaardag(?:sfeest(?:je)?|je)?|verjaart|jarig)\b`,
  "giu",
);
const EMOJI = new RegExp(String.raw`[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]`, "gu");
const POSSESSIVE = new RegExp(String.raw`(\p{L})['’]s?(?=\s|$)`, "gu");

/** Naam uit een verjaardagstitel, of `null` als het geen verjaardag is. «verjaardag» zonder naam = "". */
export function birthdayName(title: string): string | null {
  const clean = title.replace(EMOJI, " ");
  if (!clean.match(BIRTHDAY_WORD) || isDeathRemembrance(clean)) return null;
  let name = clean.replace(BIRTHDAY_WORD, " ");
  name = name
    .replace(/\b(?:van|of|from)\b/gi, " ")
    // «Ivo Peeters's birthday» / «Peeters' bday» → zonder bezittelijke 's.
    .replace(POSSESSIVE, "$1")
    .replace(/[()[\]{}:;,.!?\-–—_/|*#"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name;
}

/** «🎂 Naam verjaardag» (of «🎂 Verjaardag» zonder naam). */
function birthdayTitle(name: string): string {
  return name ? `🎂 ${name} verjaardag` : "🎂 Verjaardag";
}

/**
 * Weergave van een agendatitel: verjaardagen als «🎂 Naam verjaardag», andere herkende soorten met
 * hun emoji vooraan (zie `agenda_event_icons`), de rest ongewijzigd.
 */
export function agendaDisplayTitle(title: string): string {
  const name = birthdayName(title);
  if (name !== null) return birthdayTitle(name);
  return agendaEventIcon(title)?.title ?? title;
}

function normName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Zelfde persoon? Identiek, of een kleine tikfout («Machilse» / «Machilsen»). */
function sameBirthday(a: string, b: string): boolean {
  const x = normName(a);
  const y = normName(b);
  if (x === y) return true;
  if (!x || !y) return false;
  const short = Math.min(x.length, y.length);
  return short >= 6 && editDistance(x, y) <= (short >= 12 ? 2 : 1);
}

/**
 * Houdt elke verjaardag maar één keer over (de eerste), met de langste schrijfwijze van de naam
 * als weergavetitel. Andere afspraken blijven ongewijzigd, in dezelfde volgorde.
 */
export function dedupeBirthdays<T extends { title: string }>(events: readonly T[]): T[] {
  const out: T[] = [];
  const kept: { index: number; name: string }[] = [];
  for (const e of events) {
    const name = birthdayName(e.title);
    if (name === null) {
      out.push(e);
      continue;
    }
    const match = kept.find((k) => sameBirthday(k.name, name));
    if (match) {
      if (name.length > match.name.length) {
        match.name = name;
        out[match.index] = { ...out[match.index], title: birthdayTitle(name) };
      }
      continue;
    }
    kept.push({ index: out.length, name });
    out.push({ ...e, title: birthdayTitle(name) });
  }
  return out;
}
