import { getInstantAdminDb } from "@/lib/server/instant-admin";
import { panasonicConnectionId, sealPanasonic, unsealPanasonic } from "./panasonic-session.mjs";

export type PanasonicSession = { ownerId: string; accessToken: string; refreshToken: string; expiresAt: number; clientId: string; version: string; scope: string };
export function panasonicConfigured() { return Boolean(process.env.INSTANT_APP_ADMIN_TOKEN && (process.env.PANASONIC_SESSION_SECRET?.length ?? 0) >= 32); }
export async function loadPanasonic(ownerId: string): Promise<PanasonicSession | null> {
  const db = getInstantAdminDb();
  if (!db || !panasonicConfigured()) return null;
  const data = await db.query({ panasonicConnections: { $: { where: { id: panasonicConnectionId(ownerId) } } } });
  const row = data.panasonicConnections[0];
  return row?.ownerId === ownerId ? unsealPanasonic(row.sealedSession, process.env.PANASONIC_SESSION_SECRET!, ownerId) as PanasonicSession | null : null;
}
export async function savePanasonic(session: PanasonicSession) {
  const db = getInstantAdminDb();
  if (!db || !panasonicConfigured()) throw new Error("Panasonic storage unavailable");
  await db.transact(db.tx.panasonicConnections[panasonicConnectionId(session.ownerId)].update({ ownerId: session.ownerId, sealedSession: sealPanasonic(session, process.env.PANASONIC_SESSION_SECRET!), updatedAt: Date.now() }));
}
export async function deletePanasonic(ownerId: string) {
  const db = getInstantAdminDb();
  if (!db) throw new Error("Panasonic storage unavailable");
  await db.transact(db.tx.panasonicConnections[panasonicConnectionId(ownerId)].delete());
}
