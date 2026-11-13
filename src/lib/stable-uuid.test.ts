import { describe, expect, it } from "vitest";
import { seriesMetaId, stableUuid } from "./stable-uuid";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("stableUuid", () => {
  it("geeft voor dezelfde sleutel altijd dezelfde geldige UUID", () => {
    expect(stableUuid("a")).toBe(stableUuid("a"));
    expect(stableUuid("films-series-meta:g:1")).toMatch(UUID);
  });
  it("geeft verschillende ids voor verschillende sleutels", () => {
    const ids = new Set(Array.from({ length: 2000 }, (_, i) => stableUuid(`k${i}`)));
    expect(ids.size).toBe(2000);
  });
  it("seriesMetaId hangt af van groep én serie", () => {
    expect(seriesMetaId("g1", "100")).toBe(seriesMetaId("g1", "100"));
    expect(seriesMetaId("g1", "100")).not.toBe(seriesMetaId("g2", "100"));
    expect(seriesMetaId("g1", "100")).not.toBe(seriesMetaId("g1", "101"));
  });
});
