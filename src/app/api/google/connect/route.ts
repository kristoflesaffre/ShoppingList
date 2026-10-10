import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  googleCookieOptions,
  googleOAuthConfig,
} from "@/lib/google-dashboard-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request.nextUrl.origin);
  if (!config.configured) {
    return NextResponse.redirect(new URL("/?google=not-configured", request.url));
  }

  const state = randomBytes(24).toString("base64url");
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("include_granted_scopes", "true");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
    ].join(" "),
  );

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    ...googleCookieOptions(request.nextUrl.protocol === "https:"),
    maxAge: 60 * 10,
  });
  return response;
}
