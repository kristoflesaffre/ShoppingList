/**
 * Vaste lijstjes (canvas «Lijstjes · B uitgewerkt»): blijvende lijstjes zonder winkeldag, zoals kado's
 * per persoon of een to do. Ze staan in `lists` met `listKind: "vast"`; hun items in `items`.
 * «Te kopen» blijft een eigen lijst (`shoppingItems`) en verschijnt als vaste tegel ernaast.
 */

export type VastType = "kado" | "todo" | "anders";

export type VastColorKey = "blauw" | "roze" | "oranje" | "paars" | "groen" | "geel";

/** Basiskleur per tegel (RGB); tegel en detailband worden hieruit gemengd met wit. */
export const VAST_COLORS: Record<VastColorKey, [number, number, number]> = {
  blauw: [79, 85, 241],
  roze: [229, 97, 138],
  oranje: [224, 140, 47],
  paars: [139, 108, 240],
  groen: [47, 163, 107],
  geel: [222, 170, 30],
};

export const VAST_COLOR_KEYS = Object.keys(VAST_COLORS) as VastColorKey[];

/** Illustraties om uit te kiezen (bestaande app-illustraties). */
export const VAST_ICONS = [
  "/images/ui/kado_240.webp",
  "/images/ui/hart_240.webp",
  "/images/ui/meisje_240.webp",
  "/images/ui/jongen_240.webp",
  "/images/ui/man_240.webp",
  "/images/ui/gezin_240.webp",
  "/images/ui/lijstje_240.webp",
  "/images/ui/kopen_240.webp",
  "/images/ui/supermarkt_240.webp",
] as const;

export const VAST_TYPE_META: Record<VastType, { label: string; icon: string; color: VastColorKey; doneLabel: string; itemNoun: string }> = {
  kado: { label: "Kado's", icon: "/images/ui/kado_240.webp", color: "roze", doneLabel: "Gekocht", itemNoun: "idee" },
  todo: { label: "To do", icon: "/images/ui/lijstje_240.webp", color: "groen", doneLabel: "Gedaan", itemNoun: "taak" },
  anders: { label: "Ander lijstje", icon: "/images/ui/kopen_240.webp", color: "paars", doneLabel: "Klaar", itemNoun: "item" },
};

export function isVastList(row: { listKind?: unknown } | null | undefined): boolean {
  return row?.listKind === "vast";
}

export function vastType(row: { vastType?: unknown }): VastType {
  const t = row.vastType;
  return t === "kado" || t === "todo" || t === "anders" ? t : "anders";
}

export function vastColor(row: { colorKey?: unknown; vastType?: unknown }): [number, number, number] {
  const key = row.colorKey;
  if (typeof key === "string" && key in VAST_COLORS) return VAST_COLORS[key as VastColorKey];
  return VAST_COLORS[VAST_TYPE_META[vastType(row)].color];
}

export function vastIcon(row: { icon?: unknown; vastType?: unknown }): string {
  const icon = row.icon;
  return typeof icon === "string" && icon.startsWith("/images/") ? icon : VAST_TYPE_META[vastType(row)].icon;
}

/** Kleur gemengd met wit (0 = wit, 1 = volle kleur). */
export function mixWithWhiteRgb([r, g, b]: [number, number, number], amount: number): string {
  const m = (v: number) => Math.round(255 * (1 - amount) + v * amount);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

/** Donkerdere tint voor tekst op de tegel (cijfer, labels). */
export function deepRgb([r, g, b]: [number, number, number], factor = 0.68): string {
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/** Dagen tot de volgende keer dat de gelegenheid valt (verjaardag: elk jaar). Null zonder datum. */
export function daysUntilEvent(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** «za 24 oktober» voor de volgende keer dat de datum valt. */
export function formatEventDate(iso: string | null | undefined, now: Date = new Date()): string | null {
  const days = daysUntilEvent(iso, now);
  if (days == null) return null;
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return next.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "long" }).replace(".", "");
}

export function daysUntilLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days === 0) return "vandaag";
  if (days === 1) return "morgen";
  return `nog ${days} dagen`;
}

/**
 * Zichtbaar deel van elke illustratie binnen het 240×240-beeld (links, boven, rechts, onder), gemeten
 * op de alfa. Zo krijgt elke illustratie op een tegel dezelfde zichtbare grootte, ook al hebben de
 * bestanden verschillende witruimte (het kado vult het beeld, de ster en het tasje niet).
 */
const ICON_BOXES: Record<string, [number, number, number, number]> = {
  kopen: [41, 14, 206, 221],
  ster: [23, 30, 217, 210],
  kado: [4, 0, 236, 240],
  hart: [13, 41, 228, 215],
  meisje: [24, 35, 216, 215],
  jongen: [48, 18, 190, 222],
  man: [30, 0, 208, 239],
  gezin: [27, 13, 222, 229],
  lijstje: [38, 18, 204, 230],
  supermarkt: [35, 15, 213, 228],
};
/** Onbekende illustratie: ~12% witruimte rondom. */
const DEFAULT_BOX: [number, number, number, number] = [14, 14, 226, 226];

/**
 * Plaatsing van de illustratie op een tegel: het zichtbare deel wordt `size` px (grootste zijde) en
 * steekt `overhang` px voorbij de rechter- en onderrand (wordt door de tegel afgesneden).
 */
export function tileIconPlacement(icon: string, size: number, overhang: number) {
  const key = /\/([a-z]+)_\d+\.webp$/.exec(icon)?.[1] ?? "";
  const [l, t, r, b] = ICON_BOXES[key] ?? DEFAULT_BOX;
  const scale = size / Math.max(r - l, b - t);
  const px = 240 * scale;
  return {
    width: px,
    height: px,
    right: -overhang - (240 - r) * scale,
    bottom: -overhang - (240 - b) * scale,
  };
}
