import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { msUntilNextDay, startWakeRefresh } from "./wake_refresh";

describe("msUntilNextDay", () => {
  it("telt tot 2 s na de volgende lokale middernacht", () => {
    expect(msUntilNextDay(new Date(2026, 10, 19, 23, 59, 0))).toBe(62_000);
    expect(msUntilNextDay(new Date(2026, 10, 19, 0, 0, 0))).toBe(24 * 3600_000 + 2000);
  });
  it("landt altijd op de volgende dag, ook rond de wisseling naar winter- en zomertijd", () => {
    for (const start of [new Date(2026, 9, 24, 12, 0), new Date(2026, 9, 25, 12, 0), new Date(2026, 2, 28, 12, 0), new Date(2026, 2, 29, 12, 0)]) {
      const next = new Date(start.getTime() + msUntilNextDay(start));
      expect(next.getDate()).toBe(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1).getDate());
      expect(next.getHours()).toBe(0);
    }
  });
});

describe("startWakeRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 19, 22, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  const targets = () => {
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    return { win, doc };
  };

  it("ververst elke interval", () => {
    const run = vi.fn();
    const stop = startWakeRefresh(run, 60_000, targets());
    vi.advanceTimersByTime(3 * 60_000);
    expect(run).toHaveBeenCalledTimes(3);
    stop();
  });

  it("ververst net na middernacht, ook zonder interval, en elke volgende nacht weer", () => {
    const run = vi.fn();
    const stop = startWakeRefresh(run, null, targets());
    vi.advanceTimersByTime(2 * 3600_000 - 1000);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(24 * 3600_000);
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it("ververst bij wakker worden en telt signalen vlak na elkaar als één", () => {
    const run = vi.fn();
    const t = targets();
    const stop = startWakeRefresh(run, null, t);
    t.doc.dispatchEvent(new Event("visibilitychange"));
    t.win.dispatchEvent(new Event("focus"));
    t.win.dispatchEvent(new Event("pageshow"));
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    t.win.dispatchEvent(new Event("online"));
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it("negeert visibilitychange zolang de pagina verborgen is, en stopt na stop()", () => {
    const run = vi.fn();
    const t = targets();
    const stop = startWakeRefresh(run, 60_000, t);
    t.doc.visibilityState = "hidden";
    t.doc.dispatchEvent(new Event("visibilitychange"));
    expect(run).not.toHaveBeenCalled();
    stop();
    t.doc.visibilityState = "visible";
    t.doc.dispatchEvent(new Event("visibilitychange"));
    t.win.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(3 * 3600_000);
    expect(run).not.toHaveBeenCalled();
  });
});
