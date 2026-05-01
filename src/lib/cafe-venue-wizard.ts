/**
 * Café-venue catalogus en hulpfuncties (Figma 1321:23139 — tabs + tellerijen).
 */

export type CafeWizardCategory = "koude" | "warme" | "bieren" | "wijn" | "sauzen";

export type CafeWizardItem = {
  id: string;
  name: string;
  category: CafeWizardCategory;
  defaultCount: number;
  iconSrc: string;
};

export const CAFE_WIZARD_CATEGORY_LABELS: Record<CafeWizardCategory, string> = {
  koude: "Koude dranken",
  warme: "Warme dranken",
  bieren: "Bieren",
  wijn: "Wijn",
  sauzen: "Sauzen",
};

/** Na «Gereed» in de wizard: alle regels onder één kop (Figma 1321:22930). */
export const CAFE_ROUND_SECTION_TITLE = "Rondje 1";

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
  if (fromSection === CAFE_ROUND_SECTION_TITLE) {
    return CAFE_ROUND_SECTION_TITLE;
  }
  if (
    fromSection &&
    Object.values(CAFE_WIZARD_CATEGORY_LABELS).includes(fromSection)
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
  category: CafeWizardCategory;
};

export function cafeWizardCategoryFromQueryParam(
  value: string | null | undefined,
): CafeWizardCategory {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "warme" || v === "bieren" || v === "wijn" || v === "sauzen") {
    return v;
  }
  return "koude";
}

export function cafeWizardCategoryFromSectionTitle(
  sectionTitle: string | null | undefined,
): CafeWizardCategory {
  const t = (sectionTitle ?? "").trim();
  if (t === CAFE_ROUND_SECTION_TITLE) return "koude";
  const entry = (
    Object.entries(CAFE_WIZARD_CATEGORY_LABELS) as [
      CafeWizardCategory,
      string,
    ][]
  ).find(([, label]) => label === t);
  return entry?.[0] ?? "koude";
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
