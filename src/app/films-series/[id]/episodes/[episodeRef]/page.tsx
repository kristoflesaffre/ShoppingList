"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { backOr } from "@/lib/in_app_history";
import { ActionPill, CastRound, DetailSectionHead, FilmIcons, GlassIconButton, StarGlyph, formatAirDate } from "@/components/films/film_detail_ui";
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


function DetailSkeleton() {
  return (
    <div className="flex animate-pulse flex-col">
      <div className="-mx-4 h-[260px] bg-[var(--gray-100)] lg:mx-0 lg:h-[300px] lg:rounded-[24px]" />
      <div className="flex flex-col gap-3 pt-5">
        <div className="h-3 w-1/2 rounded bg-[var(--gray-100)]" />
        <div className="h-7 w-3/4 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--gray-100)]" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 rounded bg-[var(--gray-100)]" style={{ width: i % 2 === 0 ? "100%" : "83%" }} />
        ))}
      </div>
    </div>
  );
}

function EpisodeHero({ stillUrl }: { stillUrl: string | null }) {
  return (
    <div className="relative -mx-4 h-[260px] overflow-hidden bg-[#1b1d3a] lg:mx-0 lg:h-[340px] lg:rounded-[24px]">
      {stillUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={stillUrl.replace("/w300/", "/w780/")} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 lg:hidden"
        style={{ background: "linear-gradient(180deg, rgba(16,17,48,0.3) 0%, rgba(16,17,48,0) 40%, rgba(16,17,48,0) 62%, var(--bg-app) 100%)" }}
      />
    </div>
  );
}

function Eyebrow({ series, season, ep }: { series: string; season: number; ep: number }) {
  return (
    <p className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--blue-500)]">
      {[series, `Seizoen ${season}`, `Aflevering ${ep}`].filter(Boolean).join(" · ")}
    </p>
  );
}

type EpisodeRef = { s: number; e: number };

/**
 * Volledige inhoud van één aflevering. Zowel de huidige pagina als de panelen links/rechts
 * (zichtbaar tijdens het swipen) gebruiken dit, zodat er bij het wisselen niets verspringt.
 */
function EpisodeBody({
  episode,
  at,
  series,
  certification,
  watched,
  next,
  nextData,
  onToggleWatched,
  onNext,
  onAllCast,
}: {
  episode: EpisodeDetail;
  at: EpisodeRef;
  series: string;
  certification: string;
  watched: boolean;
  next: EpisodeRef | null;
  nextData: EpisodeDetail | null;
  onToggleWatched?: () => void;
  onNext?: () => void;
  onAllCast?: () => void;
}) {
  const metaLine = [formatAirDate(episode.airDate), episode.runtime, certification].filter(Boolean).join(" · ");
  return (
    <>
      <div className="lg:flex lg:items-start lg:gap-8">
        <div className="lg:w-[52%] lg:shrink-0">
          <EpisodeHero stillUrl={episode.stillUrl} />
        </div>
        <div className="relative -mt-[30px] min-w-0 flex-1 lg:mt-1">
          <Eyebrow series={series} season={at.s} ep={at.e} />
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] lg:text-[30px]">{episode.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13.5px] text-[var(--text-secondary)]">
            {episode.rating != null ? (
              <>
                <StarGlyph />
                <b className="text-[var(--text-primary)]">{episode.rating.toFixed(1)}</b>
              </>
            ) : null}
            {metaLine ? <span>{episode.rating != null ? "· " : ""}{metaLine}</span> : null}
          </p>
          <p className="mt-4 text-[15px] leading-[22px] text-[var(--text-primary)]">{episode.overview || "Geen beschrijving beschikbaar."}</p>
          <div className="mt-[18px] flex">
            <ActionPill
              tone={watched ? "soft" : "primary"}
              icon={watched ? FilmIcons.check : FilmIcons.eye}
              aria-pressed={watched}
              onClick={onToggleWatched}
              tabIndex={onToggleWatched ? undefined : -1}
              className="flex-1 lg:flex-none lg:px-6"
            >
              Gezien
            </ActionPill>
          </div>
          {next ? (
            <button
              type="button"
              onClick={onNext}
              tabIndex={onNext ? undefined : -1}
              className="mt-3.5 flex w-full items-center gap-3 rounded-[18px] bg-[var(--white)] py-2.5 pl-2.5 pr-3 text-left shadow-[inset_0_0_0_1px_var(--border-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
            >
              <span className="h-12 w-[84px] shrink-0 overflow-hidden rounded-[9px] bg-[var(--gray-100)]">
                {nextData?.stillUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={nextData.stillUrl} alt="" className="size-full object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                  {next.s !== at.s ? `Volgende · seizoen ${next.s}` : "Volgende"}
                </span>
                <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                  {next.e}. {nextData?.title ?? "\u00a0"}
                </span>
              </span>
              <span className="text-[var(--blue-500)]">{FilmIcons.chevron}</span>
            </button>
          ) : null}
        </div>
      </div>

      {episode.cast.length > 0 && (
        <section className="mt-[30px]">
          <DetailSectionHead title="Cast" action="Alles" onAction={onAllCast ?? (() => {})} />
          <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex w-max gap-2">
              {episode.cast.map((m, i) => (
                <CastRound key={i} person={m} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
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

  // Buren berekenen (over seizoensgrenzen heen) uit de seizoensinfo.
  const epAfter = React.useCallback(
    (at: EpisodeRef): EpisodeRef | null => {
      const count = seriesInfo?.seasons.find((x) => x.seasonNumber === at.s)?.episodeCount ?? at.e;
      if (at.e < count) return { s: at.s, e: at.e + 1 };
      if (seriesInfo?.seasons.some((x) => x.seasonNumber === at.s + 1)) return { s: at.s + 1, e: 1 };
      return null;
    },
    [seriesInfo],
  );
  const epBefore = React.useCallback(
    (at: EpisodeRef): EpisodeRef | null => {
      if (at.e > 1) return { s: at.s, e: at.e - 1 };
      if (at.s <= 1) return null;
      const prev = seriesInfo?.seasons.find((x) => x.seasonNumber === at.s - 1);
      return { s: at.s - 1, e: prev?.episodeCount ?? 1 };
    },
    [seriesInfo],
  );

  // Hertekenen zodra een vooraf opgehaalde aflevering in de cache komt.
  const [, setCacheTick] = React.useState(0);
  const cached = (at: EpisodeRef | null) => (at ? (episodeCache.current.get(`${tmdbId}-s${at.s}e${at.e}`) ?? null) : null);

  const here: EpisodeRef = { s: currentSeason, e: currentEp };
  const prevAt = epBefore(here);
  const nextAt = seriesInfo ? epAfter(here) : null;
  const nextNextAt = nextAt ? epAfter(nextAt) : null;

  // Vorige, volgende én de aflevering daarna vooraf ophalen (tekst + beelden), zodat zowel het
  // swipepaneel als de «Volgende»-kaart na het wisselen meteen gevuld zijn.
  React.useEffect(() => {
    if (!tmdbId) return;
    for (const at of [prevAt, nextAt, nextNextAt]) {
      if (!at) continue;
      const key = `${tmdbId}-s${at.s}e${at.e}`;
      if (episodeCache.current.has(key)) continue;
      fetch(`/api/films/episode?id=${tmdbId}&season=${at.s}&episode=${at.e}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: EpisodeDetail | null) => {
          if (!data?.title) return;
          episodeCache.current.set(key, data);
          if (data.stillUrl) {
            new Image().src = data.stillUrl.replace("/w300/", "/w780/");
            new Image().src = data.stillUrl;
          }
          setCacheTick((t) => t + 1);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId, currentSeason, currentEp, seriesInfo]);

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
      });

      window.history.replaceState(null, "", `/films-series/${rawId}/episodes/s${nextSeason}e${nextEp}`);

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

  const seriesTitle = seriesInfo?.title ?? "";
  const certification = seriesInfo?.certification ?? "";
  const watchedAt = (at: EpisodeRef) => isWatched(`ep-${tmdbId}-s${at.s}e${at.e}`);
  const ghost = (at: EpisodeRef | null, after: EpisodeRef | null) => {
    const data = cached(at);
    if (!at || !data) return <DetailSkeleton />;
    return (
      <EpisodeBody
        episode={data}
        at={at}
        series={seriesTitle}
        certification={certification}
        watched={watchedAt(at)}
        next={after}
        nextData={cached(after)}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Terug / meer: glas op de still (mobiel), los erboven (desktop) */}
      <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-20 flex justify-between lg:hidden">
        <GlassIconButton aria-label="Terug" onClick={() => backOr(router, `/films-series/${rawId}/episodes?s=${currentSeason}`)}>
          {FilmIcons.back}
        </GlassIconButton>
        <GlassIconButton aria-label="Naar alle afleveringen" onClick={() => router.push(`/films-series/${rawId}/episodes?s=${currentSeason}`)}>
          {FilmIcons.dots}
        </GlassIconButton>
      </div>

      {/* Canvas «21 · Aflevering — voorstel» */}
      <div className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] lg:pt-10">
        <div className="mb-5 hidden items-center justify-between lg:flex">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => backOr(router, `/films-series/${rawId}/episodes?s=${currentSeason}`)}
            className="flex size-10 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            {FilmIcons.back}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Vorige aflevering"
              onClick={() => navigateEpisode("prev")}
              disabled={!hasPrev}
              className="flex size-10 rotate-180 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] disabled:opacity-40"
            >
              {FilmIcons.chevron}
            </button>
            <button
              type="button"
              aria-label="Volgende aflevering"
              onClick={() => navigateEpisode("next")}
              disabled={!hasNext}
              className="flex size-10 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] disabled:opacity-40"
            >
              {FilmIcons.chevron}
            </button>
          </div>
        </div>

        {/* Sliding panel wrapper — current + ghost panels are siblings here */}
        <div className="relative">
          <div ref={prevPanelRef} className="pointer-events-none absolute left-0 top-0 w-full" aria-hidden>
            {ghost(prevAt, here)}
          </div>
          <div ref={nextPanelRef} className="pointer-events-none absolute left-0 top-0 w-full" aria-hidden>
            {ghost(nextAt, nextNextAt)}
          </div>

          {/* Current content — this div is what slides during swipe */}
          <div ref={contentRef} className="flex flex-col">
            {loading ? (
              <DetailSkeleton />
            ) : !episode ? (
              <p className="pt-[calc(env(safe-area-inset-top,0px)+80px)] text-center text-sm text-[var(--text-secondary)]">Kan afleveringsdetails niet laden.</p>
            ) : (
              <EpisodeBody
                episode={episode}
                at={here}
                series={seriesTitle}
                certification={certification}
                watched={watched}
                next={nextAt}
                nextData={cached(nextAt)}
                onToggleWatched={() => {
                  if (watched) void unmarkWatched(watchedId);
                  else void markWatched(watchedId);
                }}
                onNext={() => navigateEpisode("next")}
                onAllCast={() => router.push(`/films-series/${rawId}/cast`)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
