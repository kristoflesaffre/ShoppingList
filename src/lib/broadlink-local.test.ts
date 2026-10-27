import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn(), write: vi.fn(), execute: vi.fn() }));
const projector = vi.hoisted(() => ({ configured: vi.fn(), wake: vi.fn(), sleep: vi.fn() }));
vi.mock("@/lib/server/projector-local", () => ({ projectorConfigured: projector.configured, wakeProjector: projector.wake, sleepProjector: projector.sleep }));
vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: mocks.verify }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.read, writeFile: mocks.write }));
vi.mock("node:child_process", () => ({ execFile: Object.assign(vi.fn(), { [Symbol.for("nodejs.util.promisify.custom")]: mocks.execute }) }));
import { broadlinkAction, broadlinkLocal, broadlinkRequest } from "./server/broadlink-local";
function request(action: unknown, origin = "https://localhost:3011", url = "https://localhost:3011/api/broadlink") { return new NextRequest(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(action) }); }
beforeEach(() => { vi.resetAllMocks(); projector.configured.mockResolvedValue(false); projector.wake.mockResolvedValue({ configured: false }); projector.sleep.mockResolvedValue({ configured: false }); mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ configured: true, durationSeconds: null, calibrating: false, running: false }) }); mocks.write.mockResolvedValue(undefined); mocks.verify.mockResolvedValue("owner"); mocks.read.mockResolvedValue(JSON.stringify({ ownerId: "owner", commands: { up: "code", stop: "code", down: "code" } })); });
describe("BroadLink local boundary", () => {
  it("accepts only named actions, never arbitrary packets or shell arguments", () => {
    for (const action of ["status", "up", "stop", "down", "calibrate", "preset"]) expect(broadlinkAction({ action })).toBe(action);
    for (const data of [{ action: "up; echo bad" }, { action: "up", packet: "arbitrary" }, [], null, { action: "reset" }]) expect(broadlinkAction(data)).toBeNull();
  });
  it("does not offer a local Python runtime on a public host", async () => { expect((await broadlinkLocal(request({action:"status"}, "https://example.com", "https://example.com/api/broadlink"))).status).toBe(503); expect(mocks.verify).not.toHaveBeenCalled(); });
  it("blocks cross-origin requests", async () => { expect((await broadlinkLocal(request({action:"status"}, "https://evil.example"))).status).toBe(403); });
  it("requires a verified app login", async () => { mocks.verify.mockResolvedValue(null); expect((await broadlinkLocal(request({action:"status"}))).status).toBe(401); });
  it("restricts the local device to its configured owner", async () => { mocks.verify.mockResolvedValue("other"); expect((await broadlinkLocal(request({action:"status"}))).status).toBe(403); });
  it("returns readiness without exposing captured codes or transmitting RF", async () => { const response = await broadlinkLocal(request({action:"status"})); expect(await response.json()).toEqual({ configured:true, durationSeconds:null, calibrating:false, running:false, open:null, projectorConfigured:false }); expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(projector.wake).not.toHaveBeenCalled(); });
  it("powers the projector off with screen down and reports its independent result", async () => {
    projector.sleep.mockResolvedValue({ configured: true, accepted: false });
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: true, configured: true }) });
    const response = await broadlinkLocal(request({ action: "down" }));
    expect(projector.sleep).toHaveBeenCalledWith("owner");
    expect(projector.wake).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ accepted: true, projector: { configured: true, accepted: false } });
  });
  it("does not change power on Stop or calibration", async () => {
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: true }) });
    for (const action of ["stop", "calibrate"]) expect((await broadlinkLocal(request({ action }))).status).toBe(200);
    expect(projector.wake).not.toHaveBeenCalled();
    expect(projector.sleep).not.toHaveBeenCalled();
  });
  it("wakes when opening the screen or going to the saved viewing height", async () => {
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: true }) });
    for (const action of ["up", "preset"]) expect((await broadlinkLocal(request({ action }))).status).toBe(200);
    expect(projector.wake).toHaveBeenCalledTimes(2);
    expect(projector.sleep).not.toHaveBeenCalled();
  });
  it("remembers open/closed after confirmed movements only, never after Stop", async () => {
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: true }) });
    await broadlinkLocal(request({ action: "down" }));
    expect(mocks.write).toHaveBeenLastCalledWith(expect.stringContaining("screen-state.json"), JSON.stringify({ open: false }), { mode: 0o600 });
    await broadlinkLocal(request({ action: "preset" }));
    expect(mocks.write).toHaveBeenLastCalledWith(expect.stringContaining("screen-state.json"), JSON.stringify({ open: true }), { mode: 0o600 });
    mocks.write.mockClear();
    await broadlinkLocal(request({ action: "stop" }));
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: false }) });
    await broadlinkLocal(request({ action: "up" }));
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("does not wake for other owners or while screen controls are paused", async () => {
    mocks.verify.mockResolvedValue("other");
    expect((await broadlinkLocal(request({ action: "down" }))).status).toBe(403);
    mocks.verify.mockResolvedValue("owner");
    mocks.read.mockResolvedValue(JSON.stringify({ ownerId: "owner", paused: true }));
    expect((await broadlinkLocal(request({ action: "down" }))).status).toBe(423);
    expect(projector.wake).not.toHaveBeenCalled();
    expect(projector.sleep).not.toHaveBeenCalled();
  });
});

// Next.js normalizes loopback names, while the browser's Origin and Host stay exact.
it("accepts a matching numeric loopback Origin and Host after NextURL normalization", async () => {
  const req = new NextRequest("http://localhost:3000/api/broadlink", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json" }, body: JSON.stringify({ action: "status" }) });
  expect((await broadlinkLocal(req)).status).toBe(200);
});
it("still rejects other loopback ports and mismatched browser origins", async () => {
  const req = new NextRequest("http://localhost:3000/api/broadlink", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3001", "content-type": "application/json" }, body: JSON.stringify({ action: "status" }) });
  expect((await broadlinkLocal(req)).status).toBe(403);
  expect(mocks.execute).not.toHaveBeenCalled();
});

it("rejects non-local Host headers even when NextURL uses a loopback hostname", async () => {
  const req = new NextRequest("http://localhost:3000/api/broadlink", { method: "POST", headers: { host: "example.com:3000", origin: "http://example.com:3000", "content-type": "application/json" }, body: JSON.stringify({ action: "status" }) });
  expect((await broadlinkLocal(req)).status).toBe(503);
  expect(mocks.execute).not.toHaveBeenCalled();
});

describe("home-network screen access (SCREEN_LOCAL_ORIGIN)", () => {
  const lan = (host: string, origin = `http://${host}`) => new NextRequest(`http://${host}/api/broadlink`, { method: "POST", headers: { host, origin, "content-type": "application/json" }, body: JSON.stringify({ action: "status" }) });
  afterEach(() => vi.unstubAllEnvs());
  it("stays Mac-only without the explicit opt-in", async () => {
    vi.stubEnv("SCREEN_LOCAL_ORIGIN", "");
    expect((await broadlinkLocal(lan("192.168.132.183:3000"))).status).toBe(503);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("accepts only the exact opted-in LAN origin, still requiring the owner's login", async () => {
    vi.stubEnv("SCREEN_LOCAL_ORIGIN", "http://192.168.132.183:3000");
    expect((await broadlinkLocal(lan("192.168.132.183:3000"))).status).toBe(200);
    for (const host of ["192.168.132.184:3000", "192.168.132.183:3001"]) expect((await broadlinkLocal(lan(host))).status).toBe(503);
    expect((await broadlinkLocal(lan("192.168.132.183:3000", "http://evil.example"))).status).toBe(403);
    mocks.verify.mockResolvedValue(null);
    expect((await broadlinkLocal(lan("192.168.132.183:3000"))).status).toBe(401);
  });
  it("never opens the LAN path on a hosted runtime or for a public origin", async () => {
    vi.stubEnv("SCREEN_LOCAL_ORIGIN", "http://192.168.132.183:3000");
    vi.stubEnv("NETLIFY", "true");
    expect((await broadlinkLocal(lan("192.168.132.183:3000"))).status).toBe(503);
    vi.unstubAllEnvs();
    vi.stubEnv("SCREEN_LOCAL_ORIGIN", "http://8.8.8.8:3000");
    expect((await broadlinkLocal(lan("8.8.8.8:3000"))).status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe("film mode: screen movement without projector power", () => {
  it("accepts projector:false only for up, down and preset, and nothing else", () => {
    expect(broadlinkRequest({ action: "preset", projector: false })).toEqual({ action: "preset", projector: false });
    expect(broadlinkRequest({ action: "down" })).toEqual({ action: "down", projector: true });
    for (const data of [{ action: "stop", projector: false }, { action: "status", projector: false }, { action: "up", projector: true }, { action: "up", projector: "no" }, { action: "up", projector: false, extra: 1 }]) expect(broadlinkRequest(data)).toBeNull();
  });
  it("moves the screen without waking or sleeping the projector", async () => {
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: true }) });
    for (const action of ["preset", "down"]) {
      const response = await broadlinkLocal(request({ action, projector: false }));
      expect(response.status).toBe(200);
      expect(await response.json()).not.toHaveProperty("projector");
    }
    expect(projector.wake).not.toHaveBeenCalled();
    expect(projector.sleep).not.toHaveBeenCalled();
  });
});
