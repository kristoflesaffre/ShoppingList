import { describe, expect, it } from "vitest";
import { mergeAgendaWindows, nextAgendaWindow } from "./agenda-future";

describe("future agenda windows", () => {
  it("loads only the next 30 days and keeps neighboring windows contiguous", () => {
    const first = nextAgendaWindow(new Date(2026, 9, 25));
    const second = nextAgendaWindow(first.timeMax);
    expect(first.timeMin).toEqual(new Date(2026, 9, 25));
    expect(first.timeMax).toEqual(new Date(2026, 10, 24));
    expect(second.timeMin).toEqual(first.timeMax);
    expect(second.timeMax).toEqual(new Date(2026, 11, 24));
  });
  it("crosses years without a fixed future cutoff", () => {
    let end = new Date(2026, 11, 20);
    for (let i = 0; i < 100; i++) end = nextAgendaWindow(end).timeMax;
    expect(end.getFullYear()).toBeGreaterThan(2033);
  });
  it("handles leap-year February using calendar days", () => {
    expect(nextAgendaWindow(new Date(2028, 1, 1)).timeMax).toEqual(new Date(2028, 2, 2));
  });
  it("deduplicates an event spanning two windows without combining recurring occurrences", () => {
    const events = mergeAgendaWindows([{ id: "holiday", title: "Updated holiday" }], [
      { id: "holiday", title: "Old holiday" },
      { id: "weekly_20261101", title: "Weekly meeting" },
      { id: "weekly_20261108", title: "Weekly meeting" },
    ]);
    expect(events).toHaveLength(3);
    expect(events[0].title).toBe("Updated holiday");
  });
  it("keeps existing events when a future window is empty", () => {
    expect(mergeAgendaWindows([{ id: "existing" }], [])).toEqual([{ id: "existing" }]);
  });
});
