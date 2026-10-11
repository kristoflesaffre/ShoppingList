import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const GOOGLE_AUTH_COOKIE = "shopping_google_auth";
export const GOOGLE_STATE_COOKIE = "shopping_google_state";

export type GoogleAuthPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  ownerId: string;
};

export type GoogleOAuthStatePayload = {
  state: string;
  ownerId: string;
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

function sealPayload(payload: object, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function unsealPayload(value: string, secret: string): unknown {
  try {
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(decoded) as unknown;
  } catch {
    return null;
  }
}

export function sealGoogleAuth(payload: GoogleAuthPayload, secret: string): string {
  return sealPayload(payload, secret);
}

export function unsealGoogleAuth(value: string, secret: string): GoogleAuthPayload | null {
  const payload = unsealPayload(value, secret) as Partial<GoogleAuthPayload> | null;
  if (
    !payload?.accessToken ||
    !Number.isFinite(payload.expiresAt) ||
    typeof payload.ownerId !== "string" ||
    !payload.ownerId
  ) {
    return null;
  }
  return payload as GoogleAuthPayload;
}

export function sealGoogleOAuthState(
  payload: GoogleOAuthStatePayload,
  secret: string,
): string {
  return sealPayload(payload, secret);
}

export function unsealGoogleOAuthState(
  value: string,
  secret: string,
): GoogleOAuthStatePayload | null {
  const payload = unsealPayload(value, secret) as Partial<GoogleOAuthStatePayload> | null;
  if (
    typeof payload?.state !== "string" ||
    !payload.state ||
    typeof payload.ownerId !== "string" ||
    !payload.ownerId
  ) {
    return null;
  }
  return payload as GoogleOAuthStatePayload;
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
