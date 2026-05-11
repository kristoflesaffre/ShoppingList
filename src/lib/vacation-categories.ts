export const VACATION_CATEGORIES = [
  "Toiletartikelen",
  "Toiletgerief",
  "Kleding",
  "Eten & drinken",
  "Gekoelde eten en drank",
  "Elektronica",
  "Medicijnen",
  "Documenten",
  "Slaapspullen",
  "Activiteiten",
  "Schoonmaak",
  "Andere",
] as const;

export type VacationCategory = (typeof VACATION_CATEGORIES)[number];

/**
 * Sorteert categorie-sectietitels in de vaste VACATION_CATEGORIES volgorde.
 * Onbekende categorieën komen vóór "Andere", "Andere" altijd als laatste.
 */
/** Sectiesleutel of weergavetitel → vakantiecategorie voor het nieuwe-itemformulier. */
export function resolveVacationItemCategoryFromSection(
  sectionTitle: string,
  displayTitle?: string,
): VacationCategory {
  const candidates = [displayTitle, sectionTitle].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  for (const candidate of candidates) {
    const normalized = candidate.split("|")[0]?.trim();
    if (
      normalized &&
      (VACATION_CATEGORIES as readonly string[]).includes(normalized)
    ) {
      return normalized as VacationCategory;
    }
  }
  return "Andere";
}

export function orderVacationCategorySections(keys: string[]): string[] {
  const order = VACATION_CATEGORIES as readonly string[];
  const andereIndex = order.indexOf("Andere");

  return [...keys].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    // Beide bekend → gebruik vaste volgorde
    if (ia !== -1 && ib !== -1) return ia - ib;
    // Alleen a onbekend → vóór "Andere" maar na bekende
    if (ia === -1 && ib !== -1) return ib === andereIndex ? -1 : 1;
    // Alleen b onbekend
    if (ia !== -1 && ib === -1) return ia === andereIndex ? 1 : -1;
    // Beide onbekend → alfabetisch
    return a.localeCompare(b, "nl");
  });
}
