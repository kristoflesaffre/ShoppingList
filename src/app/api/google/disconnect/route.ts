import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_COOKIE,
  GOOGLE_STATE_COOKIE,
  googleOAuthConfig,
  readGoogleAccounts,
} from "@/lib/google-dashboard-auth";
import { loadGoogleConnection, saveGoogleConnection, verifiedUserId } from "@/lib/server/google-connection-store";

/** Ontkoppelt alle accounts van de ingelogde gebruiker, of met `?email=` alleen dat ene account. */
export async function POST(request: NextRequest) {
  const config = googleOAuthConfig(request.nextUrl.origin);
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return NextResponse.json({ error: "not-signed-in" }, { status: 401 });

  const fromServer = config.configured ? await loadGoogleConnection(ownerId, config.cookieSecret).catch(() => null) : null;
  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const fromCookie = config.configured && sealed ? readGoogleAccounts(sealed, config.cookieSecret) : null;
  const all = [...(fromServer?.accounts ?? []), ...(fromCookie?.ownerId === ownerId ? fromCookie.accounts : [])];
  const onlyEmail = request.nextUrl.searchParams.get("email")?.trim() || null;
  const toRemove = all.filter((a) => !onlyEmail || a.email === onlyEmail);
  await Promise.all(
    toRemove.map((a) =>
      fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: a.refreshToken ?? a.accessToken }),
        cache: "no-store",
      }).catch(() => null),
    ),
  );
  const remaining = onlyEmail ? (fromServer?.accounts ?? []).filter((a) => a.email !== onlyEmail) : [];
  if (config.configured) await saveGoogleConnection({ ownerId, accounts: remaining }, config.cookieSecret).catch(() => undefined);

  const response = NextResponse.json({ connected: remaining.length > 0 });
  response.cookies.delete(GOOGLE_AUTH_COOKIE);
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
