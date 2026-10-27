import { afterEach, expect, it, vi } from "vitest";
import { sendProjectorCommand } from "./projector-client";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
it("queues once and polls only the receipt until completion", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValueOnce(json({ pending: true, commandId: "11111111-1111-4111-8111-111111111111" }, 202)).mockResolvedValueOnce(json({ pending: true })).mockResolvedValueOnce(json({ pending: false, accepted: true, isOn: null }));
  vi.stubGlobal("fetch", fetcher);
  const pending = sendProjectorCommand("on", "owner-token");
  await vi.runAllTimersAsync();
  expect(await pending).toMatchObject({ accepted: true });
  expect(fetcher.mock.calls.filter(call => call[1].method === "POST")).toHaveLength(1);
  expect(fetcher.mock.calls[1][0]).toContain("/api/projector/commands/");
});
it("never retries a rejected physical-command request", async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error("network response lost"));
  vi.stubGlobal("fetch", fetcher);
  await expect(sendProjectorCommand("off", "owner-token")).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not poll when the bridge rejects a command", async () => {
  const fetcher = vi.fn().mockResolvedValue(json({ accepted: false, error: "bridge-offline" }, 503));
  vi.stubGlobal("fetch", fetcher);
  expect(await sendProjectorCommand("on", "owner-token")).toMatchObject({ accepted: false, error: "bridge-offline" });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
