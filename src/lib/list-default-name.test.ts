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

  it("gebruikt de winkeldatum als standaardnaam", () => {
    expect(defaultNewListName(new Date("2026-04-11"))).toBe("11 april");
  });

  it("houdt dezelfde datumnaam ongeacht bestaande lijstnamen", () => {
    expect(
      defaultNewListName(new Date("2026-04-11"), [
        "April 1",
        "April week 2",
        "Maart 1",
      ]),
    ).toBe("11 april");
  });

  it("toont oude maand-dagnamen als dag-maand en behoudt legacy weekbadges", () => {
    expect(parseCalendarWeekListTitle("April 11")).toEqual({
      displayName: "11 april",
      weekBadge: null,
    });
    expect(parseCalendarWeekListTitle("april week 10")).toEqual({
      displayName: "April",
      weekBadge: "10",
    });
  });
});
