import { describe, expect, it } from "vitest";
import { sortAircos } from "./airco-order";

const devices = ["Leefruimte", "Gastenkamer", "Kamer Noë", "Slaapkamer", "Zolder"].map((name) => ({ name }));
const order = (iso: string) => sortAircos(devices, new Date(iso)).map((d) => d.name);
const SLEEP = ["Slaapkamer", "Kamer Noë", "Leefruimte", "Gastenkamer", "Zolder"];
const LIVING = ["Leefruimte", "Gastenkamer", "Slaapkamer", "Kamer Noë", "Zolder"];

describe("airco order", () => {
  it.each([
    // Maandag 19 okt 2026
    ["2026-10-19T07:59:00", SLEEP],
    ["2026-10-19T08:00:00", LIVING],
    ["2026-10-19T21:29:00", LIVING],
    ["2026-10-19T21:30:00", SLEEP],
    // Zaterdag 24 okt 2026
    ["2026-10-24T09:59:00", SLEEP],
    ["2026-10-24T10:00:00", LIVING],
    ["2026-10-24T22:59:00", LIVING],
    ["2026-10-24T23:00:00", SLEEP],
  ])("%s", (iso, expected) => {
    expect(order(iso)).toEqual(expected);
  });
});
