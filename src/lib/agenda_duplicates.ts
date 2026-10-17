/**
 * Dezelfde afspraak twee keer in de agenda: één keer als «hele dag» (bv. uit Smartschool:
 * «[Smartschool] Fruitschildag [AI-…]») en één keer met een uur («🍎 Fruitschildag Noë - …»).
 * Dan tonen we enkel de afspraak met het uur. Een hele-dag-afspraak geldt als dubbel als al haar
 * betekenisvolle woorden ook in een afspraak met uur van dezelfde dag staan. Tekst tussen haakjes,
 * emoji's, leestekens, vulwoorden en uren («09u», «9:30») tellen niet mee, en «paps» = «papa».
 */

const EMOJI = new RegExp(String.raw`[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]`, "gu");
/** Koosnamen die hetzelfde betekenen: «Papa ophalen» = «Paps ophalen». */
const SAME_WORD: Record<string, string> = { paps: "papa", pap: "papa", mams: "mama", mam: "mama" };
const TIME = /\b\d{1,2}(?:[:.h]\d{2}|u\d{0,2}|h)\b/gi;
const STOPWORDS = new Set(["de", "het", "een", "van", "voor", "met", "bij", "en", "op", "in", "aan", "naar", "om", "tot", "the", "and", "for", "with", "at", "to", "of"]);

function words(title: string, dropBrackets: boolean): string[] {
  let t = title.replace(EMOJI, " ").replace(TIME, " ");
  // Ook een afgebroken «[AI-…» zonder sluithaakje.
  if (dropBrackets) t = t.replace(/\[[^\]]*(?:\]|$)/g, " ").replace(/\([^)]*(?:\)|$)/g, " ");
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map((w) => SAME_WORD[w] ?? w);
}

/** Hele-dag-afspraken zonder de exemplaren die ook als afspraak met uur op dezelfde dag staan. */
export function dropAllDayDuplicates<T extends { title: string }>(allDay: readonly T[], timed: readonly { title: string }[]): T[] {
  if (timed.length === 0) return [...allDay];
  const timedWords = timed.map((t) => new Set(words(t.title, false)));
  return allDay.filter((e) => {
    const own = words(e.title, true);
    if (own.length === 0) return true;
    return !timedWords.some((set) => own.every((w) => set.has(w)));
  });
}

/** Zelfde onderwerp? De ene titel zit helemaal in de andere, of ze delen minstens twee woorden. */
function sameTopic(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  if (a.every((w) => sb.has(w)) || b.every((w) => sa.has(w))) return true;
  return new Set(a.filter((w) => sb.has(w))).size >= 2;
}

/**
 * Twee hele-dag-afspraken van dezelfde dag over hetzelfde («PEDAGOGISCHE STUDIEDAG NOE» en
 * «[Smartschool] Pedagogische studiedag – opvang mogelijk [AI-generated]»): één keer. We houden de
 * titel zonder haakjes (meestal zelf ingegeven), anders de eerste. Geef alleen afspraken van één dag mee.
 */
export function mergeAllDayDuplicates<T extends { title: string }>(allDay: readonly T[]): T[] {
  const out: { e: T; w: string[] }[] = [];
  for (const e of allDay) {
    const w = words(e.title, true);
    const match = out.find((k) => sameTopic(k.w, w));
    if (!match) out.push({ e, w });
    else if (/\[/.test(match.e.title) && !/\[/.test(e.title)) {
      match.e = e;
      match.w = w;
    }
  }
  return out.map((k) => k.e);
}
