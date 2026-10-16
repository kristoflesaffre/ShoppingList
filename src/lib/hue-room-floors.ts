import { splitRoomName } from "@/lib/hue-room-name";

/**
 * Op welke verdieping een Hue-kamer ligt (Hue zelf kent geen verdiepingen). Volgorde van bepalen:
 * 1. wat je zelf koos in het lichtvenster («Indeling», bewaard op dit toestel);
 * 2. een verdiepingswoord in de naam («… eerste verdieping», «Gang beneden»);
 * 3. de standaardindeling van ons huis (onderaan);
 * 4. anders «Andere kamers».
 */
export type FloorKey = "g" | "1" | "2" | "up" | "other";

/** `short`: voor de smalle keuzelijst onder een kolom. */
export const FLOORS: { key: FloorKey; label: string; short: string }[] = [
  { key: "g", label: "Gelijkvloers", short: "Gelijkvl." },
  { key: "1", label: "Eerste verdieping", short: "1e verd." },
  { key: "2", label: "Tweede verdieping", short: "2e verd." },
  { key: "up", label: "Boven", short: "Boven" },
  { key: "other", label: "Andere kamers", short: "Andere" },
];

/** Standaardindeling (zoals Kristof ze opgaf); wat je in het venster kiest gaat altijd voor. */
const HOUSE_DEFAULTS: { match: RegExp; floor: FloorKey }[] = [
  { match: /\b(bureau|woonkamer|living|keuken|eetkamer)\b/i, floor: "g" },
  { match: /\bgastenkamer\b|\btv[\s-]?kamer\b/i, floor: "1" },
  { match: /\b(slaapkamer|kinderkamer|hobbykamer|hobby)\b|no[eë]/i, floor: "2" },
];

export function defaultFloor(name: string): FloorKey {
  const badge = splitRoomName(name).badge;
  if (badge?.kind === "down") return "g";
  if (badge?.kind === "up") return "up";
  if (badge?.kind === "number") {
    if (badge.value === "0") return "g";
    if (badge.value === "1" || badge.value === "2") return badge.value;
  }
  return HOUSE_DEFAULTS.find((d) => d.match.test(name))?.floor ?? "other";
}

const STORAGE_KEY = "hue-room-floors";

export function readFloorOverrides(): Record<string, FloorKey> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
    const keys = new Set(FLOORS.map((f) => f.key as string));
    return Object.fromEntries(Object.entries(raw).filter(([, v]) => keys.has(v))) as Record<string, FloorKey>;
  } catch {
    return {};
  }
}

export function writeFloorOverrides(map: Record<string, FloorKey>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* niet bewaard; geldt dan alleen tot herladen */
  }
}
