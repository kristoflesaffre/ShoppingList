import { afterEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_CALENDAR_SCOPES, GoogleCalendarError, loadGoogleCalendarEvents } from "./google-calendar";

const bounds = { start: "2026-10-13T00:00:00Z", end: "2026-10-15T00:00:00Z" };
afterEach(() => vi.unstubAllGlobals());

describe("Google Calendar read-only import", () => {
  it("reads every calendar and event page, including recurring and all-day events", async () => {
    const urls: URL[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: URL) => {
      const url = new URL(input);
      urls.push(url);
      if (url.pathname.endsWith("calendarList")) {
        return Response.json(url.searchParams.has("pageToken")
          ? { items: [{ id: "family@example.com", summary: "Gezin" }, { id: "hidden", hidden: true }] }
          : { items: [{ id: "work", summary: "Werk" }], nextPageToken: "cal-page-2" });
      }
      if (url.pathname.includes("work")) {
        return Response.json(url.searchParams.has("pageToken")
          ? { items: [{ id: "recurring-instance", start: { dateTime: "2026-10-13T10:00:00Z" } }] }
          : { items: [{ id: "meeting" }, { id: "removed", status: "cancelled" }], nextPageToken: "events-page-2" });
      }
      return Response.json({ items: [{ id: "birthday", start: { date: "2026-10-13" }, end: { date: "2026-10-14" } }] });
    }));

    const result = await loadGoogleCalendarEvents("token", bounds);
    expect(result.unavailable).toBe(false);
    expect(result.events.map((event) => event.id)).toEqual(["meeting", "recurring-instance", "birthday"]);
    expect(result.events[2].calendarName).toBe("Gezin");
    expect(urls.some((url) => url.pathname.includes("hidden"))).toBe(false);
    for (const url of urls.filter((entry) => entry.pathname.endsWith("events"))) {
      expect(url.searchParams.get("singleEvents")).toBe("true");
      expect(url.searchParams.get("timeMin")).toBe(bounds.start);
      expect(url.searchParams.get("timeMax")).toBe(bounds.end);
    }
    expect(GOOGLE_CALENDAR_SCOPES.every((scope) => scope.endsWith("readonly"))).toBe(true);
  });

  it("keeps successful calendars when another calendar is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL) => {
      if (url.pathname.endsWith("calendarList")) return Response.json({ items: [{ id: "good" }, { id: "bad" }] });
      return url.pathname.includes("bad") ? new Response(null, { status: 503 }) : Response.json({ items: [{ id: "event" }] });
    }));
    const result = await loadGoogleCalendarEvents("token", bounds);
    expect(result.unavailable).toBe(true);
    expect(result.events).toHaveLength(1);
  });

  it("reports missing permissions so an existing user can reconnect", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
    await expect(loadGoogleCalendarEvents("old-token", bounds)).rejects.toBeInstanceOf(GoogleCalendarError);
  });
});
