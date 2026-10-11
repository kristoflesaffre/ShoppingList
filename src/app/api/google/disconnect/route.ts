import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_COOKIE,
  GOOGLE_STATE_COOKIE,
  googleOAuthConfig,
  unsealGoogleAuth,
} from "@/lib/google-dashboard-auth";

export async function POST(request: NextRequest) {
  const config = googleOAuthConfig(request.nextUrl.origin);
  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const auth = config.configured && sealed
    ? unsealGoogleAuth(sealed, config.cookieSecret)
    : null;
  const tokenToRevoke = auth?.refreshToken ?? auth?.accessToken;
  if (tokenToRevoke) {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: tokenToRevoke }),
      cache: "no-store",
    }).catch(() => null);
  }
  const response = NextResponse.json({ connected: false });
  response.cookies.delete(GOOGLE_AUTH_COOKIE);
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
