"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";

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
  imdbId: string | null;
  totalEpisodes: number | null;
  genres: string[];
  seasons: Season[];
  cast: CastMember[];
  trailerKey: string | null;
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

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AvatarCircle({ person, className }: { person: FeedbackAvatar; className?: string }) {
  return (
    <div
      className={cn(
        "size-6 shrink-0 overflow-hidden rounded-full border border-[#edeefe] bg-white",
        className,
      )}
    >
      {person.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.url} alt={person.name ?? ""} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <MaskIcon src="/icons/avatar.svg" className="size-4 bg-[#4f55f1]" />
        </div>
      )}
    </div>
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
  const showTogetherAvatars = reaction === "up";
  const interactive = Boolean(onClick);

  const content = (
    <>
      {showTogetherAvatars ? (
        <div className="flex isolate shrink-0 items-start">
          <AvatarCircle person={userAvatar} className="z-[2] -mr-3" />
          <AvatarCircle person={partnerAvatar} className="z-[1]" />
        </div>
      ) : (
        <AvatarCircle person={partnerAvatar} />
      )}
      <p className="min-w-0 flex-1 text-left text-xs font-normal leading-4 text-[#4f55f1]">
        {feedbackText({ reaction, mediaType, partnerName })}
      </p>
      {interactive ? (
        <MaskIcon src="/icons/chevron.svg" className="size-6 -rotate-90 bg-[#4f55f1]" aria-hidden />
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div className="flex w-full items-center gap-4 rounded-[8px] bg-[#edeefe] p-3">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[8px] bg-[#edeefe] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      {content}
    </button>
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
      <div className="h-12 rounded-lg bg-[var(--gray-100)]" />
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
  } = useFilmsLibrary();

  const [detail, setDetail] = React.useState<FilmDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showTrailer, setShowTrailer] = React.useState(false);
  const [posterFullscreen, setPosterFullscreen] = React.useState(false);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [overviewNeedsTruncation, setOverviewNeedsTruncation] = React.useState(false);
  const overviewRef = React.useRef<HTMLParagraphElement>(null);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [seasonData, setSeasonData] = React.useState<SeasonData | null>(null);
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

  // Initialiseer selectedSeason op het eerste seizoen zodra detail geladen is
  React.useEffect(() => {
    if (!detail || detail.type !== "tv" || detail.seasons.length === 0) return;
    setSelectedSeason(detail.seasons[0].seasonNumber);
  }, [detail?.id]);

  // Haal seizoenspecifieke data op zodra seizoen of show verandert
  React.useEffect(() => {
    if (!detail || detail.type !== "tv") return;
    const dashIdx = rawId.indexOf("-");
    const tmdbId = rawId.slice(dashIdx + 1);
    setSeasonData(null);
    setOverviewExpanded(false);
    fetch(`/api/films/season?id=${tmdbId}&season=${selectedSeason}`)
      .then((r) => r.json())
      .then((d: SeasonData) => setSeasonData(d))
      .catch(() => {});
  }, [detail?.id, selectedSeason]);

  // Meet of de overview-tekst de posterhoogte overschrijdt met minstens één volledige regel (24px)
  React.useEffect(() => {
    if (!overviewRef.current) return;
    setOverviewNeedsTruncation(overviewRef.current.scrollHeight > 191 + 24);
  }, [detail?.overview, seasonData?.overview]);

  const isTV = detail?.type === "tv";
  const activeTrailerKey = isTV
    ? (seasonData?.trailerKey ?? detail?.trailerKey ?? null)
    : (detail?.trailerKey ?? null);
  const activeOverview = isTV
    ? (seasonData?.overview || detail?.overview || "")
    : (detail?.overview || "");

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
  const userAvatar = React.useMemo(
    (): FeedbackAvatar => ({ url: userAvatarUrl, name: userName }),
    [userAvatarUrl, userName],
  );
  const partnerAvatar = React.useMemo(
    (): FeedbackAvatar => ({ url: partnerAvatarUrl, name: partnerName }),
    [partnerAvatarUrl, partnerName],
  );

  const metaParts = [detail?.year, detail?.certification, detail?.runtime].filter(Boolean);
  const genrePart = detail?.genres?.join(" - ") ?? "";
  const metaLine = genrePart
    ? `${metaParts.join("  ")}  /  ${genrePart}`
    : metaParts.join("  ");

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Vaste header */}
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
              {detail?.title ?? ""}
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
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {loading ? (
          <DetailSkeleton />
        ) : !detail ? (
          <p className="py-8 text-center text-sm text-[var(--gray-400)]">Kan details niet laden.</p>
        ) : (
          <>
            {partnerFeedback && (
              <PartnerFeedbackBanner
                reaction={partnerFeedback}
                mediaType={detail.type}
                partnerName={partnerName}
                userAvatar={userAvatar}
                partnerAvatar={partnerAvatar}
                onClick={
                  canAskPartnerAgain ? () => setShowAskAgainSlideIn(true) : undefined
                }
              />
            )}

            {/* Titel + score + externe links */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h1 className="min-w-0 flex-1 truncate text-2xl font-bold leading-8 text-[var(--text-primary)]">
                    {detail.title}
                  </h1>
                  {detail.score !== null && (
                    <div className="flex shrink-0 items-center gap-1">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="size-6 shrink-0">
                        <path
                          d="M12 2l2.75 5.57 6.15.9-4.45 4.33 1.05 6.11L12 15.9l-5.5 2.89 1.05-6.11L3.1 8.47l6.15-.9L12 2z"
                          fill="#FBBF24"
                          stroke="#F59E0B"
                          strokeWidth="0.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="font-medium text-[var(--text-primary)]">
                        <span className="text-base leading-6">{detail.score.toFixed(1)}</span>
                        <span className="text-xs font-normal leading-none">/10</span>
                      </p>
                    </div>
                  )}
                </div>
                {metaLine && (
                  <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                    <p className="whitespace-nowrap text-sm leading-5 text-[var(--gray-400)]">{metaLine}</p>
                  </div>
                )}
              </div>

              {/* Figma 1675:73093 — IMDb + YouTube links (links) + afleveringen (rechts) */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <a
                    href={imdbUrl(detail.title, detail.imdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${detail.title} bekijken op IMDb`}
                    className="flex h-6 w-12 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logos/logos-imdb.svg" alt="" className="h-6 w-auto max-w-full object-contain" />
                  </a>
                  <a
                    href={youtubeTrailerSearchUrl(detail.title, isTV ? selectedSeason : undefined)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Trailer van ${detail.title} zoeken op YouTube`}
                    className="flex h-6 w-[108px] shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logos/logos-youtube.svg" alt="" className="h-6 w-auto max-w-full object-contain" />
                  </a>
                </div>
                {isTV && detail.totalEpisodes !== null && (
                  <button
                    type="button"
                    onClick={() => router.push(`/films-series/${rawId}/episodes`)}
                    className="flex shrink-0 items-center gap-1 focus-visible:outline-none"
                  >
                    <span className="text-sm font-normal leading-5 text-[#4f55f1]">
                      {detail.totalEpisodes} afleveringen
                    </span>
                    <MaskIcon src="/icons/chevron.svg" className="size-6 -rotate-90 bg-[#4f55f1]" />
                  </button>
                )}
              </div>
            </div>

            {/* Seizoentabs — alleen voor TV-series */}
            {isTV && detail.seasons.length > 0 && (
              <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-6 border-b border-[#e2e4e6]" style={{ width: "max-content" }}>
                  {detail.seasons.map((s) => {
                    const active = s.seasonNumber === selectedSeason;
                    return (
                      <button
                        key={s.seasonNumber}
                        type="button"
                        onClick={() => setSelectedSeason(s.seasonNumber)}
                        className={cn(
                          "flex shrink-0 flex-col gap-2 pb-0 focus-visible:outline-none",
                          active
                            ? "font-medium text-[#16181a]"
                            : "font-normal text-[#8c929d]",
                        )}
                      >
                        <span className="whitespace-nowrap text-base leading-6">{s.name}</span>
                        <div
                          className="h-[2px] w-full rounded-full bg-[#4f55f1]"
                          style={{ opacity: active ? 1 : 0 }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Op large: trailer links naast poster+beschrijving; op mobile: trailer boven */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">

              {/* Trailer thumbnail */}
              <div className="relative h-[172px] shrink-0 overflow-hidden rounded-lg bg-[var(--gray-100)] lg:h-[191px] lg:w-auto lg:[aspect-ratio:16/9]">
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
                {activeTrailerKey && (
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

              {/* Poster + beschrijving */}
              <div className="flex items-start gap-6">
                <button
                  type="button"
                  aria-label="Poster vergroten"
                  onClick={() => detail.posterUrl && setPosterFullscreen(true)}
                  className={cn(
                    "relative h-[191px] w-[128px] shrink-0 overflow-hidden rounded bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                    !detail.posterUrl && "pointer-events-none",
                  )}
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
                      <MaskIcon src="/icons/films.svg" className="size-10 bg-[var(--gray-200)]" />
                    </div>
                  )}
                </button>

                {/* Beschrijving: zelfde hoogte als poster, uitbreidbaar indien nodig */}
                <div className="relative min-w-0 flex-1">
                  <div
                    className={cn(
                      "overflow-hidden",
                      !overviewExpanded && overviewNeedsTruncation && "h-[191px]",
                    )}
                  >
                    <p ref={overviewRef} className="text-base font-medium leading-6 text-[var(--text-primary)]">
                      {activeOverview || "Geen beschrijving beschikbaar."}
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
            </div>

            {/* Watchlist + bekeken knoppen */}
            <div className="flex w-full gap-3 lg:max-w-[358px] lg:self-end">
              {/* Bekeken — links */}
              <button
                type="button"
                onClick={() => {
                  if (!detail) return;
                  if (isTV) {
                    setShowBekendenModal(true);
                  } else if (watched) {
                    void unmarkWatched(detail.id);
                  } else {
                    void markWatched(detail.id);
                  }
                }}
                className={cn(
                  "flex h-12 min-w-0 flex-1 items-center gap-3 rounded-[8px] p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                  watched ? "border border-[#595f6a] bg-transparent" : "border border-[#4f55f1] bg-transparent",
                )}
              >
                <p className={cn(
                  "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-base font-medium",
                  watched ? "text-[#595f6a]" : "text-[#4f55f1]",
                )}>
                  {watched ? "Bekeken" : "Bekeken"}
                </p>
                <MaskIcon
                  src={watched ? "/icons/checkmark.svg" : "/icons/visible.svg"}
                  className={cn("size-6 shrink-0", watched ? "bg-[#595f6a]" : "bg-[#4f55f1]")}
                />
              </button>

              {/* Watchlist — rechts */}
              <button
                type="button"
                onClick={() => {
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
                }}
                className={cn(
                  "flex h-12 min-w-0 flex-1 items-center gap-3 rounded-[8px] p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                  inWatchlist ? "bg-[#d64040]" : "bg-[#4f55f1]",
                )}
              >
                <p className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-base font-medium text-white">
                  {inWatchlist ? "Verwijderen" : "Watchlist"}
                </p>
                <MaskIcon
                  src={inWatchlist ? "/icons/recycle_bin.svg" : "/icons/plus-circle.svg"}
                  className="size-6 shrink-0 bg-white"
                />
              </button>
            </div>

            {/* Cast */}
            {detail.cast.length > 0 && (
              <div className="flex w-full flex-col gap-4">
                <div className="flex items-center gap-6 lg:gap-4">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130] lg:flex-none">Cast</h2>
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

      {/* Trailer modal */}
      {showTrailer && activeTrailerKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={() => setShowTrailer(false)}
        >
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => setShowTrailer(false)}
            className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+16px)] flex size-8 items-center justify-center rounded-full bg-white/20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <CloseIcon />
          </button>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className="aspect-video w-full" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1`}
              className="size-full"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title={`Trailer: ${detail?.title ?? ""}`}
            />
          </div>
        </div>
      )}

      {/* Poster fullscreen modal */}
      {posterFullscreen && detail?.posterUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={() => setPosterFullscreen(false)}
        >
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => setPosterFullscreen(false)}
            className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+16px)] flex size-8 items-center justify-center rounded-full bg-white/20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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

      {/* Slide-in: kies hoe je bekeken wil markeren (alleen TV) */}
      <SlideInModal
        open={showBekendenModal}
        onClose={() => setShowBekendenModal(false)}
        title="Bekeken"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!detail) return;
                const firstSeason = detail.seasons[0]?.seasonNumber ?? 1;
                const epId = `ep-${tmdbId}-s${firstSeason}e1`;
                void markWatched(epId);
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
