import { afterEach, describe, expect, it, vi } from "vitest";
import { filmModeIsOn, filmTarget, runFilmMode } from "@/lib/film-mode";

describe("filmModeIsOn", () => {
  it("staat aan op de dag van het starten", () => {
    expect(filmModeIsOn("on:2026-11-09", "2026-11-09")).toBe(true);
  });
  it("staat de volgende dag weer op «Film starten»", () => {
    expect(filmModeIsOn("on:2026-11-08", "2026-11-09")).toBe(false);
  });
  it("oude opslag zonder datum telt als uit", () => {
    expect(filmModeIsOn("on", "2026-11-09")).toBe(false);
    expect(filmModeIsOn(null, "2026-11-09")).toBe(false);
  });
});

describe("filmTarget", () => {
  const lookup = async () => "tt27557289";
  it("opent de volgende aflevering van de serie", async () => {
    expect(await filmTarget({ type: "tv", tmdbId: "224941", season: 1, episode: 8 }, lookup)).toEqual({ imdbId: "tt27557289", type: "tv", season: 1, episode: 8 });
  });
  it("valt terug op de serie bij een ongeldige aflevering", async () => {
    expect(await filmTarget({ type: "tv", tmdbId: "224941", season: 1, episode: 0 }, lookup)).toEqual({ imdbId: "tt27557289", type: "tv" });
  });
  it("zonder IMDb-nummer: gewoon cinema zonder titel", async () => {
    expect(await filmTarget({ type: "tv", tmdbId: "1" }, async () => null)).toBeNull();
    expect(await filmTarget({ type: "tv", tmdbId: "1" }, async () => { throw new Error("offline"); })).toBeNull();
  });
});

describe("runFilmMode met titel", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("stuurt de kijkopdracht met de serie in plaats van een kale cinemastart", async () => {
    const calls: { path: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (path: string, init?: RequestInit) => {
      calls.push({ path, body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify({ accepted: true }), { status: 202 });
    }));
    const result = await runFilmMode(true, "token", { imdbId: "tt27557289", type: "tv", season: 1, episode: 8 });
    expect(calls).toEqual([{ path: "/api/projector/stremio", body: { imdbId: "tt27557289", type: "tv", season: 1, episode: 8 } }]);
    expect(result).toEqual({ projector: true, screen: true, light: true });
  });
});
