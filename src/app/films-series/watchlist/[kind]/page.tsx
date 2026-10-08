"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { Snackbar } from "@/components/ui/snackbar";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { Shimmer } from "@/components/ui/shimmer";
import { FilmIcons } from "@/components/films/film_detail_ui";
import { PosterTile } from "@/components/films/film_tiles";
import { getScoreSourceCache } from "@/lib/score_source_cache";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";

type Kind = "films" | "series";

const CONFIG: Record<
  Kind,
  { mediaType: "movie" | "tv"; pageTitle: string; sectionTitle: string }
> = {
  films: {
    mediaType: "movie",
    pageTitle: "Watchlist films",
    sectionTitle: "Watchlist films",
  },
  series: {
    mediaType: "tv",
    pageTitle: "Watchlist series",
    sectionTitle: "Watchlist series",
  },
};

const REMOVE_ANIM_MS = 420;

type DetailPayload = {
  genres: string[];
  cast: { name: string }[];
  overview: string;
  score: number | null;
  releaseDate?: string | null;
  trailerKey?: string | null;
  imdbId?: string | null;
};

type EnrichedItem = WatchlistItem & {
  genres: string[];
  castNames: string;
  overview: string;
  metaLine: string;
  releaseDate?: string | null;
  trailerKey?: string | null;
  imdbId?: string | null;
};

type ListTab = "alleen" | "samen";

function buildMetaLine(year: string, genres: string[]): string {
  const genrePart = genres.join(" - ");
  if (year && genrePart) return `${year} / ${genrePart}`;
  return year || genrePart;
}

function formatCast(names: string[]): string {
  if (names.length === 0) return "";
  const joined = names.slice(0, 4).join(", ");
  return names.length > 4 ? `${joined},....` : joined;
}

function toEnriched(
  item: WatchlistItem,
  data: DetailPayload | null,
): EnrichedItem {
  const genres = data?.genres ?? [];
  const castNames = formatCast((data?.cast ?? []).map((c) => c.name));
  const overview = item.overview ?? data?.overview ?? "";
  const score = item.score ?? data?.score ?? null;
  return {
    ...item,
    score,
    genres,
    castNames,
    overview,
    metaLine: buildMetaLine(item.year, genres),
    releaseDate: data?.releaseDate ?? null,
    trailerKey: data?.trailerKey ?? null,
    imdbId: data?.imdbId ?? null,
  };
}

export default function WatchlistKindPage() {
  const router = useRouter();
  const params = useParams();
  const kindParam = params.kind as string;
  const kind: Kind | null =
    kindParam === "films" || kindParam === "series" ? kindParam : null;

  const config = kind ? CONFIG[kind] : null;
  const {
    aloneWatchlist,
    togetherWatchlist,
    ownWatchlist,
    isFilmsListShared,
    partnerName,
    removeFromWatchlist,
    addToWatchlist,
    updateWatchlistScore,
    markWatched,
    watchedIds,
  } = useFilmsLibrary();

  // tmdbIds van series die al "aan het kijken" zijn — die horen niet in de watchlist
  const watchingTmdbIds = React.useMemo(() => {
    const epPattern = /^ep-(\d+)-/;
    const ids = new Set<string>();
    for (const id of watchedIds) {
      const m = id.match(epPattern);
      if (m) ids.add(m[1]);
    }
    return ids;
  }, [watchedIds]);

  const [query, setQuery] = React.useState("");
  const [listTab, setListTab] = React.useState<ListTab>("alleen");
  const [genreFilter, setGenreFilter] = React.useState<string>("Alles");
  const [watchingSlide, setWatchingSlide] = React.useState<{
    item: EnrichedItem;
    seasons: { seasonNumber: number; name: string; episodeCount: number }[];
    selectedSeason: number;
    selectedEpisode: number;
  } | null>(null);

  const hasScrolledRef = React.useRef(false);
  const [scoreSources, setScoreSources] = React.useState<Record<string, "imdb" | "tmdb">>({});
  React.useEffect(() => setScoreSources(getScoreSourceCache()), []);

  // Restore tab and scroll anchor on mount
  React.useEffect(() => {
    const savedTab = sessionStorage.getItem(`watchlist-${kindParam}-tab`);
    if (savedTab === "alleen" || savedTab === "samen") setListTab(savedTab);

    // Keep anchor in sessionStorage until scroll succeeds (StrictMode fires effects twice;
    // first run gets cleaned up before scroll can happen, second run still finds the anchor).
    const anchor = sessionStorage.getItem(`watchlist-${kindParam}-anchor`);
    if (!anchor || hasScrolledRef.current) return;

    let stopped = false;
    let attempts = 0;
    const tryScroll = () => {
      if (stopped) return;
      const el = document.getElementById(`watchlist-item-${anchor}`);
      if (el) {
        hasScrolledRef.current = true;
        sessionStorage.removeItem(`watchlist-${kindParam}-anchor`);
        el.scrollIntoView({ behavior: "instant", block: "center" });
        return;
      }
      if (++attempts < 40) setTimeout(tryScroll, 100);
    };
    requestAnimationFrame(tryScroll);
    return () => { stopped = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [enriched, setEnriched] = React.useState<Record<string, EnrichedItem>>({});
  const [loadingDetails, setLoadingDetails] = React.useState(true);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(() => new Set());
  /** Items die de gebruiker heeft verwijderd — blijven verborgen tot DB-sync klaar is. */
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());
  const [snackbar, setSnackbar] = React.useState<{
    message: string;
    undoFn: () => void;
    undoItem?: WatchlistItem;
    undoEnriched?: EnrichedItem;
  } | null>(null);

  const snackbarTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const removalTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removalSnapshotsRef = React.useRef<Map<string, EnrichedItem>>(new Map());
  const dismissedIdsRef = React.useRef(dismissedIds);
  React.useEffect(() => {
    dismissedIdsRef.current = dismissedIds;
  }, [dismissedIds]);


  const listSourceItems = React.useMemo(() => {
    if (!config) return [];
    const byType = (items: WatchlistItem[]) =>
      items.filter((i) => {
        if (i.type !== config.mediaType) return false;
        if (i.type === "tv") {
          const tmdbId = i.id.replace(/^tv-/, "");
          if (watchingTmdbIds.has(tmdbId)) return false;
        }
        return true;
      });
    if (isFilmsListShared && listTab === "samen") return byType(togetherWatchlist);
    if (isFilmsListShared && listTab === "alleen") return byType(aloneWatchlist);
    return byType(ownWatchlist);
  }, [config, isFilmsListShared, listTab, togetherWatchlist, aloneWatchlist, ownWatchlist, watchingTmdbIds]);

  const baseItems = React.useMemo(() => {
    return listSourceItems.filter((i) => !dismissedIds.has(i.id));
  }, [listSourceItems, dismissedIds]);

  /** Ruim dismissedIds op zodra item echt weg is uit de watchlist. */
  React.useEffect(() => {
    setDismissedIds((prev) => {
      if (prev.size === 0) return prev;
      const stillPresent = new Set([
        ...ownWatchlist.map((i) => i.id),
        ...togetherWatchlist.map((i) => i.id),
      ]);
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (stillPresent.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [ownWatchlist, togetherWatchlist]);

  const itemIdsKey = React.useMemo(
    () => baseItems.map((i) => i.id).join(","),
    [baseItems],
  );

  /** Alleen nieuwe items ophalen; bestaande enriched-data behouden. */
  React.useEffect(() => {
    if (!config) return;

    if (baseItems.length === 0) {
      setEnriched({});
      setLoadingDetails(false);
      return;
    }

    const needsFetch = baseItems.filter((item) => {
      if (dismissedIds.has(item.id)) return false;
      const e = enriched[item.id];
      return !e || (e.genres.length === 0 && !e.overview);
    });

    // Prune alleen items die echt verwijderd zijn (dismissed), niet items van een andere tab —
    // anders verdwijnen de genres bij elke tab-wissel en springt de layout.
    setEnriched((prev) => {
      const dismissed = dismissedIdsRef.current;
      if (dismissed.size === 0) return prev;
      const pruned: Record<string, EnrichedItem> = {};
      for (const id of Object.keys(prev)) {
        if (!dismissed.has(id)) pruned[id] = prev[id];
      }
      return pruned;
    });

    if (needsFetch.length === 0) {
      setLoadingDetails(false);
      return;
    }

    let cancelled = false;
    if (Object.keys(enriched).length === 0) setLoadingDetails(true);

    void Promise.all(
      needsFetch.map(async (item) => {
        const dash = item.id.indexOf("-");
        const tmdbId = item.id.slice(dash + 1);
        try {
          const res = await fetch(`/api/films/detail?type=${item.type}&id=${tmdbId}`);
          if (!res.ok) throw new Error("detail failed");
          const data = (await res.json()) as DetailPayload;
          return { item, data };
        } catch {
          return { item, data: null };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setEnriched((prev) => {
        const next = { ...prev };
        for (const { item, data } of results) {
          if (dismissedIdsRef.current.has(item.id)) continue;
          const built = toEnriched(item, data);
          next[item.id] = built;
          if (built.score != null && item.score == null) {
            void updateWatchlistScore(item.id, built.score);
          }
        }
        return next;
      });
      setLoadingDetails(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey, config?.mediaType, dismissedIds]);

  const allEnrichedItems = React.useMemo(() => {
    return baseItems.map((item) => {
      const snap = removalSnapshotsRef.current.get(item.id);
      if (snap) return snap;
      return (
        enriched[item.id] ??
        toEnriched(item, null)
      );
    });
  }, [baseItems, enriched, removingIds]);

  const genreChips = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of allEnrichedItems) {
      for (const g of item.genres) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"))
      .map(([g]) => g);
    return ["Alles", ...sorted];
  }, [allEnrichedItems]);

  // Cache genre chips in sessionStorage to avoid layout shift on re-visit
  const genreCacheKey = `watchlist-${kindParam}-genres`;
  // Na het mounten lezen: sessionStorage bestaat niet op de server (anders hydratiefout).
  const [cachedGenreChips, setCachedGenreChips] = React.useState<string[]>([]);
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(genreCacheKey);
      if (raw) setCachedGenreChips(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
  }, [genreCacheKey]);
  React.useEffect(() => {
    if (genreChips.length > 1) {
      try { sessionStorage.setItem(genreCacheKey, JSON.stringify(genreChips)); } catch { /* ignore */ }
    }
  }, [genreChips, genreCacheKey]);

  // Show cached chips while enrichment is still running, fall back to live chips once ready
  const visibleGenreChips = genreChips.length > 1 ? genreChips : cachedGenreChips;
  // Show skeleton row to reserve space on first-ever load (no cache, items exist but genres not yet loaded)
  const showGenreSkeleton = loadingDetails && visibleGenreChips.length <= 1 && baseItems.length > 0;

  React.useEffect(() => {
    if (genreFilter !== "Alles" && !genreChips.includes(genreFilter)) {
      setGenreFilter("Alles");
    }
  }, [genreChips, genreFilter]);

  const displayItems = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const isFuture = (item: EnrichedItem) => {
      const d = item.releaseDate;
      if (d) return d > today;
      // Fallback: year alone — treat unknown-date items with year > today's year as future
      return item.year > today.slice(0, 4);
    };

    const q = query.trim().toLowerCase();
    const filtered = allEnrichedItems.filter((item) => {
      if (genreFilter !== "Alles" && !item.genres.includes(genreFilter)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.castNames.toLowerCase().includes(q) ||
        item.overview.toLowerCase().includes(q) ||
        item.metaLine.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => (isFuture(a) ? 1 : 0) - (isFuture(b) ? 1 : 0));
  }, [allEnrichedItems, query, genreFilter]);

  const cancelRemoval = React.useCallback((id: string) => {
    const timer = removalTimersRef.current.get(id);
    if (timer) clearTimeout(timer);
    removalTimersRef.current.delete(id);
    removalSnapshotsRef.current.delete(id);
    setRemovingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const commitRemoval = React.useCallback(
    (id: string) => {
      removalTimersRef.current.delete(id);
      removalSnapshotsRef.current.delete(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDismissedIds((prev) => new Set(prev).add(id));
      setEnriched((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      void removeFromWatchlist(id);
    },
    [removeFromWatchlist],
  );


  function handleSwipeWatching(item: EnrichedItem) {
    const tmdbId = item.id.replace(/^tv-/, "");
    fetch(`/api/films/detail?type=tv&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: { seasons?: { seasonNumber: number; name: string; episodeCount: number }[] }) => {
        const seasons = (data.seasons ?? []).filter((s) => s.seasonNumber > 0);
        if (seasons.length === 0) {
          // Geen seizoeninfo — direct starten bij s1e1
          void markWatched(`ep-${tmdbId}-s1e0`);
          void addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl ?? null, score: item.score });
          setSnackbar({ message: `${item.title} toegevoegd aan 'Aan het kijken'`, undoFn: () => {} });
          snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
          return;
        }
        setWatchingSlide({ item, seasons, selectedSeason: seasons[0].seasonNumber, selectedEpisode: 1 });
      })
      .catch(() => {
        void markWatched(`ep-${tmdbId}-s1e0`);
        void addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl ?? null, score: item.score });
      });
  }


  function handleWatchingConfirm() {
    if (!watchingSlide) return;
    const { item, selectedSeason, selectedEpisode } = watchingSlide;
    const tmdbId = item.id.replace(/^tv-/, "");
    void markWatched(`ep-${tmdbId}-s${selectedSeason}e${selectedEpisode - 1}`);
    void addToWatchlist({ id: item.id, type: "tv", title: item.title, year: item.year, posterUrl: item.posterUrl ?? null, score: item.score });
    setSnackbar({ message: `${item.title} toegevoegd aan 'Aan het kijken'`, undoFn: () => {} });
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
    setWatchingSlide(null);
  }

  function handleMarkSeen(e: React.MouseEvent, item: EnrichedItem) {
    e.stopPropagation();
    if (removingIds.has(item.id)) return;

    removalSnapshotsRef.current.set(item.id, item);
    setRemovingIds((prev) => new Set(prev).add(item.id));

    const timer = setTimeout(() => {
      commitRemoval(item.id);
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
      setSnackbar({
        message: `${item.title} verwijderd`,
        undoItem: { ...item },
        undoEnriched: item,
        undoFn: () => {},
      });
      snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
    }, REMOVE_ANIM_MS);

    removalTimersRef.current.set(item.id, timer);
  }


  function handleSnackbarUndo() {
    if (!snackbar) return;
    if (snackbar.undoItem) {
      cancelRemoval(snackbar.undoItem.id);
      setDismissedIds((prev) => {
        if (!prev.has(snackbar.undoItem!.id)) return prev;
        const next = new Set(prev);
        next.delete(snackbar.undoItem!.id);
        return next;
      });
      void addToWatchlist(snackbar.undoItem);
      if (snackbar.undoEnriched) {
        setEnriched((prev) => ({ ...prev, [snackbar.undoItem!.id]: snackbar.undoEnriched! }));
      }
    } else {
      snackbar.undoFn();
    }
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar(null);
  }

  React.useEffect(() => {
    return () => {
      Array.from(removalTimersRef.current.values()).forEach((timer) => clearTimeout(timer));
      removalTimersRef.current.clear();
    };
  }, []);

  React.useEffect(() => {
    if (kind) return;
    router.replace("/films-series");
  }, [kind, router]);

  if (!kind || !config) return null;

  const count = displayItems.length;
  const countLabel = `${baseItems.length} ${config.mediaType === "movie" ? (baseItems.length === 1 ? "film" : "films") : baseItems.length === 1 ? "serie" : "series"}`;

  return (
    <>
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Canvas «22 · Watchlist — voorstel»: grote titel, wit zoekveld, segmentknop, genres, posterraster. */}
      <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-12">
        <div className="flex items-center justify-between lg:hidden">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => router.push("/films-series")}
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            {FilmIcons.back}
          </button>
          <RoundIconButton tone="surface" size={36} aria-label="Instellingen" onClick={() => router.push("/films-series/instellingen")}>
            {FilmIcons.dots}
          </RoundIconButton>
        </div>

        <div className="mt-1 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:items-center lg:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <PageBackButton href="/films-series" label="Terug" />
            <div className="min-w-0">
              <h1 className="flex items-baseline gap-2 text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">
                {config.sectionTitle}
                <span className="hidden text-lg font-semibold text-[var(--text-tertiary)] lg:inline">{baseItems.length}</span>
              </h1>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)] lg:hidden">{countLabel}</p>
            </div>
          </div>
          <SearchBar
            surface="app"
            placeholder="Zoek in je watchlist"
            value={query}
            onValueChange={setQuery}
            className="lg:w-[300px] lg:shrink-0"
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:mt-6 lg:flex-row lg:items-center lg:gap-4">
          {isFilmsListShared ? (
            <SegmentedControl
              ariaLabel="Watchlist weergave"
              value={listTab}
              onChange={(tab) => {
                setListTab(tab);
                sessionStorage.setItem(`watchlist-${kindParam}-tab`, tab);
              }}
              options={[
                { value: "alleen", label: "Alleen" },
                { value: "samen", label: partnerName ? `Samen met ${partnerName}` : "Samen" },
              ]}
              className="lg:w-[300px] lg:shrink-0"
            />
          ) : null}

          {visibleGenreChips.length > 1 || showGenreSkeleton ? (
            <div className="-mx-4 min-w-0 overflow-x-auto px-4 lg:mx-0 lg:flex-1 lg:px-0" style={{ scrollbarWidth: "none" }}>
              {visibleGenreChips.length > 1 ? (
                <div className="flex w-max gap-1.5 py-0.5">
                  {visibleGenreChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      aria-pressed={genreFilter === chip}
                      onClick={() => setGenreFilter(chip)}
                      className={cn(
                        "h-8 shrink-0 rounded-pill px-[13px] text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                        genreFilter === chip
                          ? "bg-[var(--blue-500)] font-bold text-white"
                          : "bg-[var(--white)] font-semibold text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border-subtle)]",
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-1.5 py-0.5">
                  {[56, 72, 80, 64].map((w) => (
                    <Shimmer key={w} className="h-8 rounded-full" style={{ width: w }} />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-[18px] lg:mt-6">
          {loadingDetails && baseItems.length > 0 && Object.keys(enriched).length === 0 ? (
            <div className="grid grid-cols-3 gap-x-2 gap-y-[18px] lg:grid-cols-6 lg:gap-x-[23px] lg:gap-y-6">
              {Array.from({ length: Math.min(baseItems.length, 12) }).map((_, i) => (
                <div key={i}>
                  <Shimmer className="aspect-[2/3] w-full rounded-[14px]" />
                  <Shimmer className="mt-2.5 h-3.5 w-4/5 rounded-md" />
                  <Shimmer className="mt-1.5 h-3 w-1/3 rounded-md" />
                </div>
              ))}
            </div>
          ) : count === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
              {baseItems.length === 0 ? "Je watchlist is nog leeg." : "Geen resultaten voor je zoekopdracht."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-[18px] lg:grid-cols-6 lg:gap-x-[23px] lg:gap-y-6">
              {displayItems.map((item) => {
                const isRemoving = removingIds.has(item.id);
                return (
                  <div
                    id={`watchlist-item-${item.id}`}
                    key={item.id}
                    className="transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ opacity: isRemoving ? 0 : 1, transform: isRemoving ? "scale(0.85)" : undefined }}
                  >
                    <PosterTile
                      item={item}
                      scoreSource={scoreSources[item.id]}
                      className="w-full"
                      onOpen={() => {
                        sessionStorage.setItem(`watchlist-${kindParam}-anchor`, item.id);
                        sessionStorage.setItem("films-watchlist-return", `/films-series/watchlist/${kindParam}`);
                        router.push(`/films-series/${item.id}`);
                      }}
                      seenLabel={config.mediaType === "tv" ? `Begin met kijken naar ${item.title}` : `${item.title} gezien`}
                      onSeen={(e) => {
                        e.stopPropagation();
                        if (config.mediaType === "tv") handleSwipeWatching(item);
                        else handleMarkSeen(e, item);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {snackbar && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]",
            APP_SNACKBAR_NO_NAV_FIXTURE_CLASS,
          )}
        >
          <Snackbar
            message={snackbar.message}
            actionLabel="Zet terug"
            onAction={handleSnackbarUndo}
            className="w-full max-w-[956px]"
          />
        </div>
      )}

      {/* Slide-in: episode selectie voor 'Aan het kijken' */}
      <SlideInModal
        open={watchingSlide !== null}
        onClose={() => setWatchingSlide(null)}
        title="Starten bij…"
        bodyFullWidth
        footer={
          <Button variant="primary" onClick={handleWatchingConfirm}>
            Bevestigen
          </Button>
        }
      >
        {watchingSlide && (
          <>
            {watchingSlide.seasons.length > 1 && (
              <div className="overflow-x-auto pb-4 pl-4" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-2 pr-4" style={{ width: "max-content" }}>
                  {watchingSlide.seasons.map((s) => (
                    <button
                      key={s.seasonNumber}
                      type="button"
                      onClick={() => setWatchingSlide((prev) => prev ? { ...prev, selectedSeason: s.seasonNumber, selectedEpisode: 1 } : prev)}
                      className={cn(
                        "h-8 shrink-0 rounded-full px-3 text-[13px] leading-[18px] transition-colors focus-visible:outline-none",
                        watchingSlide.selectedSeason === s.seasonNumber
                          ? "bg-[var(--blue-500)] font-semibold text-white"
                          : "bg-[var(--gray-100)] font-normal text-[var(--gray-500)]",
                      )}
                    >
                      {s.name.startsWith("Seizoen") || s.name.startsWith("Season") ? s.name : `Seizoen ${s.seasonNumber}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="px-4">
              <Stepper
                label="Aflevering waarmee je begint"
                value={watchingSlide.selectedEpisode}
                min={1}
                max={watchingSlide.seasons.find((s) => s.seasonNumber === watchingSlide.selectedSeason)?.episodeCount ?? 50}
                onValueChange={(v) => setWatchingSlide((prev) => prev ? { ...prev, selectedEpisode: v } : prev)}
              />
            </div>
          </>
        )}
      </SlideInModal>
    </div>

    </>
  );
}
