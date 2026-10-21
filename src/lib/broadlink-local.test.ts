import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: mocks.verify }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.read }));
vi.mock("node:child_process", () => ({ execFile: Object.assign(vi.fn(), { [Symbol.for("nodejs.util.promisify.custom")]: mocks.execute }) }));
import { broadlinkAction, broadlinkLocal } from "./server/broadlink-local";
function request(action: unknown, origin = "https://localhost:3011", url = "https://localhost:3011/api/broadlink") { return new NextRequest(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(action) }); }
beforeEach(() => { vi.resetAllMocks(); mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ configured: true, durationSeconds: null, calibrating: false, running: false }) }); mocks.verify.mockResolvedValue("owner"); mocks.read.mockResolvedValue(JSON.stringify({ ownerId: "owner", commands: { up: "code", stop: "code", down: "code" } })); });
describe("BroadLink local boundary", () => {
  it("accepts only named actions, never arbitrary packets or shell arguments", () => {
    for (const action of ["status", "up", "stop", "down", "calibrate", "preset"]) expect(broadlinkAction({ action })).toBe(action);
    for (const data of [{ action: "up; echo bad" }, { action: "up", packet: "arbitrary" }, [], null, { action: "reset" }]) expect(broadlinkAction(data)).toBeNull();
  });
  it("does not offer a local Python runtime on a public host", async () => { expect((await broadlinkLocal(request({action:"status"}, "https://example.com", "https://example.com/api/broadlink"))).status).toBe(503); expect(mocks.verify).not.toHaveBeenCalled(); });
  it("blocks cross-origin requests", async () => { expect((await broadlinkLocal(request({action:"status"}, "https://evil.example"))).status).toBe(403); });
  it("requires a verified app login", async () => { mocks.verify.mockResolvedValue(null); expect((await broadlinkLocal(request({action:"status"}))).status).toBe(401); });
  it("restricts the local device to its configured owner", async () => { mocks.verify.mockResolvedValue("other"); expect((await broadlinkLocal(request({action:"status"}))).status).toBe(403); });
  it("returns readiness without exposing captured codes or transmitting RF", async () => { const response = await broadlinkLocal(request({action:"status"})); expect(await response.json()).toEqual({ configured:true, durationSeconds:null, calibrating:false, running:false }); expect(response.headers.get("Cache-Control")).toBe("no-store"); });
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
