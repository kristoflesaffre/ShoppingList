import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarError, loadGoogleCalendarEvents, type GoogleCalendarEvent } from "@/lib/google-calendar";
import {
  GOOGLE_AUTH_COOKIE,
  GOOGLE_MAX_ACCOUNTS,
  googleOAuthConfig,
  readGoogleAccounts,
  refreshGoogleAccount,
  type GoogleAccount,
} from "@/lib/google-dashboard-auth";
import { loadGoogleConnection, saveGoogleConnection, verifiedUserId } from "@/lib/server/google-connection-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localDayBounds(request: NextRequest) {
  const requestedStart = request.nextUrl.searchParams.get("timeMin");
  const requestedEnd = request.nextUrl.searchParams.get("timeMax");
  const parsedStart = requestedStart ? new Date(requestedStart) : null;
  const parsedEnd = requestedEnd ? new Date(requestedEnd) : null;
  if (
    parsedStart &&
    parsedEnd &&
    Number.isFinite(parsedStart.getTime()) &&
    Number.isFinite(parsedEnd.getTime()) &&
    parsedEnd > parsedStart
  ) {
    return { start: parsedStart.toISOString(), end: parsedEnd.toISOString() };
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request.nextUrl.origin);
  if (!config.configured) {
    return NextResponse.json({ configured: false, connected: false, events: [] });
  }
  // Enkel de ingelogde gebruiker (geverifieerd Instant-token), nooit een id uit de URL.
  const ownerId = await verifiedUserId(request);
  if (!ownerId) {
    return NextResponse.json({ configured: true, connected: false, events: [], accounts: [] }, { status: 401 });
  }

  // De koppeling staat op de server; een oudere koppeling in een cookie van deze browser verhuist mee.
  let stored = await loadGoogleConnection(ownerId, config.cookieSecret).catch(() => null);
  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const fromCookie = sealed ? readGoogleAccounts(sealed, config.cookieSecret) : null;
  let migrated = false;
  if (fromCookie && fromCookie.ownerId === ownerId && fromCookie.accounts.length > 0) {
    const known = new Set((stored?.accounts ?? []).map((a) => a.email).filter(Boolean));
    const extra = fromCookie.accounts.filter((a) => !a.email || !known.has(a.email));
    if (extra.length > 0) {
      stored = { ownerId, accounts: [...(stored?.accounts ?? []), ...extra].slice(0, GOOGLE_MAX_ACCOUNTS) };
      migrated = true;
    }
  }
  if (!stored || stored.accounts.length === 0) {
    const empty = NextResponse.json({ configured: true, connected: false, events: [], accounts: [] });
    if (sealed) empty.cookies.delete(GOOGLE_AUTH_COOKIE);
    return empty;
  }
  const storedAccounts = stored.accounts;

  const bounds = localDayBounds(request);
  // Alle gekoppelde accounts ophalen; een account dat niet meer werkt valt weg.
  const results = await Promise.all(
    storedAccounts.map(async (stale) => {
      try {
      const account = await refreshGoogleAccount(stale, config.clientId, config.clientSecret);
      if (!account) return { account: null, stale, events: [] as GoogleCalendarEvent[], name: undefined, failed: false };
      const result = await loadGoogleCalendarEvents(account.accessToken, bounds);
      return { account, stale, events: result.events, name: undefined, failed: result.unavailable };
      } catch (error) {
        const reconnect = error instanceof GoogleCalendarError && (error.status === 401 || error.status === 403);
        return { account: stale, stale, events: [] as GoogleCalendarEvent[], name: undefined, failed: true, reconnect };
      }
    }),
  );

  const kept: GoogleAccount[] = results
    .filter((r) => r.account)
    .map((r) => ({ ...(r.account as GoogleAccount), email: (r.account as GoogleAccount).email ?? r.name }));
  const accounts = results.flatMap((result, index) => result.account ? [{
    id: result.account.email ?? result.name ?? `account-${index + 1}`,
    email: result.account.email ?? result.name ?? null,
  }] : []);
  const events = results
    .flatMap((r, index) => {
      if (!r.account) return [];
      const accountId = (r.account.email ?? r.name) || `account-${index + 1}`;
      return r.events.map((event) => ({
        id: `${accountId}:${event.calendarId}:${event.id ?? ""}`,
        calendarName: event.calendarName,
        title: event.summary?.trim() || "Zonder titel",
        location: event.location?.trim() || null,
        start: event.start?.dateTime ?? event.start?.date ?? null,
        end: event.end?.dateTime ?? event.end?.date ?? null,
        allDay: Boolean(event.start?.date && !event.start?.dateTime),
        accountId,
      }));
    })
    .sort((x, y) => (x.start ?? "").localeCompare(y.start ?? ""));
  const unavailable = results.some((r) => r.failed);

  const response = NextResponse.json(
    { configured: true, connected: kept.length > 0, events, accounts, reconnectRequired: results.some((r) => "reconnect" in r && r.reconnect), ...(unavailable ? { unavailable: true } : {}) },
    { status: unavailable && events.length === 0 && kept.length > 0 ? 502 : 200 },
  );
  const changed =
    migrated ||
    kept.length !== storedAccounts.length ||
    kept.some((a, i) => a.accessToken !== storedAccounts[i]?.accessToken || a.email !== storedAccounts[i]?.email);
  if (changed) await saveGoogleConnection({ ownerId, accounts: kept }, config.cookieSecret).catch(() => undefined);
  if (sealed) response.cookies.delete(GOOGLE_AUTH_COOKIE);
  return response;
}
