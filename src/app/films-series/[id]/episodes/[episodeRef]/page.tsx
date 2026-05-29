"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";

type CastMember = {
  name: string;
  character: string;
  profileUrl: string | null;
};

type EpisodeDetail = {
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  runtime: string;
  rating: number | null;
  overview: string;
  stillUrl: string | null;
  cast: CastMember[];
};

type SeasonMeta = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
};

type SeriesInfo = {
  title: string;
  certification: string;
  seasons: SeasonMeta[];
};

type AdjData = {
  prevSeason: number;
  prevEp: number;
  prevData: EpisodeDetail | null;
  nextSeason: number;
  nextEp: number;
  nextData: EpisodeDetail | null;
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

function formatDate(airDate: string | null): string {
  if (!airDate) return "";
  const d = new Date(airDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function DetailSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-8 w-2/3 rounded bg-[var(--gray-100)]" />
          <div className="h-6 w-16 rounded bg-[var(--gray-100)]" />
        </div>
        <div className="h-5 w-40 rounded bg-[var(--gray-100)]" />
      </div>
      <div className="-mx-4 h-[172px] bg-[var(--gray-100)]" />
      <div className="flex gap-6">
        <div className="h-[191px] w-[128px] shrink-0 rounded bg-[var(--gray-100)]" />
        <div className="flex flex-1 flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-[var(--gray-100)]" style={{ width: i % 2 === 0 ? "100%" : "83%" }} />
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-[8px] bg-[var(--gray-100)]" />
        <div className="h-12 flex-1 rounded-[8px] bg-[var(--gray-100)]" />
      </div>
    </div>
  );
}

// Ghost panel: shown during swipe drag for adjacent episodes
function GhostContent({ episode, season, ep }: { episode: EpisodeDetail | null; season: number; ep: number }) {
  if (!episode) return <DetailSkeleton />;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold leading-8 text-[#16181a]">{episode.title}</h1>
        <p className="text-sm leading-5 text-[var(--gray-400)]">Seizoen {season} aflevering {ep}</p>
      </div>
      <div className="-mx-4 h-[172px] overflow-hidden bg-[var(--gray-100)]">
        {episode.stillUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={episode.stillUrl} alt="" className="size-full object-cover object-center" aria-hidden />
        )}
      </div>
      <div className="flex items-start gap-6">
        <div className="relative h-[191px] w-[128px] shrink-0 overflow-hidden rounded bg-[var(--gray-50)]">
          {episode.stillUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={episode.stillUrl} alt="" className="absolute inset-0 size-full object-cover object-center" aria-hidden />
          ) : (
            <div className="flex size-full items-center justify-center">
              <MaskIcon src="/icons/films.svg" className="size-10 bg-[var(--gray-200)]" />
            </div>
          )}
        </div>
        <p className="flex-1 text-base font-medium leading-6 text-[var(--text-primary)] line-clamp-6">
          {episode.overview || "Geen beschrijving beschikbaar."}
        </p>
      </div>
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-[8px] border border-[#4f55f1]" />
        <div className="h-12 flex-1 rounded-[8px] bg-[#4f55f1]" />
      </div>
    </div>
  );
}

export default function EpisodeDetailPage() {
  const { isWatched, markWatched, unmarkWatched } = useFilmsLibrary();
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;
  const episodeRef = params.episodeRef as string;

  const tmdbId = React.useMemo(() => {
    const dashIdx = rawId?.indexOf("-") ?? -1;
    return dashIdx >= 0 ? rawId.slice(dashIdx + 1) : "";
  }, [rawId]);

  const initialRef = React.useMemo(() => {
    const match = episodeRef?.match(/^s(\d+)e(\d+)$/);
    if (!match) return { season: 1, ep: 1 };
    return { season: parseInt(match[1]), ep: parseInt(match[2]) };
  }, [episodeRef]);

  const [currentSeason, setCurrentSeason] = React.useState(initialRef.season);
  const [currentEp, setCurrentEp] = React.useState(initialRef.ep);
  const [episode, setEpisode] = React.useState<EpisodeDetail | null>(null);
  const [seriesInfo, setSeriesInfo] = React.useState<SeriesInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [overviewNeedsTruncation, setOverviewNeedsTruncation] = React.useState(false);
  const overviewRef = React.useRef<HTMLParagraphElement>(null);

  // Adjacent episode data for ghost panels
  const [adjData, setAdjData] = React.useState<AdjData | null>(null);

  // Refs for imperative animation (no React state involved)
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const prevPanelRef = React.useRef<HTMLDivElement>(null);
  const nextPanelRef = React.useRef<HTMLDivElement>(null);
  const animatingRef = React.useRef(false);
  const episodeCache = React.useRef<Map<string, EpisodeDetail>>(new Map());
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    startTime: number;
    dx: number;
    isHorizontal: boolean | null;
  } | null>(null);

  // Stable refs to avoid stale closures in event listeners
  const currentSeasonRef = React.useRef(currentSeason);
  const currentEpRef = React.useRef(currentEp);
  const seriesInfoRef = React.useRef(seriesInfo);
  const hasPrevRef = React.useRef(false);
  const hasNextRef = React.useRef(false);
  React.useEffect(() => { currentSeasonRef.current = currentSeason; }, [currentSeason]);
  React.useEffect(() => { currentEpRef.current = currentEp; }, [currentEp]);
  React.useEffect(() => { seriesInfoRef.current = seriesInfo; }, [seriesInfo]);

  // Initialize ghost panel positions imperatively so React never resets them
  React.useEffect(() => {
    const w = window.innerWidth;
    if (prevPanelRef.current) prevPanelRef.current.style.transform = `translateX(${-w}px)`;
    if (nextPanelRef.current) nextPanelRef.current.style.transform = `translateX(${w}px)`;
  }, []);

  // Fetch series info once
  React.useEffect(() => {
    if (!tmdbId) return;
    fetch(`/api/films/detail?type=tv&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: { title: string; certification: string; seasons: SeasonMeta[] }) => {
        setSeriesInfo({ title: data.title, certification: data.certification, seasons: data.seasons ?? [] });
      })
      .catch(() => {});
  }, [tmdbId]);

  // Fetch episode detail when season/ep changes — check cache first
  React.useEffect(() => {
    if (!tmdbId) return;
    setOverviewExpanded(false);
    setOverviewNeedsTruncation(false);

    const key = `${tmdbId}-s${currentSeason}e${currentEp}`;
    const cached = episodeCache.current.get(key);
    if (cached) {
      setEpisode(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/films/episode?id=${tmdbId}&season=${currentSeason}&episode=${currentEp}`)
      .then((r) => r.json())
      .then((epData: EpisodeDetail) => {
        episodeCache.current.set(key, epData);
        setEpisode(epData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tmdbId, currentSeason, currentEp]);

  // Pre-fetch adjacent episodes and populate ghost panels
  React.useEffect(() => {
    if (!tmdbId) return;

    const curInfo = seriesInfo?.seasons.find((s) => s.seasonNumber === currentSeason);
    const epCount = curInfo?.episodeCount ?? currentEp;

    // Compute prev target
    let prevS = currentSeason, prevE = currentEp - 1;
    const hasPrevT = currentEp > 1 || currentSeason > 1;
    if (currentEp <= 1 && currentSeason > 1) {
      const ps = seriesInfo?.seasons.find((s) => s.seasonNumber === currentSeason - 1);
      prevS = currentSeason - 1;
      prevE = ps?.episodeCount ?? 1;
    }

    // Compute next target
    let nextS = currentSeason, nextE = currentEp + 1;
    const hasNextT = currentEp < epCount || (seriesInfo !== null
      ? seriesInfo.seasons.some((s) => s.seasonNumber > currentSeason)
      : true);
    if (currentEp >= epCount && seriesInfo?.seasons.some((s) => s.seasonNumber > currentSeason)) {
      nextS = currentSeason + 1;
      nextE = 1;
    }

    const prevKey = `${tmdbId}-s${prevS}e${prevE}`;
    const nextKey = `${tmdbId}-s${nextS}e${nextE}`;

    setAdjData({
      prevSeason: hasPrevT ? prevS : 0,
      prevEp: hasPrevT ? prevE : 0,
      prevData: hasPrevT ? (episodeCache.current.get(prevKey) ?? null) : null,
      nextSeason: hasNextT ? nextS : 0,
      nextEp: hasNextT ? nextE : 0,
      nextData: hasNextT ? (episodeCache.current.get(nextKey) ?? null) : null,
    });

    if (hasPrevT && !episodeCache.current.has(prevKey)) {
      fetch(`/api/films/episode?id=${tmdbId}&season=${prevS}&episode=${prevE}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: EpisodeDetail | null) => {
          if (data?.title) {
            episodeCache.current.set(prevKey, data);
            setAdjData((d) =>
              d && d.prevSeason === prevS && d.prevEp === prevE ? { ...d, prevData: data } : d,
            );
          }
        })
        .catch(() => {});
    }

    if (hasNextT && !episodeCache.current.has(nextKey)) {
      fetch(`/api/films/episode?id=${tmdbId}&season=${nextS}&episode=${nextE}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: EpisodeDetail | null) => {
          if (data?.title) {
            episodeCache.current.set(nextKey, data);
            setAdjData((d) =>
              d && d.nextSeason === nextS && d.nextEp === nextE ? { ...d, nextData: data } : d,
            );
          }
        })
        .catch(() => {});
    }
  }, [tmdbId, currentSeason, currentEp, seriesInfo]);

  React.useEffect(() => {
    if (!overviewRef.current) return;
    setOverviewNeedsTruncation(overviewRef.current.scrollHeight > 191 + 24);
  }, [episode?.overview]);

  const watchedId = `ep-${tmdbId}-s${currentSeason}e${currentEp}`;
  const watched = isWatched(watchedId);

  const currentSeasonInfo = seriesInfo?.seasons.find((s) => s.seasonNumber === currentSeason);
  const episodeCount = currentSeasonInfo?.episodeCount ?? currentEp;
  const hasPrev = currentSeason > 1 || currentEp > 1;
  const hasNext =
    currentEp < episodeCount ||
    (seriesInfo?.seasons.some((s) => s.seasonNumber > currentSeason) ?? false);

  // Keep nav refs in sync for use inside event listeners
  React.useEffect(() => { hasPrevRef.current = hasPrev; }, [hasPrev]);
  React.useEffect(() => { hasNextRef.current = hasNext; }, [hasNext]);

  const metaParts = React.useMemo(() => {
    if (!episode) return "";
    const parts: string[] = [];
    parts.push(`Seizoen ${episode.seasonNumber} aflevering ${episode.episodeNumber}`);
    const dateStr = formatDate(episode.airDate);
    if (dateStr) parts.push(dateStr);
    if (seriesInfo?.certification) parts.push(seriesInfo.certification);
    if (episode.runtime) parts.push(episode.runtime);
    return parts.join("  •  ");
  }, [episode, seriesInfo]);

  // ─── Core animation: commit a navigation in given direction ─────────────────

  const commitNavigationRef = React.useRef<(dir: "prev" | "next", fromX?: number, velocity?: number) => void>();

  commitNavigationRef.current = (dir: "prev" | "next", fromX = 0, velocity = 0) => {
    if (animatingRef.current) return;
    if (dir === "prev" && !hasPrevRef.current) return;
    if (dir === "next" && !hasNextRef.current) return;

    animatingRef.current = true;

    // Calculate target episode
    const curSeason = currentSeasonRef.current;
    const curEp = currentEpRef.current;
    const info = seriesInfoRef.current;
    const curSeasonInfo = info?.seasons.find((s) => s.seasonNumber === curSeason);
    const curEpCount = curSeasonInfo?.episodeCount ?? curEp;

    let nextSeason = curSeason;
    let nextEp = curEp;
    if (dir === "prev") {
      if (curEp > 1) {
        nextEp = curEp - 1;
      } else {
        nextSeason = curSeason - 1;
        const prevInfo = info?.seasons.find((s) => s.seasonNumber === nextSeason);
        nextEp = prevInfo?.episodeCount ?? 1;
      }
    } else {
      if (curEp < curEpCount) {
        nextEp = curEp + 1;
      } else {
        nextSeason = curSeason + 1;
        nextEp = 1;
      }
    }

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

    // Phase 1: animate current out + arriving ghost to center
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

      // flushSync: render new episode data into current panel synchronously
      const cacheKey = `${tmdbId}-s${nextSeason}e${nextEp}`;
      const cached = episodeCache.current.get(cacheKey);
      flushSync(() => {
        setCurrentSeason(nextSeason);
        setCurrentEp(nextEp);
        setEpisode(cached ?? null);
        setLoading(!cached);
        setOverviewExpanded(false);
        setOverviewNeedsTruncation(false);
      });

      router.replace(`/films-series/${rawId}/episodes/s${nextSeason}e${nextEp}`);

      // Instant swap: current snaps to center (same content as ghost), ghost moves away
      // Both changes happen before next paint → seamless
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

  // ─── Non-passive touchmove listener (needed for preventDefault) ─────────────

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
      // Move ghost panels together with current so adjacent content is visible
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

  // ─── Touch start / end (React handlers, no preventDefault needed) ────────────

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
    const velocity = Math.abs(dx) / elapsed; // px/ms
    const screenWidth = window.innerWidth;
    const shouldCommit = Math.abs(dx) > screenWidth * 0.25 || velocity > 0.4;

    const dir = dx < 0 ? "next" : "prev";
    const canNav = dir === "next" ? hasNextRef.current : hasPrevRef.current;

    if (!shouldCommit || !canNav) {
      // Snap all panels back to default positions
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

  function navigateEpisode(dir: "prev" | "next") {
    commitNavigationRef.current?.(dir);
  }

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      {/* Fixed header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex justify-center">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4 px-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.back()}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-base font-medium leading-6 text-[var(--text-primary)]">
              {seriesInfo?.title ?? ""}
            </p>
            <button
              type="button"
              aria-label="Meer opties"
              className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <ThreeDotsIcon />
            </button>
          </header>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {/* Episode navigator */}
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            aria-label="Vorige aflevering"
            onClick={() => navigateEpisode("prev")}
            disabled={!hasPrev}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] transition-opacity",
              !hasPrev && "opacity-25 pointer-events-none",
            )}
          >
            <MaskIcon src="/icons/chevron.svg" className="size-6 bg-[#4f55f1] rotate-90" />
          </button>
          <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[#16181a]">
            Seizoen {currentSeason} aflevering {currentEp}
          </p>
          <button
            type="button"
            aria-label="Volgende aflevering"
            onClick={() => navigateEpisode("next")}
            disabled={!hasNext}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] transition-opacity",
              !hasNext && "opacity-25 pointer-events-none",
            )}
          >
            <MaskIcon src="/icons/chevron.svg" className="size-6 bg-[#4f55f1] -rotate-90" />
          </button>
        </div>

        {/* Sliding panel wrapper — current + ghost panels are siblings here */}
        <div className="relative">
          {/* Prev ghost panel — positioned off-screen left, tracks drag */}
          <div
            ref={prevPanelRef}
            className="pointer-events-none absolute left-0 top-0 w-full"
            aria-hidden
          >
            <GhostContent
              episode={adjData?.prevData ?? null}
              season={adjData?.prevSeason ?? 0}
              ep={adjData?.prevEp ?? 0}
            />
          </div>

          {/* Next ghost panel — positioned off-screen right, tracks drag */}
          <div
            ref={nextPanelRef}
            className="pointer-events-none absolute left-0 top-0 w-full"
            aria-hidden
          >
            <GhostContent
              episode={adjData?.nextData ?? null}
              season={adjData?.nextSeason ?? 0}
              ep={adjData?.nextEp ?? 0}
            />
          </div>

          {/* Current content — this div is what slides during swipe */}
          <div ref={contentRef} className="flex flex-col gap-6">
            {loading ? (
              <DetailSkeleton />
            ) : !episode ? (
              <p className="py-8 text-center text-sm text-[var(--gray-400)]">Kan afleveringsdetails niet laden.</p>
            ) : (
              <>
                {/* Title + rating */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h1 className="min-w-0 flex-1 text-2xl font-bold leading-8 text-[#16181a]">
                      {episode.title}
                    </h1>
                    {episode.rating !== null && (
                      <div className="flex shrink-0 items-center gap-1">
                        <StarIcon />
                        <p className="font-medium text-[var(--text-primary)]">
                          <span className="text-base leading-6">{episode.rating.toFixed(1)}</span>
                          <span className="text-xs font-normal leading-none">/10</span>
                        </p>
                      </div>
                    )}
                  </div>
                  {metaParts && (
                    <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                      <p className="whitespace-nowrap text-sm leading-5 text-[var(--gray-400)]">{metaParts}</p>
                    </div>
                  )}
                </div>

                {/* Still — full-width hero */}
                <div className="-mx-4 relative h-[172px] overflow-hidden bg-[var(--gray-100)]">
                  {episode.stillUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={episode.stillUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover object-center"
                      aria-hidden
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/10" aria-hidden />
                </div>

                {/* Series poster + overview */}
                <div className="flex items-start gap-6">
                  <div className="relative h-[191px] w-[128px] shrink-0 overflow-hidden rounded bg-[var(--gray-50)]">
                    {episode.stillUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={episode.stillUrl}
                        alt=""
                        className="absolute inset-0 size-full object-cover object-center"
                        aria-hidden
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <MaskIcon src="/icons/films.svg" className="size-10 bg-[var(--gray-200)]" />
                      </div>
                    )}
                  </div>

                  <div className="relative min-w-0 flex-1">
                    <div
                      className={cn(
                        "overflow-hidden",
                        !overviewExpanded && overviewNeedsTruncation && "h-[191px]",
                      )}
                    >
                      <p ref={overviewRef} className="text-base font-medium leading-6 text-[var(--text-primary)]">
                        {episode.overview || "Geen beschrijving beschikbaar."}
                      </p>
                    </div>
                    {!overviewExpanded && overviewNeedsTruncation && (
                      <div className="absolute bottom-0 right-0 flex items-baseline gap-1 bg-white">
                        <span className="text-base font-medium leading-6 text-[var(--text-primary)]">…</span>
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

                {/* Two action buttons */}
                <div className="flex gap-3">
                  {/* Bekeken — outline */}
                  <button
                    type="button"
                    onClick={() => {
                      if (watched) void unmarkWatched(watchedId);
                      else void markWatched(watchedId);
                    }}
                    className={cn(
                      "flex h-12 flex-1 items-center gap-3 rounded-[8px] border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                      watched ? "border-[#34C759]" : "border-[#4f55f1]",
                    )}
                  >
                    <span className={cn(
                      "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-medium",
                      watched ? "text-[#34C759]" : "text-[#4f55f1]",
                    )}>
                      Bekeken
                    </span>
                    <MaskIcon
                      src={watched ? "/icons/checkmark.svg" : "/icons/visible.svg"}
                      className={cn("size-6 shrink-0", watched ? "bg-[#34C759]" : "bg-[#4f55f1]")}
                    />
                  </button>

                  {/* Naar overzicht — filled */}
                  <button
                    type="button"
                    onClick={() => router.push(`/films-series/${rawId}/episodes`)}
                    className="flex h-12 flex-1 items-center justify-center rounded-[8px] bg-[#4f55f1] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                  >
                    <span className="text-base font-medium text-white">Naar overzicht</span>
                  </button>
                </div>

                {/* Cast */}
                {episode.cast.length > 0 && (
                  <div className="flex w-full flex-col gap-4">
                    <div className="flex items-center gap-6">
                      <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Cast</h2>
                      <button
                        type="button"
                        onClick={() => router.push(`/films-series/${rawId}/cast`)}
                        className="shrink-0 text-xs font-medium text-[#4f55f1] focus-visible:outline-none"
                      >
                        Toon alle
                      </button>
                    </div>
                    <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                      <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                        {episode.cast.map((member, i) => (
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
    </div>
  );
}
