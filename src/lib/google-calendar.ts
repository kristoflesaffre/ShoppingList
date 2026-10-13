export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

export type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  location?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  calendarId: string;
  calendarName: string;
};

export class GoogleCalendarError extends Error {
  constructor(public status: number) {
    super(`Google Calendar request failed (${status})`);
  }
}

async function pages<T>(url: URL, accessToken: string): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  while (true) {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new GoogleCalendarError(response.status);
    const page = await response.json() as { items?: T[]; nextPageToken?: string };
    items.push(...(page.items ?? []));
    if (!page.nextPageToken) return items;
    if (seen.has(page.nextPageToken)) throw new Error("Repeated calendar page token");
    seen.add(page.nextPageToken);
    url.searchParams.set("pageToken", page.nextPageToken);
  }
}

/** Reads every page from the user's visible calendars within the requested dates. */
export async function loadGoogleCalendarEvents(accessToken: string, bounds: { start: string; end: string }) {
  const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
  calendarUrl.searchParams.set("maxResults", "250");
  calendarUrl.searchParams.set("minAccessRole", "reader");
  const calendars = await pages<{ id: string; summary?: string; summaryOverride?: string; hidden?: boolean; deleted?: boolean }>(calendarUrl, accessToken);
  const visible = calendars.filter((calendar) => !calendar.hidden && !calendar.deleted);
  const events: GoogleCalendarEvent[] = [];
  let unavailable = false;
  for (let index = 0; index < visible.length; index += 5) {
    const batch = await Promise.allSettled(visible.slice(index, index + 5).map(async (calendar) => {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
      url.searchParams.set("timeMin", bounds.start);
      url.searchParams.set("timeMax", bounds.end);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "2500");
      const items = await pages<Omit<GoogleCalendarEvent, "calendarId" | "calendarName">>(url, accessToken);
      return items.filter((event) => event.status !== "cancelled").map((event) => ({
        ...event,
        calendarId: calendar.id,
        calendarName: calendar.summaryOverride ?? calendar.summary ?? calendar.id,
      }));
    }));
    for (const result of batch) {
      if (result.status === "fulfilled") events.push(...result.value);
      else if (result.reason instanceof GoogleCalendarError && result.reason.status === 401) throw result.reason;
      else unavailable = true;
    }
  }
  return { events, unavailable };
}
