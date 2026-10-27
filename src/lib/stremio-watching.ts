import type { StremioProgress } from "./stremio-progress";
import { getHighestWatchedProgress, type WatchingTvItem } from "./tv-watching-progress";
import type { WatchlistItem } from "./watchlist";

/** Only resume watchlisted, unfinished episodes; explicit manual progress never moves backwards. */
export function mergeStremioWatching(input: {
  manual: WatchingTvItem[]; watchlist: readonly WatchlistItem[]; progress: readonly StremioProgress[];
  imdbByTmdbId: Record<string, string | null | undefined>; watchedIds: readonly string[]; stale?: boolean;
}): WatchingTvItem[] {
  const items = new Map(input.manual.map(item => [item.id, item]));
  const byImdb = new Map(input.progress.filter(item => item.type === "tv").map(item => [item.imdbId, item]));
  const watched = new Set(input.watchedIds);
  for (const row of input.watchlist) {
    if (row.type !== "tv" || !/^tv-\d+$/.test(row.id)) continue;
    const tmdbId = row.id.slice(3), imdb = input.imdbByTmdbId[tmdbId];
    const progress = imdb ? byImdb.get(imdb) : undefined;
    if (!progress || progress.season === undefined || !progress.episode || progress.positionMs <= 0 || progress.durationMs <= 0 || progress.positionMs >= progress.durationMs) continue;
    if (watched.has(row.id) || watched.has(`ep-${tmdbId}-s${progress.season}e${progress.episode}`)) continue;
    const existing = items.get(row.id);
    const lastWatched = getHighestWatchedProgress(input.watchedIds, tmdbId) ?? existing?.lastWatched;
    if (lastWatched && (lastWatched.season > progress.season || (lastWatched.season === progress.season && lastWatched.episode >= progress.episode))) continue;
    items.set(row.id, {
      tmdbId, id: row.id, title: row.title, posterUrl: row.posterUrl, year: row.year,
      lastWatched: lastWatched ?? { season: progress.season, episode: 0 },
      nextSeason: progress.season, nextEpisode: progress.episode,
      stremio: { ...progress, stale: Boolean(input.stale) },
    });
  }
  return Array.from(items.values()).sort((a, b) => (b.stremio?.lastWatchedAt ?? 0) - (a.stremio?.lastWatchedAt ?? 0));
}
