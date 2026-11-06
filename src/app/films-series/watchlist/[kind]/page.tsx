"use client";

import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { Snackbar } from "@/components/ui/snackbar";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { PageBackButton } from "@/components/ui/page_back_button";
import { Shimmer } from "@/components/ui/shimmer";
import { FilmIcons } from "@/components/films/film_detail_ui";
import { PosterTile } from "@/components/films/film_tiles";
import { getScoreSourceCache } from "@/lib/score_source_cache";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { airedEpisodeIds, followMarkId, isReturningStatus, skipMarkId } from "@/lib/series-follow";
import { setForcedDark } from "@/lib/theme";
import { DoneButton, TitleEditButton } from "@/components/ui/title_edit_button";

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

const useBrowserLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export default function WatchlistKindPage() {
  const router = useRouter();
  // Donker zoals de andere filmpagina's (cinema-thema), ongeacht het gekozen thema.
  useBrowserLayoutEffect(() => {
    setForcedDark(true);
    return () => setForcedDark(false);
  }, []);
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
    watchedIds,
    watchedSet,
    markWatchedMany,
    unmarkWatchedMany,
    saveSeriesMeta,
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

  /** Bewerkmodus: meerdere titels kiezen en samen van de watchlist halen. */
  const [editing, setEditing] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
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
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.castNames.toLowerCase().includes(q) ||
        item.overview.toLowerCase().includes(q) ||
        item.metaLine.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => (isFuture(a) ? 1 : 0) - (isFuture(b) ? 1 : 0));
  }, [allEnrichedItems, query]);

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


  /**
   * Oogje bij een serie: alles wat al uitgezonden is op gezien, loopt de serie nog dan volg je ze
   * («Lopende series die je volgt»), en ze gaat van de watchlist. «Zet terug» draait alles terug.
   */
  function handleSeriesSeen(item: EnrichedItem) {
    if (removingIds.has(item.id)) return;
    const tmdbId = item.id.replace(/^tv-/, "");
    removalSnapshotsRef.current.set(item.id, item);
    setRemovingIds((prev) => new Set(prev).add(item.id));

    const work = (async () => {
      const res = await fetch(`/api/films/detail?type=tv&id=${tmdbId}`);
      if (!res.ok) throw new Error("detail");
      const data = (await res.json()) as {
        seasons?: { seasonNumber: number; episodeCount: number }[];
        lastAired?: { season: number; episode: number } | null;
        status?: string | null;
      };
      const lastAired = data.lastAired ?? null;
      const seasons = (data.seasons ?? []).filter((s) => s.seasonNumber > 0);
      const episodeIds = airedEpisodeIds(tmdbId, seasons, lastAired);
      const ongoing = isReturningStatus(data.status);
      const toMark = [...episodeIds, ...(ongoing ? [followMarkId(tmdbId)] : [])].filter((id) => !watchedSet.has(id));
      const unskip = ongoing && watchedSet.has(skipMarkId(tmdbId));
      await saveSeriesMeta(tmdbId, {
        title: item.title,
        year: item.year,
        posterUrl: item.posterUrl ?? null,
        seasons: seasons
          .filter((s) => !lastAired || s.seasonNumber <= lastAired.season)
          .map((s) => ({
            seasonNumber: s.seasonNumber,
            episodeCount: lastAired && s.seasonNumber === lastAired.season ? Math.min(s.episodeCount, lastAired.episode) : s.episodeCount,
          })),
      });
      for (let i = 0; i < toMark.length; i += 150) await markWatchedMany(toMark.slice(i, i + 150));
      if (unskip) await unmarkWatchedMany([skipMarkId(tmdbId)]);
      return { marked: toMark, unskip, ongoing, episodes: episodeIds.length };
    })();

    const timer = setTimeout(() => {
      commitRemoval(item.id);
      work
        .then(({ marked, unskip, ongoing, episodes }) => {
          if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
          setSnackbar({
            message:
              episodes === 0
                ? `${item.title} van je watchlist gehaald`
                : ongoing
                  ? `${item.title} gezien · je volgt de serie nu`
                  : `${item.title} gezien`,
            undoItem: { ...item },
            undoEnriched: item,
            undoFn: () => {
              for (let i = 0; i < marked.length; i += 150) void unmarkWatchedMany(marked.slice(i, i + 150));
              if (unskip) void markWatchedMany([skipMarkId(tmdbId)]);
            },
          });
          snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
        })
        .catch(() => {
          // Geen gegevens: niets aangeduid, de serie komt terug op de watchlist.
          cancelRemoval(item.id);
          setDismissedIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          void addToWatchlist({ ...item });
          setEnriched((prev) => ({ ...prev, [item.id]: item }));
          if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
          setSnackbar({ message: `Kon ${item.title} niet als gezien aanduiden`, undoFn: () => {} });
          snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
        });
    }, REMOVE_ANIM_MS);
    removalTimersRef.current.set(item.id, timer);
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


  function toggleEditing() {
    setEditing((on) => !on);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Gekozen titels in één keer van de watchlist; «Zet terug» zet ze allemaal terug. */
  function removeSelected() {
    const items = displayItems.filter((i) => selectedIds.has(i.id));
    if (items.length === 0) return;
    const snapshots = items.map((i) => ({ ...i }));
    for (const item of items) commitRemoval(item.id);
    setEditing(false);
    setSelectedIds(new Set());
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    const noun = config?.mediaType === "movie" ? (items.length === 1 ? "film" : "films") : items.length === 1 ? "serie" : "series";
    setSnackbar({
      message: items.length === 1 ? `${items[0].title} verwijderd` : `${items.length} ${noun} verwijderd`,
      undoFn: () => {
        const ids = new Set(snapshots.map((i) => i.id));
        setDismissedIds((prev) => new Set(Array.from(prev).filter((id) => !ids.has(id))));
        setEnriched((prev) => {
          const next = { ...prev };
          for (const item of snapshots) next[item.id] = item;
          return next;
        });
        for (const item of snapshots) void addToWatchlist(item);
      },
    });
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 6000);
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
      snackbar.undoFn();
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
            className={headerRoundButtonClass}
          >
            {FilmIcons.back}
          </button>
          <div className="flex items-center gap-2">
            {editing ? (
              <DoneButton onClick={toggleEditing} />
            ) : (
              <>
                {baseItems.length > 0 ? <TitleEditButton onClick={toggleEditing} aria-label="Watchlist bewerken" /> : null}
                <button type="button" aria-label="Instellingen" onClick={() => router.push("/films-series/instellingen")} className={headerRoundButtonClass}>
                  {FilmIcons.dots}
                </button>
              </>
            )}
          </div>
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
          {/* Alleen / Samen met … in de kop, zo breed als nodig (gsm: volle breedte onder de titel). */}
          {isFilmsListShared ? (
            <SegmentedControl
              ariaLabel="Watchlist weergave"
              size="lg"
              value={listTab}
              onChange={(tab) => {
                setListTab(tab);
                sessionStorage.setItem(`watchlist-${kindParam}-tab`, tab);
              }}
              options={[
                { value: "alleen", label: "Alleen" },
                { value: "samen", label: partnerName ? `Samen met ${partnerName}` : "Samen" },
              ]}
              className="lg:w-auto lg:shrink-0 [&>button]:whitespace-nowrap lg:[&>button]:flex-none"
            />
          ) : null}
          <SearchBar
            surface="app"
            placeholder="Zoek in je watchlist"
            value={query}
            onValueChange={setQuery}
            className="lg:w-[260px] lg:shrink-0"
          />
          {/* Desktop: bewerken rechtsboven, naast het zoekveld */}
          {baseItems.length > 0 ? (
            <div className="hidden lg:flex lg:shrink-0 lg:justify-end">
              {editing ? <DoneButton onClick={toggleEditing} /> : <TitleEditButton onClick={toggleEditing} aria-label="Watchlist bewerken" />}
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
                      selected={editing ? selectedIds.has(item.id) : undefined}
                      onOpen={() => {
                        if (editing) {
                          toggleSelected(item.id);
                          return;
                        }
                        sessionStorage.setItem(`watchlist-${kindParam}-anchor`, item.id);
                        sessionStorage.setItem("films-watchlist-return", `/films-series/watchlist/${kindParam}`);
                        router.push(`/films-series/${item.id}`);
                      }}
                      seenLabel={`${item.title} gezien`}
                      onSeen={(e) => {
                        e.stopPropagation();
                        if (config.mediaType === "tv") handleSeriesSeen(item);
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

      {/* Bewerkmodus: zwevende balk met het aantal gekozen titels en «Verwijderen». */}
      {editing ? (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]",
            APP_SNACKBAR_NO_NAV_FIXTURE_CLASS,
          )}
        >
          <div className="flex w-full max-w-[520px] items-center gap-3 rounded-pill bg-[var(--white)] py-2 pl-5 pr-2 shadow-[0_14px_30px_-12px_rgba(16,17,48,.6),inset_0_0_0_1px_var(--border-subtle)]">
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-[var(--text-primary)]">
              {selectedIds.size === 0 ? "Tik op wat weg mag" : `${selectedIds.size} gekozen`}
            </span>
            <button
              type="button"
              onClick={removeSelected}
              disabled={selectedIds.size === 0}
              className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-pill bg-[var(--action-danger)] px-4 text-[15px] font-bold text-fixed-white transition-[opacity,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
                <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
              </svg>
              Verwijderen
            </button>
          </div>
        </div>
      ) : null}

      {snackbar && !editing && (
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

    </div>

    </>
  );
}
