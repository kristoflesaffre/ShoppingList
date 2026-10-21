import { describe, expect, it } from "vitest";
import { isScreenActionDisabled } from "./projection-screen";
const ready = { configured: true, durationSeconds: 3.2, running: false, calibrating: false };
describe("Dashboard projection-screen controls", () => {
  it("keeps Stop available during a pending height preset or calibration", () => {
    for (const status of [ready, { ...ready, running: true }, { ...ready, calibrating: true }]) {
      expect(isScreenActionDisabled("stop", status, true)).toBe(false);
    }
  });
  it("blocks overlapping movement commands while leaving Stop enabled", () => {
    for (const action of ["up", "down", "preset"] as const) {
      expect(isScreenActionDisabled(action, ready, true)).toBe(true);
      expect(isScreenActionDisabled(action, { ...ready, running: true }, false)).toBe(true);
      expect(isScreenActionDisabled(action, ready, false)).toBe(false);
    }
  });
  it("requires a saved height for the preset, while manual movement remains available", () => {
    const status = { ...ready, durationSeconds: null };
    expect(isScreenActionDisabled("preset", status, false)).toBe(true);
    expect(isScreenActionDisabled("up", status, false)).toBe(false);
    expect(isScreenActionDisabled("down", status, false)).toBe(false);
  });
  it("disables all controls when unconfigured, loading or explicitly paused", () => {
    for (const status of [null, { ...ready, configured: false }, { ...ready, paused: true }]) {
      for (const action of ["up", "stop", "down", "preset"] as const) expect(isScreenActionDisabled(action, status, false)).toBe(true);
    }
  });
});
