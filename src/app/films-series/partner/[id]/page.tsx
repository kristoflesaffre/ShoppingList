"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { PageBackButton } from "@/components/ui/page_back_button";
import {
  ActionPill,
  DeckBody,
  DeckRoundAction,
  DeckSkeleton,
  FilmIcons,
  GlassIconButton,
  TrailerOverlay,
  type DeckMedia,
} from "@/components/films/film_detail_ui";
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

export default function PartnerFilmDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;

  const { partnerWatchlist, partnerName, partnerAvatarUrl, reactToPartnerItem } = useFilmsLibrary();

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
  const [showTrailer, setShowTrailer] = React.useState(false);
  const [adjData, setAdjData] = React.useState<AdjData>({
    prevItem: null, prevDetail: null, nextItem: null, nextDetail: null,
  });


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

  const toDeck = (d: FilmDetail | null): DeckMedia | null =>
    d
      ? {
          title: d.title,
          type: d.type,
          year: d.year,
          certification: d.certification,
          runtime: d.runtime,
          score: d.score,
          scoreSource: "imdb",
          genres: d.genres,
          overview: d.overview,
          posterUrl: d.posterUrl,
          backdropUrl: d.backdropUrl,
          imdbId: d.imdbId,
          cast: d.cast,
          trailerKey: d.trailerKey,
        }
      : null;
  const name = partnerName ?? "Je partner";
  const banner = (
    <div className="flex items-center gap-3 rounded-[18px] bg-[var(--blue-25)] px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--blue-50)]">
      <span className="flex size-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)]">
        {partnerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partnerAvatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-[var(--blue-500)]">{name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span className="flex-1 text-[13.5px] font-semibold text-[var(--text-primary)]">{name} zette dit op de watchlist</span>
    </div>
  );
  const ghost = (d: FilmDetail | null) => {
    const m = toDeck(d);
    return m ? <DeckBody media={m} banner={banner} /> : <DeckSkeleton />;
  };
  const currentMedia = toDeck(detail);
  const counter = currentIndex >= 0 && totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : "";
  const goBack = () => router.push("/films-series/partner-watchlist");

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-20 flex items-center justify-between lg:hidden">
        <GlassIconButton aria-label="Terug" onClick={goBack}>
          {FilmIcons.back}
        </GlassIconButton>
        {counter ? (
          <span className="inline-flex h-[30px] items-center rounded-pill bg-[rgba(16,17,48,0.32)] px-3 text-[13px] font-bold text-white backdrop-blur-[10px]">{counter}</span>
        ) : null}
        <GlassIconButton aria-label="Instellingen" onClick={() => router.push("/films-series/instellingen")}>
          {FilmIcons.dots}
        </GlassIconButton>
      </div>

      {/* Canvas «22 · Partner — één titel — voorstel» */}
      <div className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+128px)] lg:pt-10">
        <div className="mb-5 hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-3">
            <PageBackButton href="/films-series/partner-watchlist" label="Terug" className="lg:flex" />
            <h1 className="text-[32px] font-bold leading-9 tracking-tight text-[var(--text-primary)]">Watchlist {name}</h1>
            {counter ? <span className="text-lg font-semibold text-[var(--text-tertiary)]">{counter}</span> : null}
          </div>
          <div className="flex gap-2">
            <RoundIconButton tone="surface" size={36} aria-label="Vorige" disabled={!hasPrev} onClick={() => navigateItem("prev")} className="rotate-180 text-[var(--blue-500)]">
              {FilmIcons.chevron}
            </RoundIconButton>
            <RoundIconButton tone="surface" size={36} aria-label="Volgende" disabled={!hasNext} onClick={() => navigateItem("next")} className="text-[var(--blue-500)]">
              {FilmIcons.chevron}
            </RoundIconButton>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div ref={prevPanelRef} style={{ transform: "translateX(-200vw)" }} className="pointer-events-none absolute left-0 top-0 w-full px-4 lg:px-0" aria-hidden>
            {ghost(adjData.prevDetail)}
          </div>
          <div ref={nextPanelRef} style={{ transform: "translateX(200vw)" }} className="pointer-events-none absolute left-0 top-0 w-full px-4 lg:px-0" aria-hidden>
            {ghost(adjData.nextDetail)}
          </div>
          <div ref={contentRef} className="px-4 lg:px-0">
            {loading ? (
              <DeckSkeleton />
            ) : currentMedia ? (
              <DeckBody
                key={currentId}
                media={currentMedia}
                banner={hasReacted ? undefined : banner}
                onPlay={() => setShowTrailer(true)}
                onAllCast={() => router.push(`/films-series/${currentId}/cast`)}
              />
            ) : (
              <p className="pt-[calc(env(safe-area-inset-top,0px)+96px)] text-center text-sm text-[var(--text-secondary)]">Kan details niet laden.</p>
            )}
          </div>
        </div>
      </div>

      {!hasReacted && !loading && detail ? (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-[linear-gradient(180deg,rgba(245,246,250,0),var(--bg-app)_30%)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-3.5">
          <div className="mx-auto flex max-w-[956px] items-start justify-center gap-3">
            <DeckRoundAction
              label="Niet voor mij"
              onClick={() => handleReact("down")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              }
            />
            <DeckRoundAction label="Al gezien" onClick={() => handleReact("seen")} icon={FilmIcons.eye} />
            <ActionPill tone="primary" icon={FilmIcons.plus} onClick={() => handleReact("up")} className="h-[52px] px-[22px]">
              Ook voor mij
            </ActionPill>
          </div>
        </div>
      ) : null}

      {showTrailer && detail?.trailerKey ? (
        <TrailerOverlay videoKey={detail.trailerKey} title={detail.title} onClose={() => setShowTrailer(false)} />
      ) : null}
    </div>
  );
}
