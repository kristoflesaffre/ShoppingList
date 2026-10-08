"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { backOr } from "@/lib/in_app_history";
import { cn } from "@/lib/utils";
import { buildNewSeasonItems } from "@/lib/tv-watching-progress";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import {
  ActionPill,
  CastRound,
  CastRow,
  DetailSectionHead,
  EpisodeRow,
  EpisodeRowSkeleton,
  ExternalChip,
  FilmIcons,
  GlassIconButton,
  HeroImdbChip,
  ImdbMark,
  ListCard,
  SeasonPills,
  SoftPlayButton,
  StarGlyph,
  TrailerOverlay,
  YoutubeMark,
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
};

type PartnerFeedback = "up" | "down" | "seen";
type FeedbackAvatar = { url: string | null; name: string | null };

/** Afleveringen die de detailpagina toont (de rest staat op /episodes). */
const PREVIEW_EPISODES = 3;

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
    <span className={cn("flex size-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] shadow-[0_0_0_2px_var(--white)]", className)}>
      {person.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.url} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold text-[var(--blue-500)]">{(person.name ?? "?").slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}

function feedbackText({
  reaction,
  mediaType,
  partnerName,
}: {
  reaction: PartnerFeedback;
  mediaType: "movie" | "tv";
  partnerName: string | null;
}): string {
  const name = partnerName ?? "Je partner";
  const label = mediaType === "tv" ? "serie" : "film";
  if (reaction === "up") return `Je kijkt deze ${label} samen met ${name}`;
  if (reaction === "down") return `${name} wil deze ${label} niet zien`;
  return `${name} heeft deze ${label} al gezien`;
}

function PartnerFeedbackBanner({
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
          <AvatarCircle person={partnerAvatar} className="-ml-[9px]" />
        </span>
      ) : (
        <AvatarCircle person={partnerAvatar} />
      )}
      <span className="min-w-0 flex-1 text-left text-[13.5px] font-semibold leading-[18px] text-[var(--text-primary)]">
        {feedbackText({ reaction, mediaType, partnerName })}
      </span>
      {onClick ? <span className="text-[var(--blue-500)]">{FilmIcons.chevron}</span> : null}
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-[18px] bg-[var(--blue-25)] px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--blue-50)]";
  if (!onClick) return <div className={cls}>{content}</div>;
  return (
    <button type="button" onClick={onClick} className={cn(cls, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]")}>
      {content}
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="h-[300px] shimmer lg:mx-auto lg:mt-[88px] lg:h-[400px] lg:w-full lg:max-w-[956px] lg:rounded-[28px]" />
      <div className="mx-auto flex w-full max-w-[956px] flex-col gap-4 px-4 pt-5">
        <div className="h-7 w-2/3 rounded shimmer" />
        <div className="h-4 w-1/2 rounded shimmer" />
        <div className="flex gap-2.5">
          <div className="h-11 flex-1 rounded-full shimmer" />
          <div className="h-11 flex-1 rounded-full shimmer" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 rounded shimmer" style={{ width: i % 2 === 0 ? "100%" : "83%" }} />
        ))}
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
  function toggleEpisode(ep: number) {
    const id = epId(selectedSeason, ep);
    if (watchedSet.has(id)) void unmarkWatched(id);
    else void markWatched(id);
  }

  // Toon de afleveringen vanaf de eerste die je nog niet zag.
  const previewEpisodes = React.useMemo(() => {
    if (!episodes) return null;
    const firstOpen = episodes.findIndex((e) => !watchedSet.has(epId(selectedSeason, e.episodeNumber)));
    const start = firstOpen < 0 ? 0 : Math.min(firstOpen, Math.max(0, episodes.length - PREVIEW_EPISODES));
    return episodes.slice(start, start + PREVIEW_EPISODES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes, selectedSeason, tmdbId]);

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

  const eyebrow = detail
    ? [isTV ? "Serie" : "Film", detail.year, detail.certification].filter(Boolean).join(" · ")
    : "";
  const scoreLine = detail ? (
    <>
      {detail.score != null ? (
        <>
          <StarGlyph source={detail.scoreSource} />
          <b className="font-bold">{detail.score.toFixed(1)}</b>
          <span className="opacity-70">{detail.scoreSource === "imdb" ? "IMDb" : "TMDB"}</span>
        </>
      ) : null}
      {detail.runtime ? <span>{detail.score != null ? "· " : ""}{detail.runtime}</span> : null}
    </>
  ) : null;

  const seenPill = (onDark: boolean) =>
    isTV ? (
      <ActionPill tone={onDark ? "glass" : "surface"} icon={FilmIcons.eye} onClick={handleSeen} className="flex-1 lg:flex-none">
        Gezien…
      </ActionPill>
    ) : (
      <ActionPill
        tone={watched ? (onDark ? "white" : "soft") : onDark ? "glass" : "surface"}
        icon={watched ? FilmIcons.check : FilmIcons.eye}
        aria-pressed={watched}
        onClick={handleSeen}
        className="flex-1 lg:flex-none"
      >
        Gezien
      </ActionPill>
    );
  const watchlistPill = (onDark: boolean) => (
    <ActionPill
      tone={inWatchlist ? (onDark ? "white" : "soft") : "primary"}
      icon={inWatchlist ? FilmIcons.check : FilmIcons.plus}
      aria-pressed={inWatchlist}
      aria-label={inWatchlist ? "Van je watchlist halen" : "Op je watchlist zetten"}
      onClick={toggleWatchlist}
      className="flex-1 lg:flex-none"
    >
      {inWatchlist ? "Op je watchlist" : "Watchlist"}
    </ActionPill>
  );

  const playButton = (size: number) =>
    activeTrailerKey ? <SoftPlayButton size={size} aria-label={`Trailer van ${detail?.title ?? ""} afspelen`} onClick={() => setShowTrailer(true)} /> : null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
      {loading ? (
        <DetailSkeleton />
      ) : !detail ? (
        <div className="mx-auto w-full max-w-[956px] px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <button type="button" aria-label="Terug" onClick={goBack} className="-ml-2 flex size-10 items-center justify-center text-[var(--blue-500)]">
            {FilmIcons.back}
          </button>
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Kan details niet laden.</p>
        </div>
      ) : (
        <>
          {/* ── Mobiel: backdrop die in de achtergrond overloopt, poster erover ── */}
          <div className="relative h-[300px] lg:hidden">
            {detail.backdropUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.backdropUrl} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
            ) : (
              <div aria-hidden className="absolute inset-0 bg-[#1b1d3a]" />
            )}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(16,17,48,0.28) 0%, rgba(16,17,48,0) 34%, rgba(16,17,48,0) 58%, var(--bg-app) 100%)" }}
            />
            <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex justify-between">
              <GlassIconButton aria-label="Terug" onClick={goBack}>
                {FilmIcons.back}
              </GlassIconButton>
              <GlassIconButton aria-label="Instellingen" onClick={() => router.push("/films-series/instellingen")}>
                {FilmIcons.dots}
              </GlassIconButton>
            </div>
            <div className="absolute left-1/2 top-[128px] -translate-x-1/2">{playButton(52)}</div>
          </div>
          <div className="relative -mt-[92px] flex items-end gap-4 px-4 lg:hidden">
            <button
              type="button"
              aria-label="Poster vergroten"
              onClick={() => detail.posterUrl && setPosterFullscreen(true)}
              className="h-[168px] w-28 shrink-0 overflow-hidden rounded-[14px] bg-[var(--gray-100)] shadow-[0_18px_30px_-16px_rgba(16,17,48,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              {detail.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.posterUrl} alt={`Poster van ${detail.title}`} className="size-full object-cover" />
              ) : null}
            </button>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--blue-500)]">{eyebrow}</p>
              <h1 className="mt-1 line-clamp-3 text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">{detail.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13.5px] text-[var(--text-secondary)] [&_b]:text-[var(--text-primary)]">{scoreLine}</p>
            </div>
          </div>

          {/* ── Desktop: donkere herokaart ── */}
          <div className="mx-auto hidden w-full max-w-[956px] px-4 pt-10 lg:block lg:px-0">
            <div className="mb-5 flex justify-between">
              <button
                type="button"
                aria-label="Terug"
                onClick={goBack}
                className="flex size-10 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                {FilmIcons.back}
              </button>
              <button
                type="button"
                aria-label="Instellingen"
                onClick={() => router.push("/films-series/instellingen")}
                className="flex size-10 items-center justify-center rounded-full bg-[var(--white)] text-[var(--text-secondary)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                {FilmIcons.dots}
              </button>
            </div>
            <div className="relative h-[400px] overflow-hidden rounded-[28px] bg-[#1b1d3a]">
              {detail.backdropUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.backdropUrl} alt="" aria-hidden className="absolute right-0 top-0 h-full w-[72%] object-cover" />
              ) : null}
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#1b1d3a_30%,rgba(27,29,58,0.75)_52%,rgba(27,29,58,0.05)_85%)]" />
              <div className="absolute right-[190px] top-1/2 -translate-y-1/2">{playButton(60)}</div>
              <div className="absolute inset-y-10 left-9 flex items-center gap-7">
                <button
                  type="button"
                  aria-label="Poster vergroten"
                  onClick={() => detail.posterUrl && setPosterFullscreen(true)}
                  className="h-80 w-[213px] shrink-0 overflow-hidden rounded-[16px] bg-[rgba(255,255,255,0.08)] shadow-[0_20px_40px_-18px_rgba(0,0,0,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {detail.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detail.posterUrl} alt={`Poster van ${detail.title}`} className="size-full object-cover" />
                  ) : null}
                </button>
                <div className="w-[360px] text-white">
                  <p className="text-xs font-extrabold uppercase tracking-[0.07em] text-[#c9cbff]">{eyebrow}</p>
                  <h1 className="mt-2 line-clamp-2 text-[44px] font-extrabold leading-[1.05] tracking-[-0.02em]">{detail.title}</h1>
                  <p className="mt-2.5 flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.75)] [&_b]:text-white">{scoreLine}</p>
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {detail.genres.map((g) => (
                      <span key={g} className="inline-flex h-7 items-center rounded-pill bg-[rgba(255,255,255,0.14)] px-[11px] text-[12.5px] font-semibold">
                        {g}
                      </span>
                    ))}
                    <HeroImdbChip title={detail.title} imdbId={detail.imdbId} />
                  </div>
                  <div className="mt-[22px] flex gap-2.5">
                    {watchlistPill(true)}
                    {seenPill(true)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[956px] flex-col px-4 lg:px-0">
            {/* Mobiel: genres + acties */}
            <div className="flex flex-col gap-4 pt-[18px] lg:hidden">
              {detail.genres.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detail.genres.map((g) => (
                    <span key={g} className="inline-flex h-7 items-center rounded-pill bg-[var(--white)] px-[11px] text-[12.5px] font-semibold text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border-subtle)]">
                      {g}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2.5">
                {watchlistPill(false)}
                {seenPill(false)}
              </div>
            </div>

            {partnerFeedback ? (
              <div className="mt-4 lg:mt-[18px]">
                <PartnerFeedbackBanner
                  reaction={partnerFeedback}
                  mediaType={detail.type}
                  partnerName={partnerName}
                  userAvatar={userAvatar}
                  partnerAvatar={partnerAvatar}
                  onClick={canAskPartnerAgain ? () => setShowAskAgainSlideIn(true) : undefined}
                />
              </div>
            ) : null}

            {newSeason ? (
              <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-[#eef9f2] p-3.5 shadow-[inset_0_0_0_1px_#d3f0de] lg:mt-[18px]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[#1f9d55]" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
                    <path d="M12 2.5l2.1 6.1 6.4.3-5 4 1.8 6.2L12 15.4l-5.3 3.7 1.8-6.2-5-4 6.4-.3z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-bold text-[var(--text-primary)]">
                    Seizoen {newSeason.season} {newSeason.released ? "is uit" : `komt op ${new Date(`${newSeason.airDate}T12:00:00`).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}`}
                  </p>
                  <p className="text-[12.5px] text-[var(--text-secondary)]">
                    {newSeason.watchedThrough === 1 ? "Je zag seizoen 1 al helemaal" : `Je zag seizoen 1 tot ${newSeason.watchedThrough} al helemaal`}
                  </p>
                </div>
                <ActionPill tone={newSeason.released ? "primary" : "soft"} icon={FilmIcons.plus} onClick={toggleWatchlist} className="h-[34px] shrink-0 px-[13px] text-[13px]">
                  {newSeason.released ? "Watchlist" : "Alvast"}
                </ActionPill>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-[30px] lg:mt-[30px] lg:flex-row lg:items-start lg:gap-9">
              <div className="flex min-w-0 flex-1 flex-col gap-[30px] lg:gap-[34px]">
                {/* Over */}
                <section>
                  <h2 className="mb-2.5 hidden text-[19px] font-bold leading-6 text-[var(--text-primary)] lg:block">Over</h2>
                  <p className={cn("text-[15px] leading-[22px] text-[var(--text-primary)] lg:text-[15.5px] lg:leading-6", !overviewExpanded && "line-clamp-4 lg:line-clamp-none")}>
                    {activeOverview || "Geen beschrijving beschikbaar."}
                  </p>
                  {!overviewExpanded && activeOverview.length > 180 ? (
                    <button type="button" onClick={() => setOverviewExpanded(true)} className="mt-1 text-[15px] font-bold text-[var(--blue-500)] focus-visible:outline-none lg:hidden">
                      Meer lezen
                    </button>
                  ) : null}
                  <div className="mt-3.5 flex gap-2">
                    <ExternalChip href={imdbUrl(detail.title, detail.imdbId)} label={`${detail.title} bekijken op IMDb`}>
                      <ImdbMark />
                    </ExternalChip>
                    <ExternalChip href={youtubeTrailerSearchUrl(detail.title, isTV ? selectedSeason : undefined)} label={`Trailer van ${detail.title} zoeken op YouTube`}>
                      <YoutubeMark />
                    </ExternalChip>
                  </div>
                </section>

                {/* Afleveringen */}
                {isTV && detail.seasons.length > 0 ? (
                  <section>
                    <DetailSectionHead
                      title="Afleveringen"
                      action={detail.totalEpisodes ? `Alle ${detail.totalEpisodes}` : "Alle"}
                      onAction={() => router.push(`/films-series/${rawId}/episodes?s=${selectedSeason}`)}
                    />
                    <SeasonPills seasons={seasonPills} selected={selectedSeason} onSelect={setSelectedSeason} className="mb-3.5" />
                    <ListCard>
                      {previewEpisodes === null
                        ? [1, 2, 3].map((i) => <EpisodeRowSkeleton key={i} />)
                        : previewEpisodes.map((ep) => (
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
                  </section>
                ) : null}

                {/* Cast — mobiel als rij ronde foto's */}
                {detail.cast.length > 0 ? (
                  <section className="lg:hidden">
                    <DetailSectionHead title="Cast" action="Alles" onAction={() => router.push(`/films-series/${rawId}/cast`)} />
                    <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                      <div className="flex w-max gap-2">
                        {detail.cast.slice(0, 12).map((m, i) => (
                          <CastRound key={i} person={m} />
                        ))}
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>

              {/* Cast — desktop als lijst rechts */}
              {detail.cast.length > 0 ? (
                <aside className="hidden w-80 shrink-0 lg:block">
                  <DetailSectionHead title="Cast" action="Alles" onAction={() => router.push(`/films-series/${rawId}/cast`)} />
                  <ListCard>
                    {detail.cast.slice(0, 6).map((m, i) => (
                      <CastRow key={i} person={m} />
                    ))}
                  </ListCard>
                </aside>
              ) : null}
            </div>
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

      {/* Slide-in: kies hoe je gezien wil markeren (alleen TV) */}
      <SlideInModal
        open={showBekendenModal}
        onClose={() => setShowBekendenModal(false)}
        title="Gezien"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!detail) return;
                const firstSeason = detail.seasons[0]?.seasonNumber ?? 1;
                void markWatched(epId(firstSeason, 1));
                void markWatched(detail.id);
                setShowBekendenModal(false);
              }}
            >
              Eerste aflevering
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowBekendenModal(false);
                router.push(`/films-series/${rawId}/episodes/select`);
              }}
            >
              Kies een aflevering
            </Button>
          </>
        }
      >
        <></>
      </SlideInModal>
    </div>
  );
}
