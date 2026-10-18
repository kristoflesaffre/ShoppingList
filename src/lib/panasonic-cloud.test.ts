import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/panasonic-store", () => ({ savePanasonic: save }));
import { discoverPanasonic, PanasonicReconnect, PanasonicRejected, panasonicCloud, refreshPanasonic } from "./server/panasonic-cloud";
const session = { ownerId: "owner", accessToken: "old-access", refreshToken: "old-refresh", expiresAt: 0, clientId: "client", version: "1.25.0", scope: "openid offline_access comfortcloud.control" };
beforeEach(() => { save.mockReset(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });
describe("Comfort Cloud token lifecycle", () => {
  it("persists rotated tokens before returning and does not persist a password", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }));
    const result = await refreshPanasonic(session);
    expect(result).toMatchObject({ accessToken: "new-access", refreshToken: "new-refresh" });
    expect(save).toHaveBeenCalledExactlyOnceWith(result);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init?.body as string)).toMatchObject({ grant_type: "refresh_token", refresh_token: "old-refresh" });
    expect(JSON.stringify(result)).not.toContain("password");
  });
  it("keeps the existing refresh token when the provider does not rotate it", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ access_token: "new", expires_in: 3600 }));
    expect((await refreshPanasonic(session)).refreshToken).toBe("old-refresh");
  });
  it("requires pairing again after revocation without leaking upstream responses", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: "invalid_grant", detail: "sensitive" }, { status: 403 }));
    await expect(refreshPanasonic(session)).rejects.toBeInstanceOf(PanasonicReconnect);
    expect(save).not.toHaveBeenCalled();
  });
  it("does not refresh a valid token", async () => { await refreshPanasonic({ ...session, expiresAt: Date.now() + 3600000 }); expect(fetch).not.toHaveBeenCalled(); });
  it("never sends a command if persisting rotation failed", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ access_token: "new", expires_in: 3600 })); save.mockRejectedValue(new Error("db unavailable"));
    await expect(refreshPanasonic(session)).rejects.toThrow("db unavailable"); expect(fetch).toHaveBeenCalledTimes(1);
  });
});
describe("Comfort Cloud responses", () => {
  it("deduplicates discovery and ignores non-AC or malformed entries", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ groupList: [{ deviceList: [{ deviceGuid: "x", deviceName: "Living", parameters: {} }, { deviceGuid: "y", deviceName: "Heat pump" }] }, { deviceIdList: [{ deviceGuid: "x", deviceName: "Living", parameters: {} }] }] }));
    expect(await discoverPanasonic(session)).toEqual([{ deviceGuid: "x", deviceName: "Living", parameters: {} }]);
  });
  it("does not turn a provider rejection into a successful command", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ result: 1 }));
    await expect(panasonicCloud(session, "/deviceStatus/control", { parameters: { operate: 0 } })).rejects.toBeInstanceOf(PanasonicRejected);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
