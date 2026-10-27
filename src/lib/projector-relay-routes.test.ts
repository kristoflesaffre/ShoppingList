import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ user: vi.fn(), owner: vi.fn(), token: vi.fn(), enqueue: vi.fn(), poll: vi.fn(), claim: vi.fn(), complete: vi.fn(), command: vi.fn() }));
vi.mock("./server/google-connection-store", () => ({ verifiedUserId: m.user }));
vi.mock("./server/projector-relay", async importOriginal => ({ ...await importOriginal<typeof import("./server/projector-relay")>(), ownerBridge: m.owner, tokenBridge: m.token, enqueueProjector: m.enqueue, pollProjector: m.poll, claimProjector: m.claim, completeProjector: m.complete, relayCommand: m.command }));
import { projectorRemote, projectorBridgeRoute, projectorCommandStatus } from "./server/projector-relay-routes";
const id = "11111111-1111-4111-8111-111111111111";
function request(body: unknown, origin = "https://app.example") { return new NextRequest("https://app.example/api/projector", { method: "POST", headers: { host: "app.example", origin, authorization: "Bearer user", "content-type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.clearAllMocks();
  m.user.mockResolvedValue("owner");
  m.owner.mockResolvedValue({ id: "bridge", enabled: true, lastSeenAt: Date.now(), reportedState: "off" });
  m.token.mockResolvedValue({ id: "bridge" });
  m.command.mockResolvedValue({ id, bridgeId: "bridge", state: "pending", expiresAt: Date.now() + 30_000 });
});
it("rejects cross-origin and unauthenticated owner commands", async () => {
  expect((await projectorRemote(request({ action: "on" }, "https://evil.example")))?.status).toBe(403);
  m.user.mockResolvedValue(null);
  expect((await projectorRemote(request({ action: "on" })))?.status).toBe(401);
  expect(m.enqueue).not.toHaveBeenCalled();
});
it("preserves local fallback only when there is no bridge", async () => {
  m.owner.mockResolvedValue(null); expect(await projectorRemote(request({ action: "on" }))).toBe(null);
});
it("does not queue when Pi is offline or disabled", async () => {
  m.owner.mockResolvedValue({ enabled: true, lastSeenAt: 0 });
  expect((await projectorRemote(request({ action: "off" })))?.status).toBe(503);
  expect(m.enqueue).not.toHaveBeenCalled();
});
it("checks status without creating a physical command", async () => {
  const response = await projectorRemote(request({ action: "status" }));
  expect(await response?.json()).toMatchObject({ accepted: true, isOn: false });
  expect(m.enqueue).not.toHaveBeenCalled();
});
it("rejects arbitrary actions and target overrides", async () => {
  for (const body of [{ action: "toggle" }, { action: "on", entity_id: "elsewhere" }, null, []]) expect((await projectorRemote(request(body)))?.status).toBe(400);
  expect(m.enqueue).not.toHaveBeenCalled();
});
it("returns a pending receipt, not false execution success", async () => {
  m.enqueue.mockResolvedValue({ id, state: "pending", expiresAt: Date.now() + 30_000 });
  const response = await projectorRemote(request({ action: "on" }));
  expect(response?.status).toBe(202);
  expect(await response?.json()).toMatchObject({ accepted: false, pending: true, commandId: id });
});
it("hides other owners' receipts", async () => {
  m.command.mockResolvedValue({ bridgeId: "other" });
  expect((await projectorCommandStatus(request(null), id)).status).toBe(404);
});
it("requires the scoped Pi credential", async () => {
  m.token.mockResolvedValue(null);
  expect((await projectorBridgeRoute(request({ commandId: id, stage: "claim" }))).status).toBe(401);
  expect(m.claim).not.toHaveBeenCalled();
});
it("refuses command injection in bridge acknowledgements", async () => {
  expect((await projectorBridgeRoute(request({ commandId: id, stage: "claim", action: "off" }))).status).toBe(400);
  expect(m.claim).not.toHaveBeenCalled();
});
it("fails closed if a claim was already consumed", async () => {
  m.claim.mockResolvedValue(false);
  expect((await projectorBridgeRoute(request({ commandId: id, stage: "claim" }))).status).toBe(409);
});
