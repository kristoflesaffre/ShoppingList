import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/google-calendar";
import {
  GOOGLE_AUTH_COOKIE,
  GOOGLE_MAX_ACCOUNTS,
  GOOGLE_STATE_COOKIE,
  googleOAuthConfig,
  googleRequestOrigin,
  readGoogleAccounts,
  unsealGoogleOAuthState,
  type GoogleAccount,
} from "@/lib/google-dashboard-auth";
import { loadGoogleConnection, saveGoogleConnection } from "@/lib/server/google-connection-store";

export const runtime = "nodejs";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

/** E-mailadres = naam van de hoofdagenda (zit in de events-lijst; geen extra scope nodig). */
async function primaryCalendarName(accessToken: string): Promise<string | undefined> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("timeMin", new Date().toISOString());
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" }).catch(() => null);
  if (!response?.ok) return undefined;
  const json = (await response.json().catch(() => null)) as { summary?: string } | null;
  return json?.summary?.trim() || undefined;
}

export async function GET(request: NextRequest) {
  const origin = googleRequestOrigin(request);
  const config = googleOAuthConfig(origin);
  const state = request.nextUrl.searchParams.get("state");
  const sealedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const expectedState = sealedState
    ? unsealGoogleOAuthState(sealedState, config.cookieSecret)
    : null;
  const code = request.nextUrl.searchParams.get("code");

  if (state && state === expectedState?.state && request.nextUrl.searchParams.get("error") === "access_denied") {
    const response = NextResponse.redirect(new URL("/?google=cancelled", origin));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  }

  if (!config.configured || !state || state !== expectedState?.state || !code) {
    return NextResponse.redirect(new URL("/?google=connection-failed", origin));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!tokenResponse?.ok) {
    return NextResponse.redirect(new URL("/?google=connection-failed", origin));
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const grantedScopes = new Set((tokens.scope ?? "").split(/\s+/).filter(Boolean));
  if (!tokens.access_token || !GOOGLE_CALENDAR_SCOPES.every((scope) => grantedScopes.has(scope))) {
    return NextResponse.redirect(new URL("/?google=permission-required", origin));
  }

  const account: GoogleAccount = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    ownerId: expectedState.ownerId,
    email: await primaryCalendarName(tokens.access_token),
  };

  // Bij de bestaande accounts van dezelfde gebruiker voegen (server, en een oudere cookie van deze
  // browser); hetzelfde account vervangt het oude.
  const ownerId = expectedState.ownerId;
  const stored = await loadGoogleConnection(ownerId, config.cookieSecret).catch(() => null);
  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const fromCookie = sealed ? readGoogleAccounts(sealed, config.cookieSecret) : null;
  const previous = [...(stored?.accounts ?? []), ...(fromCookie?.ownerId === ownerId ? fromCookie.accounts : [])];
  const others = previous.filter(
    (a, i) => (!account.email || a.email !== account.email) && previous.findIndex((b) => b.email && b.email === a.email) === i,
  );
  const accounts = [...others, account];
  if (accounts.length > GOOGLE_MAX_ACCOUNTS) {
    const response = NextResponse.redirect(new URL("/?google=account-limit", origin));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  }
  try {
    await saveGoogleConnection({ ownerId, accounts }, config.cookieSecret);
  } catch {
    return NextResponse.redirect(new URL("/?google=connection-failed", origin));
  }

  const response = NextResponse.redirect(new URL("/?google=connected", origin));
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  response.cookies.delete(GOOGLE_AUTH_COOKIE);
  return response;
}
