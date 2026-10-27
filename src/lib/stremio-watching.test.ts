import { expect, it } from "vitest";
import { mergeStremioWatching } from "./stremio-watching";
import type { StremioProgress } from "./stremio-progress";
import type { WatchingTvItem } from "./tv-watching-progress";
const carrie = { id: "tv-288673", type: "tv" as const, title: "Carrie", year: "2026", posterUrl: null };
const progress: StremioProgress = { imdbId: "tt11540908", type: "tv", title: "Carrie", season: 1, episode: 1, positionMs: 2_921_861, durationMs: 3_311_168, percent: 88, lastWatchedAt: 1000 };
const input = { manual: [] as WatchingTvItem[], watchlist: [carrie], progress: [progress], imdbByTmdbId: { "288673": "tt11540908" }, watchedIds: [] as string[] };
const manual: WatchingTvItem = { ...carrie, tmdbId: "288673", lastWatched: { season: 1, episode: 1 }, nextSeason: 1, nextEpisode: 2 };
it("includes partial first episodes without making a watched mark", () => {
  const [item] = mergeStremioWatching(input);
  expect(item).toMatchObject({ id: carrie.id, nextSeason: 1, nextEpisode: 1, stremio: { percent: 88 } });
  expect(input.watchedIds).toEqual([]);
  expect(item.lastWatched.episode).toBe(0);
});
it("requires an exact IMDb match and never matches on the title alone", () => {
  expect(mergeStremioWatching({ ...input, imdbByTmdbId: { "288673": "tt0108778" } })).toEqual([]);
  expect(mergeStremioWatching({ ...input, imdbByTmdbId: {} })).toEqual([]);
});
it("does not fill currently watching with unwatchlisted historical titles or movies", () => {
  expect(mergeStremioWatching({ ...input, watchlist: [] })).toEqual([]);
  expect(mergeStremioWatching({ ...input, progress: [{ ...progress, type: "movie" }] })).toEqual([]);
});
it("ignores unstarted, completed or indeterminate playback", () => {
  for (const changed of [{ positionMs: 0 }, { durationMs: 0 }, { positionMs: progress.durationMs }, { episode: undefined }]) {
    expect(mergeStremioWatching({ ...input, progress: [{ ...progress, ...changed }] })).toEqual([]);
  }
});
it("preserves explicit manual progress over stale Stremio playback", () => {
  expect(mergeStremioWatching({ ...input, manual: [manual], watchedIds: ["ep-288673-s1e1"] })).toEqual([manual]);
  expect(mergeStremioWatching({ ...input, watchedIds: ["ep-288673-s2e8"] })).toEqual([]);
  expect(mergeStremioWatching({ ...input, watchedIds: [carrie.id] })).toEqual([]);
});
it("merges later Stremio playback into one card without duplicates", () => {
  const result = mergeStremioWatching({ ...input, manual: [manual], progress: [{ ...progress, episode: 4 }], watchedIds: ["ep-288673-s1e1"] });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ nextEpisode: 4, lastWatched: { season: 1, episode: 1 } });
});
it("keeps manual-only titles and labels unavailable sync as stale", () => {
  const other = { ...manual, id: "tv-123", tmdbId: "123", title: "Other" };
  const result = mergeStremioWatching({ ...input, manual: [other], stale: true });
  expect(result[0].stremio?.stale).toBe(true);
  expect(result[1]).toEqual(other);
});
it("removing the watchlist entry removes a Stremio-only card", () => {
  expect(mergeStremioWatching(input)).toHaveLength(1);
  expect(mergeStremioWatching({ ...input, watchlist: [] })).toEqual([]);
});
