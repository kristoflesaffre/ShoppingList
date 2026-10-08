"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { PageBackButton } from "@/components/ui/page_back_button";
import { SoftPlayButton, TrailerOverlay } from "@/components/films/film_detail_ui";
import { MiniButton } from "@/components/ui/mini_button";
import { Shimmer } from "@/components/ui/shimmer";
import { CheckIcon, EyeIcon, OneByOneButton, PartnerAction, Poster, PosterTile, RatingChip, TypeChip, WatchingCard } from "@/components/films/film_tiles";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { useWatchingTvItems, type WatchingTvItem } from "@/hooks/use_watching_tv_items";
import { Snackbar } from "@/components/ui/snackbar";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { getScoreSourceCache, setScoreSource } from "@/lib/score_source_cache";

type SearchResult = {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  typeLabel: string;
  posterUrl: string | null;
  score: number | null;
  scoreSource?: "imdb" | "tmdb";
  cast: string;
};

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

function StarIcon({ source }: { source?: "imdb" | "tmdb" | null }) {
  const color = source === "imdb" ? "#FBBF24" : "var(--blue-500)";
  const strokeColor = source === "imdb" ? "#F59E0B" : "var(--blue-500)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="size-4 shrink-0">
      <path
        d="M8 1.5l1.545 3.13 3.455.503-2.5 2.437.59 3.44L8 9.387l-3.09 1.623.59-3.44L3 5.133l3.455-.503L8 1.5z"
        fill={color}
        stroke={strokeColor}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}


/** Figma 1652:47625 — zoekresultaat-kaart */
function FilmResultCard({
  result,
  scoreSource,
  onAdd,
  onViewDetail,
}: {
  result: SearchResult;
  scoreSource?: "imdb" | "tmdb";
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
            <div className="flex shrink-0 items-center gap-[4px]">
              <StarIcon source={result.scoreSource ?? scoreSource} />
              <span className="text-[12px] font-medium leading-4 text-[var(--gray-900)]">{result.score.toFixed(1)}</span>
            </div>
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
          className="flex h-[88px] items-center gap-3 rounded-[8px] border border-[var(--gray-100)] bg-white py-3 pl-4 pr-3"
        >
          <div className="h-16 w-[43px] shrink-0 rounded-[4px] shimmer" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
            <div className="h-3 w-2/3 rounded shimmer" />
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

function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Instellingen"
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--text-secondary)] shadow-[0_1px_3px_rgba(16,17,48,0.1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:text-[var(--blue-500)]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
      </svg>
    </button>
  );
}

/** Shimmer-versie van het hele overzicht zolang de bibliotheek laadt. */
function FilmsOverviewSkeleton() {
  const head = (w: string) => (
    <div className="flex items-center justify-between">
      <Shimmer className={cn("h-5 rounded-md", w)} />
      <Shimmer className="h-3.5 w-10 rounded-md" />
    </div>
  );
  const posterRow = (withActions: boolean) => (
    <div className="-mx-4 overflow-hidden px-4">
      <div className="flex w-max gap-3 lg:gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-[120px] shrink-0 lg:w-[140px]">
            <Shimmer className="aspect-[2/3] w-full rounded-[14px]" />
            <Shimmer className="mt-2.5 h-3.5 w-4/5 rounded-md" />
            {withActions ? (
              <div className="mt-2.5 flex gap-1.5">
                <Shimmer className="h-8 flex-1 rounded-full" />
                <Shimmer className="h-8 flex-1 rounded-full" />
                <Shimmer className="h-8 flex-1 rounded-full" />
              </div>
            ) : (
              <Shimmer className="mt-1.5 h-3 w-1/3 rounded-md" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div aria-busy="true" aria-label="Films en series laden" className="mt-7 flex flex-col gap-7 lg:mt-8 lg:gap-8">
      <section className="flex flex-col gap-3">
        {head("w-36")}
        <div className="-mx-4 overflow-hidden px-4 lg:mx-0 lg:px-0">
          <div className="flex w-max gap-2.5 lg:grid lg:w-full lg:grid-cols-3 lg:gap-3.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex w-[300px] shrink-0 gap-3 rounded-[20px] bg-[var(--white)] p-2.5 shadow-[inset_0_0_0_1px_var(--border-subtle)] lg:w-auto">
                <Shimmer className="h-[104px] w-[70px] shrink-0 rounded-[12px]" />
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div>
                    <Shimmer className="h-4 w-3/4 rounded-md" />
                    <Shimmer className="mt-2 h-3 w-1/2 rounded-md" />
                    <Shimmer className="mt-3 h-1 w-full rounded-full" />
                  </div>
                  <Shimmer className="h-7 w-3/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        {head("w-40")}
        {posterRow(true)}
      </section>
      <section className="flex flex-col gap-3">
        {head("w-32")}
        <Shimmer className="h-[198px] rounded-[24px] lg:h-[227px]" />
      </section>
      <section className="flex flex-col gap-3">
        {head("w-36")}
        {posterRow(false)}
      </section>
    </div>
  );
}

/** Canvas «20 · Nieuw voor jou»: één suggestie op een donkere kaart met de poster wazig erachter. */
function DiscoverFeature({
  item,
  scoreSource,
  onOpen,
  onAdd,
  onNext,
}: {
  item: SearchResult;
  scoreSource?: "imdb" | "tmdb";
  onOpen: () => void;
  onAdd: () => void;
  onNext: () => void;
}) {
  const [trailerKey, setTrailerKey] = React.useState<string | null>(null);
  const [showTrailer, setShowTrailer] = React.useState(false);
  React.useEffect(() => {
    setTrailerKey(null);
    let cancelled = false;
    fetch(`/api/films/detail?type=${item.type}&id=${item.tmdbId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setTrailerKey((d?.trailerKey as string | null) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.type, item.tmdbId]);

  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-[24px] bg-[#1b1d3a] p-4">
      {item.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.posterUrl} alt="" aria-hidden className="absolute inset-0 size-full scale-[1.3] object-cover opacity-45 blur-[28px] saturate-[1.3]" />
      ) : null}
      <div className="relative w-[110px] shrink-0 lg:w-[130px]">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={`${item.title} bekijken`}
        >
          <Poster src={item.posterUrl} alt="" className="rounded-[12px]" />
        </button>
        {trailerKey ? (
          <SoftPlayButton
            onClick={() => setShowTrailer(true)}
            aria-label={`Trailer van ${item.title} afspelen`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        ) : null}
      </div>
      {showTrailer && trailerKey ? <TrailerOverlay videoKey={trailerKey} title={item.title} onClose={() => setShowTrailer(false)} /> : null}
      <div className="relative min-w-0 flex-1 text-white">
        <button type="button" onClick={onOpen} className="block text-left focus-visible:outline-none">
          <span className="line-clamp-2 text-[19px] font-extrabold leading-[1.2] lg:text-2xl">{item.title}</span>
        </button>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-white/75">
          {item.score != null ? (
            <>
              <svg viewBox="0 0 24 24" aria-hidden className="size-3">
                <path fill={scoreSource === "imdb" ? "#f5b301" : "#a9adf4"} d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
              </svg>
              <b className="text-white">{item.score.toFixed(1)}</b>
            </>
          ) : null}
          <span>
            {item.score != null ? "· " : ""}
            {[item.year, item.typeLabel].filter(Boolean).join(" · ")}
          </span>
        </p>
        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-pill bg-white px-4 text-sm font-bold text-[#16181a] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1d3a]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[15px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Watchlist
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Volgende suggestie"
            className="flex size-[38px] items-center justify-center rounded-full bg-white/15 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:bg-white/25"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FilmsSeriesPage() {
  const router = useRouter();
  const {
    watchlist,
    dataLoading,
    ownWatchlist,
    partnerWatchlist,
    partnerName,
    partnerAvatarUrl,
    watchedIds,
    discoverDismissedIds,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistScore,
    unmarkWatched,
    reactToPartnerItem,
  } = useFilmsLibrary();
  const { watchingItems, markNextEpisode, markSeasonWatched, markSeriesWatched, unmarkEpisodes } = useWatchingTvItems();
  const [watchMenuFor, setWatchMenuFor] = React.useState<string | null>(null);
  const [discoverIndex, setDiscoverIndex] = React.useState(0);
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
  const [discoverItems, setDiscoverItems] = React.useState<SearchResult[]>([]);
  const [discoverLoading, setDiscoverLoading] = React.useState(true);
  const [scoreSourceMap, setScoreSourceMap] = React.useState<Record<string, "imdb" | "tmdb">>({});

  React.useEffect(() => {
    setMounted(true);
    setScoreSourceMap(getScoreSourceCache());
  }, []);

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
    const cache = getScoreSourceCache();
    const missing = partnerWatchlist.filter((item) => !cache[item.id]);
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (item) => {
        const dash = item.id.indexOf("-");
        const type = item.id.slice(0, dash);
        const tmdbId = item.id.slice(dash + 1);
        try {
          const res = await fetch(`/api/films/detail?type=${type}&id=${tmdbId}`);
          const data = (await res.json()) as { scoreSource?: "imdb" | "tmdb" };
          return { id: item.id, scoreSource: data.scoreSource };
        } catch {
          return { id: item.id, scoreSource: undefined };
        }
      }),
    ).then((results) => {
      const sourceUpdates: Record<string, "imdb" | "tmdb"> = {};
      for (const r of results) {
        if (r.scoreSource) {
          setScoreSource(r.id, r.scoreSource);
          sourceUpdates[r.id] = r.scoreSource;
        }
      }
      if (Object.keys(sourceUpdates).length > 0) setScoreSourceMap((prev) => ({ ...prev, ...sourceUpdates }));
    });
  }, [partnerWatchlist]);

  React.useEffect(() => {
    const cache = getScoreSourceCache();
    const needsScore = watchlist.filter(
      (i) => i.score == null || !cache[i.id],
    );
    if (needsScore.length === 0) return;
    void Promise.all(
      needsScore.map((item) => {
        const tmdbId = item.id.replace(/^(movie|tv)-/, "");
        return fetch(`/api/films/detail?type=${item.type}&id=${tmdbId}`)
          .then((r) => r.json())
          .then((data: { score: number | null; scoreSource?: "imdb" | "tmdb" }) => ({ id: item.id, score: data.score, scoreSource: data.scoreSource }))
          .catch(() => ({ id: item.id, score: null, scoreSource: undefined }));
      }),
    ).then((scoreResults) => {
      const updates: Record<string, "imdb" | "tmdb"> = {};
      scoreResults.forEach(({ id, score, scoreSource }) => {
        if (score != null) void updateWatchlistScore(id, score);
        if (scoreSource) {
          setScoreSource(id, scoreSource);
          updates[id] = scoreSource;
        }
      });
      if (Object.keys(updates).length > 0) {
        setScoreSourceMap((prev) => ({ ...prev, ...updates }));
      }
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
    for (const id of discoverDismissedIds) ids.add(id);
    return ids;
  }, [watchlist, watchedIds, discoverDismissedIds]);

  const discoverVisible = React.useMemo(
    () => discoverItems.filter((item) => !discoverExcludeIds.has(item.id)),
    [discoverItems, discoverExcludeIds],
  );

  React.useEffect(() => {
    if (discoverVisible.length === 0) return;
    const cache = getScoreSourceCache();
    const missing = discoverVisible.filter((item) => item.score != null && !cache[item.id]);
    if (missing.length === 0) return;
    void Promise.all(
      missing.map((item) => {
        const tmdbId = item.id.replace(/^(movie|tv)-/, "");
        return fetch(`/api/films/detail?type=${item.type}&id=${tmdbId}`)
          .then((r) => r.json())
          .then((data: { scoreSource?: "imdb" | "tmdb" }) => ({ id: item.id, scoreSource: data.scoreSource }))
          .catch(() => ({ id: item.id, scoreSource: undefined }));
      }),
    ).then((results) => {
      const updates: Record<string, "imdb" | "tmdb"> = {};
      for (const r of results) {
        if (r.scoreSource) {
          setScoreSource(r.id, r.scoreSource);
          updates[r.id] = r.scoreSource;
        }
      }
      if (Object.keys(updates).length > 0) {
        setScoreSourceMap((prev) => ({ ...prev, ...updates }));
      }
    });
  }, [discoverVisible]);

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

  function handleMarkNextEpisode(e: React.MouseEvent, item: WatchingTvItem) {
    e.stopPropagation();
    setWatchMenuFor(null);
    void markNextEpisode(item).then((result) => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
      if (result.completed) {
        setSnackbar({
          message: "Serie volledig bekeken en uit watchlist verwijderd",
          undoFn: () => {},
        });
      } else if (result.epId && result.episode != null) {
        const seasonLabel =
          result.season != null && result.season > item.lastWatched.season
            ? `Seizoen ${result.season}, aflevering ${result.episode}`
            : `Aflevering ${result.episode}`;
        setSnackbar({
          message: `${seasonLabel} als bekeken gemarkeerd`,
          undoFn: () => void unmarkWatched(result.epId!),
        });
      }
      snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
    });
  }

  function showSnackbar(message: string, undoFn: () => void, undoItem?: WatchlistItem) {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar({ message, undoFn, undoItem });
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
  }

  async function handleMarkSeason(item: WatchingTvItem) {
    setWatchMenuFor(null);
    const res = await markSeasonWatched(item);
    if (!res) return;
    showSnackbar(`Seizoen ${res.season} als bekeken gemarkeerd`, () => void unmarkEpisodes(res.ids));
  }

  async function handleMarkSeries(item: WatchingTvItem) {
    setWatchMenuFor(null);
    const res = await markSeriesWatched(item);
    if (!res) return;
    showSnackbar(`${item.title} helemaal gezien`, () => {
      void unmarkEpisodes(res.ids);
      if (res.watchlistItem) void addToWatchlist(res.watchlistItem);
    });
  }

  // Menu «Aan het kijken» sluiten bij een tik ernaast.
  React.useEffect(() => {
    if (!watchMenuFor) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest("[data-watch-menu]")) setWatchMenuFor(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [watchMenuFor]);

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

  const SectionHead = ({ title, href, linkLabel = "Alles", count, avatar, extra }: { title: string; href?: string; linkLabel?: string; count?: number; avatar?: React.ReactNode; extra?: React.ReactNode }) => (
    <div className="flex items-center gap-3">
      <h2 className="flex min-w-0 flex-1 items-center gap-2 text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
        {avatar}
        <span className="truncate">{title}</span>
        {count != null ? <span className="text-[15px] font-medium text-[var(--text-tertiary)] tabular-nums">{count}</span> : null}
      </h2>
      {extra}
      {href ? (
        <button
          type="button"
          onClick={() => router.push(href)}
          className="shrink-0 text-sm font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          {linkLabel}
        </button>
      ) : null}
    </div>
  );

  const discoverFeature = discoverVisible.length > 0 ? discoverVisible[discoverIndex % discoverVisible.length] : null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Canvas «20 · Films & series — voorstel»: grote titel, wit zoekveld, «Aan het kijken» bovenaan. */}
      <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-12">
        <div className="flex items-center justify-between lg:hidden">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => router.push("/")}
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
          </button>
          <SettingsButton onClick={() => router.push("/films-series/instellingen")} />
        </div>
        <div className="mt-1 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:items-center lg:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <PageBackButton href="/" label="Terug" />
            <h1 className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">Films &amp; series</h1>
          </div>
          <SearchBar
            surface="app"
            className="lg:w-[300px]"
            placeholder="Zoek film of serie"
            value={query}
            onValueChange={setQuery}
          />
          <span className="hidden lg:block">
            <SettingsButton onClick={() => router.push("/films-series/instellingen")} />
          </span>
        </div>

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
                      ? "bg-[var(--blue-500)] font-medium text-white"
                      : "bg-white font-normal text-[var(--gray-500)] shadow-[0px_1px_2px_rgba(0,0,0,0.04)]",
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
                <FilmResultCard key={result.id} result={result} scoreSource={result.scoreSource ?? scoreSourceMap[result.id]} onAdd={handleAdd} onViewDetail={handleViewDetail} />
              ))
            )}
          </div>
        )}

        {!hasQuery && (!mounted || dataLoading) ? <FilmsOverviewSkeleton /> : null}

        {mounted && !dataLoading && !hasQuery && (hasWatchlistItems || hasPartnerItems || watchingItems.length > 0 || hasDiscoverSection) && (
          <div className="mt-7 flex flex-col gap-7 lg:mt-8 lg:gap-8">
            {/* Aan het kijken — bovenaan: wat je het vaakst gebruikt */}
            {watchingItems.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionHead title="Aan het kijken" href="/films-series/aan-het-kijken" />
                <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:overflow-visible lg:px-0" style={{ scrollbarWidth: "none" }}>
                  <div className="flex w-max gap-2.5 lg:grid lg:w-full lg:grid-cols-3 lg:gap-3.5">
                    {watchingItems.map((item) => (
                      <WatchingCard
                        key={item.id}
                        item={item}
                        menuOpen={watchMenuFor === item.id}
                        onToggleMenu={() => setWatchMenuFor((v) => (v === item.id ? null : item.id))}
                        onOpen={() => router.push(`/films-series/${item.id}/episodes/s${item.nextSeason}e${item.nextEpisode}`)}
                        onNext={(e) => handleMarkNextEpisode(e, item)}
                        onSeason={() => void handleMarkSeason(item)}
                        onSeries={() => void handleMarkSeries(item)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Watchlist partner */}
            {hasPartnerItems && (
              <section className="flex flex-col gap-3">
                <SectionHead
                  title={`Watchlist ${partnerName ?? "partner"}`}
                  href="/films-series/partner-watchlist"
                  extra={<OneByOneButton onClick={() => router.push(`/films-series/partner/${partnerWatchlist[0].id}`)} />}
                  avatar={
                    <span className="flex size-[26px] shrink-0 overflow-hidden rounded-full bg-[var(--blue-50)] shadow-[0_0_0_2px_var(--white)]">
                      {partnerAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={partnerAvatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <MaskIcon src="/icons/avatar.svg" className="m-auto size-4 bg-[var(--blue-500)]" />
                      )}
                    </span>
                  }
                />
                <div className="-mx-4 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-3 lg:gap-4" style={{ width: "max-content" }}>
                    {partnerWatchlist.map((item) => (
                      <div key={item.id} className="w-32 shrink-0 lg:w-[140px]">
                        <button
                          type="button"
                          onClick={() => router.push(`/films-series/partner/${item.id}`)}
                          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-[14px]"
                        >
                          <Poster src={item.posterUrl} alt="">
                            <TypeChip type={item.type} />
                            {item.score != null ? <RatingChip score={item.score} source={scoreSourceMap[item.id]} /> : null}
                          </Poster>
                          <p className="mt-2 truncate text-[13.5px] font-bold leading-[18px] text-[var(--text-primary)]">{item.title}</p>
                        </button>
                        <div className="mt-2 flex gap-1.5">
                          <PartnerAction label="Ook op mijn watchlist" tone="blue" onClick={() => void reactToPartnerItem(item.id, "up")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[15px]">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </PartnerAction>
                          <PartnerAction label="Al gezien" onClick={() => void reactToPartnerItem(item.id, "seen")}>
                            <EyeIcon />
                          </PartnerAction>
                          <PartnerAction label="Niet voor mij" onClick={() => void reactToPartnerItem(item.id, "down")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5">
                              <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                          </PartnerAction>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Nieuw voor jou — één suggestie uit «Te ontdekken» */}
            {hasDiscoverSection && (
              <section className="flex flex-col gap-3">
                <SectionHead title="Nieuw voor jou" href="/films-series/discover" linkLabel="Meer ontdekken" />
                {discoverLoading || !discoverFeature ? (
                  <Shimmer className="h-[198px] rounded-[24px] lg:h-[227px]" />
                ) : (
                  <DiscoverFeature
                    item={discoverFeature}
                    scoreSource={scoreSourceMap[discoverFeature.id] ?? discoverFeature.scoreSource}
                    onOpen={() => handleViewDetail(discoverFeature.id)}
                    onAdd={() => handleAdd(discoverFeature)}
                    onNext={() => setDiscoverIndex((i) => i + 1)}
                  />
                )}
              </section>
            )}

            {/* Watchlist films */}
            {watchlistFilms.length > 0 && (
              <section ref={filmsSectionRef} className="flex flex-col gap-3">
                <SectionHead title="Watchlist films" href="/films-series/watchlist/films" count={watchlistFilms.length} />
                <div ref={filmsScrollRef} className="-mx-4 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                  <div className="flex" style={{ width: "max-content" }}>
                    {watchlistFilms.map((item) => {
                      const isCollapsed = removingFilmId === item.id || restoringFilmId === item.id;
                      return (
                        <div
                          key={item.id}
                          /* Breedte = poster + tussenruimte (mobiel 120+12, desktop 140+16); 0 tijdens weghalen. */
                          className="w-[132px] shrink-0 overflow-hidden pr-3 lg:w-[156px] lg:pr-4"
                          style={{
                            ...(isCollapsed ? { width: 0 } : null),
                            opacity: isCollapsed ? 0 : 1,
                            transition: "width 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease-out",
                          }}
                        >
                          <PosterTile
                            item={item}
                            scoreSource={scoreSourceMap[item.id]}
                            buttonRef={(el) => { if (item.id === lastAddedId) lastAddedItemRef.current = el; }}
                            onOpen={() => handleViewDetail(item.id)}
                            onSeen={(e) => handleRemoveFilm(e, item)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Watchlist series */}
            {watchlistSeries.length > 0 && (
              <section ref={seriesSectionRef} className="flex flex-col gap-3">
                <SectionHead title="Watchlist series" href="/films-series/watchlist/series" count={watchlistSeries.length} />
                <div ref={seriesScrollRef} className="-mx-4 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-3" style={{ width: "max-content" }}>
                    {watchlistSeries.map((item) => (
                      <PosterTile
                        key={item.id}
                        item={item}
                        scoreSource={scoreSourceMap[item.id]}
                        buttonRef={(el) => { if (item.id === lastAddedId) lastAddedItemRef.current = el; }}
                        onOpen={() => handleViewDetail(item.id)}
                      />
                    ))}
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
      {mounted && !dataLoading && !hasQuery && !hasWatchlistItems && !hasPartnerItems && watchingItems.length === 0 && !hasDiscoverSection && (
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
