import { describe, expect, it } from "vitest";
import {
  getHighestWatchedProgress,
  getNextEpisodeToWatch,
  isSeriesFullyWatched,
  buildWatchingTvItems,
} from "@/lib/tv-watching-progress";

const HALF_MAN_SEASONS = [{ seasonNumber: 1, episodeCount: 8 }];

describe("getNextEpisodeToWatch", () => {
  it("na s1e0 is volgende s1e1", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 0 }, HALF_MAN_SEASONS)).toEqual({
      season: 1,
      episode: 1,
    });
  });

  it("na s1e7 is volgende s1e8", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 7 }, HALF_MAN_SEASONS)).toEqual({
      season: 1,
      episode: 8,
    });
  });

  it("na s1e8 is serie klaar (geen aflevering 9)", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 8 }, HALF_MAN_SEASONS)).toBeNull();
    expect(isSeriesFullyWatched({ season: 1, episode: 8 }, HALF_MAN_SEASONS)).toBe(true);
  });

  it("na ongeldige s1e9 is serie ook klaar", () => {
    expect(getNextEpisodeToWatch({ season: 1, episode: 9 }, HALF_MAN_SEASONS)).toBeNull();
  });
});

describe("buildWatchingTvItems", () => {
  it("verbergt series waar het laatste seizoen volledig bekeken is", () => {
    const items = buildWatchingTvItems({
      watchedIds: ["ep-999-s1e8"],
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
      watchedIds: ["ep-999-s1e7"],
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
    expect(items[0]?.nextEpisode).toBe(8);
  });
});

describe("getHighestWatchedProgress", () => {
  it("kiest hoogste ep-id", () => {
    expect(
      getHighestWatchedProgress(["ep-1-s1e3", "ep-1-s1e8", "ep-1-s2e1"], "1"),
    ).toEqual({ season: 2, episode: 1 });
  });
});
