import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/google-calendar";
import {
  GOOGLE_STATE_COOKIE,
  googleCookieOptions,
  googleOAuthConfig,
  googleRequestOrigin,
  sealGoogleOAuthState,
} from "@/lib/google-dashboard-auth";
import { verifiedUserId } from "@/lib/server/google-connection-store";

export const runtime = "nodejs";

/**
 * Start de koppeling voor de ingelogde gebruiker (Instant-token in `Authorization`).
 * Geeft `{ url }` terug; de app stuurt de browser daarheen. De gebruiker zit verzegeld in de
 * state-cookie, zodat de callback de tokens bij het juiste account bewaart.
 */
export async function POST(request: NextRequest) {
  const origin = googleRequestOrigin(request);
  const config = googleOAuthConfig(origin);
  if (!config.configured) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const ownerId = await verifiedUserId(request);
  if (!ownerId) {
    return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  }

  const state = randomBytes(24).toString("base64url");
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("access_type", "offline");
  // «select_account»: met «+» kan een tweede account (bv. dat van je partner) gekoppeld worden.
  authorizeUrl.searchParams.set("prompt", "consent select_account");
  authorizeUrl.searchParams.set("include_granted_scopes", "false");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));

  const response = NextResponse.json({ url: authorizeUrl.toString() });
  response.cookies.set(GOOGLE_STATE_COOKIE, sealGoogleOAuthState({ state, ownerId }, config.cookieSecret), {
    ...googleCookieOptions(request.nextUrl.protocol === "https:"),
    maxAge: 60 * 10,
  });
  return response;
}
