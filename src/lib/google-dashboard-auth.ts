import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const GOOGLE_AUTH_COOKIE = "shopping_google_auth";
export const GOOGLE_STATE_COOKIE = "shopping_google_state";

/** NextURL normalizes loopback hosts; OAuth must return to the cookie's exact host. */
export function googleRequestOrigin(request: { headers: Headers; nextUrl: { protocol: string; origin: string } }): string {
  const host = request.headers.get("host");
  return host ? new URL(`${request.nextUrl.protocol}//${host}`).origin : request.nextUrl.origin;
}

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

/**
 * Meerdere Google-accounts (agenda op de startpagina): één versleutelde cookie met een lijst accounts.
 * Een oudere cookie met één account wordt gelezen als lijst van één.
 */
export type GoogleAccount = GoogleAuthPayload & {
  /** Naam van de hoofdagenda = het e-mailadres van het account. */
  email?: string;
};

export type GoogleAccountsPayload = {
  ownerId: string;
  accounts: GoogleAccount[];
};

/** Maximaal aantal gekoppelde accounts (cookie blijft zo onder 4 kB). */
export const GOOGLE_MAX_ACCOUNTS = 4;

export function sealGoogleAccounts(payload: GoogleAccountsPayload, secret: string): string {
  return sealPayload(payload, secret);
}

export function readGoogleAccounts(value: string, secret: string): GoogleAccountsPayload | null {
  const raw = unsealPayload(value, secret) as Partial<GoogleAccountsPayload & GoogleAuthPayload> | null;
  if (!raw || typeof raw.ownerId !== "string" || !raw.ownerId) return null;
  if (Array.isArray(raw.accounts)) {
    const accounts = raw.accounts.filter(
      (a): a is GoogleAccount => !!a && typeof a.accessToken === "string" && Number.isFinite(a.expiresAt),
    );
    return { ownerId: raw.ownerId, accounts };
  }
  const single = unsealGoogleAuth(value, secret);
  return single ? { ownerId: single.ownerId, accounts: [single] } : null;
}

/** Vernieuwt het toegangstoken als het (bijna) verlopen is; null = account niet meer bruikbaar. */
export async function refreshGoogleAccount(
  account: GoogleAccount,
  clientId: string,
  clientSecret: string,
): Promise<GoogleAccount | null> {
  if (account.expiresAt > Date.now() + 60_000) return account;
  if (!account.refreshToken) return null;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null;
    if (error?.error === "invalid_grant") return null;
    throw new Error("Google token refresh temporarily unavailable");
  }
  const refreshed = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!refreshed.access_token) return null;
  return { ...account, accessToken: refreshed.access_token, expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000 };
}
