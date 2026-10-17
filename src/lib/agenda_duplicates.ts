/**
 * Dezelfde afspraak twee keer in de agenda: één keer als «hele dag» (bv. uit Smartschool:
 * «[Smartschool] Fruitschildag [AI-…]») en één keer met een uur («🍎 Fruitschildag Noë - …»).
 * Dan tonen we enkel de afspraak met het uur. Een hele-dag-afspraak geldt als dubbel als al haar
 * betekenisvolle woorden ook in een afspraak met uur van dezelfde dag staan. Tekst tussen haakjes,
 * emoji's, leestekens en vulwoorden tellen niet mee.
 */

const EMOJI = new RegExp(String.raw`[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]`, "gu");
const STOPWORDS = new Set(["de", "het", "een", "van", "voor", "met", "bij", "en", "op", "in", "aan", "naar", "om", "tot", "the", "and", "for", "with", "at", "to", "of"]);

function words(title: string, dropBrackets: boolean): string[] {
  let t = title.replace(EMOJI, " ");
  // Ook een afgebroken «[AI-…» zonder sluithaakje.
  if (dropBrackets) t = t.replace(/\[[^\]]*(?:\]|$)/g, " ").replace(/\([^)]*(?:\)|$)/g, " ");
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
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
