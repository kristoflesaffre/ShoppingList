"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { backOr } from "@/lib/in_app_history";
import { ActionPill, CastRound, DetailSectionHead, FilmIcons, GlassIconButton, SeasonStrip, StarGlyph, formatAirDate, type SeasonStripEpisode } from "@/components/films/film_detail_ui";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { WatchOnProjector } from "@/components/films/watch_on_projector";
import { StremioEpisodeStatus } from "@/components/films/stremio_progress";

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
  imdbId: string | null;
  title: string;
  backdropUrl: string | null;
  certification: string;
  seasons: SeasonMeta[];
};


/** Zelfde bovenruimte als EpisodeBody, zodat het seriebeeld tijdens het laden niet verspringt. */
function DetailSkeleton() {
  return (
    <div className="flex flex-col pt-[230px] lg:pt-[150px] [&_.shimmer]:opacity-[0.14]">
      <div className="flex flex-col gap-3 lg:max-w-[560px]">
        <div className="h-3 w-1/2 rounded shimmer" />
        <div className="h-10 w-3/4 rounded-[10px] shimmer lg:h-14" />
        <div className="h-4 w-2/3 rounded shimmer" />
        <div className="mt-3 h-[50px] w-full rounded-pill shimmer lg:w-[230px]" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 rounded shimmer" style={{ width: i % 2 === 0 ? "100%" : "83%" }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Seriebeeld achter de pagina (canvas EP · A «Cinema»): over de volle breedte, vloeit links en onderaan
 * weg in het donkere doek. Staat buiten de swipepanelen, zodat het blijft staan bij het wisselen.
 */
function CinemaBackdrop({ url }: { url: string | null }) {
  const screen = (pct: number) => `color-mix(in srgb, var(--cinema-screen) ${pct}%, transparent)`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[440px] overflow-hidden lg:h-[660px]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" decoding="async" className="absolute inset-0 size-full object-cover object-[52%_0%] lg:object-[50%_18%]" />
      ) : null}
      <div
        className="absolute inset-0 lg:hidden"
        style={{ background: `linear-gradient(180deg, ${screen(30)} 0%, transparent 28%, ${screen(72)} 64%, var(--cinema-screen) 88%)` }}
      />
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background: `linear-gradient(90deg, ${screen(92)} 0%, ${screen(55)} 36%, transparent 68%), linear-gradient(180deg, ${screen(40)} 0%, transparent 18%, transparent 46%, ${screen(85)} 76%, var(--cinema-screen) 98%)`,
        }}
      />
    </div>
  );
}

function Eyebrow({ series, season, ep }: { series: string; season: number; ep: number }) {
  return (
    <p className="text-[12px] font-extrabold uppercase tracking-[0.09em] text-fixed-white/70 lg:text-[13px]">
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
  projectorTmdbId,
  imdbId,
  seasonEpisodes,
  onPickEpisode,
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
  projectorTmdbId?: string;
  imdbId?: string | null;
  /** Afleveringen van dit seizoen voor de strook; null = (nog) niet bekend. */
  seasonEpisodes?: SeasonStripEpisode[] | null;
  onPickEpisode?: (episodeNumber: number) => void;
}) {
  const metaLine = [formatAirDate(episode.airDate), episode.runtime, certification].filter(Boolean).join(" · ");
  const overview = episode.overview || "Geen beschrijving beschikbaar.";
  const nextCard = next ? (
    <button
      type="button"
      onClick={onNext}
      tabIndex={onNext ? undefined : -1}
      className="flex w-full items-center gap-3.5 rounded-[20px] bg-fixed-white/10 py-2.5 pl-2.5 pr-3.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] backdrop-blur-[16px] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white [@media(hover:hover)]:hover:bg-fixed-white/15"
    >
      <span className="h-[52px] w-[92px] shrink-0 overflow-hidden rounded-[10px] bg-fixed-white/10">
        {nextData?.stillUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nextData.stillUrl} alt="" className="size-full object-cover" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-fixed-white/55">
          {next.s !== at.s ? `Volgende · seizoen ${next.s}` : "Volgende"}
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-bold text-fixed-white">
          {next.e}. {nextData?.title ?? "\u00a0"}
        </span>
      </span>
      <span className="text-fixed-white">{FilmIcons.chevron}</span>
    </button>
  ) : null;
  const cast = episode.cast.length > 0 ? (
    <section className="min-w-0">
      <DetailSectionHead tone="cinema" title="Cast" action="Alles" onAction={onAllCast ?? (() => {})} />
      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: "none" }}>
        <div className="flex w-max gap-2.5">
          {episode.cast.map((m, i) => (
            <CastRound key={i} person={m} tone="cinema" />
          ))}
        </div>
      </div>
    </section>
  ) : null;

  return (
    <div className="pt-[230px] lg:pt-[150px]">
      {/* Canvas EP · A «Cinema»: tekst op het seriebeeld, still als kader rechts (desktop). */}
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
        <div className="min-w-0 lg:max-w-[580px]">
          <Eyebrow series={series} season={at.s} ep={at.e} />
          <h1 className="mt-2 text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] text-fixed-white [text-wrap:balance] lg:text-[64px] lg:tracking-[-0.035em]">{episode.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[14px] text-fixed-white/70 lg:text-[15px]">
            {episode.rating != null ? (
              <>
                <StarGlyph />
                <b className="text-fixed-white">{episode.rating.toFixed(1)}</b>
              </>
            ) : null}
            {metaLine ? <span>{episode.rating != null ? "· " : ""}{metaLine}</span> : null}
          </p>
          <p className="mt-4 hidden max-w-[520px] text-[16px] leading-[25px] text-fixed-white/85 lg:block">{overview}</p>
          <div className="mt-5 flex flex-col gap-2.5 lg:mt-6 lg:flex-row lg:items-start lg:gap-3">
            {projectorTmdbId ? <WatchOnProjector tone="cinema" type="tv" tmdbId={projectorTmdbId} season={at.s} episode={at.e} className="w-full lg:w-auto" /> : null}
            <ActionPill
              tone={watched ? "primary" : "glass"}
              icon={watched ? FilmIcons.check : FilmIcons.eye}
              aria-pressed={watched}
              onClick={onToggleWatched}
              tabIndex={onToggleWatched ? undefined : -1}
              className="h-[50px] px-6 text-base text-fixed-white backdrop-blur-[14px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] focus-visible:ring-fixed-white focus-visible:ring-offset-0"
            >
              Gezien
            </ActionPill>
          </div>
          {projectorTmdbId ? <StremioEpisodeStatus tone="cinema" imdbId={imdbId} tmdbId={projectorTmdbId} at={at} /> : null}
          <p className="mt-5 text-[15px] leading-[23px] text-fixed-white/80 lg:hidden">{overview}</p>
        </div>
        {/* Desktop: still + «Volgende» samen rechts, onderkant gelijk met de knoppen en de voortgang. */}
        <div className="hidden w-[380px] shrink-0 flex-col gap-3 lg:flex">
          <div className="relative overflow-hidden rounded-[18px] bg-fixed-white/10 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.2)]">
            {episode.stillUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={episode.stillUrl.replace("/w300/", "/w780/")} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <div className="aspect-video" />
            )}
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(0,0,0,0.55))]" />
            <span className="absolute bottom-2.5 left-3 text-[12px] font-bold text-fixed-white">Aflevering {at.e}{episode.runtime ? ` · ${episode.runtime}` : ""}</span>
          </div>
          {nextCard}
        </div>
      </div>

      <div className="mt-6 lg:hidden">{nextCard}</div>

      {seasonEpisodes && seasonEpisodes.length > 1 ? (
        <section className="mt-8 lg:mt-12">
          <DetailSectionHead tone="cinema" title={`Seizoen ${at.s}`} meta={`${seasonEpisodes.length} afleveringen`} />
          <SeasonStrip episodes={seasonEpisodes} current={at.e} onPick={onPickEpisode} />
        </section>
      ) : null}

      {cast ? <div className="mt-8 lg:mt-10">{cast}</div> : null}
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
      .then((data: { title: string; certification: string; seasons: SeasonMeta[]; imdbId?: string | null; backdropUrl?: string | null }) => {
        setSeriesInfo({
          title: data.title,
          certification: data.certification,
          seasons: data.seasons ?? [],
          imdbId: data.imdbId ?? null,
          backdropUrl: data.backdropUrl?.replace("/w780/", "/w1280/") ?? null,
        });
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

  // Afleveringen per seizoen voor de strook (één keer per seizoen ophalen).
  const [seasonLists, setSeasonLists] = React.useState<Record<number, Omit<SeasonStripEpisode, "watched">[]>>({});
  React.useEffect(() => {
    if (!tmdbId || seasonLists[currentSeason]) return;
    let alive = true;
    fetch(`/api/films/episodes?id=${tmdbId}&season=${currentSeason}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { episodes?: { episodeNumber: number; name: string; runtime: string; stillUrl: string | null }[] } | null) => {
        if (!alive || !data?.episodes) return;
        const list = data.episodes.map(({ episodeNumber, name, runtime, stillUrl }) => ({ episodeNumber, name, runtime, stillUrl }));
        setSeasonLists((prev) => ({ ...prev, [currentSeason]: list }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [tmdbId, currentSeason, seasonLists]);

  // Het doek loopt door tot buiten de pagina (overscroll op iOS, randen op desktop).
  React.useEffect(() => {
    const root = document.documentElement;
    const before = root.style.backgroundColor;
    root.style.backgroundColor = "var(--cinema-screen)";
    return () => { root.style.backgroundColor = before; };
  }, []);

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

  /** Rechtstreeks naar een aflevering uit de seizoenstrook (zonder schuifanimatie). */
  function jumpToEpisode(s: number, e: number) {
    if (animatingRef.current || (s === currentSeason && e === currentEp)) return;
    const hit = episodeCache.current.get(`${tmdbId}-s${s}e${e}`);
    setCurrentSeason(s);
    setCurrentEp(e);
    setEpisode(hit ?? null);
    setLoading(!hit);
    window.history.replaceState(null, "", `/films-series/${rawId}/episodes/s${s}e${e}`);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const seriesTitle = seriesInfo?.title ?? "";
  const certification = seriesInfo?.certification ?? "";
  const watchedAt = (at: EpisodeRef) => isWatched(`ep-${tmdbId}-s${at.s}e${at.e}`);
  const stripFor = (season: number): SeasonStripEpisode[] | null =>
    seasonLists[season]?.map((ep) => ({ ...ep, watched: watchedAt({ s: season, e: ep.episodeNumber }) })) ?? null;
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
        seasonEpisodes={stripFor(at.s)}
      />
    );
  };

  const navButton = "flex size-10 items-center justify-center rounded-full bg-fixed-white/15 text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-[14px] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-35 [@media(hover:hover)]:hover:bg-fixed-white/25";
  const backdrop = seriesInfo ? (seriesInfo.backdropUrl ?? episode?.stillUrl?.replace("/w300/", "/w780/") ?? null) : null;

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-[var(--cinema-screen)]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <CinemaBackdrop key={backdrop ?? "none"} url={backdrop} />

      {/* Terug / meer: glas op het seriebeeld (mobiel), los erboven (desktop) */}
      <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-20 flex justify-between lg:hidden">
        <GlassIconButton aria-label="Terug" onClick={() => backOr(router, `/films-series/${rawId}/episodes?s=${currentSeason}`)}>
          {FilmIcons.back}
        </GlassIconButton>
        <GlassIconButton aria-label="Naar alle afleveringen" onClick={() => router.push(`/films-series/${rawId}/episodes?s=${currentSeason}`)}>
          {FilmIcons.dots}
        </GlassIconButton>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+48px)] lg:px-10 lg:pt-8">
        <div className="absolute inset-x-4 top-8 z-20 hidden items-center justify-between lg:inset-x-10 lg:flex">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => backOr(router, `/films-series/${rawId}/episodes?s=${currentSeason}`)}
            className={navButton}
          >
            {FilmIcons.back}
          </button>
          <div className="flex gap-2">
            <button type="button" aria-label="Vorige aflevering" onClick={() => navigateEpisode("prev")} disabled={!hasPrev} className={`${navButton} rotate-180`}>
              {FilmIcons.chevron}
            </button>
            <button type="button" aria-label="Volgende aflevering" onClick={() => navigateEpisode("next")} disabled={!hasNext} className={navButton}>
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
              <p className="pt-[calc(env(safe-area-inset-top,0px)+260px)] text-center text-sm text-fixed-white/70">Kan afleveringsdetails niet laden.</p>
            ) : (
              <EpisodeBody
                episode={episode}
                projectorTmdbId={tmdbId}
                imdbId={seriesInfo?.imdbId}
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
                seasonEpisodes={stripFor(currentSeason)}
                onPickEpisode={(e) => jumpToEpisode(currentSeason, e)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
