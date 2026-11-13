import { describe, expect, it } from "vitest";
import { fitZoom } from "./fit-to-screen";

const base = { viewportWidth: 1280, designWidth: 1040 };

describe("fitZoom", () => {
  it("leaves a page alone that already fits (iPad landscape)", () => {
    expect(fitZoom({ ...base, viewportWidth: 1180, available: 716, content: 716 })).toBe(1);
    expect(fitZoom({ ...base, viewportWidth: 1366, available: 920, content: 716 })).toBe(1);
  });

  it("never enlarges", () => {
    expect(fitZoom({ ...base, viewportWidth: 1920, available: 976, content: 716 })).toBe(1);
  });

  it("shrinks a page that is too tall for a 1920 × 1080 tablet (1280 × 720 in CSS)", () => {
    const zoom = fitZoom({ ...base, available: 616, content: 716 });
    expect(zoom).toBe(0.86);
    expect(716 * zoom).toBeLessThanOrEqual(616);
  });

  it("rounds down so the last row always fits", () => {
    const zoom = fitZoom({ ...base, available: 500, content: 748 });
    expect(zoom).toBe(0.668);
    expect(748 * zoom).toBeLessThanOrEqual(500);
  });

  it("keeps the column at its design width once it shrinks", () => {
    // 1024 breed: de kolom van 1040 moet erin blijven passen, ook als de hoogte minder vraagt.
    expect(fitZoom({ viewportWidth: 1024, designWidth: 1040, available: 712, content: 716 })).toBe(0.984);
    expect(fitZoom({ viewportWidth: 1024, designWidth: 1040, available: 700, content: 716 })).toBe(0.977);
    expect(fitZoom({ viewportWidth: 1024, designWidth: 1040, available: 600, content: 716 })).toBe(0.837);
  });

  it("stops at the lower limit", () => {
    expect(fitZoom({ ...base, available: 200, content: 716 })).toBe(0.5);
    expect(fitZoom({ ...base, available: 200, content: 716, min: 0.6 })).toBe(0.6);
  });

  it("ignores measurements that are not ready yet", () => {
    expect(fitZoom({ ...base, available: 0, content: 716 })).toBe(1);
    expect(fitZoom({ ...base, available: 600, content: 0 })).toBe(1);
    expect(fitZoom({ ...base, available: Number.NaN, content: 716 })).toBe(1);
  });
});
