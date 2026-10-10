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

type GmailMessage = {
  id?: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
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
  };
}

function localDayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { start: start.toISOString(), end: end.toISOString() };
}

function header(message: GmailMessage, name: string): string {
  return (
    message.payload?.headers?.find((entry) => entry.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
  );
}

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request.nextUrl.origin);
  if (!config.configured) {
    return NextResponse.json({ configured: false, connected: false, events: [], emails: [] });
  }

  const sealed = request.cookies.get(GOOGLE_AUTH_COOKIE)?.value;
  const stored = sealed ? unsealGoogleAuth(sealed, config.cookieSecret) : null;
  if (!stored) {
    return NextResponse.json({ configured: true, connected: false, events: [], emails: [] });
  }

  const auth = await refreshGoogleToken(stored, config.clientId, config.clientSecret);
  if (!auth) {
    const response = NextResponse.json({ configured: true, connected: false, events: [], emails: [] });
    response.cookies.delete(GOOGLE_AUTH_COOKIE);
    return response;
  }

  const headers = { authorization: `Bearer ${auth.accessToken}` };
  const bounds = localDayBounds();
  const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  calendarUrl.searchParams.set("timeMin", bounds.start);
  calendarUrl.searchParams.set("timeMax", bounds.end);
  calendarUrl.searchParams.set("singleEvents", "true");
  calendarUrl.searchParams.set("orderBy", "startTime");
  calendarUrl.searchParams.set("maxResults", "12");

  const gmailUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  gmailUrl.searchParams.set("q", "is:unread newer_than:2d -category:promotions -category:social");
  gmailUrl.searchParams.set("maxResults", "4");

  const [calendarResponse, gmailResponse] = await Promise.all([
    fetch(calendarUrl, { headers, cache: "no-store" }),
    fetch(gmailUrl, { headers, cache: "no-store" }),
  ]);

  const calendarJson = calendarResponse.ok
    ? ((await calendarResponse.json()) as { items?: GoogleCalendarEvent[] })
    : { items: [] };
  const gmailList = gmailResponse.ok
    ? ((await gmailResponse.json()) as { messages?: Array<{ id?: string }> })
    : { messages: [] };

  const messages = await Promise.all(
    (gmailList.messages ?? []).flatMap((message) =>
      message.id
        ? [
            fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
              { headers, cache: "no-store" },
            ).then(async (response) => (response.ok ? ((await response.json()) as GmailMessage) : null)),
          ]
        : [],
    ),
  );

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
    emails: messages.flatMap((message) =>
      message
        ? [
            {
              id: message.id ?? "",
              subject: header(message, "Subject") || "Zonder onderwerp",
              from: header(message, "From"),
              date: header(message, "Date"),
              snippet: message.snippet ?? "",
            },
          ]
        : [],
    ),
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
