import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_COOKIE,
  GOOGLE_MAX_ACCOUNTS,
  GOOGLE_STATE_COOKIE,
  googleCookieOptions,
  googleOAuthConfig,
  readGoogleAccounts,
  sealGoogleAccounts,
  unsealGoogleOAuthState,
  type GoogleAccount,
} from "@/lib/google-dashboard-auth";

export const runtime = "nodejs";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

const CALENDAR_READ_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";

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
  const config = googleOAuthConfig(request.nextUrl.origin);
  const state = request.nextUrl.searchParams.get("state");
  const sealedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const expectedState = sealedState
    ? unsealGoogleOAuthState(sealedState, config.cookieSecret)
    : null;
  const code = request.nextUrl.searchParams.get("code");

  if (!config.configured || !state || state !== expectedState?.state || !code) {
    return NextResponse.redirect(new URL("/?google=connection-failed", request.url));
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
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?google=connection-failed", request.url));
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const grantedScopes = new Set((tokens.scope ?? "").split(/\s+/).filter(Boolean));
  if (!tokens.access_token || !grantedScopes.has(CALENDAR_READ_SCOPE)) {
    return NextResponse.redirect(new URL("/?google=connection-failed", request.url));
  }

  const account: GoogleAccount = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    ownerId: expectedState.ownerId,
    email: await primaryCalendarName(tokens.access_token),
  };

  // Bij de bestaande accounts van dezelfde gebruiker voegen; hetzelfde account vervangt het oude.
  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const existing = sealed ? readGoogleAccounts(sealed, config.cookieSecret) : null;
  const others =
    existing && existing.ownerId === expectedState.ownerId
      ? existing.accounts.filter((a) => !account.email || a.email !== account.email)
      : [];
  const accounts = [...others, account].slice(-GOOGLE_MAX_ACCOUNTS);

  const response = NextResponse.redirect(new URL("/?google=connected", request.url));
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  response.cookies.set(
    GOOGLE_AUTH_COOKIE,
    sealGoogleAccounts({ ownerId: expectedState.ownerId, accounts }, config.cookieSecret),
    googleCookieOptions(request.nextUrl.protocol === "https:"),
  );
  return response;
}
