"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import type { WatchlistItem } from "@/lib/watchlist";

type CastMember = {
  name: string;
  character: string;
  profileUrl: string | null;
};

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
  imdbId: string | null;
  totalEpisodes: number | null;
  genres: string[];
  cast: CastMember[];
  trailerKey: string | null;
};

type AdjData = {
  prevItem: WatchlistItem | null;
  prevDetail: FilmDetail | null;
  nextItem: WatchlistItem | null;
  nextDetail: FilmDetail | null;
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

function StarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="size-6 shrink-0">
      <path
        d="M12 2l2.75 5.57 6.15.9-4.45 4.33 1.05 6.11L12 15.9l-5.5 2.89 1.05-6.11L3.1 8.47l6.15-.9L12 2z"
        fill="#FBBF24"
        stroke="#F59E0B"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-8 w-2/3 rounded bg-[var(--gray-100)]" />
          <div className="h-6 w-16 rounded bg-[var(--gray-100)]" />
        </div>
        <div className="h-5 w-48 rounded bg-[var(--gray-100)]" />
        <div className="flex gap-4">
          <div className="h-6 w-12 rounded bg-[var(--gray-100)]" />
          <div className="h-6 w-28 rounded bg-[var(--gray-100)]" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 rounded bg-[var(--gray-100)]" style={{ width: i === 3 ? "60%" : "100%" }} />
        ))}
      </div>
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-[8px] bg-[var(--gray-100)]" />
        <div className="h-12 flex-1 rounded-[8px] bg-[var(--gray-100)]" />
        <div className="h-12 flex-1 rounded-[8px] bg-[var(--gray-100)]" />
      </div>
      <div className="w-full rounded bg-[var(--gray-100)]" style={{ aspectRatio: "2/3" }} />
      <div className="w-full rounded-lg bg-[var(--gray-100)]" style={{ aspectRatio: "16/9" }} />
    </div>
  );
}

/** Ghost panel rendered off-screen during swipe — matches the real layout exactly to avoid jumps. */
function GhostPanel({ item, detail }: { item: WatchlistItem | null; detail: FilmDetail | null }) {
  if (!item) return <DetailSkeleton />;

  // If we don't have the full detail yet, render a layout that approximates the real one
  // using the watchlist data we already have (title, poster, score).
  const score = detail?.score ?? item.score ?? null;
  const posterUrl = detail?.posterUrl ?? item.posterUrl ?? null;
  const metaParts = detail ? [detail.year, detail.certification, detail.runtime].filter(Boolean) : [];
  const genrePart = detail?.genres?.join(" - ") ?? "";
  const metaLine = genrePart ? `${metaParts.join("  ")}  /  ${genrePart}` : metaParts.join("  ");

  return (
    <div className="flex flex-col gap-6">
      {/* Title + score */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-bold leading-8 text-[#16181a]">
              {item.title}
            </h1>
            {score != null && (
              <div className="flex shrink-0 items-center gap-1">
                <StarIcon />
                <p className="font-medium text-[#16181a]">
                  <span className="text-base leading-6">{score.toFixed(1)}</span>
                  <span className="text-xs font-normal leading-none text-[#8c929d]">/10</span>
                </p>
              </div>
            )}
          </div>
          {metaLine ? (
            <p className="whitespace-nowrap text-sm leading-5 text-[#8c929d]">{metaLine}</p>
          ) : (
            // Placeholder so layout height matches when meta loads
            <div className="h-5 w-48 rounded bg-[var(--gray-100)]" />
          )}
        </div>
        {/* IMDb + YouTube logo placeholders */}
        <div className="flex items-center gap-6 opacity-20">
          <div className="h-6 w-12 rounded bg-[var(--gray-300)]" />
          <div className="h-6 w-[108px] rounded bg-[var(--gray-300)]" />
        </div>
      </div>

      {/* Overview */}
      {detail?.overview ? (
        <p className="line-clamp-5 text-base font-medium leading-6 text-[#16181a]">
          {detail.overview}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-[var(--gray-100)]" style={{ width: i === 2 ? "60%" : "100%" }} />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-[8px] border border-[#4f55f1]" />
        <div className="h-12 flex-1 rounded-[8px] bg-[#4f55f1]" />
        <div className="h-12 flex-1 rounded-[8px] bg-[#d64040]" />
      </div>

      {/* Poster */}
      <div className="relative w-full overflow-hidden rounded bg-[var(--gray-50)]" style={{ aspectRatio: "2/3" }}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" className="absolute inset-0 size-full object-cover" aria-hidden />
        ) : (
          <div className="flex size-full items-center justify-center">
            <MaskIcon src="/icons/films.svg" className="size-12 bg-[var(--gray-200)]" />
          </div>
        )}
      </div>

      {/* Trailer placeholder */}
      <div className="w-full rounded-lg bg-[var(--gray-100)]" style={{ aspectRatio: "16/9" }}>
        {detail?.backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detail.backdropUrl} alt="" className="size-full rounded-lg object-cover" aria-hidden />
        )}
      </div>
    </div>
  );
}

export default function PartnerFilmDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;

  const { partnerWatchlist, partnerName, reactToPartnerItem } = useFilmsLibrary();

  const [currentId, setCurrentId] = React.useState(rawId);

  const currentIndex = partnerWatchlist.findIndex((i) => i.id === currentId);
  const totalCount = partnerWatchlist.length;
  const prevItem = currentIndex > 0 ? partnerWatchlist[currentIndex - 1] : null;
  const nextItem =
    currentIndex >= 0 && currentIndex < totalCount - 1
      ? partnerWatchlist[currentIndex + 1]
      : null;
  const hasReacted = currentIndex === -1 && totalCount > 0;
  const hasPrev = !!prevItem;
  const hasNext = !!nextItem;

  const [detail, setDetail] = React.useState<FilmDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [overviewOverflows, setOverviewOverflows] = React.useState(false);
  const overviewRef = React.useRef<HTMLParagraphElement>(null);
  const [showTrailer, setShowTrailer] = React.useState(false);
  const [adjData, setAdjData] = React.useState<AdjData>({
    prevItem: null, prevDetail: null, nextItem: null, nextDetail: null,
  });

  const LINE_HEIGHT = 24;
  const MAX_HEIGHT = LINE_HEIGHT * 5;

  const detailCache = React.useRef<Map<string, FilmDetail>>(new Map());

  // Animation refs
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

  // Stable refs for use inside event listeners
  const hasPrevRef = React.useRef(hasPrev);
  const hasNextRef = React.useRef(hasNext);
  const currentIdRef = React.useRef(currentId);
  const partnerWatchlistRef = React.useRef(partnerWatchlist);
  React.useEffect(() => { hasPrevRef.current = hasPrev; }, [hasPrev]);
  React.useEffect(() => { hasNextRef.current = hasNext; }, [hasNext]);
  React.useEffect(() => { currentIdRef.current = currentId; }, [currentId]);
  React.useEffect(() => { partnerWatchlistRef.current = partnerWatchlist; }, [partnerWatchlist]);

  // Initialize ghost panels off-screen
  React.useEffect(() => {
    const w = window.innerWidth;
    if (prevPanelRef.current) prevPanelRef.current.style.transform = `translateX(${-w}px)`;
    if (nextPanelRef.current) nextPanelRef.current.style.transform = `translateX(${w}px)`;
  }, []);

  // Fetch detail for current item — check cache first
  React.useEffect(() => {
    if (!currentId) return;
    setOverviewExpanded(false);
    setOverviewOverflows(false);

    const cached = detailCache.current.get(currentId);
    if (cached) {
      setDetail(cached);
      setLoading(false);
      return;
    }

    const dashIdx = currentId.indexOf("-");
    const type = currentId.slice(0, dashIdx);
    const tmdbId = currentId.slice(dashIdx + 1);
    if (!type || !tmdbId) return;
    setLoading(true);
    fetch(`/api/films/detail?type=${type}&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: FilmDetail) => {
        detailCache.current.set(currentId, data);
        setDetail(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentId]);

  // Pre-fetch adjacent items and populate ghost panel data
  React.useEffect(() => {
    // Immediately populate ghost panels from whatever is already cached
    setAdjData({
      prevItem,
      prevDetail: prevItem ? (detailCache.current.get(prevItem.id) ?? null) : null,
      nextItem,
      nextDetail: nextItem ? (detailCache.current.get(nextItem.id) ?? null) : null,
    });

    const prefetch = (item: WatchlistItem | null, role: "prev" | "next") => {
      if (!item || detailCache.current.has(item.id)) return;
      const dashIdx = item.id.indexOf("-");
      const type = item.id.slice(0, dashIdx);
      const tmdbId = item.id.slice(dashIdx + 1);
      if (!type || !tmdbId) return;
      fetch(`/api/films/detail?type=${type}&id=${tmdbId}`)
        .then((r) => r.json())
        .then((data: FilmDetail) => {
          detailCache.current.set(item.id, data);
          setAdjData((prev) => {
            if (role === "prev" && prev.prevItem?.id === item.id) return { ...prev, prevDetail: data };
            if (role === "next" && prev.nextItem?.id === item.id) return { ...prev, nextDetail: data };
            return prev;
          });
        })
        .catch(() => {});
    };

    prefetch(prevItem, "prev");
    prefetch(nextItem, "next");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, prevItem?.id, nextItem?.id]);

  // Measure overview overflow after detail loads
  const overviewFull = detail?.overview ?? "";
  React.useEffect(() => {
    if (!overviewFull) { setOverviewOverflows(false); return; }
    const id = requestAnimationFrame(() => {
      const el = overviewRef.current;
      if (el) setOverviewOverflows(el.scrollHeight > MAX_HEIGHT + 1);
    });
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewFull, overviewExpanded]);

  function handleReact(reaction: "up" | "down" | "seen") {
    // Animate immediately — don't wait for the DB write, which would remove the item
    // from partnerWatchlist mid-render and cause a flash.
    if (nextItem) {
      commitNavigationRef.current?.("next");
    } else if (prevItem) {
      commitNavigationRef.current?.("prev");
    } else {
      router.push("/films-series/partner-watchlist");
    }
    // Fire DB write in the background after animation has started
    void reactToPartnerItem(currentId, reaction);
  }

  const metaParts = [detail?.year, detail?.certification, detail?.runtime].filter(Boolean);
  const genrePart = detail?.genres?.join(" - ") ?? "";
  const metaLine = genrePart ? `${metaParts.join("  ")}  /  ${genrePart}` : metaParts.join("  ");

  // ─── Core swipe animation ────────────────────────────────────────────────────

  const commitNavigationRef = React.useRef<(dir: "prev" | "next", fromX?: number, velocity?: number) => void>();

  commitNavigationRef.current = (dir, fromX = 0, velocity = 0) => {
    if (animatingRef.current) return;
    if (dir === "prev" && !hasPrevRef.current) return;
    if (dir === "next" && !hasNextRef.current) return;

    const list = partnerWatchlistRef.current;
    const idx = list.findIndex((i) => i.id === currentIdRef.current);
    const targetItem = dir === "prev" ? list[idx - 1] : list[idx + 1];
    if (!targetItem) return;

    animatingRef.current = true;

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

      const cached = detailCache.current.get(targetItem.id);
      flushSync(() => {
        setCurrentId(targetItem.id);
        setDetail(cached ?? null);
        setLoading(!cached);
        setOverviewExpanded(false);
        setOverviewOverflows(false);
      });

      // Update URL without triggering a Next.js navigation (avoids re-mount flash on [id] change)
      window.history.replaceState(null, "", `/films-series/partner/${targetItem.id}`);

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

  // Non-passive touchmove so we can preventDefault on horizontal swipe
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
      const elC = contentRef.current;
      const prevEl = prevPanelRef.current;
      const nextEl = nextPanelRef.current;

      if (elC) {
        elC.style.transition = "none";
        elC.style.transform = `translateX(${dx}px)`;
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
    const canNav = dir === "next" ? hasNextRef.current : hasPrevRef.current;

    if (!shouldCommit || !canNav) {
      const elC = contentRef.current;
      const prevEl = prevPanelRef.current;
      const nextEl = nextPanelRef.current;
      const w = window.innerWidth;

      if (elC) {
        elC.style.transition = "transform 220ms ease-out";
        elC.style.transform = "translateX(0)";
        elC.addEventListener("transitionend", function onSnap(ev) {
          if (ev.target !== elC || ev.propertyName !== "transform") return;
          elC.removeEventListener("transitionend", onSnap);
          elC.style.transition = "";
          elC.style.transform = "";
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

  function navigateItem(dir: "prev" | "next") {
    commitNavigationRef.current?.(dir);
  }

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
              onClick={() => router.push("/films-series/partner-watchlist")}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-base font-medium leading-6 text-[#16181a]">
              Watchlist {partnerName ?? "Partner"}
            </p>
            <button
              type="button"
              aria-label="Opties"
              className="flex size-6 shrink-0 items-center justify-center text-[#16181a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <ThreeDotsIcon />
            </button>
          </header>
        </div>
      </div>

      {/* Scrollbare inhoud */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {/* Navigatie "X van Y" */}
        {totalCount > 0 && (
          <div className="flex shrink-0 items-center gap-4 lg:justify-center lg:gap-4">
            <button
              type="button"
              aria-label="Vorig item"
              disabled={!prevItem}
              onClick={() => navigateItem("prev")}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                !prevItem && "pointer-events-none opacity-30",
              )}
            >
              <MaskIcon src="/icons/chevron.svg" className="size-6 rotate-90 bg-[#16181a]" />
            </button>
            <p className="flex-1 text-center text-base font-medium leading-6 text-[#16181a] lg:flex-none">
              {currentIndex >= 0 ? `${currentIndex + 1} van ${totalCount}` : `van ${totalCount}`}
            </p>
            <button
              type="button"
              aria-label="Volgend item"
              disabled={!nextItem}
              onClick={() => navigateItem("next")}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                !nextItem && "pointer-events-none opacity-30",
              )}
            >
              <MaskIcon src="/icons/chevron.svg" className="size-6 -rotate-90 bg-[#16181a]" />
            </button>
          </div>
        )}

        {/* Sliding panel wrapper */}
        <div className="relative">
          {/* Prev ghost panel — off-screen left, full layout to avoid jumps on commit */}
          <div
            ref={prevPanelRef}
            className="pointer-events-none absolute left-0 top-0 w-full"
            aria-hidden
          >
            <GhostPanel item={adjData.prevItem} detail={adjData.prevDetail} />
          </div>

          {/* Next ghost panel — off-screen right */}
          <div
            ref={nextPanelRef}
            className="pointer-events-none absolute left-0 top-0 w-full"
            aria-hidden
          >
            <GhostPanel item={adjData.nextItem} detail={adjData.nextDetail} />
          </div>

          {/* Current content — slides during swipe */}
          <div ref={contentRef} className="flex flex-col gap-6">
            {loading ? (
              <DetailSkeleton />
            ) : !detail ? (
              <p className="py-8 text-center text-sm text-[var(--gray-400)]">Kan details niet laden.</p>
            ) : (
              <>
                {/* Titel + score + meta + externe links */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <h1 className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-bold leading-8 text-[#16181a]">
                        {detail.title}
                      </h1>
                      {detail.score !== null && (
                        <div className="flex shrink-0 items-center gap-1">
                          <StarIcon />
                          <p className="font-medium text-[#16181a]">
                            <span className="text-base leading-6">{detail.score.toFixed(1)}</span>
                            <span className="text-xs font-normal leading-none text-[#8c929d]">/10</span>
                          </p>
                        </div>
                      )}
                    </div>
                    {metaLine && (
                      <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                        <p className="whitespace-nowrap text-sm leading-5 text-[#8c929d]">{metaLine}</p>
                      </div>
                    )}
                  </div>

                  {/* IMDb + YouTube links */}
                  <div className="flex items-center gap-6">
                    <a
                      href={detail.imdbId ? `https://www.imdb.com/title/${detail.imdbId}/` : `https://www.imdb.com/find/?q=${encodeURIComponent(detail.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${detail.title} op IMDb`}
                      className="flex h-6 w-12 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logos/logos-imdb.svg" alt="" className="h-6 w-auto max-w-full object-contain" />
                    </a>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${detail.title} trailer`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Trailer van ${detail.title} op YouTube`}
                      className="flex h-6 w-[108px] shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logos/logos-youtube.svg" alt="" className="h-6 w-auto max-w-full object-contain" />
                    </a>
                  </div>
                </div>

                {/* Overview — mobile only (on lg it appears in the flex-row beside the poster) */}
                {overviewFull && (
                  <div className="relative lg:hidden">
                    <p
                      ref={overviewRef}
                      className="text-base font-medium leading-6 text-[#16181a]"
                      style={
                        !overviewExpanded && overviewOverflows
                          ? { overflow: "hidden", maxHeight: `${MAX_HEIGHT}px` }
                          : undefined
                      }
                    >
                      {overviewFull}
                    </p>
                    {!overviewExpanded && overviewOverflows && (
                      <div className="absolute bottom-0 right-0 flex items-end">
                        <div
                          aria-hidden
                          style={{
                            width: 48,
                            height: LINE_HEIGHT,
                            background: "linear-gradient(to right, rgba(255,255,255,0), white)",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setOverviewExpanded(true)}
                          className="bg-white text-base font-medium leading-6 text-[#4f55f1] underline decoration-solid underline-offset-2 focus-visible:outline-none"
                        >
                          ... toon meer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actie-knoppen — mobile only */}
                {!hasReacted && (
                  <div className="flex gap-3 lg:hidden">
                    <button
                      type="button"
                      aria-label="Al gezien"
                      onClick={() => void handleReact("seen")}
                      className="flex h-12 flex-1 items-center justify-center rounded-[8px] border border-[#4f55f1] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <MaskIcon src="/icons/visible.svg" className="size-6 bg-[#4f55f1]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Toevoegen aan mijn watchlist"
                      onClick={() => void handleReact("up")}
                      className="flex h-12 flex-1 items-center justify-center rounded-[8px] bg-[#4f55f1] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <MaskIcon src="/icons/thumb_up.svg" className="size-6 bg-white" />
                    </button>
                    <button
                      type="button"
                      aria-label="Niet interessant"
                      onClick={() => void handleReact("down")}
                      className="flex h-12 flex-1 items-center justify-center rounded-[8px] bg-[#d64040] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <MaskIcon src="/icons/thumb_down.svg" className="size-6 bg-white" />
                    </button>
                  </div>
                )}

                {/* Media row: trailer + [poster + overview] side by side on lg */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
                  {/* Trailer: full 16:9 on mobile, 191px tall on lg */}
                  <div
                    className="relative shrink-0 overflow-hidden rounded-lg bg-[var(--gray-100)] lg:h-[191px] lg:w-auto lg:[aspect-ratio:16/9]"
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
                        onClick={() => setShowTrailer(true)}
                        className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/20 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M8 5v14l11-7L8 5z" fill="white" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Poster + overview — lg only */}
                  <div className="hidden items-start gap-6 lg:flex lg:flex-1">
                    <div className="relative h-[191px] w-[128px] shrink-0 overflow-hidden rounded bg-[var(--gray-50)]">
                      {detail.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detail.posterUrl}
                          alt={`Poster van ${detail.title}`}
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <MaskIcon src="/icons/films.svg" className="size-12 bg-[var(--gray-200)]" />
                        </div>
                      )}
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className={cn("overflow-hidden", !overviewExpanded && "h-[191px]")}>
                        <p className="text-base font-medium leading-6 text-[#16181a]">
                          {overviewFull || "Geen beschrijving beschikbaar."}
                        </p>
                      </div>
                      {!overviewExpanded && overviewFull && (
                        <div className="absolute bottom-0 right-0 flex items-baseline gap-1 bg-white">
                          <span className="text-base font-medium leading-6 text-[#16181a]">…</span>
                          <button
                            type="button"
                            onClick={() => setOverviewExpanded(true)}
                            className="text-base font-medium leading-6 text-[#4f55f1] underline decoration-solid underline-offset-2 focus-visible:outline-none"
                          >
                            toon meer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Poster — mobile only (full 2:3) */}
                <div
                  className="relative w-full overflow-hidden rounded bg-[var(--gray-50)] lg:hidden"
                  style={{ aspectRatio: "2/3" }}
                >
                  {detail.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detail.posterUrl}
                      alt={`Poster van ${detail.title}`}
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <MaskIcon src="/icons/films.svg" className="size-12 bg-[var(--gray-200)]" />
                    </div>
                  )}
                </div>

                {/* Actie-knoppen — lg only, right-aligned */}
                {!hasReacted && (
                  <div className="hidden gap-3 lg:flex lg:self-end">
                    <button
                      type="button"
                      aria-label="Al gezien"
                      onClick={() => void handleReact("seen")}
                      className="flex h-12 w-40 items-center justify-center gap-2 rounded-[8px] border border-[#4f55f1] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <MaskIcon src="/icons/visible.svg" className="size-6 bg-[#4f55f1]" />
                      <span className="text-base font-medium text-[#4f55f1]">Gezien</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Toevoegen aan mijn watchlist"
                      onClick={() => void handleReact("up")}
                      className="flex h-12 w-40 items-center justify-center gap-2 rounded-[8px] bg-[#4f55f1] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <MaskIcon src="/icons/thumb_up.svg" className="size-6 bg-white" />
                      <span className="text-base font-medium text-white">Toevoegen</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Niet interessant"
                      onClick={() => void handleReact("down")}
                      className="flex h-12 w-40 items-center justify-center gap-2 rounded-[8px] bg-[#d64040] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <MaskIcon src="/icons/thumb_down.svg" className="size-6 bg-white" />
                      <span className="text-base font-medium text-white">Overslaan</span>
                    </button>
                  </div>
                )}

                {/* Cast */}
                {detail.cast.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-6 lg:gap-4">
                      <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130] lg:flex-none">Cast</h2>
                      <button
                        type="button"
                        onClick={() => router.push(`/films-series/${currentId}/cast`)}
                        className="shrink-0 text-xs font-medium leading-4 text-[#4f55f1] focus-visible:outline-none"
                      >
                        Toon alle
                      </button>
                    </div>
                    <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                      <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                        {detail.cast.map((member, i) => (
                          <div key={i} className="flex w-[87px] flex-col gap-2">
                            <div
                              className="relative w-full overflow-hidden rounded bg-[var(--gray-50)]"
                              style={{ aspectRatio: "2/3" }}
                            >
                              {member.profileUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={member.profileUrl}
                                  alt={member.name}
                                  className="absolute inset-0 size-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center">
                                  <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <p className="line-clamp-2 text-[14px] font-medium leading-4 text-[#16181a]">
                                {member.name}
                              </p>
                              <p className="text-[14px] font-normal leading-5 text-[#8c929d]">
                                {member.character}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trailer modal */}
      {showTrailer && detail?.trailerKey && (
        <div
          role="dialog"
          aria-modal
          aria-label="Trailer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setShowTrailer(false)}
        >
          <iframe
            src={`https://www.youtube.com/embed/${detail.trailerKey}?autoplay=1`}
            allow="autoplay; fullscreen"
            className="w-full max-w-2xl"
            style={{ aspectRatio: "16/9", border: "none" }}
            title={`Trailer van ${detail.title}`}
          />
        </div>
      )}
    </div>
  );
}
