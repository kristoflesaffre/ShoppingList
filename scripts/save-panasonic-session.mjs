/** Private local provisioner. Credentials arrive through stdin, never command arguments. */
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { init } from "@instantdb/admin";
import { sealPanasonic, panasonicConnectionId } from "../src/lib/server/panasonic-session.mjs";
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
let input = "";
for await (const chunk of process.stdin) { input += chunk; if (input.length > 100_000) process.exit(1); }
try {
  const { email, settings } = JSON.parse(input);
  const secret = process.env.PANASONIC_SESSION_SECRET || "";
  if (secret.length < 32 || !process.env.INSTANT_APP_ADMIN_TOKEN) throw new Error();
  const db = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID || "c63df57f-510a-46bc-8687-912d030c9359", adminToken: process.env.INSTANT_APP_ADMIN_TOKEN });
  const user = await db.auth.getUser({ email });
  if (!user?.id || !settings?.access_token || !settings.refresh_token || !settings.clientId || !/^\d+\.\d+\.\d+$/.test(settings.android_version) || !Number.isFinite(settings.access_token_expires)) throw new Error();
  // Fail closed unless the database denies all browser access to this namespace.
  const headers = { Authorization: `Bearer ${process.env.INSTANT_APP_ADMIN_TOKEN}` };
  const response = await fetch(`https://api.instantdb.com/superadmin/apps/${db.config.appId}/perms`, { headers, signal: AbortSignal.timeout(15000) });
  const rules = await response.json();
  const rule = rules.perms?.panasonicConnections;
  if (!response.ok || rule?.allow?.$default !== "false" || Object.keys(rule.allow).length !== 1) throw new Error();
  const payload = { ownerId: user.id, accessToken: settings.access_token, refreshToken: settings.refresh_token, expiresAt: settings.access_token_expires * 1000, clientId: settings.clientId, version: settings.android_version, scope: settings.scope || "openid offline_access comfortcloud.control a2w.control" };
  await db.transact(db.tx.panasonicConnections[panasonicConnectionId(user.id)].update({ ownerId: user.id, sealedSession: sealPanasonic(payload, secret), updatedAt: Date.now() }));
  console.log("Je airco’s zijn veilig gekoppeld aan je gezinsapp-account. Klik in de app op Vernieuwen.");
} catch { console.error("Koppelen is niet gelukt. Controleer je gezinsapp-e-mailadres en de serverinstallatie. Er zijn geen inloggegevens getoond."); process.exitCode = 1; }
