/**
 * Home-kaart / lijstbeheer: Landal-lijstjes tonen «Vrienden – 13 items» i.p.v. «13 producten».
 */

/**
 * Vast Landal-huisicoon op lijstkaarten en in instellingen.
 * Gezin/Vrienden staat alleen in `landalTripLabel` (ondertitel), niet in `customIconUrl`.
 */
export const LANDAL_LIST_CARD_ICON_URL = "/images/ui/landal_160.webp";

/** Legacy: ooit gebruikt om icoon per trip te zetten; niet meer voor kaarten. */
export const LANDAL_TRIP_CUSTOM_ICON = {
  Gezin: "/images/ui/gezin_160.webp",
  Vrienden: "/images/ui/vrienden_160.webp",
} as const;

export type LandalTripChoice = keyof typeof LANDAL_TRIP_CUSTOM_ICON;

export type LandalListCardInput = {
  name?: string | null;
  customIconUrl?: string | null;
  landalTripLabel?: string | null;
};

/** Landal- of Landal-subtype (gezin/vrienden) op basis van het lijsticoon. */
export function isLandalListCard(customIconUrl: string | null | undefined): boolean {
  const u = String(customIconUrl ?? "").toLowerCase();
  return (
    u.includes("landal") ||
    u.includes("/gezin_") ||
    u.includes("/vrienden_") ||
    u.includes("gezin_160") ||
    u.includes("vrienden_160")
  );
}

/**
 * Trip-label (Gezin / Vrienden) voor subtitel. Volgorde: DB-veld → icoon-URL → naam «Landal … Gezin».
 * Legacy-lijsten (andere naam, generiek landal-icoon): standaard **Vrienden** (niet «Landal»).
 */
export function inferLandalTripLabel(list: LandalListCardInput): string {
  const explicit = String(list.landalTripLabel ?? "").trim();
  if (explicit) return explicit;

  const u = String(list.customIconUrl ?? "").toLowerCase();
  if (u.includes("/gezin_") || u.includes("gezin_160")) return "Gezin";
  if (u.includes("/vrienden_") || u.includes("vrienden_160")) return "Vrienden";

  const n = String(list.name ?? "").trim();
  const m = n.match(/^Landal(?:\s+\d+)?\s+(Gezin|Vrienden)$/i);
  if (m?.[1]) {
    const w = m[1];
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  if (/\bgezin\b/i.test(n) && !/\bvrienden\b/i.test(n)) return "Gezin";
  if (/\bvrienden\b/i.test(n)) return "Vrienden";
  return "Vrienden";
}

/** Subtitelregel onder de lijstnaam (en-dash). */
export function landalListSubtitle(itemCount: number, tripLabel: string): string {
  const itemsWord = itemCount === 1 ? "item" : "items";
  return `${tripLabel} – ${itemCount} ${itemsWord}`;
}

export type HomeListCardCountInput = LandalListCardInput & {
  displayVariant: "default" | "shared" | "master" | "from-master";
  items?: { id: string }[] | null;
};

/** Ondertitel voor ListCard: favorieten / Landal-trip / standaard producttelling. */
export function homeListCardItemCountLine(list: HomeListCardCountInput): string {
  const n = list.items?.length ?? 0;
  if (list.displayVariant === "master") {
    return n === 1 ? "1 favoriet" : `${n} favorieten`;
  }
  if (isLandalListCard(list.customIconUrl)) {
    return landalListSubtitle(n, inferLandalTripLabel(list));
  }
  return n === 1 ? "1 product" : `${n} producten`;
}
