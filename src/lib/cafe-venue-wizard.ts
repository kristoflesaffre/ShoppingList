/**
 * Café-venue catalogus en hulpfuncties (Figma 1321:23139 — tabs + tellerijen).
 */

/** Catalogus-tab (drank staat in één vaste categorie). */
export type CafeWizardCatalogCategory = "koude" | "warme" | "bieren" | "wijn" | "sauzen";

/** Wizard-tabblad: catalogus + aggregaat «Meest gekozen». */
export type CafeWizardCategory = CafeWizardCatalogCategory | "meest";

export type CafeWizardItem = {
  id: string;
  name: string;
  category: CafeWizardCatalogCategory;
  defaultCount: number;
  iconSrc: string;
};

export const CAFE_WIZARD_CATEGORY_LABELS: Record<CafeWizardCategory, string> = {
  meest: "Meest gekozen",
  koude: "Koude dranken",
  warme: "Warme dranken",
  bieren: "Bieren",
  wijn: "Wijn",
  sauzen: "Sauzen",
};

/** Tabvolgorde in de UI: «Meest gekozen» eerst, daarna catalogus. */
export const CAFE_WIZARD_TAB_ORDER: readonly CafeWizardCategory[] = [
  "meest",
  "koude",
  "warme",
  "bieren",
  "wijn",
  "sauzen",
] as const;

/** Tabs voor de wizard: zonder «Meest gekozen» als de gebruiker nog nooit een catalogusdrank koos. */
export function cafeWizardTabOrder(
  showMeestTab: boolean,
): readonly CafeWizardCategory[] {
  return showMeestTab
    ? CAFE_WIZARD_TAB_ORDER
    : CAFE_WIZARD_TAB_ORDER.filter((k) => k !== "meest");
}

/** Standaard eerste rondje; vervolg: `Rondje 2`, `Rondje 3`, … (Figma 1327:25155). */
export const CAFE_ROUND_SECTION_TITLE = "Rondje 1";

const CAFE_ROUND_SECTION_RE = /^Rondje (\d+)$/;

export function isCafeVenueRoundSection(title: string | null | undefined): boolean {
  return CAFE_ROUND_SECTION_RE.test(String(title ?? "").trim());
}

export function parseCafeRoundIndex(title: string | null | undefined): number | null {
  const m = CAFE_ROUND_SECTION_RE.exec(String(title ?? "").trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Hoogste `Rondje N` in de lijst; zonder rondjes → `Rondje 1`. */
export function latestCafeRoundSectionTitle(
  items: readonly { section?: string | null }[],
): string {
  let maxN = 0;
  let maxTitle = CAFE_ROUND_SECTION_TITLE;
  for (const it of items) {
    const s = String(it.section ?? "").trim();
    if (!isCafeVenueRoundSection(s)) continue;
    const n = parseCafeRoundIndex(s);
    if (n != null && n > maxN) {
      maxN = n;
      maxTitle = s;
    }
  }
  return maxTitle;
}

/** Volgend rondje voor een nieuwe bestelling (FAB). */
export function nextCafeRoundSectionTitle(
  items: readonly { section?: string | null }[],
): string {
  const latest = latestCafeRoundSectionTitle(items);
  const n = parseCafeRoundIndex(latest) ?? 1;
  return `Rondje ${n + 1}`;
}

export const CAFE_WIZARD_ITEMS: readonly CafeWizardItem[] = [
  {
    id: "cc",
    name: "Coca cola",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/cola_240.webp",
  },
  {
    id: "ccz",
    name: "Coca cola zero",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/cola_240.webp",
  },
  {
    id: "fanta",
    name: "Fanta",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/appelsien_240.webp",
  },
  {
    id: "fz",
    name: "Fanta zero",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/appelsien_240.webp",
  },
  {
    id: "sprite",
    name: "Sprite",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/limoen_240.webp",
  },
  {
    id: "sz",
    name: "Sprite zero",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/limoen_240.webp",
  },
  {
    id: "water",
    name: "Plat water",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/water_240.webp",
  },
  {
    id: "ice",
    name: "IJsthee",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/theezakje_240.webp",
  },
  {
    id: "energy",
    name: "Energiedrank",
    category: "koude",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/energiedrank_240.webp",
  },
  {
    id: "koffie",
    name: "Koffie",
    category: "warme",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/koffie_240.webp",
  },
  {
    id: "cappu",
    name: "Cappuccino",
    category: "warme",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/koffie_240.webp",
  },
  {
    id: "latte",
    name: "Latte macchiato",
    category: "warme",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/koffieboon_240.webp",
  },
  {
    id: "thee",
    name: "Thee",
    category: "warme",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/theezakje_240.webp",
  },
  {
    id: "choco",
    name: "Chocomelk",
    category: "warme",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/choco_240.webp",
  },
  {
    id: "jup",
    name: "Jupiler",
    category: "bieren",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/bier_240.webp",
  },
  {
    id: "maes",
    name: "Maes",
    category: "bieren",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/bier_240.webp",
  },
  {
    id: "corona",
    name: "Corona",
    category: "bieren",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/bier_240.webp",
  },
  {
    id: "duvel",
    name: "Duvel",
    category: "bieren",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/bier_240.webp",
  },
  {
    id: "wijnRood",
    name: "Rode wijn",
    category: "wijn",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/wijn_rood_240.webp",
  },
  {
    id: "wijnWit",
    name: "Witte wijn",
    category: "wijn",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/wijn_wit_240.webp",
  },
  {
    id: "rose",
    name: "Rosé",
    category: "wijn",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/champagne_240.webp",
  },
  {
    id: "cara",
    name: "Karamel siroop",
    category: "sauzen",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/confituur_240.webp",
  },
  {
    id: "vanille",
    name: "Vanillesiroop",
    category: "sauzen",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/yoghurt_240.webp",
  },
  {
    id: "chocsaus",
    name: "Chocoladesaus",
    category: "sauzen",
    defaultCount: 0,
    iconSrc: "/images/ui/product_icons/chocolade_240.webp",
  },
];

const CAFE_WIZARD_PLACEHOLDER_ICON_URL = "/images/ui/cafe_160.webp";

export function normalizeCafeChoiceName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Sorteer op totaal gekozen (alle café-lijsten van de gebruiker), hoog → laag; gelijk → naam A–Z (nl). */
export function compareCafeWizardItemsByPopularity<
  T extends { name: string },
>(a: T, b: T, counts: ReadonlyMap<string, number>): number {
  const pa = counts.get(normalizeCafeChoiceName(a.name)) ?? 0;
  const pb = counts.get(normalizeCafeChoiceName(b.name)) ?? 0;
  if (pb !== pa) return pb - pa;
  return a.name.localeCompare(b.name, "nl", { sensitivity: "base" });
}

export function cafeItemIconSrc(name: string): string {
  const normalized = normalizeCafeChoiceName(name);
  const hit = CAFE_WIZARD_ITEMS.find(
    (item) => normalizeCafeChoiceName(item.name) === normalized,
  );
  return hit?.iconSrc ?? CAFE_WIZARD_PLACEHOLDER_ICON_URL;
}

export function cafeCategorySectionFromItem(item: {
  name: string;
  section?: string | null;
}): string {
  const fromSection = (item.section ?? "").trim();
  if (isCafeVenueRoundSection(fromSection)) {
    return fromSection;
  }
  if (
    fromSection &&
    (Object.values(CAFE_WIZARD_CATEGORY_LABELS) as string[]).includes(
      fromSection,
    ) &&
    fromSection !== CAFE_WIZARD_CATEGORY_LABELS.meest
  ) {
    return fromSection;
  }
  const normalized = normalizeCafeChoiceName(item.name);
  const wizardItem = CAFE_WIZARD_ITEMS.find(
    (w) => normalizeCafeChoiceName(w.name) === normalized,
  );
  return wizardItem
    ? CAFE_WIZARD_CATEGORY_LABELS[wizardItem.category]
    : CAFE_WIZARD_CATEGORY_LABELS.koude;
}

export function parseCafeQuantityCount(quantity: string): number {
  const n = Number.parseInt(String(quantity ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type CafeWizardSelectedItem = {
  name: string;
  count: number;
  category: CafeWizardCatalogCategory;
};

export function cafeWizardCategoryFromQueryParam(
  value: string | null | undefined,
  showMeestTab: boolean,
): CafeWizardCategory {
  const v = (value ?? "").trim().toLowerCase();
  if (
    showMeestTab &&
    (v === "meest" || v === "meestgekozen" || v === "favoriet")
  ) {
    return "meest";
  }
  if (
    v === "koude" ||
    v === "warme" ||
    v === "bieren" ||
    v === "wijn" ||
    v === "sauzen"
  ) {
    return v;
  }
  return showMeestTab ? "meest" : "koude";
}

export function cafeWizardCategoryFromSectionTitle(
  sectionTitle: string | null | undefined,
  showMeestTab: boolean,
): CafeWizardCategory {
  const t = (sectionTitle ?? "").trim();
  if (isCafeVenueRoundSection(t)) return showMeestTab ? "meest" : "koude";
  const entry = (
    Object.entries(CAFE_WIZARD_CATEGORY_LABELS) as [
      CafeWizardCategory,
      string,
    ][]
  ).find(([key, label]) => key !== "meest" && label === t);
  return entry?.[0] ?? (showMeestTab ? "meest" : "koude");
}

export function buildCafeWizardInitialState(
  existingItems: readonly { name: string; quantity: string }[],
): { counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const w of CAFE_WIZARD_ITEMS) counts[w.id] = 0;

  const byName = new Map(
    CAFE_WIZARD_ITEMS.map((w) => [normalizeCafeChoiceName(w.name), w]),
  );

  for (const existingItem of existingItems) {
    const w = byName.get(normalizeCafeChoiceName(existingItem.name));
    if (!w) continue;
    counts[w.id] =
      (counts[w.id] ?? 0) + parseCafeQuantityCount(existingItem.quantity);
  }

  return { counts };
}
