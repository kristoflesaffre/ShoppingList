import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const HUE_STATE_COOKIE = "shopping_hue_state";
export const HUE_AUTH_COOKIE = "shopping_hue_auth";
export type HueState = { ownerId: string; state: string; verifier: string; expiresAt: number };
export type HueConnection = { ownerId: string; clientId: string; accessToken: string; refreshToken: string; applicationKey: string; expiresAt: number };

export function hueConfig() {
  const clientId = process.env.HUE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.HUE_CLIENT_SECRET?.trim() ?? "";
  const secret = process.env.HUE_OAUTH_SECRET?.trim() ?? "";
  const redirectUri = process.env.HUE_REDIRECT_URI?.trim() ?? "";
  let origin = "";
  try {
    const url = new URL(redirectUri);
    if (url.protocol === "https:" && url.pathname === "/api/hue/callback" && !url.search && !url.hash && !url.username && !url.password) origin = url.origin;
  } catch { /* An incomplete deployment is reported as not configured. */ }
  return { clientId, clientSecret, secret, redirectUri, origin, configured: Boolean(clientId && clientSecret && secret.length >= 32 && origin) };
}

export const hueCookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

/** Separate encryption domain from the existing Google integration. */
export function sealHue(value: HueState | HueConnection, secret: string): string {
  const iv = randomBytes(12);
  const key = createHash("sha256").update(`hue:${secret}`).digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

function unseal(value: string | undefined, secret: string): Record<string, unknown> | null {
  try {
    if (!value || !secret) return null;
    const data = Buffer.from(value, "base64url");
    if (data.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(`hue:${secret}`).digest(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"));
  } catch { return null; }
}

export function readHueState(value: string | undefined, secret: string): HueState | null {
  const raw = unseal(value, secret);
  return raw && typeof raw.ownerId === "string" && typeof raw.state === "string" && typeof raw.verifier === "string" && typeof raw.expiresAt === "number" && raw.expiresAt > Date.now()
    ? raw as HueState : null;
}

export function readHueConnection(value: string | undefined, secret: string, ownerId: string, clientId: string): HueConnection | null {
  const raw = unseal(value, secret);
  return raw && raw.ownerId === ownerId && raw.clientId === clientId && [raw.accessToken, raw.refreshToken, raw.applicationKey].every(v => typeof v === "string" && v.length > 0) && typeof raw.expiresAt === "number" && Number.isFinite(raw.expiresAt)
    ? raw as HueConnection : null;
}

type TokenResult = { accessToken: string; refreshToken: string; expiresAt: number };
export class HueReconnectRequired extends Error {}
export async function hueTokens(params: URLSearchParams, config: ReturnType<typeof hueConfig>): Promise<TokenResult> {
  const response = await fetch("https://api.meethue.com/v2/oauth2/token", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}` },
    body: params,
  });
  const data = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number | string; error?: string } | null;
  if (!response.ok) {
    if (data?.error === "invalid_grant") throw new HueReconnectRequired();
    throw new Error("Hue token service unavailable");
  }
  const lifetime = Number(data?.expires_in);
  if (!data?.access_token || !data.refresh_token || !Number.isFinite(lifetime) || lifetime <= 0) throw new Error("Invalid Hue token response");
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + lifetime * 1000 };
}

/** Hue's documented cloud pairing sequence; never sends a command to a light. */
export async function pairHueBridge(accessToken: string): Promise<string> {
  const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const link = await fetch("https://api.meethue.com/route/api/0/config", { method: "PUT", headers, body: JSON.stringify({ linkbutton: true }), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!link.ok) throw new Error("Hue bridge unavailable");
  const response = await fetch("https://api.meethue.com/route/api", { method: "POST", headers, body: JSON.stringify({ devicetype: "shopping_list" }), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const data = await response.json().catch(() => null) as { success?: { username?: string } }[] | null;
  const key = Array.isArray(data) ? data[0]?.success?.username : undefined;
  if (!response.ok || !key) throw new Error("Hue bridge pairing failed");
  return key;
}
