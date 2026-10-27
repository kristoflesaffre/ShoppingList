import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: mocks.verify }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.read }));
vi.mock("node:child_process", () => ({ execFile: Object.assign(vi.fn(), { [Symbol.for("nodejs.util.promisify.custom")]: mocks.execute }) }));
import { brelLocal } from "./server/brel-local";
const mac = "ece33429034c0001";
function request(body: unknown, origin = "https://localhost:3011", url = "https://localhost:3011/api/brel") { return new NextRequest(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue("owner");
  mocks.read.mockResolvedValue(JSON.stringify({ ownerId: "owner" }));
  mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: true }) });
});
describe("BREL local boundary", () => {
  it("never runs on a public host", async () => {
    expect((await brelLocal(request({ action: "status" }, "https://example.com", "https://example.com/api/brel"))).status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("blocks other origins, missing logins and other owners", async () => {
    expect((await brelLocal(request({ action: "status" }, "https://evil.example"))).status).toBe(403);
    mocks.verify.mockResolvedValue(null);
    expect((await brelLocal(request({ action: "status" }))).status).toBe(401);
    mocks.verify.mockResolvedValue("other");
    expect((await brelLocal(request({ action: "open", blind: mac }))).status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("rejects unknown commands before the runner", async () => {
    expect((await brelLocal(request({ action: "open", blind: "all" }))).status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("passes exactly the validated arguments to the runner", async () => {
    expect((await brelLocal(request({ action: "position", blind: mac, position: 30 }))).status).toBe(200);
    expect(mocks.execute.mock.calls[0][1].slice(1)).toEqual(["position", mac, "30"]);
  });
  it("reports an unconfirmed command instead of success", async () => {
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify({ accepted: false }) });
    expect((await brelLocal(request({ action: "close", blind: mac }))).status).toBe(503);
  });
  it("returns the hub status without caching", async () => {
    const status = { configured: true, blinds: [{ mac, name: "Woonkamer", available: true, position: 60, moving: false, battery: 75 }] };
    mocks.execute.mockResolvedValue({ stdout: JSON.stringify(status) });
    const response = await brelLocal(request({ action: "status" }));
    expect(await response.json()).toEqual(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
