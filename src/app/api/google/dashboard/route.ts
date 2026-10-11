import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_COOKIE,
  googleCookieOptions,
  googleOAuthConfig,
  sealGoogleAuth,
  unsealGoogleAuth,
  type GoogleAuthPayload,
} from "@/lib/google-dashboard-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

async function refreshGoogleToken(
  payload: GoogleAuthPayload,
  clientId: string,
  clientSecret: string,
): Promise<GoogleAuthPayload | null> {
  if (payload.expiresAt > Date.now() + 60_000) return payload;
  if (!payload.refreshToken) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: payload.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const refreshed = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!refreshed.access_token) return null;
  return {
    accessToken: refreshed.access_token,
    refreshToken: payload.refreshToken,
    expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
    ownerId: payload.ownerId,
  };
}

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
  const stored = sealed ? unsealGoogleAuth(sealed, config.cookieSecret) : null;
  if (!stored || stored.ownerId !== ownerId) {
    return NextResponse.json({ configured: true, connected: false, events: [] });
  }

  const auth = await refreshGoogleToken(stored, config.clientId, config.clientSecret);
  if (!auth) {
    const response = NextResponse.json({ configured: true, connected: false, events: [] });
    response.cookies.delete(GOOGLE_AUTH_COOKIE);
    return response;
  }

  const headers = { authorization: `Bearer ${auth.accessToken}` };
  const bounds = localDayBounds(request);
  const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  calendarUrl.searchParams.set("timeMin", bounds.start);
  calendarUrl.searchParams.set("timeMax", bounds.end);
  calendarUrl.searchParams.set("singleEvents", "true");
  calendarUrl.searchParams.set("orderBy", "startTime");
  calendarUrl.searchParams.set("maxResults", "12");

  const calendarResponse = await fetch(calendarUrl, { headers, cache: "no-store" });

  if (calendarResponse.status === 401 || calendarResponse.status === 403) {
    const response = NextResponse.json({ configured: true, connected: false, events: [] });
    response.cookies.delete(GOOGLE_AUTH_COOKIE);
    return response;
  }
  if (!calendarResponse.ok) {
    return NextResponse.json(
      { configured: true, connected: true, events: [], unavailable: true },
      { status: 502 },
    );
  }

  const calendarJson = (await calendarResponse.json()) as { items?: GoogleCalendarEvent[] };

  const response = NextResponse.json({
    configured: true,
    connected: true,
    events: (calendarJson.items ?? []).map((event) => ({
      id: event.id ?? "",
      title: event.summary?.trim() || "Zonder titel",
      location: event.location?.trim() || null,
      start: event.start?.dateTime ?? event.start?.date ?? null,
      end: event.end?.dateTime ?? event.end?.date ?? null,
      allDay: Boolean(event.start?.date && !event.start?.dateTime),
    })),
  });

  if (auth.accessToken !== stored.accessToken || auth.expiresAt !== stored.expiresAt) {
    response.cookies.set(
      GOOGLE_AUTH_COOKIE,
      sealGoogleAuth(auth, config.cookieSecret),
      googleCookieOptions(request.nextUrl.protocol === "https:"),
    );
  }
  return response;
}
