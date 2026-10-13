import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_COOKIE,
  GOOGLE_STATE_COOKIE,
  googleCookieOptions,
  googleOAuthConfig,
  readGoogleAccounts,
  sealGoogleAccounts,
} from "@/lib/google-dashboard-auth";

/** Ontkoppelt alle accounts, of met `?email=` alleen dat ene account. */
export async function POST(request: NextRequest) {
  const config = googleOAuthConfig(request.nextUrl.origin);
  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const stored = config.configured && sealed ? readGoogleAccounts(sealed, config.cookieSecret) : null;
  const onlyEmail = request.nextUrl.searchParams.get("email")?.trim() || null;
  const toRemove = (stored?.accounts ?? []).filter((a) => !onlyEmail || a.email === onlyEmail);
  await Promise.all(
    toRemove.map((a) => {
      const token = a.refreshToken ?? a.accessToken;
      return fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
        cache: "no-store",
      }).catch(() => null);
    }),
  );
  const remaining = onlyEmail && stored ? stored.accounts.filter((a) => a.email !== onlyEmail) : [];
  const response = NextResponse.json({ connected: remaining.length > 0 });
  if (stored && remaining.length > 0) {
    response.cookies.set(
      GOOGLE_AUTH_COOKIE,
      sealGoogleAccounts({ ownerId: stored.ownerId, accounts: remaining }, config.cookieSecret),
      googleCookieOptions(request.nextUrl.protocol === "https:"),
    );
  } else {
    response.cookies.delete(GOOGLE_AUTH_COOKIE);
  }
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
