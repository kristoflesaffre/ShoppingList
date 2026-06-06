import { describe, expect, it } from "vitest";
import {
  getHighestWatchedProgress,
  getNextEpisodeToWatch,
  isSeriesFullyWatched,
  buildWatchingTvItems,
  mergeTvSeasons,
} from "@/lib/tv-watching-progress";

const HALF_MAN_SEASONS = [{ seasonNumber: 1, episodeCount: 6 }];
const TWO_SEASON_SHOW = [
  { seasonNumber: 1, episodeCount: 8 },
  { seasonNumber: 2, episodeCount: 10 },
];

describe("getNextEpisodeToWatch", () => {
  it("na s1e0 is volgende s1e1", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 0 }, HALF_MAN_SEASONS)).toEqual({
      season: 1,
      episode: 1,
    });
  });

  it("na s1e5 is volgende s1e6", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 5 }, HALF_MAN_SEASONS)).toEqual({
      season: 1,
      episode: 6,
    });
  });

  it("na s1e6 is Half Man klaar (één seizoen)", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 6 }, HALF_MAN_SEASONS)).toBeNull();
    expect(isSeriesFullyWatched({ season: 1, episode: 6 }, HALF_MAN_SEASONS)).toBe(true);
  });

  it("na ongeldige s1e9 is serie ook klaar", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 9 }, HALF_MAN_SEASONS)).toBeNull();
  });

  it("na laatste aflevering seizoen 1 gaat het naar seizoen 2 aflevering 1", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 8 }, TWO_SEASON_SHOW)).toEqual({
      season: 2,
      episode: 1,
    });
    expect(isSeriesFullyWatched({ season: 1, episode: 8 }, TWO_SEASON_SHOW)).toBe(false);
  });
});

describe("mergeTvSeasons", () => {
  it("voegt ontbrekend seizoen 2 toe uit API-data", () => {
    const local = [{ seasonNumber: 1, episodeCount: 8 }];
    const remote = [
      { seasonNumber: 1, episodeCount: 8 },
      { seasonNumber: 2, episodeCount: 6 },
    ];
    expect(mergeTvSeasons(local, remote)).toEqual([
      { seasonNumber: 1, episodeCount: 8 },
      { seasonNumber: 2, episodeCount: 6 },
    ]);
  });
});

describe("buildWatchingTvItems", () => {
  it("toont seizoen 2 na voltooiing seizoen 1", () => {
    const items = buildWatchingTvItems({
      watchedIds: ["ep-42-s1e8"],
      watchlist: [
        {
          id: "tv-42",
          type: "tv",
          title: "Voorbeeldserie",
          year: "2024",
          posterUrl: null,
        },
      ],
      seriesMeta: {
        "42": {
          title: "Voorbeeldserie",
          year: "2024",
          posterUrl: null,
          seasons: TWO_SEASON_SHOW,
        },
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.nextSeason).toBe(2);
    expect(items[0]?.nextEpisode).toBe(1);
  });

  it("verbergt series waar het laatste seizoen volledig bekeken is", () => {
    const items = buildWatchingTvItems({
      watchedIds: ["ep-999-s1e6"],
      watchlist: [
        {
          id: "tv-999",
          type: "tv",
          title: "Half Man",
          year: "2026",
          posterUrl: null,
        },
      ],
      seriesMeta: {
        "999": { title: "Half Man", year: "2026", posterUrl: null, seasons: HALF_MAN_SEASONS },
      },
    });
    expect(items).toHaveLength(0);
  });

  it("toont correcte volgende aflevering", () => {
    const items = buildWatchingTvItems({
      watchedIds: ["ep-999-s1e5"],
      watchlist: [
        {
          id: "tv-999",
          type: "tv",
          title: "Half Man",
          year: "2026",
          posterUrl: null,
        },
      ],
      seriesMeta: {
        "999": { title: "Half Man", year: "2026", posterUrl: null, seasons: HALF_MAN_SEASONS },
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.nextSeason).toBe(1);
    expect(items[0]?.nextEpisode).toBe(6);
  });
});

describe("getHighestWatchedProgress", () => {
  it("kiest hoogste ep-id", () => {
    expect(
      getHighestWatchedProgress(["ep-1-s1e3", "ep-1-s1e8", "ep-1-s2e1"], "1"),
    ).toEqual({ season: 2, episode: 1 });
  });
});
