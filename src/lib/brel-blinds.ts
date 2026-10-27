/**
 * BREL Home Hub blinds, as reported by the local Mac bridge. `position` follows the hub: 0 = open, 100 = closed.
 * `angle` is the slat tilt the hub works out from the motor (0–180, no sensor on the slats).
 */
export type Blind = { mac: string; name: string; available: boolean; position: number | null; angle: number | null; moving: boolean; battery: number | null };
export type BlindsStatus = { configured: boolean; blinds: Blind[] };
export type BlindCommand = "open" | "stop" | "close";
export type BlindRequest =
  | { action: "status" }
  | { action: BlindCommand; blind: string }
  | { action: "position"; blind: string; position: number }
  | { action: "tilt"; blind: string; angle: number };

/** Slats turn through 180°: horizontal (90) lets the light in, both ends (0 and 180) stand vertical and block it. */
export const SLATS_OPEN_ANGLE = 90;
/** Checked in the room 2026-10-27: 180 leans the slats down (\\\ in the app), 0 the other way round. */
export const SLATS_CLOSED_ANGLE = 180;
export const SLATS_CLOSED_UP_ANGLE = 0;

/** Slats closed upwards ("up", 0), horizontal ("open", 90) or closed downwards ("down", 180). */
export type Slats = "up" | "open" | "down";
export const SLATS_ANGLE: Record<Slats, number> = { up: SLATS_CLOSED_UP_ANGLE, open: SLATS_OPEN_ANGLE, down: SLATS_CLOSED_ANGLE };

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
  if (data.action === "tilt" && keys === "action,angle,blind" && Number.isInteger(data.angle) && (data.angle as number) >= 0 && (data.angle as number) <= 180)
    return { action: "tilt", blind: data.blind, angle: data.angle as number };
  return null;
}

/** Percentage open, as people say it ("half open"), from the hub's closed percentage. */
export function openPercent(blind: Blind) {
  return blind.position == null ? null : 100 - blind.position;
}

/** Slats open (closer to horizontal than to vertical), closed, or unknown when the hub reports no angle. */
export function slatsOpen(blind: Blind) {
  return blind.angle == null ? null : Math.abs(blind.angle - SLATS_OPEN_ANGLE) <= 45;
}

/** Which of the three slat positions the reported angle is closest to; null when the hub reports no angle. */
export function slatsState(blind: Blind): Slats | null {
  if (blind.angle == null) return null;
  return slatsOpen(blind) ? "open" : blind.angle > SLATS_OPEN_ANGLE ? "down" : "up";
}

export function blindLabel(blind: Blind) {
  const open = openPercent(blind);
  if (!blind.available || open == null) return "Niet bereikbaar";
  if (blind.moving) return "Beweegt…";
  return open >= 98 ? "Open" : open <= 2 ? "Dicht" : `${open}% open`;
}
