import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarError, loadGoogleCalendarEvents, type GoogleCalendarEvent } from "@/lib/google-calendar";
import {
  GOOGLE_AUTH_COOKIE,
  googleCookieOptions,
  googleOAuthConfig,
  readGoogleAccounts,
  refreshGoogleAccount,
  sealGoogleAccounts,
  type GoogleAccount,
} from "@/lib/google-dashboard-auth";

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
  const ownerId = request.nextUrl.searchParams.get("ownerId")?.trim() ?? "";
  if (!config.configured) {
    return NextResponse.json({ configured: false, connected: false, events: [] });
  }
  if (!ownerId) {
    return NextResponse.json({ configured: true, connected: false, events: [] }, { status: 400 });
  }

  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const stored = sealed ? readGoogleAccounts(sealed, config.cookieSecret) : null;
  if (!stored || stored.ownerId !== ownerId || stored.accounts.length === 0) {
    return NextResponse.json({ configured: true, connected: false, events: [], accounts: [] });
  }

  const bounds = localDayBounds(request);
  // Alle gekoppelde accounts ophalen; een account dat niet meer werkt valt weg.
  const results = await Promise.all(
    stored.accounts.map(async (stale) => {
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
    kept.length !== stored.accounts.length ||
    kept.some((a, i) => a.accessToken !== stored.accounts[i]?.accessToken || a.email !== stored.accounts[i]?.email);
  if (kept.length === 0) {
    response.cookies.delete(GOOGLE_AUTH_COOKIE);
  } else if (changed) {
    response.cookies.set(
      GOOGLE_AUTH_COOKIE,
      sealGoogleAccounts({ ownerId: stored.ownerId, accounts: kept }, config.cookieSecret),
      googleCookieOptions(request.nextUrl.protocol === "https:"),
    );
  }
  return response;
}
