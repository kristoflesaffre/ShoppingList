import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchLiveSync } from "./live-sync-watchdog";

function setup(probe: () => Promise<unknown>) {
  const page = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
  const view = Object.assign(new EventTarget(), {
    setTimeout: (cb: TimerHandler, ms?: number) => setTimeout(cb as () => void, ms) as unknown as number,
    clearTimeout: (id?: number) => clearTimeout(id),
    setInterval: (cb: TimerHandler, ms?: number) => setInterval(cb as () => void, ms) as unknown as number,
    clearInterval: (id?: number) => clearInterval(id),
  });
  const reconnect = vi.fn();
  const stop = watchLiveSync({ probe, reconnect, document: page, window: view as unknown as Window, intervalMs: 1000, timeoutMs: 100 });
  return { page, view, reconnect, stop };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("watchLiveSync", () => {
  it("leaves a healthy connection alone", async () => {
    const probe = vi.fn(async () => ({}));
    const { reconnect, stop } = setup(probe);
    await vi.advanceTimersByTimeAsync(3500);
    expect(probe).toHaveBeenCalledTimes(3);
    expect(reconnect).not.toHaveBeenCalled();
    stop();
  });

  it("reconnects when the probe never answers (silent socket)", async () => {
    const probe = vi.fn(() => new Promise(() => {}));
    const { reconnect, stop } = setup(probe);
    await vi.advanceTimersByTimeAsync(1100);
    expect(reconnect).toHaveBeenCalledTimes(1);
    // Volgende ronde: opnieuw proberen, niet meerdere vragen tegelijk.
    await vi.advanceTimersByTimeAsync(1000);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(reconnect).toHaveBeenCalledTimes(2);
    stop();
  });

  it("does not reconnect on an error (offline is handled by the client)", async () => {
    const { reconnect, stop } = setup(() => Promise.reject(new Error("offline")));
    await vi.advanceTimersByTimeAsync(1200);
    expect(reconnect).not.toHaveBeenCalled();
    stop();
  });

  it("only checks while visible, and checks again on return", async () => {
    const probe = vi.fn(async () => ({}));
    const { page, stop } = setup(probe);
    page.visibilityState = "hidden";
    await vi.advanceTimersByTimeAsync(2500);
    expect(probe).not.toHaveBeenCalled();
    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(probe).toHaveBeenCalledTimes(1);
    stop();
  });

  it("stops after cleanup", async () => {
    const probe = vi.fn(async () => ({}));
    const { stop } = setup(probe);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(probe).not.toHaveBeenCalled();
  });
});
