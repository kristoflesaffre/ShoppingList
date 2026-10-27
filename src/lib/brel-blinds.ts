/** BREL Home Hub blinds, as reported by the local Mac bridge. `position` follows the hub: 0 = open, 100 = closed. */
export type Blind = { mac: string; name: string; available: boolean; position: number | null; moving: boolean; battery: number | null };
export type BlindsStatus = { configured: boolean; blinds: Blind[] };
export type BlindCommand = "open" | "stop" | "close";
export type BlindRequest =
  | { action: "status" }
  | { action: BlindCommand; blind: string }
  | { action: "position"; blind: string; position: number };

/** Accepts only these exact shapes, so nothing else can reach the Python runner's arguments. */
export function blindRequest(value: unknown): BlindRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data).sort().join(",");
  if (data.action === "status") return keys === "action" ? { action: "status" } : null;
  if (typeof data.blind !== "string" || !/^[0-9a-f]{16}$/.test(data.blind)) return null;
  if (data.action === "open" || data.action === "stop" || data.action === "close") return keys === "action,blind" ? { action: data.action, blind: data.blind } : null;
  if (data.action === "position" && keys === "action,blind,position" && Number.isInteger(data.position) && (data.position as number) >= 0 && (data.position as number) <= 100)
    return { action: "position", blind: data.blind, position: data.position as number };
  return null;
}

/** Percentage open, as people say it ("half open"), from the hub's closed percentage. */
export function openPercent(blind: Blind) {
  return blind.position == null ? null : 100 - blind.position;
}

export function blindLabel(blind: Blind) {
  const open = openPercent(blind);
  if (!blind.available || open == null) return "Niet bereikbaar";
  if (blind.moving) return "Beweegt…";
  return open >= 98 ? "Open" : open <= 2 ? "Dicht" : `${open}% open`;
}
