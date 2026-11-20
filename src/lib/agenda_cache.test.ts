import { describe, expect, it } from "vitest";
import { msUntilNextDay } from "./agenda_cache";

describe("msUntilNextDay", () => {
  it("telt tot 2 s na de volgende lokale middernacht", () => {
    expect(msUntilNextDay(new Date(2026, 10, 19, 23, 59, 0))).toBe(62_000);
    expect(msUntilNextDay(new Date(2026, 10, 19, 0, 0, 0))).toBe(24 * 3600_000 + 2000);
  });
  it("landt altijd op de volgende dag, ook rond de wisseling naar winter- en zomertijd", () => {
    for (const start of [new Date(2026, 9, 24, 12, 0), new Date(2026, 9, 25, 12, 0), new Date(2026, 2, 28, 12, 0), new Date(2026, 2, 29, 12, 0)]) {
      const next = new Date(start.getTime() + msUntilNextDay(start));
      expect(next.getDate()).toBe(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1).getDate());
      expect(next.getHours()).toBe(0);
    }
  });
});
