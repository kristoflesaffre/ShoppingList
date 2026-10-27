import { getInstantAdminDb } from "./instant-admin";
import { sealStremio, stremioConnectionId, unsealStremio, type StremioSession } from "./stremio-session";

const secret = () => process.env.STREMIO_SESSION_SECRET ?? process.env.GOOGLE_OAUTH_COOKIE_SECRET ?? "";
export const stremioConfigured = () => Boolean(process.env.INSTANT_APP_ADMIN_TOKEN && secret().length >= 32);
export async function loadStremio(owner: string): Promise<StremioSession | null> {
  const db = getInstantAdminDb();
  if (!db || !stremioConfigured()) throw new Error("not-configured");
  const data = await db.query({ stremioConnections: { $: { where: { id: stremioConnectionId(owner) } } } });
  const row = data.stremioConnections[0];
  if (!row) return null;
  const session = row.ownerId === owner ? unsealStremio(row.sealedSession, secret(), owner) : null;
  if (!session) throw new Error("session-invalid");
  return session;
}
export async function saveStremio(session: StremioSession) {
  const db = getInstantAdminDb();
  if (!db || !stremioConfigured()) throw new Error("not-configured");
  await db.transact(db.tx.stremioConnections[stremioConnectionId(session.ownerId)].update({ ownerId: session.ownerId, sealedSession: sealStremio(session, secret()), updatedAt: Date.now() }));
}
export async function deleteStremio(owner: string) {
  const db = getInstantAdminDb();
  if (!db) throw new Error("not-configured");
  await db.transact(db.tx.stremioConnections[stremioConnectionId(owner)].delete());
}
