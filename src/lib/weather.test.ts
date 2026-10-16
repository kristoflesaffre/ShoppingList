import { describe, expect, it } from "vitest";
import { spreadHours, type WeatherHour } from "./weather";

const hoursFrom = (from: number, to = 23): WeatherHour[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ hour: from + i, kind: "zon", temp: 10, rainChance: 0 }));

describe("spreadHours", () => {
  it("spreidt gelijk van nu tot 22 u", () => {
    expect(spreadHours(hoursFrom(6), 5).map((h) => h.hour)).toEqual([6, 10, 14, 18, 22]);
  });

  it("toont meer uren als er meer plaats is", () => {
    expect(spreadHours(hoursFrom(6), 9).map((h) => h.hour)).toEqual([6, 8, 10, 12, 14, 16, 18, 20, 22]);
  });

  it("gebruikt een vaste stap vanaf de avond terug", () => {
    expect(spreadHours(hoursFrom(5), 8).map((h) => h.hour)).toEqual([5, 7, 10, 13, 16, 19, 22]);
  });

  it("toont alle resterende uren als er minder over zijn", () => {
    expect(spreadHours(hoursFrom(20), 6).map((h) => h.hour)).toEqual([20, 21, 22]);
  });

  it("houdt «nu» ook na 22 u", () => {
    expect(spreadHours(hoursFrom(23), 6).map((h) => h.hour)).toEqual([23]);
  });
});
