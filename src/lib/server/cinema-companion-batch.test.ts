import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("./instant-admin", () => ({ getInstantAdminDb: () => ({ query: mocks.query }) }));
import { companionId, getManyData } from "./cinema-companion";

describe("bounded companion batch reads", () => {
  beforeEach(() => { vi.stubEnv("CINEMA_COMPANION_ENABLED", "1"); mocks.query.mockReset(); });
  afterEach(() => vi.unstubAllEnvs());

  it("reads 80 episode memories in one exact-ID query, preserving order and misses", async () => {
    const keys = Array.from({ length: 80 }, (_, i) => `episode:${i}`);
    mocks.query.mockResolvedValue({ cinemaCompanionData: [79, 0].map(i => ({ id: companionId(`owner:${keys[i]}`), ownerId: "owner", expiresAt: Date.now() + 60_000, payload: { text: String(i) } })) });
    const values = await getManyData<{ text: string }>("owner", keys);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.query).toHaveBeenCalledWith({ cinemaCompanionData: { $: { where: { id: { $in: keys.map(key => companionId(`owner:${key}`)) } } } } });
    expect(values).toHaveLength(80);
    expect(values[0]).toEqual({ text: "0" });
    expect(values[1]).toBeNull();
    expect(values[79]).toEqual({ text: "79" });
  });

  it("excludes foreign owners and expired rows and deduplicates requested IDs", async () => {
    mocks.query.mockResolvedValue({ cinemaCompanionData: [
      { id: companionId("a:one"), ownerId: "b", expiresAt: Date.now() + 60_000, payload: "private" },
      { id: companionId("a:two"), ownerId: "a", expiresAt: Date.now() - 1, payload: "expired" },
    ] });
    expect(await getManyData("a", ["one", "two", "one"])).toEqual([null, null, null]);
    expect(mocks.query.mock.calls[0][0].cinemaCompanionData.$.where.id.$in).toHaveLength(2);
  });

  it("does not query an empty list or hide database failures as missing memories", async () => {
    expect(await getManyData("owner", [])).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
    mocks.query.mockRejectedValue(new Error("Your request exceeded the rate limit"));
    await expect(getManyData("owner", ["episode:1"])).rejects.toThrow("rate limit");
  });
});
