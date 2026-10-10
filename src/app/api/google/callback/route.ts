import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_COOKIE,
  GOOGLE_STATE_COOKIE,
  googleCookieOptions,
  googleOAuthConfig,
  sealGoogleAuth,
} from "@/lib/google-dashboard-auth";

export const runtime = "nodejs";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request.nextUrl.origin);
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");

  if (!config.configured || !state || state !== expectedState || !code) {
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
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/?google=connection-failed", request.url));
  }

  const response = NextResponse.redirect(new URL("/?google=connected", request.url));
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  response.cookies.set(
    GOOGLE_AUTH_COOKIE,
    sealGoogleAuth(
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      },
      config.cookieSecret,
    ),
    googleCookieOptions(request.nextUrl.protocol === "https:"),
  );
  return response;
}
