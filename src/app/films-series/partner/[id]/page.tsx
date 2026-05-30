"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";

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

function imdbUrl(title: string, imdbId: string | null): string {
  if (imdbId) return `https://www.imdb.com/title/${imdbId}/`;
  return `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`;
}

function youtubeTrailerSearchUrl(title: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
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

export default function PartnerFilmDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;

  const { partnerWatchlist, partnerName, reactToPartnerItem } = useFilmsLibrary();

  const currentIndex = partnerWatchlist.findIndex((i) => i.id === rawId);
  const totalCount = partnerWatchlist.length;
  const prevItem = currentIndex > 0 ? partnerWatchlist[currentIndex - 1] : null;
  const nextItem =
    currentIndex >= 0 && currentIndex < totalCount - 1
      ? partnerWatchlist[currentIndex + 1]
      : null;
  const hasReacted = currentIndex === -1 && totalCount > 0;

  const [detail, setDetail] = React.useState<FilmDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [showTrailer, setShowTrailer] = React.useState(false);

  React.useEffect(() => {
    if (!rawId) return;
    const dashIdx = rawId.indexOf("-");
    const type = rawId.slice(0, dashIdx);
    const tmdbId = rawId.slice(dashIdx + 1);
    if (!type || !tmdbId) return;
    setLoading(true);
    setOverviewExpanded(false);
    fetch(`/api/films/detail?type=${type}&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: FilmDetail) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rawId]);

  async function handleReact(reaction: "up" | "down" | "seen") {
    const next = nextItem;
    const prev = prevItem;
    await reactToPartnerItem(rawId, reaction);
    if (next) router.replace(`/films-series/partner/${next.id}`);
    else if (prev) router.replace(`/films-series/partner/${prev.id}`);
    else router.back();
  }

  const metaParts = [detail?.year, detail?.certification, detail?.runtime].filter(Boolean);
  const genrePart = detail?.genres?.join(" - ") ?? "";
  const metaLine = genrePart ? `${metaParts.join("  ")}  /  ${genrePart}` : metaParts.join("  ");

  const MAX_OVERVIEW_CHARS = 220;
  const overviewFull = detail?.overview ?? "";
  const needsTruncation = !overviewExpanded && overviewFull.length > MAX_OVERVIEW_CHARS;
  const overviewDisplay = needsTruncation
    ? overviewFull.slice(0, MAX_OVERVIEW_CHARS).trimEnd()
    : overviewFull;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient achtergrond */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      {/* Vaste header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <header className="flex h-16 items-center gap-4 px-4">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => router.back()}
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

      {/* Scrollbare inhoud */}
      <div
        className="relative z-10 flex flex-1 flex-col gap-6 px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {/* Navigatie "X van Y" */}
        {totalCount > 0 && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Vorig item"
              disabled={!prevItem}
              onClick={() => prevItem && router.push(`/films-series/partner/${prevItem.id}`)}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                !prevItem && "opacity-30",
              )}
            >
              <MaskIcon src="/icons/chevron.svg" className="size-6 rotate-90 bg-[#16181a]" />
            </button>
            <p className="flex-1 text-center text-base font-medium leading-6 text-[#16181a]">
              {currentIndex >= 0 ? `${currentIndex + 1} van ${totalCount}` : `van ${totalCount}`}
            </p>
            <button
              type="button"
              aria-label="Volgend item"
              disabled={!nextItem}
              onClick={() => nextItem && router.push(`/films-series/partner/${nextItem.id}`)}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                !nextItem && "opacity-30",
              )}
            >
              <MaskIcon src="/icons/chevron.svg" className="size-6 -rotate-90 bg-[#16181a]" />
            </button>
          </div>
        )}

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
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="size-6 shrink-0">
                        <path
                          d="M12 2l2.75 5.57 6.15.9-4.45 4.33 1.05 6.11L12 15.9l-5.5 2.89 1.05-6.11L3.1 8.47l6.15-.9L12 2z"
                          fill="#FBBF24"
                          stroke="#F59E0B"
                          strokeWidth="0.5"
                          strokeLinejoin="round"
                        />
                      </svg>
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
                  href={imdbUrl(detail.title, detail.imdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${detail.title} op IMDb`}
                  className="flex h-6 w-12 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logos/logos-imdb.svg" alt="" className="h-6 w-auto max-w-full object-contain" />
                </a>
                <a
                  href={youtubeTrailerSearchUrl(detail.title)}
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

            {/* Overview */}
            {overviewFull && (
              <p className="text-base font-medium leading-6 text-[#16181a]">
                {overviewDisplay}
                {needsTruncation && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setOverviewExpanded(true)}
                      className="text-[#4f55f1] underline decoration-solid underline-offset-2 focus-visible:outline-none"
                    >
                      toon meer
                    </button>
                  </>
                )}
              </p>
            )}

            {/* Actie-knoppen — verborgen als al gereageerd */}
            {!hasReacted && (
              <div className="flex gap-3">
                {/* Al gezien — omlijnd */}
                <button
                  type="button"
                  aria-label="Al gezien"
                  onClick={() => void handleReact("seen")}
                  className="flex h-12 flex-1 items-center justify-center rounded-[8px] border border-[#4f55f1] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <MaskIcon src="/icons/visible.svg" className="size-6 bg-[#4f55f1]" />
                </button>
                {/* Toevoegen aan watchlist — blauw gevuld */}
                <button
                  type="button"
                  aria-label="Toevoegen aan mijn watchlist"
                  onClick={() => void handleReact("up")}
                  className="flex h-12 flex-1 items-center justify-center rounded-[8px] bg-[#4f55f1] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <MaskIcon src="/icons/thumb_up.svg" className="size-6 bg-white" />
                </button>
                {/* Niet interessant — rood gevuld */}
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

            {/* Poster — full width, 2:3 verhouding */}
            <div
              className="relative w-full overflow-hidden rounded bg-[var(--gray-50)]"
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

            {/* Trailer thumbnail */}
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
                  onClick={() => setShowTrailer(true)}
                  className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/20 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M8 5v14l11-7L8 5z" fill="white" />
                  </svg>
                </button>
              )}
            </div>

            {/* Cast */}
            {detail.cast.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <h2 className="flex-1 text-[18px] font-bold leading-6 text-[#101130]">Cast</h2>
                  <button
                    type="button"
                    onClick={() => router.push(`/films-series/${rawId}/cast`)}
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
