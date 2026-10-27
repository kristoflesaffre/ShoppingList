import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("./server/instant-admin", () => ({ getInstantAdminDb: m.db }));
import { bridgeOnline, commandDispatchable, enqueueProjector, claimProjector, relayResult, type Bridge, type RelayCommand } from "./server/projector-relay";

const bridge: Bridge = { id: "bridge", ownerId: "owner", tokenHash: "hash", enabled: true, lastSeenAt: 1000, reportedState: "on" };
const command: RelayCommand = { id: "command", bridgeId: "bridge", action: "on", createdAt: 1000, expiresAt: 31_000, state: "pending" };
beforeEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it("requires an enabled, recent heartbeat", () => {
  expect(bridgeOnline(bridge, 2000)).toBe(true);
  expect(bridgeOnline(bridge, 50_000)).toBe(false);
  expect(bridgeOnline({ ...bridge, enabled: false }, 2000)).toBe(false);
  expect(bridgeOnline({ ...bridge, lastSeenAt: 100_000 }, 2000)).toBe(false);
});
it("dispatches only unexpired, unclaimed on/off commands for this bridge", () => {
  expect(commandDispatchable(command, "bridge", 2000)).toBe(true);
  for (const altered of [{ ...command, state: "claimed" }, { ...command, action: "toggle" }, { ...command, expiresAt: 2000 }, { ...command, createdAt: 3000 }]) expect(commandDispatchable(altered, "bridge", 2000)).toBe(false);
  expect(commandDispatchable(command, "other", 2000)).toBe(false);
});
it("distinguishes expired unsent commands from uncertain claimed commands", () => {
  expect(relayResult(command, 32_000)).toMatchObject({ pending: false, accepted: false, error: "relay-expired" });
  expect(relayResult({ ...command, state: "claimed" }, 32_000)).toMatchObject({ error: "relay-uncertain" });
  expect(relayResult({ ...command, state: "sent" }, 32_000)).toMatchObject({ accepted: true, isOn: null });
});
it("does not enqueue a second active command", async () => {
  m.db.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ projectorLocks: [{ commandId: "command", expiresAt: Date.now() + 30_000 }] }).mockResolvedValueOnce({ projectorCommands: [{ ...command, state: "claimed" }] }) });
  expect(await enqueueProjector(bridge, "on")).toBe(null);
});
it("accepts fixed cinema targets but rejects arbitrary launch URLs", () => {
  expect(commandDispatchable({ ...command, action: "cinema" }, "bridge", 2000)).toBe(true);
  expect(commandDispatchable({ ...command, action: "watch:tv:tt0108778:2:7" }, "bridge", 2000)).toBe(true);
  expect(commandDispatchable({ ...command, action: "watch:movie:tt0108778:2:7" }, "bridge", 2000)).toBe(false);
  expect(commandDispatchable({ ...command, action: "https://other-device" }, "bridge", 2000)).toBe(false);
});
it("enqueues standalone guarded cinema with a three-minute deadline", async () => {
  const tx = new Proxy({}, { get: () => new Proxy({}, { get: () => ({ create: (data: unknown) => data }) }) });
  m.db.mockReturnValue({ query: vi.fn().mockResolvedValue({ projectorLocks: [] }), tx, transact: vi.fn() });
  const result = await enqueueProjector(bridge, "cinema");
  expect(result?.action).toBe("cinema");
  expect(result!.expiresAt - result!.createdAt).toBe(180_000);
});
it("clears a completed Pi command lock and gives cinema a longer deadline", async () => {
  const writes: unknown[] = [];
  const tx = new Proxy({}, { get: (_t, ns) => new Proxy({}, { get: (_t, id) => ({ create: (data: unknown) => ({ ns, id, data }), delete: () => ({ ns, id, deleted: true }) }) }) });
  const query = vi.fn().mockResolvedValueOnce({ projectorLocks: [{ id: "lock", commandId: "old", expiresAt: Date.now() + 10_000 }] }).mockResolvedValueOnce({ projectorCommands: [{ ...command, id: "old", state: "sent" }] });
  m.db.mockReturnValue({ query, tx, transact: vi.fn(async steps => { writes.push(steps); }) });
  const result = await enqueueProjector(bridge, "watch:movie:tt0066921");
  expect(result?.expiresAt! - result?.createdAt!).toBe(180_000);
  expect(writes[0]).toMatchObject({ ns: "projectorLocks", id: "lock", deleted: true });
});
it("uses one atomic transaction with a unique receipt and fails closed on conflict", async () => {
  const writes: unknown[] = [];
  const tx = new Proxy({}, { get: (_t, ns) => new Proxy({}, { get: (_t, id) => ({ create: (data: unknown) => ({ ns, id, data }), update: (data: unknown) => ({ ns, id, data }) }) }) });
  const transact = vi.fn(async (steps) => { writes.push(steps); if (writes.length > 1) throw new Error("unique violation"); });
  m.db.mockReturnValue({ query: vi.fn().mockResolvedValue({ projectorCommands: [{ ...command, createdAt: Date.now() - 1000, expiresAt: Date.now() + 30_000 }] }), tx, transact });
  const claims = await Promise.all([claimProjector(bridge, "command"), claimProjector(bridge, "command")]);
  expect(claims.filter(Boolean)).toHaveLength(1);
  expect(writes[0]).toEqual(expect.arrayContaining([expect.objectContaining({ ns: "projectorLocks", data: expect.objectContaining({ key: "claim:command" }) }), expect.objectContaining({ ns: "projectorCommands", data: { state: "claimed" } })]));
});
