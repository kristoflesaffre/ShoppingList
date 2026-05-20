import vacationItemCategories from "@/lib/data/vacation_item_categories.json";

export const VACATION_CATEGORIES = [
  "Te regelen",
  "Toiletartikelen",
  "Kleding",
  "Eten & drinken",
  "Gekoelde eten en drank",
  "Elektronica",
  "Slaapspullen",
  "Andere",
] as const;

export type VacationCategory = (typeof VACATION_CATEGORIES)[number];

const VACATION_ANDERE: VacationCategory = "Andere";
const VACATION_PRE_DEPARTURE: VacationCategory = "Te regelen";

const VACATION_PRE_DEPARTURE_NAMES = new Set([
  "kat verzorgen",
  "puddy verzorgen",
  "planten water geven",
  "vaccinatie regelen",
  "paspoort regelen",
  "kids id regelen",
  "autovignet aanvragen",
  "auto opladen/voltanken",
  "bandenspanning controleren",
  "ev-route plannen",
  "laadpas regelen",
  "medicatievoorraad aanvullen",
  "huissleutel afgeven",
  "tablet opladen",
  "medicatie reisziekte innemen",
  "boardingpassen downloaden",
  "vervoer luchthaven regelen",
]);

type VacationCategoriesFile = {
  categoryOrder: string[];
  itemToCategory: Record<string, string>;
  slugToCategory: Record<string, string>;
};

const data = vacationItemCategories as VacationCategoriesFile;

function isVacationCategory(value: string): value is VacationCategory {
  return (VACATION_CATEGORIES as readonly string[]).includes(value);
}

/** Zelfde normalisatie als `sync-vacation-categories.mjs` / ingredient-sync. */
function normalizeVacationItemKey(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function slugKeyFromName(name: string): string {
  return normalizeVacationItemKey(name).replace(/\s/g, "_");
}

function lookupKeysForName(name: string): string[] {
  const n = normalizeVacationItemKey(name);
  const keys = new Set<string>();
  if (n) {
    keys.add(n);
    keys.add(n.replace(/\s/g, "_"));
  }
  const slug = slugKeyFromName(name);
  if (slug) keys.add(slug);
  return Array.from(keys);
}

function categoryFromJsonMaps(name: string): VacationCategory | null {
  for (const k of lookupKeysForName(name)) {
    const fromLabel = data.itemToCategory[k]?.trim();
    if (fromLabel && isVacationCategory(fromLabel)) return fromLabel;
    const fromSlug = data.slugToCategory[k]?.trim();
    if (fromSlug && isVacationCategory(fromSlug)) return fromSlug;
  }
  return null;
}

/**
 * Vakantiecategorie uit Excel-export (`vakantie_items.xlsx` → `npm run sync:vacation-categories`).
 */
export function resolveVacationCategoryFromName(name: string): VacationCategory {
  if (VACATION_PRE_DEPARTURE_NAMES.has(normalizeVacationItemKey(name))) {
    return VACATION_PRE_DEPARTURE;
  }
  return categoryFromJsonMaps(name) ?? VACATION_ANDERE;
}

export function effectiveVacationItemCategory(item: {
  name: string;
  itemCategory?: string | null;
}): VacationCategory {
  const stored =
    typeof item.itemCategory === "string" ? item.itemCategory.trim() : "";
  if (stored.length > 0 && isVacationCategory(stored)) return stored;
  return resolveVacationCategoryFromName(item.name);
}

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
    if (normalized && isVacationCategory(normalized)) {
      return normalized;
    }
  }
  return VACATION_ANDERE;
}

export function orderVacationCategorySections(keys: string[]): string[] {
  const order = VACATION_CATEGORIES as readonly string[];
  const andereIndex = order.indexOf(VACATION_ANDERE);

  return [...keys].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia === -1 && ib !== -1) return ib === andereIndex ? -1 : 1;
    if (ia !== -1 && ib === -1) return ia === andereIndex ? 1 : -1;
    return a.localeCompare(b, "nl");
  });
}
