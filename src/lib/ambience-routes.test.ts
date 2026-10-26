import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), config: vi.fn(), power: vi.fn(), start: vi.fn() }));
vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: mocks.verify }));
vi.mock("@/lib/server/samsung-tv", () => ({ readTvConfig: mocks.config, tvPower: mocks.power, startAmbience: mocks.start }));
import { ambienceRequest, ambienceTv, youtubeSearch } from "./server/ambience-routes";
const request = (body: unknown, origin = "https://localhost:3011", url = "https://localhost:3011/api/tv/ambience") => new NextRequest(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue("owner");
  mocks.config.mockResolvedValue({ host: "192.168.1.2", mac: "a4:30:7a:32:47:51", ownerId: "owner", token: "t" });
  mocks.power.mockResolvedValue("on");
  mocks.start.mockResolvedValue({ wasOn: false });
});
describe("Ambience TV boundary", () => {
  it("accepts only status or play with a valid video id", () => {
    expect(ambienceRequest({ action: "status" })).toEqual({ action: "status" });
    expect(ambienceRequest({ action: "play", videoId: "5uY3OMRulVo" })).toEqual({ action: "play", videoId: "5uY3OMRulVo" });
    for (const v of [{ action: "play", videoId: "x; rm" }, { action: "play" }, { action: "key", key: "KEY_POWER" }, { action: "status", extra: 1 }, null, []]) expect(ambienceRequest(v)).toBeNull();
  });
  it("is not available on a public host", async () => {
    expect((await ambienceTv(request({ action: "status" }, "https://example.com", "https://example.com/api/tv/ambience"))).status).toBe(503);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("blocks cross-origin requests and requires login", async () => {
    expect((await ambienceTv(request({ action: "status" }, "https://evil.example"))).status).toBe(403);
    mocks.verify.mockResolvedValue(null);
    expect((await ambienceTv(request({ action: "status" }))).status).toBe(401);
  });
  it("only lets the configured owner control the TV", async () => {
    mocks.verify.mockResolvedValue("other");
    expect((await ambienceTv(request({ action: "play", videoId: "5uY3OMRulVo" }))).status).toBe(403);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("starts the sequence and reports failures by code", async () => {
    const ok = await ambienceTv(request({ action: "play", videoId: "5uY3OMRulVo" }));
    expect(await ok.json()).toEqual({ accepted: true, wasOn: false });
    expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({ host: "192.168.1.2" }), "5uY3OMRulVo");
    mocks.start.mockRejectedValue(new Error("busy"));
    const busy = await ambienceTv(request({ action: "play", videoId: "5uY3OMRulVo" }));
    expect(busy.status).toBe(409);
  });
  it("search needs the API key", async () => {
    const previous = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    const response = await youtubeSearch(request({ q: "ambience" }, undefined, "https://localhost:3011/api/youtube/search"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "no-api-key" });
    if (previous) process.env.YOUTUBE_API_KEY = previous;
  });
});
