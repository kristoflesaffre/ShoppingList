import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), bridge: vi.fn(), enqueue: vi.fn() }));
vi.mock("./server/google-connection-store", () => ({ verifiedUserId: mocks.user }));
vi.mock("./server/projector-relay", async original => ({ ...await original<typeof import("./server/projector-relay")>(), ownerBridge: mocks.bridge, enqueueProjector: mocks.enqueue }));
import { GET, POST } from "../app/api/projector/stremio/route";

function request(body: unknown, origin = "https://localhost:3011", host = "localhost:3011") {
  return new NextRequest(`https://${host}/api/projector/stremio`, { method: "POST", headers: { host, origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv("NETLIFY", ""); vi.stubEnv("VERCEL", ""); vi.stubEnv("PROJECTOR_LOCAL_ORIGIN", "");
  vi.clearAllMocks();
  mocks.user.mockResolvedValue("owner"); mocks.bridge.mockResolvedValue({ id: "bridge", enabled: true, lastSeenAt: Date.now() });
  mocks.enqueue.mockResolvedValue({ id: "command", state: "pending", expiresAt: Date.now() + 120_000 });
});
afterEach(() => vi.unstubAllEnvs());
it("reports capability without dispatching a command", async () => {
  expect(await (await GET(request(null))).json()).toEqual({ available: true, mode: "pi" });
  mocks.user.mockResolvedValue(null);
  expect(await (await GET(request(null))).json()).toEqual({ available: false });
});
it("supports hosted execution through the Pi without a local Mac", async () => {
  vi.stubEnv("NETLIFY", "true");
  expect((await POST(request({ type: "movie", imdbId: "tt0066921" }, "https://app.example", "app.example"))).status).toBe(202);
  expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({ id: "bridge" }), "watch:movie:tt0066921");
});
it("requires same-origin authentication and a configured owner", async () => {
  expect((await POST(request({}, "https://evil.example"))).status).toBe(403);
  mocks.user.mockResolvedValue(null);
  expect((await POST(request({}))).status).toBe(401);
  mocks.user.mockResolvedValue("other"); mocks.bridge.mockResolvedValue(null);
  expect((await POST(request({ type: "movie", imdbId: "tt0066921" }))).status).toBe(503);
});
it("refuses offline and busy bridges without fallback commands", async () => {
  mocks.bridge.mockResolvedValue({ enabled: true, lastSeenAt: 0 });
  expect((await POST(request({ type: "movie", imdbId: "tt0066921" }))).status).toBe(503);
  expect(mocks.enqueue).not.toHaveBeenCalled();
  mocks.bridge.mockResolvedValue({ id: "bridge", enabled: true, lastSeenAt: Date.now() });
  mocks.enqueue.mockResolvedValue(null);
  expect((await POST(request({ type: "tv", imdbId: "tt0108778", season: 2, episode: 7 }))).status).toBe(409);
});
it.each([null, [], {}, { type: "movie", imdbId: "tt0066921", host: "other-tv" }, { type: "tv", imdbId: "tt0108778", season: 1 }])("rejects invalid payload without dispatch: %j", async body => {
  expect((await POST(request(body))).status).toBe(400);
});
