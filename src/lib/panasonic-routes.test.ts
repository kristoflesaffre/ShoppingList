import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), load: vi.fn(), refresh: vi.fn(), discover: vi.fn(), read: vi.fn(), cloud: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: mocks.verify }));
vi.mock("@/lib/server/panasonic-store", () => ({ panasonicConfigured: () => true, loadPanasonic: mocks.load, deletePanasonic: mocks.remove }));
vi.mock("@/lib/server/panasonic-cloud", () => ({ refreshPanasonic: mocks.refresh, PanasonicReconnect: class extends Error {}, discoverPanasonic: mocks.discover, readPanasonicDevice: mocks.read, panasonicCloud: mocks.cloud }));
import { POST as control } from "@/app/api/panasonic/control/route";
import { POST as devices } from "@/app/api/panasonic/devices/route";
import { POST as disconnect } from "@/app/api/panasonic/disconnect/route";
function request(body = {}, origin = "https://localhost:3011") { return new NextRequest("https://localhost:3011/api/panasonic/control", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue("owner"); mocks.load.mockResolvedValue({ ownerId: "owner" }); mocks.refresh.mockImplementation(s => Promise.resolve(s));
  mocks.discover.mockResolvedValue([{ deviceGuid: "living", deviceName: "Living", parameters: {} }]);
  mocks.read.mockResolvedValue({ id: "living", available: true, on: true, modes: ["cool", "heat"] }); mocks.cloud.mockResolvedValue({ result: 0 });
});
afterEach(() => vi.restoreAllMocks());
describe("Panasonic routes", () => {
  it("blocks cross-site requests before authentication or device access", async () => { expect((await control(request({}, "https://evil.example"))).status).toBe(403); expect(mocks.verify).not.toHaveBeenCalled(); });
  it("requires app authentication", async () => { mocks.verify.mockResolvedValue(null); expect((await control(request({}))).status).toBe(401); expect(mocks.load).not.toHaveBeenCalled(); });
  it("reports an unpaired account without any device call", async () => { mocks.load.mockResolvedValue(null); expect(await (await devices(request())).json()).toEqual({ configured: true, connected: false }); expect(mocks.discover).not.toHaveBeenCalled(); });
  it("never commands a device outside the linked account", async () => { expect((await control(request({ deviceId: "other", power: true }))).status).toBe(404); expect(mocks.cloud).not.toHaveBeenCalled(); });
  it("never implicitly powers on an off unit", async () => { mocks.read.mockResolvedValue({ available: true, on: false, modes: ["cool"] }); expect((await control(request({ deviceId: "living", temperature: 20 }))).status).toBe(409); expect(mocks.cloud).not.toHaveBeenCalled(); });
  it("sends exactly one explicit command and does not expose tokens", async () => { const response = await control(request({ deviceId: "living", power: false })); expect(await response.json()).toEqual({ accepted: true }); expect(mocks.cloud).toHaveBeenCalledExactlyOnceWith({ ownerId: "owner" }, "/deviceStatus/control", { deviceGuid: "living", parameters: { operate: 0 } }); });
  it("does not retry a command with an uncertain outcome", async () => { mocks.cloud.mockRejectedValue(new Error()); expect((await control(request({ deviceId: "living", power: false }))).status).toBe(503); expect(mocks.cloud).toHaveBeenCalledTimes(1); });
  it("rejects unsupported modes", async () => { expect((await control(request({ deviceId: "living", mode: "dry" }))).status).toBe(400); expect(mocks.cloud).not.toHaveBeenCalled(); });
  it("allows disconnecting an expired session without refreshing", async () => { await disconnect(request()); expect(mocks.refresh).not.toHaveBeenCalled(); expect(mocks.remove).toHaveBeenCalledWith("owner"); });
});
