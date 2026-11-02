import { describe, expect, it, vi } from "vitest";
import { guardTransact } from "./db-transact-guard";

describe("guardTransact", () => {
  it("laat een fout zonder await niet los als unhandled rejection, en logt ze", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    guardTransact(() => Promise.reject(new Error("transaction timed out")))();
    await new Promise((resolve) => setTimeout(resolve, 10));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
  it("geeft de fout en het resultaat door aan wie wacht", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(guardTransact(() => Promise.reject(new Error("nee")))()).rejects.toThrow("nee");
    await expect(guardTransact(async (a: number) => a + 1)(1)).resolves.toBe(2);
    warn.mockRestore();
  });
});
