import { describe, expect, it } from "vitest";
import { cinemaCommand, cinemaTarget, stremioLink } from "./stremio";

describe("Stremio title links", () => {
  it("round trips only fixed cinema commands", () => {
    const target = { type: "tv" as const, imdbId: "tt0108778", season: 2, episode: 7 };
    expect(cinemaTarget(cinemaCommand(target))).toEqual(target);
    expect(cinemaTarget("watch:movie:tt0108778:1:2")).toBeNull();
    expect(cinemaTarget("watch:tv:tt0108778:1:0")).toBeNull();
    expect(cinemaTarget("https://elsewhere")).toBeNull();
  });
  it("opens a movie without automatically selecting a stream", () => {
    expect(stremioLink({ imdbId: "tt0066921", type: "movie" })).toBe("stremio:///detail/movie/tt0066921/tt0066921?autoPlay=false");
  });
  it("opens a specific episode and supports specials", () => {
    expect(stremioLink({ imdbId: "tt0108778", type: "tv", season: 0, episode: 2 })).toBe("stremio:///detail/series/tt0108778/tt0108778:0:2?autoPlay=false");
  });
  it("opens the series overview if no episode was selected", () => {
    expect(stremioLink({ imdbId: "tt0108778", type: "tv" })).toBe("stremio:///detail/series/tt0108778/?autoPlay=false");
  });
  it.each([
    { imdbId: "https://evil.example", type: "movie" },
    { imdbId: "tt0108778/../../", type: "movie" },
    { imdbId: "tt0108778", type: "movie", season: 1, episode: 1 },
    { imdbId: "tt0108778", type: "tv", season: 1 },
    { imdbId: "tt0108778", type: "tv", season: -1, episode: 1 },
    { imdbId: "tt0108778", type: "tv", season: 1, episode: 0 },
    { imdbId: "tt0108778", type: "tv", season: 1.5, episode: 1 },
    { imdbId: "tt0108778", type: "tv", season: 1, episode: "2" },
  ])("rejects malformed targets: %j", target => {
    expect(() => stremioLink(target as Parameters<typeof stremioLink>[0])).toThrow();
  });
});
