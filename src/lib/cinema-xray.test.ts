import { describe, expect, it } from "vitest";
import { matchIdentity, xrayCostUsd, xrayCutoff } from "./cinema-xray";
import type { Playback } from "./cinema-companion";
import type { StremioProgress } from "./stremio-progress";

const now = 1_800_000_000_000;
const playback = (over: Partial<Playback> = {}): Playback => ({
  sessionId: "session-0001", sequence: 1, mediaKey: "unidentified", streamFingerprint: "a".repeat(64), imdbId: null,
  mediaType: "movie", season: null, episode: null, title: "Severance", positionMs: 1_500_000, durationMs: 3_000_000,
  speed: 1, state: "paused", observedAt: now, uncertaintyMs: 1500, deviceUpdateElapsedMs: null, ...over,
});
const item = (over: Partial<StremioProgress>): StremioProgress => ({
  imdbId: "tt11280740", type: "tv", title: "Severance", season: 2, episode: 4, positionMs: 0, durationMs: 3_010_000, percent: 0, lastWatchedAt: now - 60_000, ...over,
});

describe("matchIdentity", () => {
  it("koppelt de projectortitel aan de laatst bekeken aflevering in Stremio", () => {
    expect(matchIdentity(playback(), [item({})], now)).toMatchObject({ imdbId: "tt11280740", type: "series", season: 2, episode: 4, videoId: "tt11280740:2:4", source: "stremio" });
  });
  it("valt terug op de duur als de titel niet overeenkomt (bv. afleveringstitel op de projector)", () => {
    expect(matchIdentity(playback({ title: "Woe's Hollow" }), [item({})], now)?.videoId).toBe("tt11280740:2:4");
  });
  it("negeert titels die langer dan 12 uur geleden bekeken zijn of niet passen", () => {
    expect(matchIdentity(playback(), [item({ lastWatchedAt: now - 13 * 3600_000 })], now)).toBeNull();
    expect(matchIdentity(playback({ title: "Iets anders", durationMs: 6_000_000 }), [item({})], now)).toBeNull();
  });
  it("gebruikt een IMDb-id van de projector rechtstreeks", () => {
    expect(matchIdentity(playback({ imdbId: "tt0108778", mediaType: "series", season: 1, episode: 2 }), [], now)).toMatchObject({ videoId: "tt0108778:1:2", source: "projector" });
  });
});

describe("xrayCutoff", () => {
  it("blijft 20 s plus onzekerheid achter de positie, afgerond naar beneden op 5 s", () => {
    expect(xrayCutoff(playback(), now)).toBe(1_475_000);
  });
  it("is nooit negatief", () => {
    expect(xrayCutoff(playback({ positionMs: 5_000 }), now)).toBe(0);
  });
});

describe("xrayCostUsd", () => {
  it("rekent met het Flash-Lite-tarief", () => {
    expect(xrayCostUsd("gemini-3.1-flash-lite", 6000, 300)).toBeCloseTo(0.00195, 6);
  });
  it("schat een onbekend model nooit te laag", () => {
    expect(xrayCostUsd("iets-nieuws", 1_000_000, 0)).toBe(1.5);
  });
});
