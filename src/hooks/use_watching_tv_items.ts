"use client";

import * as React from "react";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import type { WatchlistItem } from "@/lib/watchlist";
import { useStremio } from "@/hooks/use_stremio";
import { mergeStremioWatching } from "@/lib/stremio-watching";
import { STORED_MAPPING_FRESH_MS, storedStremioTitleMappings, stremioTitleMapping } from "@/lib/stremio-title-mapping";
import { fetchFilmDetail } from "@/lib/film-detail-client";
import {
  buildNewSeasonItems,
  buildWatchingTvItems,
  notStartedSeasonMarkId,
  getEpisodeAfterNearEnd,
  getEpisodeIdAfterWatchingNext,
  getHighestWatchedProgress,
  isSeriesFullyWatched,
  mapSeasonsFromDetail,
  mergeTvSeasons,
  normalizeTvSeasons,
  parseEpisodeWatchedId,
  type NewSeasonItem,
  type TvSeasonInfo,
  type WatchingTvItem,
} from "@/lib/tv-watching-progress";
import { autoAddedMarkId, followMarkId, seasonsToAutoAdd, shouldAutoFollow } from "@/lib/series-follow";

const NEW_SEASON_DISMISSED_KEY = "films_new_season_dismissed_v1";

function readDismissedNewSeasons(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(NEW_SEASON_DISMISSED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export type RemovedWatchingTvItemSnapshot = {
  watchlistItem: WatchlistItem;
  watchedEpisodeIds: string[];
};

/** Traag Stremio mag de pagina niet blokkeren: daarna tonen we wat er is. */
const WATCHING_ORDER_MAX_WAIT_MS = 6000;

export function useWatchingTvItems() {
  const {
    dataLoading,
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
  const stremio = useStremio();
  const [imdbByTmdbId, setImdbByTmdbId] = React.useState<Record<string, string | null>>({});
  const mappingIds = watchlist.filter(item => item.type === "tv" && /^tv-\d+$/.test(item.id)).map(item => item.id.slice(3)).sort().join(",");
  const hasStremioProgress = stremio.connected && stremio.items.length > 0;
  /** Voor welke watchlist alle koppelingen met Stremio bekend zijn: zonder koppeling staat een serie niet op haar plek. */
  const [mappedFor, setMappedFor] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!hasStremioProgress || !mappingIds) return;
    let active = true;
    const all = Array.from(new Set(mappingIds.split(",")));
    // Wat dit toestel al kent, meteen gebruiken: de kaarten «aan het kijken» wachten dan niet op 36 opzoekingen.
    const stored = storedStremioTitleMappings(all);
    const known = Object.entries(stored);
    if (known.length > 0) {
      setImdbByTmdbId(prev => {
        const next = { ...prev };
        for (const [id, entry] of known) if (!(id in next)) next[id] = entry.mapping.imdbId;
        return next;
      });
      setFetchedSeasons(prev => {
        const next = { ...prev };
        for (const [id, entry] of known) if (!(id in next) && entry.mapping.seasons.length > 0) next[id] = entry.mapping.seasons;
        return next;
      });
    }
    // Opzoeken: eerst wat nog ontbreekt, daarna (op de achtergrond) wat al een tijd bewaard is.
    const missing = all.filter(id => !stored[id]);
    const ids = [...missing, ...all.filter(id => stored[id] && Date.now() - stored[id].at > STORED_MAPPING_FRESH_MS)];
    let missingLeft = missing.length;
    if (missingLeft === 0) setMappedFor(mappingIds);
    let index = 0;
    const worker = async () => {
      while (active && index < ids.length) {
        const position = index++;
        const tmdbId = ids[position];
        try {
          const mapping = await stremioTitleMapping(tmdbId);
          if (!active) return;
          setImdbByTmdbId(prev => prev[tmdbId] === mapping.imdbId ? prev : { ...prev, [tmdbId]: mapping.imdbId });
          setFetchedSeasons(prev => prev[tmdbId] === mapping.seasons ? prev : { ...prev, [tmdbId]: mapping.seasons });
        } catch { /* Retry unavailable metadata on the next Stremio snapshot. */ }
        if (active && position < missing.length && --missingLeft === 0) setMappedFor(mappingIds);
      }
    };
    // Over HTTP/2 (lokaal) en op de gehoste site kunnen er meer tegelijk; zes houdt de TMDB-route rustig.
    void Promise.all(Array.from({ length: Math.min(6, ids.length) }, worker));
    return () => { active = false; };
  }, [mappingIds, hasStremioProgress, stremio.syncedAt]);
  /** Seizoenen zoals TMDB ze nu kent, ook aangekondigde zonder afleveringen (voor «Nieuw seizoen»). */
  const [rawSeasons, setRawSeasons] = React.useState<Record<string, TvSeasonInfo[]>>({});
  /** TMDB-status per serie («Returning Series», «Ended», …), voor automatisch volgen. */
  const [statuses, setStatuses] = React.useState<Record<string, string | null>>({});
  /** Sfeerbeeld per serie, voor de teaserkaart «Nieuw seizoen». */
  const [backdrops, setBackdrops] = React.useState<Record<string, string | null>>({});
  const [dismissedNewSeasons, setDismissedNewSeasons] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => setDismissedNewSeasons(readDismissedNewSeasons()), []);
  // Per titel één keer per bezoek: het effect loopt opnieuw zodra de bewaarde seizoenen veranderen.
  const fetchingRef = React.useRef<Set<string>>(new Set());
  const cleanedRef = React.useRef<Set<string>>(new Set());

  const watchingItems = React.useMemo(
    () =>
      mergeStremioWatching({ manual: buildWatchingTvItems({
        watchedIds,
        watchlist,
        seriesMeta,
        seasonsByTmdbId: fetchedSeasons,
      }), watchlist, watchedIds, progress: stremio.connected ? stremio.items : [], imdbByTmdbId, stale: Boolean(stremio.error) }),
    [watchedIds, watchlist, seriesMeta, fetchedSeasons, stremio.connected, stremio.items, stremio.error, imdbByTmdbId],
  );

  // Is de volgorde definitief? Eén keer waar blijft waar: een latere synchronisatie mag de pagina niet terug laten laden.
  const [orderWaitOver, setOrderWaitOver] = React.useState(false);
  React.useEffect(() => {
    if (dataLoading) return;
    const timer = setTimeout(() => setOrderWaitOver(true), WATCHING_ORDER_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [dataLoading]);
  const watchingReadyRef = React.useRef(false);
  if (orderWaitOver || (!dataLoading && !stremio.loading && (!hasStremioProgress || !mappingIds || mappedFor === mappingIds))) {
    watchingReadyRef.current = true;
  }
  const watchingReady = watchingReadyRef.current;

  const newSeasonItems = React.useMemo(
    (): NewSeasonItem[] =>
      buildNewSeasonItems({
        watchedIds,
        watchlist,
        seriesMeta,
        rawSeasonsByTmdbId: rawSeasons,
        backdropByTmdbId: backdrops,
        dismissed: dismissedNewSeasons,
      }),
    [watchedIds, watchlist, seriesMeta, rawSeasons, backdrops, dismissedNewSeasons],
  );

  const setNewSeasonDismissed = React.useCallback((item: NewSeasonItem, dismissed: boolean) => {
    setDismissedNewSeasons((prev) => {
      const next = new Set(prev);
      const key = `${item.tmdbId}-s${item.season}`;
      if (dismissed) next.add(key);
      else next.delete(key);
      try {
        localStorage.setItem(NEW_SEASON_DISMISSED_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // «Series volgen»: een nieuw seizoen van een gevolgde serie één keer vanzelf op de watchlist.
  const autoAddedRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    for (const item of seasonsToAutoAdd(newSeasonItems, new Set(watchedIds))) {
      const markId = autoAddedMarkId(item.tmdbId, item.season);
      if (autoAddedRef.current.has(markId)) continue;
      autoAddedRef.current.add(markId);
      void addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl, score: null })
        .then(() => markWatched(markId))
        .catch(() => autoAddedRef.current.delete(markId));
    }
  }, [newSeasonItems, watchedIds, addToWatchlist, markWatched]);

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

      void fetchFilmDetail<{
        title: string;
        year: string;
        posterUrl: string | null;
        backdropUrl?: string | null;
        status?: string | null;
        seasons?: { seasonNumber: number; episodeCount: number; name?: string; airDate?: string | null; posterUrl?: string | null }[];
      }>("tv", tmdbId)
        .then(
          (data) => {
            setStatuses((prev) => ({ ...prev, [tmdbId]: data.status ?? null }));
            setBackdrops((prev) => ({ ...prev, [tmdbId]: data.backdropUrl ?? null }));
            setRawSeasons((prev) => ({
              ...prev,
              [tmdbId]: (data.seasons ?? [])
                .filter((x) => x.seasonNumber > 0)
                .map((x) => ({ seasonNumber: x.seasonNumber, episodeCount: x.episodeCount, name: x.name, airDate: x.airDate ?? null, posterUrl: x.posterUrl ?? null })),
            }));
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
            }).catch(() => { /* Volgende keer opnieuw bewaard. */ });
          },
        )
        // Mislukt: bij een volgende keer opnieuw proberen. Gelukt: blijft in de set, geen herhaling.
        .catch(() => fetchingRef.current.delete(tmdbId));
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

  // «Series volgen»: een lopende serie die je helemaal uitkeek, vanzelf volgen (tenzij je ze liet vallen).
  const autoFollowedRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const watched = new Set(watchedIds);
    for (const tmdbId of watchingTmdbIds) {
      if (autoFollowedRef.current.has(tmdbId) || !(tmdbId in statuses)) continue;
      const lastWatched = getHighestWatchedProgress(watchedIds, tmdbId);
      const seasons = getSeasonsFor(tmdbId);
      const fully = Boolean(lastWatched && seasons?.length && isSeriesFullyWatched(lastWatched, seasons));
      if (!shouldAutoFollow(tmdbId, statuses[tmdbId], fully, watched)) continue;
      autoFollowedRef.current.add(tmdbId);
      void markWatched(followMarkId(tmdbId)).catch(() => autoFollowedRef.current.delete(tmdbId));
    }
  }, [watchingTmdbIds, watchedIds, statuses, getSeasonsFor, markWatched]);

  const markNextEpisode = React.useCallback(
    async (item: WatchingTvItem) => {
      const seasons = getSeasonsFor(item.tmdbId);
      const next = item.stremio ? { season: item.nextSeason, episode: item.nextEpisode } : getEpisodeIdAfterWatchingNext(item.lastWatched, seasons);
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

  /** Nieuw seizoen nog niet begonnen: uit «Aan het kijken», op de watchlist. Geeft de markering terug (voor «Zet terug»). */
  const markSeasonNotStarted = React.useCallback(
    async (item: WatchingTvItem): Promise<string> => {
      const markId = notStartedSeasonMarkId(item.tmdbId, item.nextSeason);
      if (!isInWatchlist(item.id)) {
        await addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl, score: null });
      }
      await markWatched(markId);
      return markId;
    },
    [isInWatchlist, addToWatchlist, markWatched],
  );

  const restoreWatchingItem = React.useCallback(
    async (snapshot: RemovedWatchingTvItemSnapshot) => {
      await addToWatchlist(snapshot.watchlistItem);
      await Promise.all(snapshot.watchedEpisodeIds.map((id) => markWatched(id)));
    },
    [addToWatchlist, markWatched],
  );

  const episodeAfterNearEnd = React.useCallback(
    (item: WatchingTvItem) => getEpisodeAfterNearEnd(item, getSeasonsFor(item.tmdbId)),
    [getSeasonsFor],
  );

  return {
    watchingItems,
    watchingReady,
    episodeAfterNearEnd,
    markNextEpisode,
    markSeasonWatched,
    markSeriesWatched,
    unmarkEpisodes: unmarkWatchedMany,
    removeWatchingItem,
    restoreWatchingItem,
    markSeasonNotStarted,
    unmarkWatchedEpisode: unmarkWatched,
    newSeasonItems,
    dismissNewSeason: (item: NewSeasonItem) => setNewSeasonDismissed(item, true),
    restoreNewSeason: (item: NewSeasonItem) => setNewSeasonDismissed(item, false),
  };
}

export type { NewSeasonItem, WatchingTvItem };
