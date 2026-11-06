"use client";

import { WatchOnProjector } from "@/components/films/watch_on_projector";
import { StremioEpisodeStatus } from "@/components/films/stremio_progress";

import { setForcedDark } from "@/lib/theme";
import * as React from "react";
import { SeriesTasteDetailRow } from "@/components/films/series_taste";
import { useRouter, useParams } from "next/navigation";
import { backOr } from "@/lib/in_app_history";
import { cn } from "@/lib/utils";
import { buildNewSeasonItems } from "@/lib/tv-watching-progress";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { OptionTile } from "@/components/ui/option_tile";
import { airedEpisodeIds, followMarkId, isReturningStatus, skipMarkId } from "@/lib/series-follow";
import { Button } from "@/components/ui/button";
import {
  ActionPill,
  CastCard,
  CastRound,
  DetailSectionHead,
  EpisodeRow,
  EpisodeRowSkeleton,
  FilmIcons,
  GlassChip,
  GlassIconButton,
  HeroStat,
  ImdbMark,
  ListCard,
  SeasonCard,
  StarGlyph,
  TrailerOverlay,
  glassPanelClass,
  type EpisodeRowData,
} from "@/components/films/film_detail_ui";

type CastMember = {
  name: string;
  character: string;
  profileUrl: string | null;
};

type Season = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  posterUrl: string | null;
};

type SeasonData = {
  overview: string;
  trailerKey: string | null;
  posterUrl: string | null;
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
  scoreSource: "imdb" | "tmdb";
  imdbId: string | null;
  totalEpisodes: number | null;
  genres: string[];
  seasons: (Season & { airDate?: string | null })[];
  cast: CastMember[];
  trailerKey: string | null;
  /** Laatst uitgezonden aflevering (enkel series). */
  lastAired?: { season: number; episode: number } | null;
  status?: string | null;
};

type PartnerFeedback = "up" | "down" | "seen";
type FeedbackAvatar = { url: string | null; name: string | null };

function imdbUrl(title: string, imdbId: string | null): string {
  if (imdbId) return `https://www.imdb.com/title/${imdbId}/`;
  return `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`;
}

function youtubeTrailerSearchUrl(title: string, season?: number): string {
  const q = season ? `${title} seizoen ${season} trailer` : `${title} trailer`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AvatarCircle({ person, className }: { person: FeedbackAvatar; className?: string }) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fixed-white/15 shadow-[0_0_0_2px_var(--cinema-screen)]", className)}>
      {person.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.url} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-[15px] font-extrabold text-fixed-white">{(person.name ?? "?").slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}

function feedbackText(reaction: PartnerFeedback, mediaType: "movie" | "tv"): string {
  const label = mediaType === "tv" ? "serie" : "film";
  if (reaction === "up") return `Kijkt deze ${label} samen met jou`;
  if (reaction === "down") return `Wil deze ${label} niet zien`;
  return `Heeft deze ${label} al gezien`;
}

/** Wat je partner van deze titel vindt, als glazen paneel naast «Jouw oordeel». */
function PartnerFeedbackPanel({
  reaction,
  mediaType,
  partnerName,
  userAvatar,
  partnerAvatar,
  onClick,
}: {
  reaction: PartnerFeedback;
  mediaType: "movie" | "tv";
  partnerName: string | null;
  userAvatar: FeedbackAvatar;
  partnerAvatar: FeedbackAvatar;
  onClick?: () => void;
}) {
  const content = (
    <>
      {reaction === "up" ? (
        <span className="flex shrink-0">
          <AvatarCircle person={userAvatar} className="z-[1]" />
          <AvatarCircle person={partnerAvatar} className="-ml-3" />
        </span>
      ) : (
        <AvatarCircle person={partnerAvatar} />
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[11.5px] font-bold uppercase tracking-[0.12em] text-fixed-white/50">{partnerName ?? "Je partner"}</span>
        <span className="mt-0.5 block text-[15px] font-bold leading-5 text-fixed-white">{feedbackText(reaction, mediaType)}</span>
      </span>
      {onClick ? <span className="text-fixed-white/70">{FilmIcons.chevron}</span> : null}
    </>
  );
  const cls = cn(glassPanelClass, "flex w-full items-center gap-3.5 px-4 py-3.5 lg:px-5");
  if (!onClick) return <div className={cls}>{content}</div>;
  return (
    <button type="button" onClick={onClick} className={cn(cls, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white [@media(hover:hover)]:hover:bg-fixed-white/[0.1]")}>
      {content}
    </button>
  );
}

const TrailerIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="size-[18px]">
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.8l5 3.2-5 3.2z" fill="currentColor" stroke="none" />
  </svg>
);

/** Seriebeeld over de volle breedte achter de kop; vloeit links (tekst) en onderaan weg in het doek. */
function DetailBackdrop({ url }: { url: string | null }) {
  const screen = (pct: number) => `color-mix(in srgb, var(--cinema-screen) ${pct}%, transparent)`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden md:h-[640px] lg:h-[780px]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url.replace("/w780/", "/w1280/")} alt="" decoding="async" className="absolute inset-0 size-full object-cover object-[60%_10%] lg:object-[50%_20%]" />
      ) : null}
      <div
        className="absolute inset-0 md:hidden"
        style={{ background: `linear-gradient(180deg, ${screen(35)} 0%, transparent 26%, ${screen(70)} 58%, var(--cinema-screen) 92%)` }}
      />
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          background: `linear-gradient(90deg, var(--cinema-screen) 0%, ${screen(88)} 32%, ${screen(20)} 62%, transparent 80%), linear-gradient(0deg, var(--cinema-screen) 0%, transparent 45%), linear-gradient(180deg, ${screen(45)} 0%, transparent 16%)`,
        }}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 pt-[228px] lg:px-16 lg:pt-[150px]">
      <div className="flex gap-1.5">
        {[56, 48, 64].map((w) => (
          <div key={w} className="h-7 rounded-full shimmer" style={{ width: w }} />
        ))}
      </div>
      <div className="h-12 w-2/3 rounded-[12px] shimmer lg:h-[88px] lg:w-[440px]" />
      <div className="h-9 w-64 rounded shimmer" />
      <div className="flex gap-2.5">
        {[180, 120, 110].map((w) => (
          <div key={w} className="h-[46px] rounded-full shimmer" style={{ width: w }} />
        ))}
      </div>
      <div className="grid max-w-[640px] gap-3 sm:grid-cols-2">
        <div className="h-[84px] rounded-[22px] shimmer" />
        <div className="h-[84px] rounded-[22px] shimmer" />
      </div>
    </div>
  );
}

export default function FilmDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;
  const {
    isInWatchlist,
    isWatched,
    watchedSet,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistScore,
    markWatched,
    unmarkWatched,
    saveSeriesMeta,
    markWatchedMany,
    unmarkWatchedMany,
    partnerName,
    partnerAvatarUrl,
    userName,
    userAvatarUrl,
    partnerFeedbackByMediaId,
    isMediaAddedByCurrentUser,
    askPartnerToReviewAgain,
    isFilmsListShared,
    watchedIds,
  } = useFilmsLibrary();

  const [detail, setDetail] = React.useState<FilmDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showTrailer, setShowTrailer] = React.useState(false);
  const [posterFullscreen, setPosterFullscreen] = React.useState(false);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [seasonData, setSeasonData] = React.useState<SeasonData | null>(null);
  const [episodes, setEpisodes] = React.useState<EpisodeRowData[] | null>(null);
  const [showBekendenModal, setShowBekendenModal] = React.useState(false);
  const [showAskAgainSlideIn, setShowAskAgainSlideIn] = React.useState(false);
  const [askAgainLoading, setAskAgainLoading] = React.useState(false);

  // Canvas «Seriedetail donker · E»: de detailpagina is altijd donker (cinema-doek), ongeacht het thema.
  React.useEffect(() => {
    setForcedDark(true);
    return () => setForcedDark(false);
  }, []);

  const tmdbId = React.useMemo(() => {
    const dashIdx = rawId?.indexOf("-") ?? -1;
    return dashIdx >= 0 ? rawId.slice(dashIdx + 1) : "";
  }, [rawId]);

  React.useEffect(() => {
    if (!rawId) return;
    const dashIdx = rawId.indexOf("-");
    const type = rawId.slice(0, dashIdx);
    const tmdbId = rawId.slice(dashIdx + 1);
    if (!type || !tmdbId) return;

    setLoading(true);
    fetch(`/api/films/detail?type=${type}&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: FilmDetail) => {
        setDetail(data);
        if (data.type === "tv") {
          void saveSeriesMeta(String(data.tmdbId), {
            title: data.title,
            posterUrl: data.posterUrl,
            year: data.year,
            seasons: (data.seasons ?? [])
              .filter((s) => s.seasonNumber > 0)
              .map((s) => ({
                seasonNumber: s.seasonNumber,
                episodeCount: s.episodeCount,
                name: s.name,
              })),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rawId]);

  React.useEffect(() => {
    if (!detail?.id || detail.score == null) return;
    if (isInWatchlist(detail.id)) void updateWatchlistScore(detail.id, detail.score);
  }, [detail?.id, detail?.score, isInWatchlist, updateWatchlistScore]);

  const seasonProgress = React.useCallback(
    (seasonNumber: number) => {
      const prefix = `ep-${tmdbId}-s${seasonNumber}e`;
      let n = 0;
      watchedSet.forEach((id) => {
        if (id.startsWith(prefix)) n += 1;
      });
      return n;
    },
    [watchedSet, tmdbId],
  );

  // Start op het seizoen waar je mee bezig bent (eerste dat nog niet helemaal gezien is).
  React.useEffect(() => {
    if (!detail || detail.type !== "tv" || detail.seasons.length === 0) return;
    const busy = detail.seasons.find((s) => seasonProgress(s.seasonNumber) < s.episodeCount);
    setSelectedSeason((busy ?? detail.seasons[0]).seasonNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id]);

  // Seizoenspecifieke data (beschrijving, trailer) en afleveringen
  React.useEffect(() => {
    if (!detail || detail.type !== "tv") return;
    setSeasonData(null);
    setEpisodes(null);
    setOverviewExpanded(false);
    let cancelled = false;
    fetch(`/api/films/season?id=${tmdbId}&season=${selectedSeason}`)
      .then((r) => r.json())
      .then((d: SeasonData) => !cancelled && setSeasonData(d))
      .catch(() => {});
    fetch(`/api/films/episodes?id=${tmdbId}&season=${selectedSeason}`)
      .then((r) => r.json())
      .then((d: { episodes: EpisodeRowData[] }) => !cancelled && setEpisodes(d.episodes ?? []))
      .catch(() => !cancelled && setEpisodes([]));
    return () => {
      cancelled = true;
    };
  }, [detail?.id, selectedSeason]);

  const isTV = detail?.type === "tv";
  const activeTrailerKey = isTV ? (seasonData?.trailerKey ?? detail?.trailerKey ?? null) : (detail?.trailerKey ?? null);
  const activeOverview = isTV ? seasonData?.overview || detail?.overview || "" : detail?.overview || "";

  const inWatchlist = detail ? isInWatchlist(detail.id) : false;
  const watched = detail ? isWatched(detail.id) : false;
  const partnerFeedback = detail ? partnerFeedbackByMediaId[detail.id] : undefined;
  const canAskPartnerAgain =
    Boolean(detail) &&
    isFilmsListShared &&
    isMediaAddedByCurrentUser(detail?.id ?? "") &&
    (partnerFeedback === "down" || partnerFeedback === "seen");

  async function handleAskPartnerAgain() {
    if (!detail || askAgainLoading) return;
    setAskAgainLoading(true);
    try {
      await askPartnerToReviewAgain(detail.id);
      setShowAskAgainSlideIn(false);
    } finally {
      setAskAgainLoading(false);
    }
  }
  const userAvatar = React.useMemo((): FeedbackAvatar => ({ url: userAvatarUrl, name: userName }), [userAvatarUrl, userName]);
  const partnerAvatar = React.useMemo((): FeedbackAvatar => ({ url: partnerAvatarUrl, name: partnerName }), [partnerAvatarUrl, partnerName]);

  function goBack() {
    const returnUrl = sessionStorage.getItem("films-watchlist-return");
    if (returnUrl) {
      sessionStorage.removeItem("films-watchlist-return");
      router.push(returnUrl, { scroll: false });
    } else {
      backOr(router, "/films-series");
    }
  }

  function toggleWatchlist() {
    if (!detail) return;
    if (inWatchlist) {
      void removeFromWatchlist(detail.id);
    } else {
      void addToWatchlist({
        id: detail.id,
        type: detail.type,
        title: detail.title,
        year: detail.year,
        posterUrl: detail.posterUrl,
        score: detail.score,
        overview: detail.overview ?? null,
      });
    }
  }

  function handleSeen() {
    if (!detail) return;
    if (isTV) setShowBekendenModal(true);
    else if (watched) void unmarkWatched(detail.id);
    else void markWatched(detail.id);
  }

  const epId = (season: number, ep: number) => `ep-${tmdbId}-s${season}e${ep}`;

  /**
   * «Alle afleveringen»: alles wat al uitgezonden is op gezien (zoals het oogje op de watchlist).
   * Loopt de serie nog, dan volg je ze; ze gaat van de watchlist.
   */
  async function markAllEpisodesSeen() {
    if (!detail) return;
    const seasons = detail.seasons.filter((s) => s.seasonNumber > 0);
    const last = seasons[seasons.length - 1];
    const lastAired = detail.lastAired ?? (last ? { season: last.seasonNumber, episode: last.episodeCount } : null);
    const ongoing = isReturningStatus(detail.status);
    const toMark = [...airedEpisodeIds(tmdbId, seasons, lastAired), detail.id, ...(ongoing ? [followMarkId(tmdbId)] : [])].filter(
      (id) => !watchedSet.has(id),
    );
    for (let i = 0; i < toMark.length; i += 150) await markWatchedMany(toMark.slice(i, i + 150));
    if (ongoing && watchedSet.has(skipMarkId(tmdbId))) await unmarkWatchedMany([skipMarkId(tmdbId)]);
    if (isInWatchlist(detail.id)) await removeFromWatchlist(detail.id);
  }
  function toggleEpisode(ep: number) {
    const id = epId(selectedSeason, ep);
    if (watchedSet.has(id)) void unmarkWatched(id);
    else void markWatched(id);
  }

  // Canvas «22 · Nieuw seizoen — detail»: serie helemaal gezien en er is een volgend seizoen.
  const newSeason = React.useMemo(() => {
    if (!detail || detail.type !== "tv") return null;
    return (
      buildNewSeasonItems({
        watchedIds,
        watchlist: inWatchlist ? [{ id: detail.id, type: "tv", title: detail.title, year: detail.year, posterUrl: detail.posterUrl }] : [],
        seriesMeta: { [tmdbId]: { title: detail.title, year: detail.year, posterUrl: detail.posterUrl } },
        rawSeasonsByTmdbId: { [tmdbId]: detail.seasons },
        dismissed: new Set(),
      })[0] ?? null
    );
  }, [detail, watchedIds, inWatchlist, tmdbId]);

  const seasonPills = (detail?.seasons ?? []).map((s) => ({
    isNew: newSeason?.released === true && newSeason.season === s.seasonNumber,
    seasonNumber: s.seasonNumber,
    label: s.name,
    total: s.episodeCount,
    watched: seasonProgress(s.seasonNumber),
  }));

  const seasonCount = (detail?.seasons ?? []).filter((x) => x.seasonNumber > 0).length || (detail?.seasons.length ?? 0);
  const chips = detail ? [isTV ? "Serie" : "Film", detail.year, detail.certification, ...detail.genres.slice(0, 2)].filter(Boolean) as string[] : [];
  const imdbHref = detail ? imdbUrl(detail.title, detail.imdbId) : "#";
  const stats: { value: React.ReactNode; label: React.ReactNode }[] = detail
    ? [
        ...(detail.score != null
          ? [{ value: <span className="flex items-center gap-1.5"><StarGlyph source={detail.scoreSource} className="size-[0.7em]" />{detail.score.toFixed(1)}</span>, label: detail.scoreSource === "imdb" ? "IMDb" : "TMDB" }]
          : []),
        ...(isTV
          ? [
              { value: seasonCount, label: seasonCount === 1 ? "Seizoen" : "Seizoenen" },
              ...(detail.totalEpisodes ? [{ value: detail.totalEpisodes, label: "Afleveringen" }] : []),
            ]
          : detail.runtime
            ? [{ value: detail.runtime, label: "Speelduur" }]
            : []),
        {
          value: (
            <a href={imdbHref} target="_blank" rel="noopener noreferrer" aria-label={`${detail.title} bekijken op IMDb`} className="rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white">
              <ImdbMark />
            </a>
          ),
          label: (
            <a href={imdbHref} target="_blank" rel="noopener noreferrer" tabIndex={-1} className="inline-flex items-center gap-1 [@media(hover:hover)]:hover:text-fixed-white">
              Openen {FilmIcons.external}
            </a>
          ),
        },
      ]
    : [];

  const heroPill = "h-[42px] lg:h-[46px]";
  const seenPill = isTV ? (
    <ActionPill tone="glass" icon={FilmIcons.eye} onClick={handleSeen} className={heroPill}>
      Gezien…
    </ActionPill>
  ) : (
    <ActionPill tone={watched ? "screen" : "glass"} icon={watched ? FilmIcons.check : FilmIcons.eye} aria-pressed={watched} onClick={handleSeen} className={heroPill}>
      Gezien
    </ActionPill>
  );
  const watchlistPill = (
    <ActionPill
      tone={inWatchlist ? "screen" : "glass"}
      icon={inWatchlist ? FilmIcons.check : FilmIcons.plus}
      aria-pressed={inWatchlist}
      aria-label={inWatchlist ? "Van je watchlist halen" : "Op je watchlist zetten"}
      onClick={toggleWatchlist}
      className={heroPill}
    >
      {inWatchlist ? "Op je watchlist" : "Watchlist"}
    </ActionPill>
  );

  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col overflow-x-hidden bg-[var(--cinema-screen)] pb-[calc(env(safe-area-inset-bottom,0px)+48px)]">
      {loading ? (
        <DetailSkeleton />
      ) : !detail ? (
        <div className="mx-auto w-full max-w-[1180px] px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:px-16 lg:pt-8">
          <GlassIconButton aria-label="Terug" onClick={goBack}>
            {FilmIcons.back}
          </GlassIconButton>
          <p className="py-8 text-center text-sm text-fixed-white/60">Kan details niet laden.</p>
        </div>
      ) : (
        <>
          {/* Canvas «Seriedetail donker · E»: seriebeeld over de volle breedte, vloeit links en onderaan weg in het doek. */}
          <DetailBackdrop url={detail.backdropUrl ?? detail.posterUrl} />

          {/* Terug en ⋯ op dezelfde breedte als de inhoud eronder (max 1180, marge 16 / 64). */}
          <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+12px)] z-20 lg:top-8">
            <div className="mx-auto flex w-full max-w-[1180px] justify-between px-4 lg:px-16">
              <GlassIconButton aria-label="Terug" onClick={goBack}>
                {FilmIcons.back}
              </GlassIconButton>
              <GlassIconButton aria-label="Instellingen" onClick={() => router.push("/films-series/instellingen")}>
                {FilmIcons.dots}
              </GlassIconButton>
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col px-4 pt-[228px] lg:px-16 lg:pt-[150px]">
            <div className="min-w-0 lg:max-w-[640px]">
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <GlassChip key={c}>{c}</GlassChip>
                ))}
              </div>
              <h1 className="mt-4 bg-gradient-to-b from-fixed-white from-30% to-fixed-white/60 bg-clip-text pb-1 text-[44px] font-black leading-[0.98] tracking-[-0.04em] text-transparent [text-wrap:balance] lg:mt-5 lg:text-[96px] lg:leading-[0.95] lg:tracking-[-0.05em]">
                {detail.title}
              </h1>

              <div className="mt-4 flex items-stretch gap-4 lg:mt-5 lg:gap-7">
                {stats.map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? <span aria-hidden className="w-px shrink-0 bg-fixed-white/15" /> : null}
                    <HeroStat value={s.value} label={s.label} />
                  </React.Fragment>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5 lg:mt-7">
                <WatchOnProjector
                  imdbId={detail.imdbId}
                  type={detail.type}
                  tmdbId={isTV ? tmdbId : undefined}
                  tone="heroPrimary"
                  heroLabel={{ full: "Kijk op projector", short: "Projector" }}
                />
                {watchlistPill}
                {seenPill}
                {activeTrailerKey ? (
                  <ActionPill tone="glass" icon={TrailerIcon} onClick={() => setShowTrailer(true)} className="h-[42px] lg:h-[46px]">
                    Trailer
                  </ActionPill>
                ) : (
                  <a
                    href={youtubeTrailerSearchUrl(detail.title, isTV ? selectedSeason : undefined)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[42px] items-center gap-[7px] rounded-pill bg-[rgba(255,255,255,0.14)] px-4 text-[15px] font-bold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white lg:h-[46px] [@media(hover:hover)]:hover:bg-[rgba(255,255,255,0.22)]"
                  >
                    {TrailerIcon}
                    Trailer
                  </a>
                )}
              </div>
              <StremioEpisodeStatus tone="cinema" imdbId={detail.imdbId} tmdbId={isTV ? tmdbId : undefined} />

              {isTV || partnerFeedback || newSeason ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-7">
                  {isTV ? (
                    <SeriesTasteDetailRow
                      tone="glass"
                      series={{ id: Number(tmdbId), title: detail.title, year: detail.year ?? "", posterUrl: detail.posterUrl ?? null }}
                    />
                  ) : null}
                  {partnerFeedback ? (
                    <PartnerFeedbackPanel
                      reaction={partnerFeedback}
                      mediaType={detail.type}
                      partnerName={partnerName}
                      userAvatar={userAvatar}
                      partnerAvatar={partnerAvatar}
                      onClick={canAskPartnerAgain ? () => setShowAskAgainSlideIn(true) : undefined}
                    />
                  ) : null}
                  {newSeason ? (
                    <div className={cn(glassPanelClass, "flex items-center gap-3 px-4 py-3.5 sm:col-span-2 lg:px-5")}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--badge-new)] text-fixed-white" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
                          <path d="M12 2.5l2.1 6.1 6.4.3-5 4 1.8 6.2L12 15.4l-5.3 3.7 1.8-6.2-5-4 6.4-.3z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold text-fixed-white">
                          Seizoen {newSeason.season} {newSeason.released ? "is uit" : `komt op ${new Date(`${newSeason.airDate}T12:00:00`).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}`}
                        </p>
                        <p className="text-[12.5px] text-fixed-white/60">
                          {newSeason.watchedThrough === 1 ? "Je zag seizoen 1 al helemaal" : `Je zag seizoen 1 tot ${newSeason.watchedThrough} al helemaal`}
                        </p>
                      </div>
                      <ActionPill tone={newSeason.released ? "primary" : "glass"} icon={FilmIcons.plus} onClick={toggleWatchlist} className="h-[34px] shrink-0 px-[13px] text-[13px]">
                        {newSeason.released ? "Watchlist" : "Alvast"}
                      </ActionPill>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <p className={cn("mt-6 max-w-[600px] text-[15px] leading-[23px] text-fixed-white/75 lg:mt-7 lg:text-[16px] lg:leading-[26px]", !overviewExpanded && "line-clamp-4 lg:line-clamp-none")}>
                {activeOverview || "Geen beschrijving beschikbaar."}
              </p>
              {!overviewExpanded && activeOverview.length > 180 ? (
                <button type="button" onClick={() => setOverviewExpanded(true)} className="mt-1 rounded text-[15px] font-bold text-fixed-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white lg:hidden">
                  Meer lezen
                </button>
              ) : null}
            </div>

            {/* Seizoenen als glazen kaarten; de gekozen kaart bepaalt de afleveringen eronder. */}
            {isTV && detail.seasons.length > 0 ? (
              <section className="mt-10 lg:mt-14">
                <DetailSectionHead tone="cinema" title="Seizoenen" meta={detail.totalEpisodes ? `${seasonCount} ${seasonCount === 1 ? "seizoen" : "seizoenen"} · ${detail.totalEpisodes} afleveringen` : undefined} />
                <div className="-mx-4 overflow-x-auto px-4 py-0.5 lg:mx-0 lg:overflow-visible lg:px-0" style={{ scrollbarWidth: "none" }}>
                  <div role="tablist" aria-label="Seizoenen" className="flex w-max gap-3 lg:grid lg:w-full lg:grid-cols-3">
                    {detail.seasons.map((s, i) => (
                      <SeasonCard
                        key={s.seasonNumber}
                        season={seasonPills[i]}
                        year={s.airDate ? s.airDate.slice(0, 4) : null}
                        posterUrl={s.posterUrl ?? detail.posterUrl}
                        selected={s.seasonNumber === selectedSeason}
                        onSelect={() => setSelectedSeason(s.seasonNumber)}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <DetailSectionHead
                    tone="cinema"
                    title={`Afleveringen · ${detail.seasons.find((s) => s.seasonNumber === selectedSeason)?.name ?? `Seizoen ${selectedSeason}`}`}
                    action="Alles"
                    onAction={() => router.push(`/films-series/${rawId}/episodes?s=${selectedSeason}`)}
                  />
                  <ListCard className="bg-fixed-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                    {/* Alle afleveringen van het gekozen seizoen, niet enkel een voorproefje. */}
                    {episodes === null
                      ? [1, 2, 3].map((i) => <EpisodeRowSkeleton key={i} />)
                      : episodes.map((ep) => (
                          <EpisodeRow
                            key={ep.episodeNumber}
                            ep={ep}
                            watched={watchedSet.has(epId(selectedSeason, ep.episodeNumber))}
                            showOverview={false}
                            onOpen={() => router.push(`/films-series/${rawId}/episodes/s${selectedSeason}e${ep.episodeNumber}`)}
                            onToggle={() => toggleEpisode(ep.episodeNumber)}
                          />
                        ))}
                  </ListCard>
                </div>
              </section>
            ) : null}

            {detail.cast.length > 0 ? (
              <section className="mt-10 lg:mt-12">
                <DetailSectionHead tone="cinema" title="Cast" action="Alles" onAction={() => router.push(`/films-series/${rawId}/cast`)} />
                {/* Gsm: ronde foto's in een veegrij; desktop: glazen kaarten in zes kolommen. */}
                <div className="-mx-4 overflow-x-auto px-4 lg:hidden" style={{ scrollbarWidth: "none" }}>
                  <div className="flex w-max gap-2.5">
                    {detail.cast.slice(0, 12).map((m, i) => (
                      <CastRound key={i} person={m} tone="cinema" />
                    ))}
                  </div>
                </div>
                <div className="hidden grid-cols-6 gap-3.5 lg:grid">
                  {detail.cast.slice(0, 6).map((m, i) => (
                    <CastCard key={i} person={m} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      )}

      {showTrailer && activeTrailerKey ? (
        <TrailerOverlay videoKey={activeTrailerKey} title={detail?.title ?? ""} onClose={() => setShowTrailer(false)} />
      ) : null}

      {/* Poster fullscreen */}
      {posterFullscreen && detail?.posterUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => setPosterFullscreen(false)}>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => setPosterFullscreen(false)}
            className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+16px)] flex size-8 items-center justify-center rounded-full bg-fixed-white/20 text-fixed-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white"
          >
            <CloseIcon />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <img
            src={detail.posterUrl.replace("/w342/", "/w780/")}
            alt={`Poster van ${detail.title}`}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Slide-in: opnieuw vragen aan partner (Figma 1715:77430) */}
      <SlideInModal
        open={showAskAgainSlideIn}
        onClose={() => setShowAskAgainSlideIn(false)}
        title="Watchlist"
        bodyClassName="pt-6 pb-0"
        footer={
          <Button
            type="button"
            variant="secondary"
            disabled={askAgainLoading}
            onClick={() => void handleAskPartnerAgain()}
            className={cn(
              "mx-auto max-w-none min-w-0 w-full max-w-[320px] rounded-full py-2.5",
              "border border-[var(--action-primary)] bg-[var(--white)]",
              "text-[var(--action-primary)] hover:bg-[var(--blue-25)]",
            )}
          >
            Opnieuw vragen aan {partnerName ?? "je partner"}
          </Button>
        }
      >
        <></>
      </SlideInModal>

      {/* Blad: kies hoe je een serie op gezien zet — drie gelijke keuzetegels (OptionTile). */}
      <SlideInModal
        open={showBekendenModal}
        onClose={() => setShowBekendenModal(false)}
        title="Wat heb je gezien?"
        size="dialog"
      >
        <div className="grid grid-cols-1 gap-2.5 pb-2 sm:grid-cols-3">
          <OptionTile
            icon={
              <svg viewBox="0 0 24 24" aria-hidden className="size-6">
                <path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" fill="currentColor" />
              </svg>
            }
            title="Eerste aflevering"
            subtitle="Je bent eraan begonnen"
            onClick={() => {
              if (!detail) return;
              const firstSeason = detail.seasons[0]?.seasonNumber ?? 1;
              void markWatched(epId(firstSeason, 1));
              void markWatched(detail.id);
              setShowBekendenModal(false);
            }}
          />
          <OptionTile
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-6">
                <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
              </svg>
            }
            title="Kies een aflevering"
            subtitle="Tot waar je zag"
            onClick={() => {
              setShowBekendenModal(false);
              router.push(`/films-series/${rawId}/episodes/select`);
            }}
          />
          <OptionTile
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-6">
                <path d="M2.5 12.5l4 4L14 9M10 16.5l1 1L21.5 7" />
              </svg>
            }
            title="Alle afleveringen"
            subtitle="Alles wat al uit is"
            onClick={() => {
              setShowBekendenModal(false);
              void markAllEpisodesSeen();
            }}
          />
        </div>
      </SlideInModal>
    </div>
  );
}
