export type HomeSectionId =
  | "lijstjes"
  | "te-kopen"
  | "favorieten"
  | "kalender"
  | "klantenkaarten"
  | "diepvries"
  | "films-series";

export type HomeSectionConfig = {
  order: HomeSectionId[];
  hidden: HomeSectionId[];
};

export const HOME_SECTIONS_META: {
  id: HomeSectionId;
  label: string;
  illustration: string;
  hideable: boolean;
}[] = [
  { id: "lijstjes", label: "Lijstjes", illustration: "/images/ui/lijstje_320.webp", hideable: false },
  { id: "te-kopen", label: "Te kopen", illustration: "/images/ui/kopen_320.webp", hideable: true },
  { id: "favorieten", label: "Favorieten lijstjes", illustration: "/images/ui/hart_320.webp", hideable: true },
  { id: "kalender", label: "Kalender", illustration: "/images/ui/kalender_320.webp", hideable: true },
  { id: "klantenkaarten", label: "Klantenkaarten", illustration: "/images/ui/klantenkaart_320.webp", hideable: true },
  { id: "diepvries", label: "Voorraad diepvries", illustration: "/images/ui/empty_state_diepvries.png", hideable: true },
  { id: "films-series", label: "Films en series", illustration: "/images/ui/films_320.webp", hideable: true },
];

export const DEFAULT_SECTION_ORDER: HomeSectionId[] = [
  "lijstjes",
  "te-kopen",
  "favorieten",
  "kalender",
  "klantenkaarten",
  "diepvries",
  "films-series",
];

const STORAGE_KEY = "home-section-config";

export function loadHomeSectionConfig(): HomeSectionConfig {
  if (typeof window === "undefined") return { order: DEFAULT_SECTION_ORDER, hidden: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HomeSectionConfig>;
      const savedOrder = (parsed.order ?? DEFAULT_SECTION_ORDER) as HomeSectionId[];
      // Filter verwijderde secties eruit; voeg nieuwe secties toe aan het einde.
      const validSaved = savedOrder.filter((id) => (DEFAULT_SECTION_ORDER as string[]).includes(id));
      const savedSet = new Set(validSaved);
      const newSections = DEFAULT_SECTION_ORDER.filter((id) => !savedSet.has(id));
      return {
        order: [...validSaved, ...newSections],
        hidden: (parsed.hidden ?? []) as HomeSectionId[],
      };
    }
  } catch { /* ignore */ }
  return { order: DEFAULT_SECTION_ORDER, hidden: [] };
}

export function saveHomeSectionConfig(config: HomeSectionConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
