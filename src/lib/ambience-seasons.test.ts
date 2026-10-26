import { describe, expect, it } from "vitest";
import { ambienceShelves, seasonalShelves } from "./ambience-seasons";

const keys = (date: string) => seasonalShelves(new Date(`${date}T12:00:00`)).map((s) => s.key);

describe("ambience seasons", () => {
  it("puts Halloween first in the second half of October, with autumn next", () => {
    expect(keys("2026-10-26")).toEqual(["halloween", "herfst"]);
    expect(keys("2026-10-15")).toEqual(["halloween", "herfst"]);
    expect(keys("2026-10-14")).toEqual(["herfst"]);
    expect(keys("2026-11-20")).toEqual(["herfst"]);
  });
  it("shows Christmas in December until Epiphany", () => {
    expect(keys("2026-12-01")).toEqual(["kerst", "winter"]);
    expect(keys("2027-01-06")).toEqual(["kerst", "winter"]);
    expect(keys("2027-01-07")).toEqual(["winter"]);
  });
  it("follows the meteorological seasons otherwise", () => {
    expect(keys("2027-02-28")).toEqual(["winter"]);
    expect(keys("2027-03-01")).toEqual(["lente"]);
    expect(keys("2027-07-15")).toEqual(["zomer"]);
    expect(keys("2027-09-01")).toEqual(["herfst"]);
  });
  it("keeps the fixed moods after the seasonal rows, without duplicates", () => {
    const shelves = ambienceShelves(new Date("2026-12-24T20:00:00"));
    expect(shelves[0].key).toBe("kerst");
    expect(shelves.map((s) => s.key)).toContain("haardvuur");
    expect(new Set(shelves.map((s) => s.key)).size).toBe(shelves.length);
  });
});
