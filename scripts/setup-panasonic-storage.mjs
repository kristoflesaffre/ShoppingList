/** Add ONLY the Panasonic namespace's deny-all rule, preserving all existing rules. */
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import fs from "node:fs";
import { randomBytes } from "node:crypto";
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
try {
  const token = process.env.INSTANT_APP_ADMIN_TOKEN;
  const id = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "c63df57f-510a-46bc-8687-912d030c9359";
  if (!token) throw new Error();
  const url = `https://api.instantdb.com/superadmin/apps/${id}/perms`;
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const current = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const data = await current.json();
  if (!current.ok || !data.perms || typeof data.perms !== "object") throw new Error();
  const rule = { allow: { $default: "false" } };
  if (JSON.stringify(data.perms.panasonicConnections) !== JSON.stringify(rule)) {
    fs.mkdirSync(".cache/panasonic-setup", { recursive: true, mode: 0o700 });
    fs.writeFileSync(".cache/panasonic-setup/permissions-before.json", JSON.stringify(data.perms, null, 2), { mode: 0o600, flag: "wx" });
    const result = await fetch(url, { method: "POST", headers, body: JSON.stringify({ code: { ...data.perms, panasonicConnections: rule } }), signal: AbortSignal.timeout(15000) });
    if (!result.ok) throw new Error();
  }
  if (!process.env.PANASONIC_SESSION_SECRET) fs.appendFileSync(".env.local", `\n# Encrypted Panasonic sessions (server only)\nPANASONIC_SESSION_SECRET=${randomBytes(48).toString("base64url")}\n`, { mode: 0o600 });
  else if (process.env.PANASONIC_SESSION_SECRET.length < 32) throw new Error();
  console.log("Panasonic-opslag beveiligd; bestaande toegangsregels behouden. Encryptiesleutel staat alleen in .env.local.");
} catch { console.error("Opslaginstallatie niet voltooid. Er zijn geen geheime waarden getoond."); process.exitCode = 1; }
