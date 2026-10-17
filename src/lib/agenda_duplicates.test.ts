import { describe, expect, it } from "vitest";
import { dropAllDayDuplicates, mergeAllDayDuplicates } from "./agenda_duplicates";

const t = (title: string) => ({ title });

describe("dropAllDayDuplicates", () => {
  it("hides an all-day event that also exists with a time", () => {
    expect(dropAllDayDuplicates([t("[Smartschool] Fruitschildag [AI-gegenereerd]")], [t("🍎 Fruitschildag Noë - ongeschild fruit meegeven")])).toEqual([]);
    // Afgebroken haakje.
    expect(dropAllDayDuplicates([t("[Smartschool] Fruitschildag [AI-")], [t("Fruitschildag Noë")])).toEqual([]);
  });

  it("ignores times and treats papa/paps as the same", () => {
    expect(dropAllDayDuplicates([t("Papa ophalen 09u Lier")], [t("Paps ophalen lier")])).toEqual([]);
    expect(dropAllDayDuplicates([t("Mams bellen 9:30")], [t("Mama bellen")])).toEqual([]);
    expect(dropAllDayDuplicates([t("Papa ophalen Lier")], [t("Papa nr Magda")])).toEqual([t("Papa ophalen Lier")]);
  });

  it("keeps all-day events that only share a word", () => {
    const allDay = [t("🎂 Bart Machilsen verjaardag"), t("Herfstvakantie")];
    expect(dropAllDayDuplicates(allDay, [t("Verjaardag feest Jan"), t("Fruitschildag")])).toEqual(allDay);
  });

  it("keeps everything without timed events or meaningful words", () => {
    expect(dropAllDayDuplicates([t("Soepdag")], [])).toEqual([t("Soepdag")]);
    expect(dropAllDayDuplicates([t("[Smartschool]")], [t("Smartschool")])).toEqual([t("[Smartschool]")]);
  });
});

describe("mergeAllDayDuplicates", () => {
  it("keeps one of two all-day events about the same thing, preferring the title without brackets", () => {
    expect(mergeAllDayDuplicates([t("[Smartschool] Pedagogische studiedag – opvang mogelijk [AI-generated]"), t("PEDAGOGISCHE STUDIEDAG NOE")])).toEqual([t("PEDAGOGISCHE STUDIEDAG NOE")]);
    expect(mergeAllDayDuplicates([t("Soepdag"), t("[Smartschool] Soepdag [AI-generated]")])).toEqual([t("Soepdag")]);
  });

  it("keeps different all-day events", () => {
    const day = [t("Ribbetjes eten paps"), t("Papa ophalen 09u Lier"), t("Mama gestorven"), t("🚙 @KBC Leuven"), t("Tante Chantale Roosen Bday 🎈")];
    expect(mergeAllDayDuplicates(day)).toEqual(day);
  });
});
