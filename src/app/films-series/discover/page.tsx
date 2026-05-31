"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { Snackbar } from "@/components/ui/snackbar";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import type { WatchlistItem } from "@/lib/watchlist";

type DiscoverItem = {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  typeLabel: string;
  posterUrl: string | null;
  score: number | null;
};

type CastMember = {
  name: string;
  character: string;
  profileUrl: string | null;
};

const REFILL_BATCH = 8;
const LOW_WATERMARK = 5;

type FilmDetail = {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  certification: string;
  runtime: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  score: number | null;
  scoreSource: "imdb" | "tmdb";
  imdbId: string | null;
  genres: string[];
  cast: CastMember[];
  trailerKey: string | null;
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

function ThreeDotsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function StarIcon({ source = "tmdb" }: { source?: "imdb" | "tmdb" }) {
  const fill = source === "imdb" ? "#FBBF24" : "#4f55f1";
  const stroke = source === "imdb" ? "#F59E0B" : "#4f55f1";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="size-6 shrink-0">
      <path
        d="M12 2l2.75 5.57 6.15.9-4.45 4.33 1.05 6.11L12 15.9l-5.5 2.89 1.05-6.11L3.1 8.47l6.15-.9L12 2z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function imdbUrl(title: string, imdbId: string | null): string {
  if (imdbId) return `https://www.imdb.com/title/${imdbId}/`;
  return `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`;
}

function youtubeSearchUrl(title: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " trailer")}`;
}

function DetailSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="h-8 w-3/4 rounded bg-[var(--gray-100)]" />
      <div className="h-5 w-1/2 rounded bg-[var(--gray-100)]" />
      <div className="h-16 rounded bg-[var(--gray-100)]" />
      <div className="flex gap-3">
        <div className="h-14 flex-1 rounded-lg bg-[var(--gray-100)]" />
        <div className="h-14 flex-1 rounded-lg bg-[var(--gray-100)]" />
        <div className="h-14 flex-1 rounded-lg bg-[var(--gray-100)]" />
      </div>
      <div className="w-full rounded-lg bg-[var(--gray-100)]" style={{ aspectRatio: "16/9" }} />
      <div className="w-full rounded-[4px] bg-[var(--gray-100)]" style={{ aspectRatio: "2/3" }} />
    </div>
  );
}

function GhostContent({
  item,
  detail,
}: {
  item: DiscoverItem | null;
  detail: FilmDetail | null;
}) {
  if (!item) return <DetailSkeleton />;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold leading-8 text-[var(--text-primary)]">
          {item.title}
        </h1>
        {(detail?.score ?? item.score) !== null && (
          <div className="flex shrink-0 items-center gap-1 pt-1">
            <StarIcon />
            <p className="font-medium text-[var(--text-primary)]">
              <span className="text-base leading-6">{((detail?.score ?? item.score)!).toFixed(1)}</span>
              <span className="text-xs font-normal leading-none">/10</span>
            </p>
          </div>
        )}
      </div>
      <div className="h-16 rounded bg-[var(--gray-100)]" />
      <div className="flex gap-3">
        <div className="h-14 flex-1 rounded-lg border border-[#4f55f1]" />
        <div className="h-14 flex-1 rounded-lg bg-[#4f55f1]" />
        <div className="h-14 flex-1 rounded-lg bg-[#d64040]" />
      </div>
      <div
        className="relative w-full overflow-hidden rounded-lg bg-[var(--gray-100)]"
        style={{ aspectRatio: "16/9" }}
      >
        {detail?.backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.backdropUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-black/20" aria-hidden />
      </div>
    </div>
  );
}

export default function DiscoverCarouselPage() {
  const router = useRouter();
  const {
    addToWatchlist,
    markWatched,
    watchlist,
    watchedIds,
    discoverDismissedIds,
    dismissDiscoverItem,
  } = useFilmsLibrary();

  const [items, setItems] = React.useState<DiscoverItem[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [detail, setDetail] = React.useState<FilmDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [showTrailer, setShowTrailer] = React.useState(false);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [overviewNeedsTruncation, setOverviewNeedsTruncation] = React.useState(false);
  const overviewRef = React.useRef<HTMLParagraphElement>(null);
  const fullscreenDivRef = React.useRef<HTMLDivElement>(null);
  const detailCacheRef = React.useRef<Map<string, FilmDetail>>(new Map());
  const [snackbar, setSnackbar] = React.useState<{ message: string } | null>(null);
  const snackbarTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refillInFlightRef = React.useRef(false);
  const hasMoreRef = React.useRef(true);
  const processedIdsRef = React.useRef<Set<string>>(new Set());

  // Adjacent item detail for ghost panels
  const [prevGhost, setPrevGhost] = React.useState<FilmDetail | null>(null);
  const [nextGhost, setNextGhost] = React.useState<FilmDetail | null>(null);

  // Swipe animation refs
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const prevPanelRef = React.useRef<HTMLDivElement>(null);
  const nextPanelRef = React.useRef<HTMLDivElement>(null);
  const animatingRef = React.useRef(false);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    startTime: number;
    dx: number;
    isHorizontal: boolean | null;
  } | null>(null);

  // Stable refs to avoid stale closures in event handlers
  const currentIndexRef = React.useRef(currentIndex);
  const itemsRef = React.useRef(items);
  React.useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  React.useEffect(() => { itemsRef.current = items; }, [items]);

  // Initialize ghost panel positions when items become available (panels are conditionally rendered,
  // so refs are null during the initial [] effect — tie to listLoading instead)
  React.useEffect(() => {
    if (listLoading) return;
    const w = window.innerWidth;
    if (prevPanelRef.current) prevPanelRef.current.style.transform = `translateX(${-w}px)`;
    if (nextPanelRef.current) nextPanelRef.current.style.transform = `translateX(${w}px)`;
  }, [listLoading]);

  const discoverExcludeIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const item of watchlist) ids.add(item.id);
    for (const id of watchedIds) {
      if (id.startsWith("movie-") || id.startsWith("tv-")) ids.add(id);
    }
    for (const id of discoverDismissedIds) ids.add(id);
    return ids;
  }, [watchlist, watchedIds, discoverDismissedIds]);

  const discoverExcludeIdsRef = React.useRef(discoverExcludeIds);
  React.useEffect(() => {
    discoverExcludeIdsRef.current = discoverExcludeIds;
  }, [discoverExcludeIds]);

  const buildExcludeSet = React.useCallback((extraIds: string[] = []) => {
    const exclude = new Set(discoverExcludeIdsRef.current);
    for (const item of itemsRef.current) exclude.add(item.id);
    for (const id of Array.from(processedIdsRef.current)) exclude.add(id);
    for (const id of extraIds) exclude.add(id);
    return exclude;
  }, []);

  const refillDiscover = React.useCallback(async (extraExclude: string[] = []) => {
    if (refillInFlightRef.current || !hasMoreRef.current) return;

    refillInFlightRef.current = true;
    try {
      const exclude = buildExcludeSet(extraExclude);
      const params = new URLSearchParams({
        limit: String(REFILL_BATCH),
        exclude: Array.from(exclude).join(","),
      });
      const res = await fetch(`/api/films/discover?${params}`);
      if (!res.ok) return;

      const data = (await res.json()) as { results?: DiscoverItem[]; hasMore?: boolean };
      const newItems = (data.results ?? []).filter(
        (item) => !discoverExcludeIdsRef.current.has(item.id),
      );

      if (newItems.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      hasMoreRef.current = data.hasMore ?? true;
      setItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const item of newItems) {
          if (!existing.has(item.id)) merged.push(item);
        }
        return merged;
      });
    } catch {
      // stil falen — gebruiker kan terug navigeren
    } finally {
      refillInFlightRef.current = false;
    }
  }, [buildExcludeSet]);

  React.useEffect(() => {
    fetch("/api/films/discover")
      .then((r) => r.json())
      .then((data: { results: DiscoverItem[]; hasMore?: boolean }) => {
        hasMoreRef.current = data.hasMore ?? true;
        setItems((data.results ?? []).filter((item) => !discoverExcludeIdsRef.current.has(item.id)));
        setListLoading(false);
      })
      .catch(() => setListLoading(false));
  }, []);

  React.useEffect(() => {
    if (listLoading || refillInFlightRef.current || !hasMoreRef.current) return;
    if (items.length > 0 && items.length <= LOW_WATERMARK) {
      void refillDiscover();
    }
  }, [items.length, listLoading, refillDiscover]);

  React.useEffect(() => {
    setItems((currentItems) => {
      const visibleItems = currentItems.filter((item) => !discoverExcludeIds.has(item.id));
      return visibleItems.length === currentItems.length ? currentItems : visibleItems;
    });
  }, [discoverExcludeIds]);

  React.useEffect(() => {
    setCurrentIndex((index) => (items.length === 0 ? 0 : Math.min(index, items.length - 1)));
  }, [items.length]);

  function fetchDetail(id: string): Promise<FilmDetail | null> {
    const cached = detailCacheRef.current.get(id);
    if (cached) return Promise.resolve(cached);
    const dashIdx = id.indexOf("-");
    const type = id.slice(0, dashIdx);
    const tmdbId = id.slice(dashIdx + 1);
    return fetch(`/api/films/detail?type=${type}&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: FilmDetail) => {
        detailCacheRef.current.set(id, data);
        return data;
      })
      .catch(() => null);
  }

  const currentItem = items[currentIndex] ?? null;

  // Fetch detail for current item
  React.useEffect(() => {
    if (!currentItem) return;
    const cached = detailCacheRef.current.get(currentItem.id);
    if (cached) {
      setDetail(cached);
      setOverviewExpanded(false);
      return;
    }
    setDetailLoading(true);
    setDetail(null);
    setOverviewExpanded(false);
    fetchDetail(currentItem.id).then((data) => {
      if (data) setDetail(data);
      setDetailLoading(false);
    });
  }, [currentItem?.id]);

  // Pre-fetch adjacent items for ghost panels
  React.useEffect(() => {
    if (items.length === 0) return;
    const prevItem = items[currentIndex - 1];
    const nextItem = items[currentIndex + 1];

    setPrevGhost(prevItem ? (detailCacheRef.current.get(prevItem.id) ?? null) : null);
    setNextGhost(nextItem ? (detailCacheRef.current.get(nextItem.id) ?? null) : null);

    if (prevItem && !detailCacheRef.current.has(prevItem.id)) {
      fetchDetail(prevItem.id).then((data) => {
        if (data) setPrevGhost(data);
      });
    }
    if (nextItem && !detailCacheRef.current.has(nextItem.id)) {
      fetchDetail(nextItem.id).then((data) => {
        if (data) setNextGhost(data);
      });
    }
  }, [currentIndex, items]);

  React.useEffect(() => {
    if (!overviewRef.current || !detail?.overview) return;
    setOverviewNeedsTruncation(overviewRef.current.scrollHeight > 80);
  }, [detail?.overview]);

  React.useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setShowTrailer(false);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  React.useEffect(() => {
    if (!showTrailer) return;
    function onMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data?.info === 0) {
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
          setShowTrailer(false);
        }
      } catch {}
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [showTrailer]);

  // ─── Core navigation animation (same pattern as episode detail page) ──────────

  const commitNavigationRef = React.useRef<(dir: "prev" | "next", fromX?: number, velocity?: number) => void>();

  commitNavigationRef.current = (dir: "prev" | "next", fromX = 0, velocity = 0) => {
    if (animatingRef.current) return;
    const idx = currentIndexRef.current;
    const its = itemsRef.current;
    if (dir === "prev" && idx === 0) return;
    if (dir === "next" && idx === its.length - 1) return;

    animatingRef.current = true;

    const nextIndex = dir === "prev" ? idx - 1 : idx + 1;
    const nextItem = its[nextIndex] ?? null;
    const cached = nextItem ? (detailCacheRef.current.get(nextItem.id) ?? null) : null;

    const el = contentRef.current;
    const prevEl = prevPanelRef.current;
    const nextEl = nextPanelRef.current;
    if (!el) { animatingRef.current = false; return; }

    const screenWidth = window.innerWidth;
    const exitTarget = dir === "next" ? -screenWidth : screenWidth;
    const remaining = Math.abs(exitTarget - fromX);
    const exitDur = velocity > 0.05
      ? Math.min(220, Math.max(50, remaining / Math.max(velocity, 0.4)))
      : 240;
    const transition = `transform ${exitDur}ms ease-out`;

    el.style.transition = transition;
    el.style.transform = `translateX(${exitTarget}px)`;

    const arrivingEl = dir === "next" ? nextEl : prevEl;
    const leavingEl = dir === "next" ? prevEl : nextEl;

    if (arrivingEl) {
      arrivingEl.style.transition = transition;
      arrivingEl.style.transform = "translateX(0)";
    }

    function onExit(ev: TransitionEvent) {
      if (!el || ev.target !== el || ev.propertyName !== "transform") return;
      el.removeEventListener("transitionend", onExit);

      flushSync(() => {
        setCurrentIndex(nextIndex);
        setDetail(cached);
        setDetailLoading(!cached);
        setOverviewExpanded(false);
        setOverviewNeedsTruncation(false);
      });

      el.style.transition = "none";
      el.style.transform = "translateX(0)";

      if (arrivingEl) {
        arrivingEl.style.transition = "none";
        arrivingEl.style.transform = `translateX(${dir === "next" ? screenWidth : -screenWidth}px)`;
      }
      if (leavingEl) {
        leavingEl.style.transition = "none";
        leavingEl.style.transform = `translateX(${dir === "next" ? -screenWidth : screenWidth}px)`;
      }

      animatingRef.current = false;
    }

    el.addEventListener("transitionend", onExit);
  };

  // Non-passive touchmove to allow preventDefault during horizontal swipe
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: TouchEvent) => {
      const drag = dragRef.current;
      if (!drag || animatingRef.current) return;

      const dx = e.touches[0].clientX - drag.startX;
      const dy = e.touches[0].clientY - drag.startY;

      if (drag.isHorizontal === null) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          drag.isHorizontal = Math.abs(dx) > Math.abs(dy);
        }
        return;
      }
      if (!drag.isHorizontal) return;
      e.preventDefault();

      drag.dx = dx;
      const w = window.innerWidth;
      const el = contentRef.current;
      const prevEl = prevPanelRef.current;
      const nextEl = nextPanelRef.current;

      if (el) {
        el.style.transition = "none";
        el.style.transform = `translateX(${dx}px)`;
      }
      if (prevEl) {
        prevEl.style.transition = "none";
        prevEl.style.transform = `translateX(${dx - w}px)`;
      }
      if (nextEl) {
        nextEl.style.transition = "none";
        nextEl.style.transform = `translateX(${dx + w}px)`;
      }
    };

    container.addEventListener("touchmove", onMove, { passive: false });
    return () => container.removeEventListener("touchmove", onMove);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    if (animatingRef.current) return;
    dragRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
      dx: 0,
      isHorizontal: null,
    };
  }

  function handleTouchEnd() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.isHorizontal) return;

    const dx = drag.dx;
    const elapsed = Math.max(Date.now() - drag.startTime, 1);
    const velocity = Math.abs(dx) / elapsed;
    const screenWidth = window.innerWidth;
    const shouldCommit = Math.abs(dx) > screenWidth * 0.25 || velocity > 0.4;

    const dir = dx < 0 ? "next" : "prev";
    const idx = currentIndexRef.current;
    const its = itemsRef.current;
    const canNav = dir === "next" ? idx < its.length - 1 : idx > 0;

    if (!shouldCommit || !canNav) {
      const el = contentRef.current;
      const prevEl = prevPanelRef.current;
      const nextEl = nextPanelRef.current;
      const w = window.innerWidth;

      if (el) {
        el.style.transition = "transform 220ms ease-out";
        el.style.transform = "translateX(0)";
        el.addEventListener("transitionend", function onSnap(ev) {
          if (ev.target !== el || ev.propertyName !== "transform") return;
          el.removeEventListener("transitionend", onSnap);
          el.style.transition = "";
          el.style.transform = "";
        });
      }
      if (prevEl) {
        prevEl.style.transition = "transform 220ms ease-out";
        prevEl.style.transform = `translateX(${-w}px)`;
      }
      if (nextEl) {
        nextEl.style.transition = "transform 220ms ease-out";
        nextEl.style.transform = `translateX(${w}px)`;
      }
      return;
    }

    commitNavigationRef.current?.(dir, dx, velocity);
  }

  function navigateTo(dir: "prev" | "next") {
    commitNavigationRef.current?.(dir);
  }

  // ─── Action handlers ──────────────────────────────────────────────────────────

  function showSnackbar(message: string) {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar({ message });
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4500);
  }

  function removeFromCarousel(mediaId: string) {
    processedIdsRef.current.add(mediaId);
    setItems((currentItems) => currentItems.filter((item) => item.id !== mediaId));
    setDetail(null);
    setDetailLoading(true);
    setOverviewExpanded(false);
    setOverviewNeedsTruncation(false);
  }

  function handleLike() {
    if (!currentItem) return;
    const item: WatchlistItem = {
      id: currentItem.id,
      type: currentItem.type,
      title: currentItem.title,
      year: currentItem.year,
      posterUrl: detail?.posterUrl ?? currentItem.posterUrl,
      score: detail?.score ?? currentItem.score,
    };
    void addToWatchlist(item);
    showSnackbar(`${currentItem.title} toegevoegd aan watchlist`);
    removeFromCarousel(currentItem.id);
  }

  function handleSeen() {
    if (!currentItem) return;
    if (currentItem.type === "movie") {
      void markWatched(currentItem.id);
    } else {
      // Voor series: enkel uit de carousel verwijderen, niet de hele serie als gezien markeren
      void dismissDiscoverItem(currentItem.id);
    }
    showSnackbar(`${currentItem.title} als gezien gemarkeerd`);
    removeFromCarousel(currentItem.id);
  }

  function handleDislike() {
    if (!currentItem) return;
    void dismissDiscoverItem(currentItem.id);
    showSnackbar(`${currentItem.title} gedisliket`);
    removeFromCarousel(currentItem.id);
  }

  function handleWatching() {
    if (!currentItem) return;
    const tmdbId = currentItem.id.replace(/^tv-/, "");
    // ep-{tmdbId}-s1e0 → watchingItems toont dit als "volgende: s1e1"
    void markWatched(`ep-${tmdbId}-s1e0`);
    void addToWatchlist({
      id: currentItem.id,
      type: "tv",
      title: currentItem.title,
      year: currentItem.year,
      posterUrl: detail?.posterUrl ?? currentItem.posterUrl ?? null,
      score: detail?.score ?? currentItem.score ?? null,
    });
    showSnackbar(`${currentItem.title} toegevoegd aan 'Aan het kijken'`);
    removeFromCarousel(currentItem.id);
  }

  function handlePlay() {
    if (!detail?.trailerKey) return;
    fullscreenDivRef.current?.requestFullscreen?.().catch(() => {});
    setShowTrailer(true);
  }

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const metaParts = [detail?.year, detail?.certification, detail?.runtime].filter(Boolean);
  const genrePart = detail?.genres?.join(" - ") ?? "";
  const metaLine = genrePart ? `${metaParts.join("  ")}  /  ${genrePart}` : metaParts.join("  ");

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Vaste header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex justify-center">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4 px-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.push("/films-series")}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-base font-medium leading-6 text-[var(--text-primary)]">
              Te ontdekken
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

      {/* Trailer fullscreen overlay — altijd in DOM zodat requestFullscreen() synchroon werkt */}
      <div
        ref={fullscreenDivRef}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black",
          showTrailer ? "pointer-events-auto" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!showTrailer}
      >
        {showTrailer && detail?.trailerKey && (
          <iframe
            key={detail.trailerKey}
            src={`https://www.youtube.com/embed/${detail.trailerKey}?autoplay=1&mute=0&enablejsapi=1&rel=0&playsinline=0&fs=1`}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="h-full w-full"
            title="Trailer"
          />
        )}
        <button
          type="button"
          aria-label="Sluiten"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
            setShowTrailer(false);
          }}
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Scrollbare inhoud */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+48px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {listLoading ? (
          <div className="flex animate-pulse flex-col gap-6 pt-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-[var(--gray-100)]" />
              <div className="h-5 flex-1 rounded bg-[var(--gray-100)]" />
              <div className="size-10 rounded-full bg-[var(--gray-100)]" />
            </div>
            <DetailSkeleton />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--gray-400)]">Geen suggesties gevonden.</p>
        ) : (
          <>
            {/* Navigatierij */}
            <div className="flex shrink-0 items-center gap-4 pt-4">
              <button
                type="button"
                aria-label="Vorige"
                onClick={() => navigateTo("prev")}
                disabled={!hasPrev}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  !hasPrev && "pointer-events-none opacity-25",
                )}
              >
                <MaskIcon src="/icons/chevron.svg" className="size-6 rotate-90 bg-[#4f55f1]" />
              </button>
              <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
                {currentIndex + 1} van {items.length}
              </p>
              <button
                type="button"
                aria-label="Volgende"
                onClick={() => navigateTo("next")}
                disabled={!hasNext}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  !hasNext && "pointer-events-none opacity-25",
                )}
              >
                <MaskIcon src="/icons/chevron.svg" className="size-6 -rotate-90 bg-[#4f55f1]" />
              </button>
            </div>

            {/* Sliding panel wrapper — overflow-hidden clips ghost panels during swipe */}
            <div className="relative overflow-hidden">
              {/* Vorig item ghost panel — off-screen links (inline transform zorgt dat het direct verborgen is vóór de useEffect) */}
              <div
                ref={prevPanelRef}
                style={{ transform: "translateX(-200vw)" }}
                className="pointer-events-none absolute left-0 top-0 w-full"
                aria-hidden
              >
                <GhostContent
                  item={items[currentIndex - 1] ?? null}
                  detail={prevGhost}
                />
              </div>

              {/* Volgend item ghost panel — off-screen rechts */}
              <div
                ref={nextPanelRef}
                style={{ transform: "translateX(200vw)" }}
                className="pointer-events-none absolute left-0 top-0 w-full"
                aria-hidden
              >
                <GhostContent
                  item={items[currentIndex + 1] ?? null}
                  detail={nextGhost}
                />
              </div>

              {/* Huidig item — dit panel schuift tijdens swipe */}
              <div ref={contentRef} className="flex flex-col gap-6">
                {detailLoading && !detail ? (
                  <DetailSkeleton />
                ) : detail ? (
                  <>
                    {/* Titel + score */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <h1 className="min-w-0 flex-1 text-2xl font-bold leading-8 text-[var(--text-primary)]">
                          {detail.title}
                        </h1>
                        {detail.score !== null && (
                          <div className="flex shrink-0 items-center gap-1 pt-1">
                            <StarIcon source={detail.scoreSource} />
                            <p className="font-medium text-[var(--text-primary)]">
                              <span className="text-base leading-6">{detail.score.toFixed(1)}</span>
                              <span className="text-xs font-normal leading-none">/10</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {metaLine && (
                        <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                          <p className="whitespace-nowrap text-sm leading-5 text-[#8c929d]">{metaLine}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-6 pt-1">
                        <a
                          href={imdbUrl(detail.title, detail.imdbId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${detail.title} bekijken op IMDb`}
                          className="flex h-6 w-12 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/logos/logos-imdb.svg" alt="IMDb" className="h-6 w-auto max-w-full object-contain" />
                        </a>
                        <a
                          href={youtubeSearchUrl(detail.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Trailer van ${detail.title} zoeken op YouTube`}
                          className="flex h-6 w-[108px] shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/logos/logos-youtube.svg" alt="YouTube" className="h-6 w-auto max-w-full object-contain" />
                        </a>
                      </div>
                    </div>

                    {/* Overview */}
                    {detail.overview ? (
                      <div className="flex flex-col gap-1">
                        <p
                          ref={overviewRef}
                          className={cn(
                            "text-sm leading-5 text-[var(--text-primary)]",
                            !overviewExpanded && overviewNeedsTruncation && "line-clamp-4",
                          )}
                        >
                          {detail.overview}
                        </p>
                        {overviewNeedsTruncation && (
                          <button
                            type="button"
                            onClick={() => setOverviewExpanded((v) => !v)}
                            className="self-start text-sm font-medium leading-5 text-[#4f55f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                          >
                            {overviewExpanded ? "Toon minder" : "Toon meer"}
                          </button>
                        )}
                      </div>
                    ) : null}

                    {/* Actieknoppen */}
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          aria-label="Als gezien markeren"
                          onClick={handleSeen}
                          className="flex flex-1 items-center justify-center rounded-lg border border-[#4f55f1] py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        >
                          <MaskIcon src="/icons/visible.svg" className="size-6 bg-[#4f55f1]" />
                        </button>
                        <button
                          type="button"
                          aria-label="Liken en toevoegen aan watchlist"
                          onClick={handleLike}
                          className="flex flex-1 items-center justify-center rounded-lg bg-[#4f55f1] py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        >
                          <MaskIcon src="/icons/thumb_up.svg" className="size-6 bg-white" />
                        </button>
                        <button
                          type="button"
                          aria-label="Disliken"
                          onClick={handleDislike}
                          className="flex flex-1 items-center justify-center rounded-lg bg-[#d64040] py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        >
                          <MaskIcon src="/icons/thumb_down.svg" className="size-6 bg-white" />
                        </button>
                      </div>
                      {currentItem?.type === "tv" && (
                        <button
                          type="button"
                          aria-label="Ik ben dit nu aan het kijken"
                          onClick={handleWatching}
                          className="flex w-full items-center gap-3 rounded-lg border border-[#4f55f1] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        >
                          <span className="flex-1 text-left text-base font-medium leading-6 text-[#4f55f1]">
                            Ik ben dit nu aan het kijken
                          </span>
                          <MaskIcon src="/icons/visible.svg" className="size-6 shrink-0 bg-[#4f55f1]" />
                        </button>
                      )}
                    </div>

                    {/* Backdrop met playknop */}
                    <div
                      className="relative w-full overflow-hidden rounded-lg bg-[var(--gray-100)]"
                      style={{ aspectRatio: "16/9" }}
                    >
                      {detail.backdropUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detail.backdropUrl}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                          aria-hidden
                        />
                      )}
                      <div className="absolute inset-0 bg-black/20" aria-hidden />
                      {detail.trailerKey && (
                        <button
                          type="button"
                          aria-label="Trailer afspelen"
                          onClick={handlePlay}
                          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[2.75px] border-white bg-black/20 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          style={{ width: 51, height: 51 }}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M8 5v14l11-7L8 5z" fill="white" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Poster */}
                    {detail.posterUrl && (
                      <div
                        className="w-full overflow-hidden rounded-[4px] bg-[var(--gray-100)]"
                        style={{ aspectRatio: "2/3" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detail.posterUrl}
                          alt={detail.title}
                          className="size-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}

                    {/* Cast */}
                    {detail.cast.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-base font-bold leading-6 text-[var(--text-primary)]">Cast</h2>
                          <button
                            type="button"
                            onClick={() => router.push(`/films-series/${detail.id}`)}
                            className="text-xs font-medium leading-4 text-[#4f55f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                          >
                            Toon alle
                          </button>
                        </div>
                        <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                          <div className="flex gap-3" style={{ width: "max-content" }}>
                            {detail.cast.slice(0, 10).map((member, i) => (
                              <div key={i} className="flex w-16 shrink-0 flex-col gap-1">
                                <div className="size-16 overflow-hidden rounded-full bg-[var(--gray-100)]">
                                  {member.profileUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={member.profileUrl}
                                      alt=""
                                      className="size-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center">
                                      <MaskIcon src="/icons/avatar.svg" className="size-8 bg-[var(--gray-300)]" />
                                    </div>
                                  )}
                                </div>
                                <p className="line-clamp-2 text-center text-[11px] font-medium leading-4 text-[var(--text-primary)]">
                                  {member.name}
                                </p>
                                <p className="line-clamp-1 text-center text-[10px] leading-3 text-[#8c929d]">
                                  {member.character}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Snackbar */}
      {snackbar && (
        <div className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS}>
          <Snackbar message={snackbar.message} actionLabel={null} />
        </div>
      )}
    </div>
  );
}
