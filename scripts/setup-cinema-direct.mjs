/** Give the Pi a dedicated, permission-limited database identity, never an admin token. */
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { init } from "@instantdb/admin";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const appId = "c63df57f-510a-46bc-8687-912d030c9359";
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
if (!adminToken) throw new Error("Missing admin configuration");
const db = init({ appId, adminToken });
const bridge = JSON.parse(await fs.readFile(".cache/projector-relay/bridge.json", "utf8"));
const credentialPath = ".cache/projector-relay/cinema-direct.json";
let identity;
try { identity = JSON.parse(await fs.readFile(credentialPath, "utf8")); }
catch { identity = { userId: randomUUID(), bridgeId: bridge.bridgeId, token: null }; }
if (identity.bridgeId !== bridge.bridgeId) throw new Error("Bridge identity changed");
const headers = { authorization: `Bearer ${adminToken}`, "content-type": "application/json" };
const url = `https://api.instantdb.com/superadmin/apps/${appId}/perms`;
const response = await fetch(url, { headers });
const previous = await response.json();
if (!response.ok || !previous.perms) throw new Error("Cannot read existing permissions");
await fs.writeFile(".cache/projector-relay/permissions-before-cinema.json", JSON.stringify(previous.perms, null, 2), { mode: 0o600, flag: "wx" }).catch(error => { if (error.code !== "EEXIST") throw error; });
const rules = structuredClone(previous.perms);
const guard = `auth.id != '${identity.userId}'`;
for (const namespace of new Set(["$default", "attrs", ...Object.keys(rules)])) {
  const rule = rules[namespace] ?? {};
  const allow = { ...rule.allow };
  for (const action of ["view", "create", "update", "delete"]) {
    const original = allow[action] ?? allow.$default ?? rules.$default?.allow?.[action] ?? rules.$default?.allow?.$default ?? "true";
    if (!String(original).includes(guard)) allow[action] = `(${guard}) && (${original})`;
  }
  rules[namespace] = { ...rule, allow };
}
const worker = `auth.id == '${identity.userId}'`;
const bound = `${worker} && data.bridgeId == '${bridge.bridgeId}'`;
rules.projectorBridges = { allow: {
  $default: "false", view: `${worker} && data.id == '${bridge.bridgeId}'`,
  update: `${worker} && data.id == '${bridge.bridgeId}' && request.modifiedFields.all(field, field in ['lastSeenAt', 'reportedState']) && newData.reportedState in ['on', 'off', 'unknown']`,
}, fields: { tokenHash: "false", ownerId: "false" } };
rules.projectorCommands = { allow: {
  $default: "false", view: bound,
  update: `${bound} && request.modifiedFields.all(field, field in ['state', 'error']) && ((data.state == 'pending' && newData.state == 'claimed') || (data.state == 'claimed' && newData.state in ['sent', 'failed']))`,
} };
const saved = await fetch(url, { method: "POST", headers, body: JSON.stringify({ code: rules }) });
if (!saved.ok) throw new Error(`Cannot install limited permissions: ${await saved.text()}`);
if (!identity.token) identity.token = await db.auth.createToken({ id: identity.userId });
await fs.writeFile(credentialPath, JSON.stringify(identity), { mode: 0o600 });
const scoped = init({ appId }).asUser({ token: identity.token });
const read = await scoped.query({ recipes: {}, projectorBridges: {}, projectorCommands: {} });
if (read.recipes.length || read.projectorBridges.some(row => row.id !== bridge.bridgeId) || read.projectorCommands.some(row => row.bridgeId !== bridge.bridgeId)) throw new Error("Scoped read check failed");
async function denied(operation) { try { await operation(); } catch { return; } throw new Error("Forbidden operation succeeded"); }
await denied(() => scoped.transact(scoped.tx.projectorBridges[bridge.bridgeId].update({ enabled: false })));
await denied(() => scoped.transact(scoped.tx.projectorCommands[randomUUID()].create({ bridgeId: bridge.bridgeId, action: 'on', state: 'pending', createdAt: 0, expiresAt: 0 })));
await fs.writeFile(".cache/projector-relay/cinema-direct-permissions.json", JSON.stringify(rules, null, 2), { mode: 0o600 });
console.log("Dedicated Pi identity ready. Recipe access, bridge enable changes and command creation denied. No credentials printed.");
