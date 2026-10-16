/** «Badkamer 1» / «Badkamer (2)» → naam «Badkamer» + nummer apart (getoond als bolletje op de capsule). */
export function splitRoomNumber(name: string): { base: string; number: string | null } {
  const m = /^(.*?)\s*\(?(\d{1,2})\)?$/.exec(name.trim());
  const base = m?.[1].replace(/[\s(]+$/, "") ?? "";
  return m && base.length > 1 ? { base, number: m[2] } : { base: name, number: null };
}
