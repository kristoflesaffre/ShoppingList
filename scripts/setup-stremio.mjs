/** Install deny-all client permissions before creating the encrypted session namespace. */
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { init } from "@instantdb/admin";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const appId = "c63df57f-510a-46bc-8687-912d030c9359", adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
if (!adminToken || (process.env.STREMIO_SESSION_SECRET ?? process.env.GOOGLE_OAUTH_COOKIE_SECRET ?? "").length < 32) throw new Error("Server encryption is not configured");
const headers = { authorization: `Bearer ${adminToken}`, "content-type": "application/json" };
const url = `https://api.instantdb.com/superadmin/apps/${appId}/perms`;
const response = await fetch(url, { headers });
const before = await response.json();
if (!response.ok || !before.perms) throw new Error("Cannot read current permissions");
await fs.mkdir(".cache/stremio", { recursive: true, mode: 0o700 });
await fs.writeFile(`.cache/stremio/permissions-before-${Date.now()}.json`, JSON.stringify(before.perms), { mode: 0o600 });
const rules = { ...before.perms, stremioConnections: { allow: { $default: "false", view: "false", create: "false", update: "false", delete: "false" } } };
const save = await fetch(url, { method: "POST", headers, body: JSON.stringify({ code: rules }) });
if (!save.ok) throw new Error("Cannot install Stremio privacy rules");
const db = init({ appId, adminToken }), id = randomUUID();
try {
  await db.transact(db.tx.stremioConnections[id].update({ ownerId: "setup-probe", sealedSession: "not-a-session", updatedAt: Date.now() }));
  const guest = init({ appId }).asUser({ guest: true });
  const read = await guest.query({ stremioConnections: {} });
  if (read.stremioConnections.length) throw new Error("Client read was not blocked");
  let denied = false;
  try { await guest.transact(guest.tx.stremioConnections[id].update({ sealedSession: "forbidden" })); } catch { denied = true; }
  if (!denied) throw new Error("Client write was not blocked");
} finally { await db.transact(db.tx.stremioConnections[id].delete()); }
console.log("Stremio storage ready. Client reads and writes denied; existing permission rules preserved. No account connected yet.");
