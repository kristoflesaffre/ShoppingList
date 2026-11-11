import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepScreenAwake, type ScreenWakeLockState } from "./screen-wake-lock";

class Sentinel extends EventTarget {
  released = false;
  release = vi.fn(async () => { this.drop(); });
  drop() { this.released = true; this.dispatchEvent(new Event("release")); }
}
function setup(request = vi.fn(async () => new Sentinel() as unknown as WakeLockSentinel)) {
  const page = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
  const view = Object.assign(new EventTarget(), {
    setTimeout: (callback: TimerHandler, delay?: number) => setTimeout(callback as () => void, delay) as unknown as number,
    clearTimeout: (id?: number) => clearTimeout(id),
  });
  const states: ScreenWakeLockState[] = [];
  const stop = keepScreenAwake({ wakeLock: { request }, document: page, window: view as unknown as Window, onState: s => states.push(s) });
  return { page, view, states, stop, request };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("iPad dashboard screen wake lock", () => {
  it("retries a rejected mount request on the first touch, including the dark-view wake-up tap", async () => {
    const sentinel = new Sentinel();
    const request = vi.fn().mockRejectedValueOnce(new Error("NotAllowedError")).mockResolvedValue(sentinel);
    const s = setup(request); await flush();
    expect(s.states.at(-1)).toBe("blocked");
    s.view.dispatchEvent(new Event("touchstart")); await flush();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith("screen");
    expect(s.states.at(-1)).toBe("active"); s.stop();
  });
  it("retries a not-yet-active Home Screen launch once without requiring a touch", async () => {
    const s = setup(vi.fn().mockRejectedValueOnce(new Error("document not active")).mockResolvedValueOnce(new Sentinel()));
    await flush(); expect(s.states.at(-1)).toBe("blocked");
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.request).toHaveBeenCalledTimes(2); expect(s.states.at(-1)).toBe("active"); s.stop();
  });
  it("reacquires after iPadOS releases the lock while the page is still visible", async () => {
    const first = new Sentinel(), second = new Sentinel();
    const s = setup(vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)); await flush();
    first.drop(); expect(s.states.at(-1)).toBe("waiting");
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.request).toHaveBeenCalledTimes(2); expect(s.states.at(-1)).toBe("active"); s.stop();
  });
  it("holds only one lock despite overlapping focus, visibility, touch and pointer events", async () => {
    let resolve!: (lock: WakeLockSentinel) => void;
    const request = vi.fn(() => new Promise<WakeLockSentinel>(r => { resolve = r; }));
    const s = setup(request);
    for (const type of ["pageshow", "focus", "pointerdown", "touchstart", "keydown"]) s.view.dispatchEvent(new Event(type));
    s.page.dispatchEvent(new Event("visibilitychange"));
    expect(request).toHaveBeenCalledTimes(1);
    resolve(new Sentinel() as unknown as WakeLockSentinel); await flush();
    s.view.dispatchEvent(new Event("pointerdown")); await vi.advanceTimersByTimeAsync(2000);
    expect(request).toHaveBeenCalledTimes(1); s.stop();
  });
  it("releases on backgrounding and restores on return, with a delayed retry if Safari is not ready", async () => {
    const first = new Sentinel(), second = new Sentinel();
    const s = setup(vi.fn().mockResolvedValueOnce(first).mockRejectedValueOnce(new Error("document not active")).mockResolvedValueOnce(second)); await flush();
    s.page.visibilityState = "hidden"; s.page.dispatchEvent(new Event("visibilitychange")); await flush();
    expect(first.release).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000); expect(s.request).toHaveBeenCalledTimes(1);
    s.page.visibilityState = "visible"; s.page.dispatchEvent(new Event("visibilitychange")); await flush();
    expect(s.states.at(-1)).toBe("blocked"); await vi.advanceTimersByTimeAsync(1000);
    expect(s.states.at(-1)).toBe("active"); expect(s.request).toHaveBeenCalledTimes(3); s.stop();
  });
  it("releases a lock granted after leaving the dashboard and removes retry listeners", async () => {
    let resolve!: (lock: WakeLockSentinel) => void;
    const s = setup(vi.fn(() => new Promise<WakeLockSentinel>(r => { resolve = r; })));
    s.stop(); const lock = new Sentinel(); resolve(lock as unknown as WakeLockSentinel); await flush();
    expect(lock.release).toHaveBeenCalledTimes(1);
    s.view.dispatchEvent(new Event("pageshow")); s.view.dispatchEvent(new Event("touchstart"));
    await vi.advanceTimersByTimeAsync(5000); expect(s.request).toHaveBeenCalledTimes(1);
  });
  it("does not poll indefinitely when iPadOS refuses the lock", async () => {
    const s = setup(vi.fn().mockRejectedValue(new Error("Low Power Mode"))); await flush();
    await vi.advanceTimersByTimeAsync(60_000); expect(s.request).toHaveBeenCalledTimes(2);
    expect(s.states.at(-1)).toBe("blocked"); s.stop();
  });
  it("keeps unsupported browsers usable without claiming the screen is held awake", () => {
    const states: ScreenWakeLockState[] = [];
    const stop = keepScreenAwake({ document: new EventTarget() as Document, window: new EventTarget() as Window, onState: s => states.push(s) });
    expect(states).toEqual(["unsupported"]); expect(stop).not.toThrow();
  });
});
