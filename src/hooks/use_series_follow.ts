"use client";

import * as React from "react";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import {
  episodeIdsThrough,
  followedCount,
  followMarkId,
  isSeriesReviewed,
  skipMarkId,
  type OngoingSeries,
} from "@/lib/series-follow";

/** Per bezoek één keer ophalen; banner en wizard delen het resultaat. `v` = versie van de selectie (oude caches omzeilen). */
let ongoingPromise: Promise<OngoingSeries[]> | null = null;

export function fetchOngoingSeries(): Promise<OngoingSeries[]> {
  if (!ongoingPromise) {
    ongoingPromise = fetch("/api/films/ongoing?v=2")
      .then((r) => {
        if (!r.ok) throw new Error(`ongoing ${r.status}`);
        return r.json() as Promise<{ series: OngoingSeries[] }>;
      })
      .then((d) => d.series ?? [])
      .catch((err) => {
        ongoingPromise = null;
        throw err;
      });
  }
  return ongoingPromise;
}

/** Lopende series die je nog niet overliep (voor de banner op «Films & series»). */
export function useUnreviewedOngoingSeries(enabled: boolean): OngoingSeries[] | null {
  const { watchedSet, watchlist, dataLoading } = useFilmsLibrary();
  const [all, setAll] = React.useState<OngoingSeries[] | null>(null);
  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchOngoingSeries().then((s) => active && setAll(s), () => {});
    return () => {
      active = false;
    };
  }, [enabled]);
  return React.useMemo(() => {
    if (!all || dataLoading) return null;
    const onWatchlist = new Set(watchlist.map((i) => i.id));
    return all.filter((s) => !isSeriesReviewed(s.tmdbId, watchedSet, onWatchlist));
  }, [all, dataLoading, watchedSet, watchlist]);
}

type Step = { tmdbId: string; marked: string[]; addedToWatchlist: boolean };

const CHUNK = 150;

/**
 * Wizard «Series volgen»: één voor één de lopende series die je nog niet overliep.
 * De wachtrij wordt één keer vastgelegd, zodat je eigen keuzes ze niet door elkaar schudden.
 */
export function useSeriesFollow() {
  const library = useFilmsLibrary();
  const { watchedSet, watchedIds, watchlist, dataLoading, markWatchedMany, unmarkWatchedMany, addToWatchlist, removeFromWatchlist, saveSeriesMeta, isInWatchlist } = library;
  const [all, setAll] = React.useState<OngoingSeries[] | null>(null);
  const [error, setError] = React.useState(false);
  const [queue, setQueue] = React.useState<OngoingSeries[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [history, setHistory] = React.useState<Step[]>([]);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    setError(false);
    fetchOngoingSeries().then(setAll, () => setError(true));
  }, []);
  React.useEffect(load, [load]);

  React.useEffect(() => {
    if (queue || !all || dataLoading) return;
    const onWatchlist = new Set(watchlist.map((i) => i.id));
    setQueue(all.filter((s) => !isSeriesReviewed(s.tmdbId, watchedSet, onWatchlist)));
  }, [queue, all, dataLoading, watchedSet, watchlist]);

  const current = queue?.[index] ?? null;

  const mark = React.useCallback(
    async (ids: string[]) => {
      const todo = ids.filter((id) => !watchedSet.has(id));
      for (let i = 0; i < todo.length; i += CHUNK) await markWatchedMany(todo.slice(i, i + CHUNK));
      return todo;
    },
    [watchedSet, markWatchedMany],
  );

  const watchlistItem = (s: OngoingSeries) => ({
    id: `tv-${s.tmdbId}`,
    type: "tv" as const,
    title: s.title,
    year: s.year,
    posterUrl: s.posterUrl,
    score: s.score,
    scoreSource: "tmdb" as const,
    overview: s.overview || null,
  });

  const run = React.useCallback(
    async (action: (s: OngoingSeries) => Promise<Step>) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        const step = await action(current);
        setHistory((h) => [...h, step]);
        setIndex((i) => i + 1);
      } finally {
        setBusy(false);
      }
    },
    [current, busy],
  );

  /** «Ik kijk dit»: afleveringen t.e.m. `through` gezien, serie gevolgd. Nog niet bij? Dan ook op de watchlist. */
  const follow = (through: number) =>
    run(async (s) => {
      await saveSeriesMeta(s.tmdbId, {
        title: s.title,
        year: s.year,
        posterUrl: s.posterUrl,
        seasons: s.seasons.map(({ seasonNumber, episodeCount }) => ({ seasonNumber, episodeCount })),
      });
      const marked = await mark([...episodeIdsThrough(s.tmdbId, s.seasons, through), followMarkId(s.tmdbId)]);
      const behind = through < s.lastSeason && !isInWatchlist(`tv-${s.tmdbId}`);
      if (behind) await addToWatchlist(watchlistItem(s));
      return { tmdbId: s.tmdbId, marked, addedToWatchlist: behind };
    });

  /** «Kijk ik niet»: niet meer vragen. */
  const skip = () => run(async (s) => ({ tmdbId: s.tmdbId, marked: await mark([skipMarkId(s.tmdbId)]), addedToWatchlist: false }));

  /** «Wil ik zien»: op de watchlist om eraan te beginnen. */
  const want = () =>
    run(async (s) => {
      const added = !isInWatchlist(`tv-${s.tmdbId}`);
      if (added) await addToWatchlist(watchlistItem(s));
      return { tmdbId: s.tmdbId, marked: [], addedToWatchlist: added };
    });

  /** «Vorige»: laatste keuze ongedaan maken en die serie opnieuw tonen. */
  const undo = React.useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      if (last.marked.length) await unmarkWatchedMany(last.marked);
      if (last.addedToWatchlist) await removeFromWatchlist(`tv-${last.tmdbId}`);
      setHistory((h) => h.slice(0, -1));
      setIndex((i) => Math.max(0, i - 1));
    } finally {
      setBusy(false);
    }
  }, [history, busy, unmarkWatchedMany, removeFromWatchlist]);

  const followedPosters = React.useMemo(() => {
    const byId = new Map((all ?? []).map((s) => [s.tmdbId, s.posterUrl]));
    return watchedIds
      .filter((id) => /^follow-tv-\d+$/.test(id))
      .map((id) => byId.get(id.slice("follow-tv-".length)) ?? null)
      .filter((p): p is string => Boolean(p))
      .reverse();
  }, [all, watchedIds]);

  return {
    loading: !error && (queue === null),
    error,
    retry: load,
    current,
    position: index + 1,
    total: queue?.length ?? 0,
    done: queue !== null && index >= queue.length,
    canUndo: history.length > 0,
    busy,
    follow,
    skip,
    want,
    undo,
    followed: followedCount(watchedIds),
    followedPosters,
  };
}
