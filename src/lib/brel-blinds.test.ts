import { describe, expect, it } from "vitest";
import { blindLabel, blindRequest, openPercent, slatsOpen, slatsState, type Blind } from "./brel-blinds";
const mac = "ece33429034c0001";
const blind = (patch: Partial<Blind> = {}): Blind => ({ mac, name: "Woonkamer", available: true, position: 60, angle: 90, moving: false, battery: 80, ...patch });
describe("BREL blind requests", () => {
  it("accepts only exact command shapes", () => {
    expect(blindRequest({ action: "status" })).toEqual({ action: "status" });
    for (const action of ["open", "stop", "close"]) expect(blindRequest({ action, blind: mac })).toEqual({ action, blind: mac });
    expect(blindRequest({ action: "position", blind: mac, position: 40 })).toEqual({ action: "position", blind: mac, position: 40 });
    expect(blindRequest({ action: "tilt", blind: mac, angle: 90 })).toEqual({ action: "tilt", blind: mac, angle: 90 });
  });
  it("rejects extra fields, odd MACs and out-of-range positions", () => {
    for (const value of [null, [], { action: "status", blind: mac }, { action: "open" }, { action: "open", blind: "ECE33429034C0001" }, { action: "open", blind: `${mac};x` },
      { action: "open", blind: mac, position: 1 }, { action: "position", blind: mac, position: 101 }, { action: "position", blind: mac, position: 2.5 }, { action: "reset", blind: mac },
      { action: "tilt", blind: mac, angle: 181 }, { action: "tilt", blind: mac, angle: -1 }, { action: "tilt", blind: mac, position: 90 }, { action: "tilt", blind: mac, angle: 90, position: 1 }])
      expect(blindRequest(value)).toBeNull();
  });
});
describe("blind labels", () => {
  it("speaks in percent open, while the hub counts percent closed", () => {
    expect(openPercent(blind())).toBe(40);
    expect(blindLabel(blind())).toBe("40% open");
    expect(blindLabel(blind({ position: 0 }))).toBe("Open");
    expect(blindLabel(blind({ position: 100 }))).toBe("Dicht");
    expect(blindLabel(blind({ moving: true }))).toBe("Beweegt…");
    expect(blindLabel(blind({ available: false }))).toBe("Niet bereikbaar");
  });
  it("tells which way the slats are closed", () => {
    expect(slatsState(blind({ angle: 0 }))).toBe("up");
    expect(slatsState(blind({ angle: 90 }))).toBe("open");
    expect(slatsState(blind({ angle: 170 }))).toBe("down");
    expect(slatsState(blind({ angle: null }))).toBeNull();
  });

  it("calls slats open near horizontal and closed near either vertical end", () => {
    expect(slatsOpen(blind())).toBe(true);
    expect(slatsOpen(blind({ angle: 130 }))).toBe(true);
    expect(slatsOpen(blind({ angle: 0 }))).toBe(false);
    expect(slatsOpen(blind({ angle: 149 }))).toBe(false);
    expect(slatsOpen(blind({ angle: null }))).toBeNull();
  });
});
