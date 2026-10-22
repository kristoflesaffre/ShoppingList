import { describe, expect, it } from "vitest";
import { projectorTestMessage } from "./projector-control";
describe("Projector test feedback", () => {
  it("distinguishes Google TV status from actual projected image", () => {
    expect(projectorTestMessage("on", { accepted: true, isOn: true })).toContain("Controleer of het beeld");
    expect(projectorTestMessage("on", { accepted: true, isOn: null })).toContain("nog geen aan/uit-status");
  });
  it("reports connection errors before a stale power state", () => {
    expect(projectorTestMessage("off", { accepted: false, isOn: false, error: "unreachable" })).toContain("niet bereikbaar");
    expect(projectorTestMessage("on", { accepted: false, error: "pairing-required" })).toContain("opnieuw");
  });
  it("makes the read-only check explicit", () => {
    expect(projectorTestMessage("status", { accepted: true, isOn: false })).toContain("geen aan/uit-commando");
  });
});
