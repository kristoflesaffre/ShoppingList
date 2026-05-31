"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { MiniButton } from "@/components/ui/mini_button";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { Snackbar } from "@/components/ui/snackbar";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";

type SearchResult = {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  typeLabel: string;
  posterUrl: string | null;
  score: number | null;
  cast: string;
};

/** Klikbare actie-iconen in watchlist-kaarten (Figma primary 200). */
const CARD_ACTION_ICON = "bg-[var(--blue-200)]";

function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

function ThreeDotsIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="size-4 shrink-0">
      <path
        d="M8 1.5l1.545 3.13 3.455.503-2.5 2.437.59 3.44L8 9.387l-3.09 1.623.59-3.44L3 5.133l3.455-.503L8 1.5z"
        fill="#FBBF24"
        stroke="#F59E0B"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}


/** Figma 1652:47625 — zoekresultaat-kaart */
function FilmResultCard({
  result,
  onAdd,
  onViewDetail,
}: {
  result: SearchResult;
  onAdd: (result: SearchResult) => void;
  onViewDetail: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-[var(--gray-100)] bg-white py-3 pl-4 pr-3">
      {/* Poster + info: klikbaar naar detailpagina */}
      <button
        type="button"
        aria-label={`${result.title} bekijken`}
        onClick={() => onViewDetail(result.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
      >
      <div className="relative h-16 w-[43px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
        {result.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.posterUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[var(--gray-300)]">
            <MaskIcon src="/icons/films.svg" className="size-6 bg-[var(--gray-200)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Titel + score */}
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-base font-medium leading-6 text-[var(--text-primary)]">
            {result.title}
          </p>
          {result.score !== null && (
            <>
              <StarIcon />
              <p className="shrink-0 whitespace-nowrap font-medium leading-none text-[var(--text-primary)]">
                <span className="text-[14px]">{result.score.toFixed(1)}</span>
                <span className="text-[10px] font-normal">/10</span>
              </p>
            </>
          )}
        </div>
        {/* Jaar + type */}
        <p className="text-sm leading-5 text-[var(--gray-400)]">
          {[result.year, result.typeLabel].filter(Boolean).join(" ")}
        </p>
        {/* Cast */}
        {result.cast && (
          <p className="truncate text-sm leading-5 text-[var(--gray-400)]">
            {result.cast}
          </p>
        )}
      </div>
      </button>

      {/* Verticale divider */}
      <div className="w-px self-stretch bg-[var(--gray-100)]" aria-hidden />

      {/* Toevoegen-knop */}
      <button
        type="button"
        aria-label={`${result.title} toevoegen`}
        onClick={() => onAdd(result)}
        className="flex shrink-0 items-center justify-center p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 rounded-full"
      >
        <MaskIcon src="/icons/plus-circle.svg" className="size-6 bg-[var(--blue-500)]" />
      </button>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex h-[88px] items-center gap-3 rounded-[8px] border border-[var(--gray-100)] bg-white py-3 pl-4 pr-3 animate-pulse"
        >
          <div className="h-16 w-[43px] shrink-0 rounded-[4px] bg-[var(--gray-100)]" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-3/4 rounded bg-[var(--gray-100)]" />
            <div className="h-3 w-1/2 rounded bg-[var(--gray-100)]" />
            <div className="h-3 w-2/3 rounded bg-[var(--gray-100)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Scroll animation helpers ---

function easeOutBack(t: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateSwimlaneScroll(el: HTMLElement, targetLeft: number, duration: number, onDone?: () => void) {
  const startLeft = el.scrollLeft;
  const delta = targetLeft - startLeft;
  if (Math.abs(delta) < 1) { onDone?.(); return; }
  const t0 = performance.now();
  function step(now: number) {
    const t = Math.min((now - t0) / duration, 1);
    el.scrollLeft = startLeft + delta * easeOutBack(t);
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  }
  requestAnimationFrame(step);
}

function animatePageScroll(targetY: number, duration: number, onDone?: () => void) {
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) { onDone?.(); return; }
  const t0 = performance.now();
  function step(now: number) {
    const t = Math.min((now - t0) / duration, 1);
    window.scrollTo(0, startY + delta * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  }
  requestAnimationFrame(step);
}

type FilterOption = "all" | "movie" | "tv";

const FILTER_CHIPS: { id: FilterOption; label: string }[] = [
  { id: "all", label: "Alles" },
  { id: "movie", label: "Films" },
  { id: "tv", label: "Series" },
];

export default function FilmsSeriesPage() {
  const router = useRouter();
  const {
    watchlist,
    ownWatchlist,
    partnerWatchlist,
    partnerName,
    partnerAvatarUrl,
    watchedIds,
    seriesMeta,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistScore,
    markWatched,
    unmarkWatched,
    reactToPartnerItem,
  } = useFilmsLibrary();
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterOption>("all");
  const [snackbar, setSnackbar] = React.useState<{ message: string; undoFn: () => void; undoItem?: WatchlistItem } | null>(null);
  const [removingFilmId, setRemovingFilmId] = React.useState<string | null>(null);
  const [restoringFilmId, setRestoringFilmId] = React.useState<string | null>(null);
  const snackbarTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastAddedId, setLastAddedId] = React.useState<string | null>(null);
  const filmsSectionRef = React.useRef<HTMLElement>(null);
  const seriesSectionRef = React.useRef<HTMLElement>(null);
  const filmsScrollRef = React.useRef<HTMLDivElement>(null);
  const seriesScrollRef = React.useRef<HTMLDivElement>(null);
  const lastAddedItemRef = React.useRef<HTMLButtonElement | null>(null);
  const scrollPendingRef = React.useRef(false);
  // Overviews voor partner-items die nog geen overview in de DB hebben (legacy items)
  const [partnerOverviews, setPartnerOverviews] = React.useState<Record<string, string>>({});
  const [discoverItems, setDiscoverItems] = React.useState<SearchResult[]>([]);
  const [discoverLoading, setDiscoverLoading] = React.useState(true);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;
    setDiscoverLoading(true);
    fetch("/api/films/discover")
      .then((r) => r.json())
      .then((data: { results: SearchResult[] }) => {
        setDiscoverItems(data.results ?? []);
        setDiscoverLoading(false);
      })
      .catch(() => setDiscoverLoading(false));
  }, [mounted]);

  React.useEffect(() => {
    const missing = partnerWatchlist.filter((item) => !item.overview);
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (item) => {
        const dash = item.id.indexOf("-");
        const type = item.id.slice(0, dash);
        const tmdbId = item.id.slice(dash + 1);
        try {
          const res = await fetch(`/api/films/detail?type=${type}&id=${tmdbId}`);
          const data = (await res.json()) as { overview?: string | null };
          return { id: item.id, overview: data.overview ?? "" };
        } catch {
          return { id: item.id, overview: "" };
        }
      }),
    ).then((results) => {
      const map: Record<string, string> = {};
      for (const r of results) if (r.overview) map[r.id] = r.overview;
      if (Object.keys(map).length > 0) setPartnerOverviews((prev) => ({ ...prev, ...map }));
    });
  }, [partnerWatchlist]);

  const watchingItems = React.useMemo(() => {
    const epPattern = /^ep-(\d+)-s(\d+)e(\d+)$/;
    const progressMap = new Map<string, { season: number; episode: number }>();
    for (const id of watchedIds) {
      const m = id.match(epPattern);
      if (!m) continue;
      const [, tmdbId, sStr, eStr] = m;
      const season = parseInt(sStr);
      const episode = parseInt(eStr);
      const existing = progressMap.get(tmdbId);
      if (!existing || season > existing.season || (season === existing.season && episode > existing.episode)) {
        progressMap.set(tmdbId, { season, episode });
      }
    }

    const watchlistById = new Map(
      watchlist.filter((i) => i.type === "tv").map((i) => [i.id.replace(/^tv-/, ""), i]),
    );

    return Array.from(progressMap.entries()).flatMap(([tmdbId, progress]) => {
      const wlItem = watchlistById.get(tmdbId);
      const meta = seriesMeta[tmdbId];
      if (!wlItem && !meta) return [];
      return [{
        id: `tv-${tmdbId}`,
        title: wlItem?.title ?? meta?.title ?? "",
        posterUrl: wlItem?.posterUrl ?? meta?.posterUrl ?? null,
        year: wlItem?.year ?? meta?.year ?? "",
        season: progress.season,
        episode: progress.episode,
      }];
    });
  }, [watchedIds, watchlist, seriesMeta]);

  React.useEffect(() => {
    const needsScore = watchlist.filter((i) => i.score == null);
    if (needsScore.length === 0) return;
    void Promise.all(
      needsScore.map((item) => {
        const tmdbId = item.id.replace(/^(movie|tv)-/, "");
        return fetch(`/api/films/detail?type=${item.type}&id=${tmdbId}`)
          .then((r) => r.json())
          .then((data: { score: number | null }) => ({ id: item.id, score: data.score }))
          .catch(() => ({ id: item.id, score: null }));
      }),
    ).then((scoreResults) => {
      scoreResults.forEach(({ id, score }) => {
        if (score != null) void updateWatchlistScore(id, score);
      });
    });
  }, [watchlist, updateWatchlistScore]);

  // Debounce: 300ms na laatste toetsaanslag zoeken
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/films/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then((r) => r.json())
      .then((data: { results: SearchResult[] }) => {
        setResults(data.results ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery]);

  const hasQuery = query.trim().length >= 2;
  const filteredResults = filter === "all" ? results : results.filter((r) => r.type === filter);

  const watchlistFilms = ownWatchlist.filter((r) => r.type === "movie");
  const watchlistSeries = ownWatchlist.filter((r) => r.type === "tv");
  const hasWatchlistItems = ownWatchlist.length > 0;
  const hasPartnerItems = partnerWatchlist.length > 0;

  const discoverExcludeIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const item of watchlist) ids.add(item.id);
    for (const id of watchedIds) {
      if (id.startsWith("movie-") || id.startsWith("tv-")) ids.add(id);
    }
    return ids;
  }, [watchlist, watchedIds]);

  const discoverVisible = React.useMemo(
    () => discoverItems.filter((item) => !discoverExcludeIds.has(item.id)),
    [discoverItems, discoverExcludeIds],
  );

  const hasDiscoverSection = discoverLoading || discoverVisible.length > 0;

  function handleAdd(result: SearchResult) {
    const item: WatchlistItem = {
      id: result.id,
      type: result.type,
      title: result.title,
      year: result.year,
      posterUrl: result.posterUrl,
      score: result.score,
    };
    if (isInWatchlist(result.id)) {
      void removeFromWatchlist(result.id);
    } else {
      void addToWatchlist(item);
      setQuery("");
      setLastAddedId(result.id);
    }
  }

  function handleViewDetail(id: string) {
    router.push(`/films-series/${id}`);
  }

  function handleMarkNextEpisode(e: React.MouseEvent, item: { id: string; season: number; episode: number }) {
    e.stopPropagation();
    const tmdbId = item.id.replace(/^tv-/, "");
    const nextEpId = `ep-${tmdbId}-s${item.season}e${item.episode + 1}`;
    void markWatched(nextEpId);
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar({ message: `Aflevering ${item.episode + 1} als bekeken gemarkeerd`, undoFn: () => void unmarkWatched(nextEpId) });
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
  }

  function handleSnackbarUndo() {
    if (!snackbar) return;
    if (snackbar.undoItem) {
      setRestoringFilmId(snackbar.undoItem.id);
      setRemovingFilmId(null);
      void addToWatchlist(snackbar.undoItem);
    } else {
      snackbar.undoFn();
    }
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar(null);
  }

  function handleRemoveFilm(e: React.MouseEvent, item: WatchlistItem) {
    e.stopPropagation();

    // Snapshot a reliable order value before deletion so undo can re-insert at the exact same position.
    // Some legacy DB rows don't have an order field, so fall back to a midpoint between neighbours.
    const itemToRestore: WatchlistItem = (() => {
      const laneItems = item.type === "movie" ? watchlistFilms : watchlistSeries;
      const idx = laneItems.findIndex((f) => f.id === item.id);
      if (idx < 0) return item;
      if (item.order !== undefined) return { ...item, restoreIndex: idx };
      const prev = laneItems[idx - 1];
      const next = laneItems[idx + 1];
      const order =
        prev?.order !== undefined && next?.order !== undefined ? (prev.order + next.order) / 2
        : prev?.order !== undefined ? prev.order + 0.5
        : next?.order !== undefined ? next.order - 0.5
        : idx;
      return { ...item, order, restoreIndex: idx };
    })();

    setRemovingFilmId(item.id);
    setTimeout(() => {
      void removeFromWatchlist(item.id);
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
      setSnackbar({
        message: `${item.title} verwijderd`,
        undoFn: () => setRemovingFilmId(null),
        undoItem: itemToRestore,
      });
      snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
    }, 420);
  }

  // Scroll to newly added item after DB write lands in ownWatchlist
  React.useEffect(() => {
    if (!lastAddedId || scrollPendingRef.current) return;
    const isMovie = lastAddedId.startsWith("movie-");
    const items = isMovie ? watchlistFilms : watchlistSeries;
    if (!items.some((i) => i.id === lastAddedId)) return;

    scrollPendingRef.current = true;
    let cancelled = false;

    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const sectionEl = (isMovie ? filmsSectionRef : seriesSectionRef).current;
      const scrollEl = (isMovie ? filmsScrollRef : seriesScrollRef).current;
      if (!sectionEl || !scrollEl) { scrollPendingRef.current = false; return; }

      const doSwimlane = () => {
        if (cancelled) return;
        const maxLeft = scrollEl.scrollWidth - scrollEl.clientWidth;
        animateSwimlaneScroll(scrollEl, maxLeft, 680, () => {
          if (!cancelled) {
            lastAddedItemRef.current?.animate(
              [
                { transform: "scale(1)" },
                { transform: "scale(1.1)", offset: 0.4 },
                { transform: "scale(0.94)", offset: 0.7 },
                { transform: "scale(1.04)", offset: 0.86 },
                { transform: "scale(1)" },
              ],
              { duration: 500, easing: "ease-out" },
            );
          }
          setTimeout(() => {
            if (!cancelled) { setLastAddedId(null); scrollPendingRef.current = false; }
          }, 580);
        });
      };

      const rect = sectionEl.getBoundingClientRect();
      const HEADER_H = 72;
      const needsPageScroll = rect.top < HEADER_H || rect.top > window.innerHeight - 80;

      if (needsPageScroll) {
        animatePageScroll(Math.max(0, window.scrollY + rect.top - HEADER_H - 12), 420, () => {
          setTimeout(doSwimlane, 60);
        });
      } else {
        doSwimlane();
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      scrollPendingRef.current = false;
    };
  }, [lastAddedId, watchlistFilms, watchlistSeries]);

  // Slide-in animation after undo: wait for the DB item to appear, then expand from width 0
  React.useEffect(() => {
    if (!restoringFilmId) return;
    if (!watchlistFilms.some((i) => i.id === restoringFilmId)) return;
    const raf = requestAnimationFrame(() => setRestoringFilmId(null));
    return () => cancelAnimationFrame(raf);
  }, [restoringFilmId, watchlistFilms]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient achtergrond — Figma 1652:46675 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      {/* Vaste header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto w-full max-w-[956px] px-4">
          <header className="flex h-16 w-full items-center gap-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.push("/")}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
              Films en series
            </p>
            <button
              type="button"
              aria-label="Instellingen"
              onClick={() => router.push("/films-series/instellingen")}
              className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <ThreeDotsIcon />
            </button>
          </header>
        </div>
      </div>

      {/* Scrollbare inhoud */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pt-8"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {/* Zoekbalk — Figma 1652:46676 */}
        <SearchBar
          placeholder="Zoek film of serie"
          value={query}
          onValueChange={setQuery}
        />

        {/* Filter chips — Figma 1652:46667 */}
        {hasQuery && (
          <div className="-mx-4 mt-3 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[13px] leading-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                    filter === chip.id
                      ? "bg-[#4f55f1] font-medium text-white"
                      : "bg-white font-normal text-[#707784] shadow-[0px_1px_2px_rgba(0,0,0,0.04)]",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resultatenlijst — Figma 1652:47833 */}
        {hasQuery && (
          <div className="mt-4 flex flex-col gap-3 pb-[calc(88px+env(safe-area-inset-bottom,0px))]">
            {loading ? (
              <ResultsSkeleton />
            ) : filteredResults.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--gray-400)]">
                Geen resultaten voor &ldquo;{query}&rdquo;
              </p>
            ) : (
              filteredResults.map((result) => (
                <FilmResultCard key={result.id} result={result} onAdd={handleAdd} onViewDetail={handleViewDetail} />
              ))
            )}
          </div>
        )}

        {/* Niet-lege staat: watchlist secties */}
        {mounted && !hasQuery && (hasWatchlistItems || hasPartnerItems || watchingItems.length > 0 || hasDiscoverSection) && (
          <div className="mt-6 flex flex-col gap-6 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
            {/* Watchlist partner — bovenaan getoond wanneer er items zijn */}
            {hasPartnerItems && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">
                    Watchlist {partnerName ?? "Partner"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push("/films-series/partner-watchlist")}
                    className="shrink-0 text-xs font-medium leading-4 text-[#4f55f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    Toon alle
                  </button>
                </div>
                <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-3 pb-1" style={{ width: "max-content" }}>
                    {partnerWatchlist.map((item) => (
                      <div
                        key={item.id}
                        className="flex w-[300px] shrink-0 gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3"
                      >
                        {/* Poster */}
                        <button
                          type="button"
                          onClick={() => router.push(`/films-series/partner/${item.id}`)}
                          className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        >
                          {item.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.posterUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <MaskIcon src="/icons/films.svg" className="size-6 bg-[var(--gray-200)]" />
                            </div>
                          )}
                        </button>

                        {/* Info + acties */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          {/* Tekst-blok: titel/avatar + ondertitel + beschrijving */}
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col">
                              {/* Titel + partner avatar */}
                              <div className="flex w-full items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/films-series/partner/${item.id}`)}
                                  className="min-w-0 flex-1 truncate text-left text-base font-medium leading-6 text-[#16181a] focus-visible:outline-none"
                                >
                                  {item.title}
                                </button>
                                {/* Partner avatar */}
                                <div className="size-6 shrink-0 overflow-hidden rounded-full border border-white bg-[#edeefe]">
                                  {partnerAvatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={partnerAvatarUrl} alt={partnerName ?? ""} className="size-full object-cover" />
                                  ) : (
                                    <div className="flex size-full items-center justify-center">
                                      <MaskIcon src="/icons/avatar.svg" className="size-4 bg-[#4f55f1]" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-[14px] font-normal leading-5 text-[#8c929d]">
                                {item.year} {item.type === "movie" ? "Film" : "TV Serie"}
                              </p>
                            </div>
                            {(item.overview ?? partnerOverviews[item.id]) && (
                              <p className="line-clamp-2 text-[10px] font-normal leading-3 text-[#595f6a]">
                                {item.overview ?? partnerOverviews[item.id]}
                              </p>
                            )}
                          </div>

                          {/* Actie-knoppen */}
                          <div className="flex items-start justify-end gap-2">
                            <button
                              type="button"
                              aria-label="Toevoegen aan mijn watchlist"
                              onClick={() => void reactToPartnerItem(item.id, "up")}
                              className="flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                            >
                              <MaskIcon src="/icons/thumb_up.svg" className={cn("size-6", CARD_ACTION_ICON)} />
                            </button>
                            <button
                              type="button"
                              aria-label="Niet interessant"
                              onClick={() => void reactToPartnerItem(item.id, "down")}
                              className="flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                            >
                              <MaskIcon src="/icons/thumb_down.svg" className={cn("size-6", CARD_ACTION_ICON)} />
                            </button>
                            <button
                              type="button"
                              aria-label="Al gezien"
                              onClick={() => void reactToPartnerItem(item.id, "seen")}
                              className="flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                            >
                              <MaskIcon src="/icons/visible.svg" className={cn("size-6", CARD_ACTION_ICON)} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Aan het kijken */}
            {watchingItems.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Aan het kijken</h2>
                  <button type="button" className="shrink-0 text-xs font-medium leading-4 text-[#4f55f1] focus-visible:outline-none">
                    Toon alle
                  </button>
                </div>
                <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-3 pb-1" style={{ width: "max-content" }}>
                    {watchingItems.map((item) => {
                      const { id, title, posterUrl, year, season, episode } = item;
                      const nextEpisode = episode + 1;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => router.push(`/films-series/${id}/episodes/s${season}e${nextEpisode}`)}
                          className="flex w-[300px] shrink-0 items-start gap-3 rounded-[8px] border border-[#e2e4e6] bg-white py-3 pl-4 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        >
                          <div className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
                            {posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={posterUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <MaskIcon src="/icons/films.svg" className="size-6 bg-[var(--gray-200)]" />
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex w-full flex-col">
                              <div className="flex w-full items-start">
                                <p className="min-w-0 flex-1 truncate text-base font-medium leading-6 text-[#16181a]">{title}</p>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  aria-label="Markeer volgende aflevering als bekeken"
                                  onClick={(e) => handleMarkNextEpisode(e, item)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleMarkNextEpisode(e as unknown as React.MouseEvent, item);
                                    }
                                  }}
                                  className="shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded"
                                >
                                  <MaskIcon src="/icons/visible.svg" className={cn("size-6", CARD_ACTION_ICON)} />
                                </span>
                              </div>
                              <p className="text-sm leading-5 text-[#8c929d]">{year} TV Serie</p>
                            </div>
                            <div className="flex flex-nowrap items-center gap-2">
                              <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[4px] bg-[#edeefe] px-2 py-1 text-xs leading-4 text-[#4f55f1]">
                                Seizoen {season}
                              </span>
                              <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[4px] bg-[#edeefe] px-2 py-1 text-xs leading-4 text-[#4f55f1]">
                                Aflevering {nextEpisode}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Watchlist films */}
            {watchlistFilms.length > 0 && (
              <section ref={filmsSectionRef} className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Watchlist films</h2>
                  <button
                    type="button"
                    onClick={() => router.push("/films-series/watchlist/films")}
                    className="shrink-0 text-xs font-medium text-[#4f55f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    Toon alle
                  </button>
                </div>
                <div ref={filmsScrollRef} className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex pb-1" style={{ width: "max-content" }}>
                    {watchlistFilms.map((item) => {
                      const isCollapsed = removingFilmId === item.id || restoringFilmId === item.id;
                      return (
                      <div
                        key={item.id}
                        className="shrink-0 overflow-hidden"
                        style={{
                          width: isCollapsed ? 0 : 95,
                          opacity: isCollapsed ? 0 : 1,
                          paddingRight: 8,
                          transition: "width 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease-out",
                        }}
                      >
                      <button
                        type="button"
                        ref={(el) => { if (item.id === lastAddedId) lastAddedItemRef.current = el; }}
                        onClick={() => handleViewDetail(item.id)}
                        className="flex w-[87px] flex-col gap-2 text-left focus-visible:outline-none"
                      >
                        <div className="relative w-full overflow-hidden rounded-[4px] bg-[var(--gray-50)]" style={{ aspectRatio: "2/3" }}>
                          {item.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.posterUrl} alt={item.title} className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                            </div>
                          )}
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Markeer ${item.title} als bekeken`}
                            className="absolute right-[4px] top-[4px] size-4 cursor-pointer focus-visible:outline-none"
                            onClick={(e) => handleRemoveFilm(e, item)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleRemoveFilm(e as unknown as React.MouseEvent, item); } }}
                          >
                            <MaskIcon src="/icons/visible.svg" className={cn("size-4", CARD_ACTION_ICON)} />
                          </span>
                        </div>
                        <div className="flex flex-col gap-0">
                          <p className="line-clamp-2 h-8 text-[14px] font-medium leading-4 text-[#16181a]">{item.title}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-[14px] font-normal leading-5 text-[#8c929d]">{item.year}</p>
                            {item.score != null && (
                              <div className="flex items-center gap-1">
                                <StarIcon />
                                <span className="text-[12px] font-medium leading-4 text-[#16181a]">{item.score.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Watchlist series */}
            {watchlistSeries.length > 0 && (
              <section ref={seriesSectionRef} className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Watchlist series</h2>
                  <button
                    type="button"
                    onClick={() => router.push("/films-series/watchlist/series")}
                    className="shrink-0 text-xs font-medium text-[#4f55f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    Toon alle
                  </button>
                </div>
                <div ref={seriesScrollRef} className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                    {watchlistSeries.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        ref={(el) => { if (item.id === lastAddedId) lastAddedItemRef.current = el; }}
                        onClick={() => handleViewDetail(item.id)}
                        className="flex w-[87px] flex-col gap-2 text-left focus-visible:outline-none"
                      >
                        <div className="relative w-full overflow-hidden rounded-[4px] bg-[var(--gray-50)]" style={{ aspectRatio: "2/3" }}>
                          {item.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.posterUrl} alt={item.title} className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0">
                          <p className="line-clamp-2 h-8 text-[14px] font-medium leading-4 text-[#16181a]">{item.title}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-[14px] font-normal leading-5 text-[#8c929d]">{item.year}</p>
                            {item.score != null && (
                              <div className="flex items-center gap-1">
                                <StarIcon />
                                <span className="text-[12px] font-medium leading-4 text-[#16181a]">{item.score.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Te ontdekken */}
            {hasDiscoverSection && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Te ontdekken</h2>
                  {discoverVisible.length > 0 && (
                    <button
                      type="button"
                      onClick={() => router.push("/films-series/discover")}
                      className="shrink-0 text-xs font-medium leading-4 text-[#4f55f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      Toon carousel
                    </button>
                  )}
                </div>
                <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                    {discoverLoading ? (
                      [1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-[130px] w-[87px] shrink-0 animate-pulse rounded-[4px] bg-[var(--gray-100)]"
                        />
                      ))
                    ) : (
                      discoverVisible.slice(0, 14).map((item) => (
                        <div key={item.id} className="flex w-[87px] shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(item.id)}
                            className="relative w-full overflow-hidden rounded-[4px] bg-[var(--gray-50)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                            style={{ aspectRatio: "2/3" }}
                          >
                            {item.posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.posterUrl}
                                alt=""
                                className="absolute inset-0 size-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                              </div>
                            )}
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`${item.title} toevoegen aan watchlist`}
                              className="absolute right-[4px] top-[4px] size-4 cursor-pointer focus-visible:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdd(item);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAdd(item);
                                }
                              }}
                            >
                              <MaskIcon src="/icons/plus-circle.svg" className="size-4 bg-white" />
                            </span>
                          </button>
                          <div className="flex flex-col gap-0">
                            <p className="line-clamp-2 h-8 text-[14px] font-medium leading-4 text-[#16181a]">
                              {item.title}
                            </p>
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-[12px] leading-4 text-[#8c929d]">{item.year}</p>
                              {item.score != null && (
                                <div className="flex shrink-0 items-center gap-0.5">
                                  <StarIcon />
                                  <span className="text-[10px] font-medium leading-4 text-[#16181a]">
                                    {item.score.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Snackbar */}
      {snackbar && (
        <div className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS} role="region" aria-label="Melding">
          <Snackbar
            message={snackbar.message}
            actionLabel="Zet terug"
            onAction={handleSnackbarUndo}
          />
        </div>
      )}

      {/* Empty state — alleen zichtbaar zonder zoekterm en zonder watchlist items en zonder watching items */}
      {mounted && !hasQuery && !hasWatchlistItems && !hasPartnerItems && watchingItems.length === 0 && !hasDiscoverSection && (
        <div className="absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/ui/films_160.webp"
            alt=""
            width={96}
            height={96}
            className="size-24 object-contain"
            aria-hidden
          />
          <p className="max-w-[280px] text-center text-base font-medium leading-6 text-[var(--gray-500)]">
            Nog geen items toegevoegd aan je film of en serie lijstje
          </p>
          <MiniButton variant="primary" onClick={() => {}}>
            Voeg item toe
          </MiniButton>
        </div>
      )}
    </div>
  );
}
