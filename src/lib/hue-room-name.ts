/**
 * Kamernaam voor het lichtpaneel: wat achteraan de verdieping aanduidt, gaat naar een bolletje op de
 * capsule zodat de naam kort blijft.
 * - «Badkamer eerste verdieping» / «Badkamer 1e verdieping» / «Badkamer 1» → «Badkamer» + «1»
 * - «Gang boven» / «Gang bovenverdieping» → «Gang» + pijl omhoog; «Gang beneden» / «gelijkvloers» → pijl omlaag
 */
export type RoomBadge = { kind: "number"; value: string } | { kind: "up" } | { kind: "down" };

const ORDINALS: Record<string, string> = { eerste: "1", tweede: "2", derde: "3", vierde: "4" };

const FLOOR = new RegExp(
  String.raw`^(.*?)[\s,–-]*(?:\(?\s*)?(?:(eerste|tweede|derde|vierde|(\d{1,2})\s*(?:e|ste|de))\s+(?:verdieping|verd\.?)|(?:verdieping|verd\.?)\s*(\d{1,2}))\s*\)?$`,
  "i",
);
const UP = /^(.*?)[\s,–-]*\(?\s*(?:boven(?:verdieping)?|zolder)\s*\)?$/i;
const DOWN = /^(.*?)[\s,–-]*\(?\s*(?:beneden(?:verdieping)?|onder|gelijkvloers|benedenhuis)\s*\)?$/i;
const NUMBER = /^(.*?)\s*\(?(\d{1,2})\)?$/;

export function splitRoomName(name: string): { base: string; badge: RoomBadge | null } {
  const n = name.trim();
  const keep = (base: string | undefined) => (base ?? "").replace(/[\s,(–-]+$/, "");
  let m = FLOOR.exec(n);
  if (m && keep(m[1]).length > 1) {
    const value = m[2] && ORDINALS[m[2].toLowerCase()] ? ORDINALS[m[2].toLowerCase()] : (m[3] ?? m[4]);
    return { base: keep(m[1]), badge: { kind: "number", value } };
  }
  m = UP.exec(n);
  if (m && keep(m[1]).length > 1) return { base: keep(m[1]), badge: { kind: "up" } };
  m = DOWN.exec(n);
  if (m && keep(m[1]).length > 1) return { base: keep(m[1]), badge: { kind: "down" } };
  m = NUMBER.exec(n);
  if (m && keep(m[1]).length > 1) return { base: keep(m[1]), badge: { kind: "number", value: m[2] } };
  return { base: name, badge: null };
}

const ORDINAL_LABELS: Record<string, string> = { "1": "Eerste", "2": "Tweede", "3": "Derde", "4": "Vierde" };

/**
 * Verdieping-groep voor het lichtvenster, afgeleid uit het bolletje: «beneden» eerst, dan de genummerde
 * verdiepingen, dan «boven», en tot slot kamers zonder verdieping.
 */
export function floorGroup(badge: RoomBadge | null): { key: string; label: string; order: number } {
  if (!badge) return { key: "other", label: "Andere kamers", order: 1000 };
  if (badge.kind === "down") return { key: "down", label: "Beneden", order: 0 };
  if (badge.kind === "up") return { key: "up", label: "Boven", order: 500 };
  const n = Number(badge.value);
  return { key: `f${n}`, label: `${ORDINAL_LABELS[badge.value] ?? `${n}e`} verdieping`, order: 10 + n };
}
