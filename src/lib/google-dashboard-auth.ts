import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const GOOGLE_AUTH_COOKIE = "shopping_google_auth";
export const GOOGLE_STATE_COOKIE = "shopping_google_state";

export type GoogleAuthPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export function googleOAuthConfig(origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const cookieSecret = process.env.GOOGLE_OAUTH_COOKIE_SECRET?.trim() ?? "";
  return {
    configured: Boolean(clientId && clientSecret && cookieSecret),
    clientId,
    clientSecret,
    cookieSecret,
    redirectUri: `${origin}/api/google/callback`,
  };
}

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function sealGoogleAuth(payload: GoogleAuthPayload, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unsealGoogleAuth(value: string, secret: string): GoogleAuthPayload | null {
  try {
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const payload = JSON.parse(decoded) as GoogleAuthPayload;
    if (!payload.accessToken || !Number.isFinite(payload.expiresAt)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function googleCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 45,
  };
}
