"use client";

import * as React from "react";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import type { WatchlistItem } from "@/lib/watchlist";
import {
  buildWatchingTvItems,
  getEpisodeIdAfterWatchingNext,
  getHighestWatchedProgress,
  isSeriesFullyWatched,
  mapSeasonsFromDetail,
  mergeTvSeasons,
  normalizeTvSeasons,
  parseEpisodeWatchedId,
  type TvSeasonInfo,
  type WatchingTvItem,
} from "@/lib/tv-watching-progress";

export type RemovedWatchingTvItemSnapshot = {
  watchlistItem: WatchlistItem;
  watchedEpisodeIds: string[];
};

export function useWatchingTvItems() {
  const {
    watchedIds,
    watchlist,
    seriesMeta,
    addToWatchlist,
    saveSeriesMeta,
    removeFromWatchlist,
    markWatched,
    unmarkWatched,
    markWatchedMany,
    unmarkWatchedMany,
    isInWatchlist,
  } = useFilmsLibrary();

  const [fetchedSeasons, setFetchedSeasons] = React.useState<Record<string, TvSeasonInfo[]>>({});
  const fetchingRef = React.useRef<Set<string>>(new Set());
  const cleanedRef = React.useRef<Set<string>>(new Set());

  const watchingItems = React.useMemo(
    () =>
      buildWatchingTvItems({
        watchedIds,
        watchlist,
        seriesMeta,
        seasonsByTmdbId: fetchedSeasons,
      }),
    [watchedIds, watchlist, seriesMeta, fetchedSeasons],
  );

  const watchingTmdbIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const id of watchedIds) {
      const parsed = parseEpisodeWatchedId(id);
      if (parsed) ids.add(parsed.tmdbId);
    }
    return Array.from(ids);
  }, [watchedIds]);

  const getSeasonsFor = React.useCallback(
    (tmdbId: string): TvSeasonInfo[] | undefined => {
      const merged = mergeTvSeasons(fetchedSeasons[tmdbId], seriesMeta[tmdbId]?.seasons);
      return merged.length > 0 ? merged : undefined;
    },
    [fetchedSeasons, seriesMeta],
  );

  React.useEffect(() => {
    for (const tmdbId of watchingTmdbIds) {
      if (fetchingRef.current.has(tmdbId)) continue;
      fetchingRef.current.add(tmdbId);

      void fetch(`/api/films/detail?type=tv&id=${tmdbId}`)
        .then((r) => r.json())
        .then(
          (data: {
            title: string;
            year: string;
            posterUrl: string | null;
            seasons?: { seasonNumber: number; episodeCount: number; name?: string }[];
          }) => {
            const remoteSeasons = mapSeasonsFromDetail(data.seasons);
            if (remoteSeasons.length === 0) return;
            const seasons = mergeTvSeasons(seriesMeta[tmdbId]?.seasons, remoteSeasons);
            setFetchedSeasons((prev) => ({ ...prev, [tmdbId]: seasons }));
            const existing = seriesMeta[tmdbId];
            void saveSeriesMeta(tmdbId, {
              title: existing?.title ?? data.title,
              year: existing?.year ?? data.year,
              posterUrl: existing?.posterUrl ?? data.posterUrl,
              seasons,
            });
          },
        )
        .finally(() => {
          fetchingRef.current.delete(tmdbId);
        });
    }
  }, [watchingTmdbIds, seriesMeta, saveSeriesMeta]);

  React.useEffect(() => {
    for (const tmdbId of watchingTmdbIds) {
      const mediaId = `tv-${tmdbId}`;
      if (cleanedRef.current.has(tmdbId)) continue;
      if (!isInWatchlist(mediaId)) continue;

      const lastWatched = getHighestWatchedProgress(watchedIds, tmdbId);
      if (!lastWatched) continue;

      const seasons = getSeasonsFor(tmdbId);
      if (!seasons?.length) continue;

      if (isSeriesFullyWatched(lastWatched, seasons)) {
        cleanedRef.current.add(tmdbId);
        void removeFromWatchlist(mediaId);
      }
    }
  }, [watchingTmdbIds, watchedIds, getSeasonsFor, isInWatchlist, removeFromWatchlist]);

  const markNextEpisode = React.useCallback(
    async (item: WatchingTvItem) => {
      const seasons = getSeasonsFor(item.tmdbId);
      const next = getEpisodeIdAfterWatchingNext(item.lastWatched, seasons);
      if (!next) {
        await removeFromWatchlist(item.id);
        return { completed: true as const, epId: null, episode: null };
      }
      const epId = `ep-${item.tmdbId}-s${next.season}e${next.episode}`;
      await markWatched(epId);
      return {
        completed: false as const,
        epId,
        episode: next.episode,
        season: next.season,
      };
    },
    [getSeasonsFor, removeFromWatchlist, markWatched],
  );

  /**
   * Rest van het huidige seizoen als bekeken (canvas «20 · menu»). Geeft de gemarkeerde ids terug
   * (voor «ongedaan maken»), of null als de seizoensdata nog ontbreekt.
   */
  const markSeasonWatched = React.useCallback(
    async (item: WatchingTvItem): Promise<{ ids: string[]; season: number } | null> => {
      const season = normalizeTvSeasons(getSeasonsFor(item.tmdbId)).find((s) => s.seasonNumber === item.nextSeason);
      if (!season) return null;
      const ids: string[] = [];
      for (let e = item.nextEpisode; e <= season.episodeCount; e++) ids.push(`ep-${item.tmdbId}-s${season.seasonNumber}e${e}`);
      await markWatchedMany(ids);
      return { ids, season: season.seasonNumber };
    },
    [getSeasonsFor, markWatchedMany],
  );

  /** Alle resterende afleveringen als bekeken; de serie verdwijnt dan uit «Aan het kijken» en de watchlist. */
  const markSeriesWatched = React.useCallback(
    async (item: WatchingTvItem): Promise<{ ids: string[]; watchlistItem: WatchlistItem | null } | null> => {
      const seasons = normalizeTvSeasons(getSeasonsFor(item.tmdbId));
      if (seasons.length === 0) return null;
      const ids: string[] = [];
      for (const s of seasons) {
        if (s.seasonNumber < item.nextSeason) continue;
        const start = s.seasonNumber === item.nextSeason ? item.nextEpisode : 1;
        for (let e = start; e <= s.episodeCount; e++) ids.push(`ep-${item.tmdbId}-s${s.seasonNumber}e${e}`);
      }
      const watchlistItem: WatchlistItem | null = isInWatchlist(item.id)
        ? { id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl, score: null }
        : null;
      await markWatchedMany(ids);
      if (watchlistItem) await removeFromWatchlist(item.id);
      return { ids, watchlistItem };
    },
    [getSeasonsFor, markWatchedMany, isInWatchlist, removeFromWatchlist],
  );

  const getWatchedEpisodeIdsFor = React.useCallback(
    (tmdbId: string) =>
      watchedIds.filter((id) => parseEpisodeWatchedId(id)?.tmdbId === tmdbId),
    [watchedIds],
  );

  const removeWatchingItem = React.useCallback(
    async (item: WatchingTvItem): Promise<RemovedWatchingTvItemSnapshot> => {
      const watchedEpisodeIds = getWatchedEpisodeIdsFor(item.tmdbId);
      const watchlistItem: WatchlistItem = {
        id: item.id,
        type: "tv",
        title: item.title,
        year: item.year,
        posterUrl: item.posterUrl,
        score: null,
      };

      await Promise.all(watchedEpisodeIds.map((id) => unmarkWatched(id)));
      await removeFromWatchlist(item.id);

      return { watchlistItem, watchedEpisodeIds };
    },
    [getWatchedEpisodeIdsFor, removeFromWatchlist, unmarkWatched],
  );

  const restoreWatchingItem = React.useCallback(
    async (snapshot: RemovedWatchingTvItemSnapshot) => {
      await addToWatchlist(snapshot.watchlistItem);
      await Promise.all(snapshot.watchedEpisodeIds.map((id) => markWatched(id)));
    },
    [addToWatchlist, markWatched],
  );

  return {
    watchingItems,
    markNextEpisode,
    markSeasonWatched,
    markSeriesWatched,
    unmarkEpisodes: unmarkWatchedMany,
    removeWatchingItem,
    restoreWatchingItem,
    unmarkWatchedEpisode: unmarkWatched,
  };
}

export type { WatchingTvItem };
