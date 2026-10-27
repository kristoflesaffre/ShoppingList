import { createHash, randomUUID } from "node:crypto";
import { getInstantAdminDb } from "./instant-admin";
import { cinemaTarget } from "../stremio";

export const COMMAND_TTL = 30_000;
export const BRIDGE_FRESHNESS = 45_000;
export type Bridge = { id: string; ownerId: string; tokenHash: string; enabled: boolean; lastSeenAt: number; reportedState: string };
export type RelayCommand = { id: string; bridgeId: string; action: string; createdAt: number; expiresAt: number; state: string; error?: string };
type Lock = { id: string; key: string; commandId: string; expiresAt: number };
export function bridgeTokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export const bridgeOnline = (bridge: Bridge, now = Date.now()) => bridge.enabled && bridge.lastSeenAt > now - BRIDGE_FRESHNESS && bridge.lastSeenAt <= now + 5000;
export function relayResult(command: RelayCommand, now = Date.now()) {
  if (command.state === "sent") return { configured: true, accepted: true, isOn: null, pending: false };
  if (command.state === "failed") return { configured: true, accepted: false, pending: false, error: "relay-failed", detail: command.error };
  if (command.expiresAt <= now) return { configured: true, accepted: false, pending: false, error: command.state === "claimed" ? "relay-uncertain" : "relay-expired" };
  return { configured: true, accepted: false, pending: true, commandId: command.id };
}
export function commandDispatchable(command: RelayCommand, bridgeId: string, now = Date.now()) {
  return command.bridgeId === bridgeId && command.state === "pending" && command.createdAt <= now && command.expiresAt > now && (["on", "off", "cinema"].includes(command.action) || cinemaTarget(command.action) !== null);
}
function database() {
  const db = getInstantAdminDb();
  if (!db) throw new Error("relay-unavailable");
  return db;
}
export async function ownerBridge(ownerId: string): Promise<Bridge | null> {
  if (!getInstantAdminDb()) return null;
  const data = await database().query({ projectorBridges: { $: { where: { ownerId }, limit: 1 } } });
  return (data.projectorBridges[0] as Bridge | undefined) ?? null;
}
export async function tokenBridge(header: string | null): Promise<Bridge | null> {
  const token = /^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(header ?? "")?.[1];
  if (!token) return null;
  const data = await database().query({ projectorBridges: { $: { where: { tokenHash: bridgeTokenHash(token), enabled: true }, limit: 1 } } });
  return (data.projectorBridges[0] as Bridge | undefined) ?? null;
}
export async function relayCommand(id: string): Promise<RelayCommand | null> {
  const data = await database().query({ projectorCommands: { $: { where: { id }, limit: 1 } } });
  return (data.projectorCommands[0] as RelayCommand | undefined) ?? null;
}
async function lockFor(key: string): Promise<Lock | undefined> {
  const data = await database().query({ projectorLocks: { $: { where: { key }, limit: 1 } } });
  return data.projectorLocks[0] as Lock | undefined;
}
export async function enqueueProjector(bridge: Bridge, action: string): Promise<RelayCommand | null> {
  if (!["on", "off", "cinema"].includes(action) && !cinemaTarget(action)) throw new Error("invalid-command");
  const now = Date.now();
  const db = database();
  const active = await lockFor(`active:${bridge.id}`);
  if (active && active.expiresAt > now) {
    const previous = await relayCommand(active.commandId);
    if (!previous || !["sent", "failed"].includes(previous.state)) return null;
  }
  if (active) await db.transact(db.tx.projectorLocks[active.id].delete());
  const command: RelayCommand = { id: randomUUID(), bridgeId: bridge.id, action, createdAt: now, expiresAt: now + (action === "cinema" || cinemaTarget(action) ? 180_000 : COMMAND_TTL), state: "pending" };
  try {
    // A unique active key also serializes concurrent requests in different server instances.
    await db.transact([
      db.tx.projectorCommands[command.id].create(command),
      db.tx.projectorLocks[randomUUID()].create({ key: `active:${bridge.id}`, commandId: command.id, expiresAt: command.expiresAt }),
    ]);
    return command;
  } catch { return null; }
}
export async function pollProjector(bridge: Bridge, state: string) {
  const db = database();
  const now = Date.now();
  if (now - bridge.lastSeenAt >= 15_000 || state !== bridge.reportedState) {
    await db.transact(db.tx.projectorBridges[bridge.id].update({ lastSeenAt: now, reportedState: state }));
  }
  const active = await lockFor(`active:${bridge.id}`);
  if (!active || active.expiresAt <= now) return { id: "idle", action: "none", expiresAt: 0 };
  const command = await relayCommand(active.commandId);
  if (!command || !commandDispatchable(command, bridge.id, now)) return { id: "idle", action: "none", expiresAt: 0 };
  return { id: command.id, action: command.action, expiresAt: command.expiresAt };
}
export async function claimProjector(bridge: Bridge, id: string): Promise<boolean> {
  const command = await relayCommand(id);
  if (!command || !commandDispatchable(command, bridge.id)) return false;
  const db = database();
  try {
    // This receipt must be committed before the Pi sends a physical command.
    // A lost HTTP response means no dispatch, not an automatic retry.
    await db.transact([
      db.tx.projectorLocks[randomUUID()].create({ key: `claim:${id}`, commandId: id, expiresAt: Date.now() + 86_400_000 }),
      db.tx.projectorCommands[id].update({ state: "claimed" }),
    ]);
    return true;
  } catch { return false; }
}
export async function completeProjector(bridge: Bridge, id: string, ok: boolean): Promise<boolean> {
  const command = await relayCommand(id);
  if (!command || command.bridgeId !== bridge.id || command.state !== "claimed") return false;
  const active = await lockFor(`active:${bridge.id}`);
  const db = database();
  await db.transact([
    db.tx.projectorCommands[id].update({ state: ok ? "sent" : "failed" }),
    ...(active?.commandId === id ? [db.tx.projectorLocks[active.id].delete()] : []),
  ]);
  return true;
}
