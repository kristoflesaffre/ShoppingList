export type HomeSectionId =
  | "agenda"
  | "todo"
  | "lijstjes"
  | "te-kopen"
  | "kalender"
  | "klantenkaarten"
  | "diepvries"
  | "films-series"
  | "licht";

export type HomeSectionConfig = {
  order: HomeSectionId[];
  hidden: HomeSectionId[];
};

export const HOME_SECTIONS_META: {
  id: HomeSectionId;
  label: string;
  /** Korte uitleg onder het label op «Startpagina aanpassen». */
  description: string;
  /** Achtergrondkleur van de illustratietegel. */
  tint: string;
  illustration: string;
  hideable: boolean;
}[] = [
  { id: "agenda", label: "Agenda", description: "Je Google-afspraken van vandaag", tint: "#eef0ff", illustration: "/images/ui/kalender_320.webp", hideable: true },
  { id: "todo", label: "To-do", description: "Je taken uit Todoist", tint: "#e8f4ec", illustration: "/images/ui/lijstje_320.webp", hideable: true },
  { id: "lijstjes", label: "Lijstjes", description: "Je boodschappenlijstjes", tint: "#f2f2fe", illustration: "/images/ui/lijstje_320.webp", hideable: false },
  { id: "te-kopen", label: "Te kopen", description: "Losse dingen om mee te nemen", tint: "#fdf3df", illustration: "/images/ui/kopen_320.webp", hideable: true },
  { id: "kalender", label: "Kalender", description: "Wat je deze week kookt", tint: "#fdeee3", illustration: "/images/ui/kalender_320.webp", hideable: true },
  { id: "klantenkaarten", label: "Klantenkaarten", description: "Je kaarten altijd bij de hand", tint: "#fdf6d8", illustration: "/images/ui/klantenkaart_320.webp", hideable: true },
  { id: "diepvries", label: "Diepvries", description: "Wat er in je diepvries ligt", tint: "#e5f1fb", illustration: "/images/ui/empty_state_diepvries.png", hideable: true },
  { id: "films-series", label: "Films en series", description: "Je watchlist en wat je kijkt", tint: "#eceef4", illustration: "/images/ui/films_320.webp", hideable: true },
  { id: "licht", label: "Licht", description: "Je Philips Hue-lampen bedienen", tint: "#fff6d9", illustration: "/images/ui/lamp_320.webp", hideable: true },
];

export const DEFAULT_SECTION_ORDER: HomeSectionId[] = [
  "agenda",
  "todo",
  "lijstjes",
  "te-kopen",
  "kalender",
  "klantenkaarten",
  "diepvries",
  "films-series",
  "licht",
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
      // Nieuwe secties komen op hun standaardplek (bv. «Agenda» bovenaan), niet achteraan.
      const order = [...validSaved];
      DEFAULT_SECTION_ORDER.forEach((id, index) => {
        if (savedSet.has(id)) return;
        const before = DEFAULT_SECTION_ORDER.slice(index + 1).find((next) => order.includes(next));
        order.splice(before ? order.indexOf(before) : order.length, 0, id);
      });
      return {
        order,
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
