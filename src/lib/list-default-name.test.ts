import { describe, expect, it } from "vitest";
import {
  defaultNewListName,
  parseCalendarWeekListTitle,
  weekWithinCalendarMonth,
} from "@/lib/list-default-name";

describe("list-default-name", () => {
  it("berekent week binnen kalendermaand per blok van 7 dagen", () => {
    expect(weekWithinCalendarMonth(new Date("2026-04-01"))).toBe(1);
    expect(weekWithinCalendarMonth(new Date("2026-04-08"))).toBe(2);
    expect(weekWithinCalendarMonth(new Date("2026-04-29"))).toBe(5);
  });

  it("maakt nieuwe lijstnamen zonder het woord week", () => {
    expect(defaultNewListName(new Date("2026-04-11"))).toBe("April 2");
  });

  it("telt nieuwe en legacy maandnamen mee voor het volgende nummer", () => {
    expect(
      defaultNewListName(new Date("2026-04-11"), [
        "April 1",
        "April week 2",
        "Maart 1",
      ]),
    ).toBe("April 3");
  });

  it("parset nieuwe en legacy kalenderlijsttitels", () => {
    expect(parseCalendarWeekListTitle("April 11")).toEqual({
      displayName: "April",
      weekBadge: "11",
    });
    expect(parseCalendarWeekListTitle("april week 10")).toEqual({
      displayName: "April",
      weekBadge: "10",
    });
  });
});
