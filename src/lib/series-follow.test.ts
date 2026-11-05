import { describe, expect, it } from "vitest";
import {
  airedEpisodeIds,
  autoAddedMarkId,
  episodeIdsThrough,
  followMarkId,
  followedCount,
  isSeriesReviewed,
  ongoingFromTmdbDetail,
  seasonStatusFromDetail,
  seasonsToAutoAdd,
  shouldAutoFollow,
  skipMarkId,
} from "./series-follow";

const base = {
  id: 100,
  name: "Slow Horses",
  first_air_date: "2022-04-01",
  overview: "Spionnen",
  vote_average: 8.24,
  vote_count: 900,
  poster_path: "/p.jpg",
  genres: [{ name: "Drama" }],
  seasons: [
    { season_number: 0, episode_count: 3, air_date: "2021-01-01" },
    { season_number: 1, episode_count: 6, air_date: "2022-04-01" },
    { season_number: 2, episode_count: 6, air_date: "2022-12-02" },
    { season_number: 3, episode_count: 0, air_date: "2027-01-10" },
  ],
};

describe("ongoingFromTmdbDetail", () => {
  it("geeft een serie tussen twee seizoenen terug met het volgende seizoen", () => {
    const s = ongoingFromTmdbDetail(
      { ...base, last_episode_to_air: { season_number: 2, air_date: "2023-01-06" }, next_episode_to_air: null },
      "img",
    );
    expect(s).toMatchObject({
      tmdbId: "100",
      year: "2022",
      posterUrl: "img/p.jpg",
      score: 8.2,
      lastSeason: 2,
      lastAirDate: "2023-01-06",
      nextSeason: { seasonNumber: 3, airDate: "2027-01-10" },
    });
    expect(s?.seasons.map((x) => x.seasonNumber)).toEqual([1, 2]);
  });

  it("telt van een lopend seizoen enkel de uitgezonden afleveringen", () => {
    const s = ongoingFromTmdbDetail(
      {
        ...base,
        last_episode_to_air: { season_number: 2, episode_number: 4 },
        next_episode_to_air: { season_number: 2, air_date: "2022-12-09" },
      },
      "img",
    );
    expect(s).toMatchObject({ airing: true, lastSeason: 2, nextSeason: { seasonNumber: 3, airDate: "2027-01-10" } });
    expect(s?.seasons.map((x) => x.episodeCount)).toEqual([6, 4]);
  });

  it("neemt de datum van de volgende aflevering als het nieuwe seizoen al gepland is", () => {
    const s = ongoingFromTmdbDetail(
      { ...base, last_episode_to_air: { season_number: 2 }, next_episode_to_air: { season_number: 3, air_date: "2027-01-03" } },
      "img",
    );
    expect(s?.nextSeason).toEqual({ seasonNumber: 3, airDate: "2027-01-03" });
  });

  it("geen volgend seizoen bekend = null", () => {
    const s = ongoingFromTmdbDetail(
      { ...base, seasons: base.seasons.slice(0, 3), last_episode_to_air: { season_number: 2 }, next_episode_to_air: null },
      "img",
    );
    expect(s?.nextSeason).toBeNull();
  });
});

describe("episodeIdsThrough", () => {
  it("markeert alle afleveringen t.e.m. het gekozen seizoen", () => {
    const ids = episodeIdsThrough("7", [
      { seasonNumber: 1, episodeCount: 2, airDate: null },
      { seasonNumber: 2, episodeCount: 3, airDate: null },
    ], 1);
    expect(ids).toEqual(["ep-7-s1e1", "ep-7-s1e2"]);
  });
});

describe("isSeriesReviewed", () => {
  it("kent volgen, overslaan, watchlist en afleveringen", () => {
    const none = new Set<string>();
    expect(isSeriesReviewed("1", none, none)).toBe(false);
    expect(isSeriesReviewed("1", new Set([followMarkId("1")]), none)).toBe(true);
    expect(isSeriesReviewed("1", new Set([skipMarkId("1")]), none)).toBe(true);
    expect(isSeriesReviewed("1", none, new Set(["tv-1"]))).toBe(true);
    expect(isSeriesReviewed("1", new Set(["ep-1-s1e1"]), none)).toBe(true);
    expect(isSeriesReviewed("1", new Set(["ep-12-s1e1"]), none)).toBe(false);
  });
});

describe("followedCount", () => {
  it("telt enkel volg-markeringen", () => {
    expect(followedCount(["follow-tv-1", "follow-no-tv-2", "follow-added-tv-1-s3", "ep-1-s1e1", "follow-tv-9"])).toBe(2);
  });
});

describe("seasonsToAutoAdd", () => {
  it("enkel uitgekomen seizoenen van gevolgde series die nog niet toegevoegd werden", () => {
    const items = [
      { tmdbId: "1", season: 3, released: true },
      { tmdbId: "2", season: 2, released: true },
      { tmdbId: "3", season: 5, released: false },
      { tmdbId: "4", season: 4, released: true },
    ];
    const watched = new Set([followMarkId("1"), followMarkId("3"), followMarkId("4"), autoAddedMarkId("4", 4)]);
    expect(seasonsToAutoAdd(items, watched).map((i) => i.tmdbId)).toEqual(["1"]);
  });
});

describe("shouldAutoFollow", () => {
  it("volgt een lopende serie die je helemaal zag", () => {
    expect(shouldAutoFollow("1", "Returning Series", true, new Set())).toBe(true);
  });
  it("niet als ze afgelopen is, nog niet uitgekeken, al gevolgd of ooit gelaten", () => {
    expect(shouldAutoFollow("1", "Ended", true, new Set())).toBe(false);
    expect(shouldAutoFollow("1", "Returning Series", false, new Set())).toBe(false);
    expect(shouldAutoFollow("1", "Returning Series", true, new Set([followMarkId("1")]))).toBe(false);
    expect(shouldAutoFollow("1", "Returning Series", true, new Set([skipMarkId("1")]))).toBe(false);
  });
});

describe("seasonStatusFromDetail", () => {
  it("laatste uitgezonden seizoen en het volgende met datum", () => {
    expect(
      seasonStatusFromDetail(
        [
          { seasonNumber: 1, episodeCount: 8, airDate: "2023-01-01" },
          { seasonNumber: 2, episodeCount: 8, airDate: "2025-01-01" },
          { seasonNumber: 3, episodeCount: 0, airDate: "2027-02-01" },
        ],
        "2026-11-03",
      ),
    ).toEqual({ lastSeason: 2, nextSeason: { seasonNumber: 3, airDate: "2027-02-01" }, airing: false });
  });
});

describe("airedEpisodeIds", () => {
  const seasons = [
    { seasonNumber: 1, episodeCount: 2 },
    { seasonNumber: 2, episodeCount: 8 },
    { seasonNumber: 3, episodeCount: 10 },
  ];
  it("stopt bij de laatste uitgezonden aflevering, ook midden in een seizoen", () => {
    expect(airedEpisodeIds("9", seasons, { season: 2, episode: 3 })).toEqual([
      "ep-9-s1e1",
      "ep-9-s1e2",
      "ep-9-s2e1",
      "ep-9-s2e2",
      "ep-9-s2e3",
    ]);
  });
  it("is leeg als er nog niets uit is", () => {
    expect(airedEpisodeIds("9", seasons, null)).toEqual([]);
  });
});
