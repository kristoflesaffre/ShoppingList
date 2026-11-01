import { afterEach, describe, expect, it, vi } from "vitest";
import { sharedRead } from "./shared-read";

afterEach(() => vi.useRealTimers());

describe("sharedRead", () => {
  it("asks once while a read is in flight, however long it takes", async () => {
    vi.useFakeTimers();
    let resolve!: (value: number) => void;
    const run = vi.fn(() => new Promise<number>((r) => (resolve = r)));
    const first = sharedRead("slow", run, 1_000);
    vi.advanceTimersByTime(14_000);
    const second = sharedRead("slow", run, 1_000);
    resolve(7);
    expect(await Promise.all([first, second])).toEqual([7, 7]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("keeps an answer for maxAge, then asks again", async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => Math.random());
    const a = await sharedRead("age", run, 1_000);
    expect(await sharedRead("age", run, 1_000)).toBe(a);
    vi.advanceTimersByTime(1_001);
    await sharedRead("age", run, 1_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("never keeps a failure", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("ok");
    await expect(sharedRead("fail", run)).rejects.toThrow("down");
    expect(await sharedRead("fail", run)).toBe("ok");
  });

  it("keeps different keys apart", async () => {
    expect(await sharedRead("a", async () => 1)).toBe(1);
    expect(await sharedRead("b", async () => 2)).toBe(2);
  });
});
