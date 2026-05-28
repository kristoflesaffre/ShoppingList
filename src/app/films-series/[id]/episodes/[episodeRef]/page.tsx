"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { isWatched, markWatched, unmarkWatched } from "@/lib/watched";

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

type SeriesInfo = {
  title: string;
  certification: string;
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
      <div className="h-12 rounded-lg bg-[var(--gray-100)]" />
    </div>
  );
}

export default function EpisodeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;
  const episodeRef = params.episodeRef as string;

  const [episode, setEpisode] = React.useState<EpisodeDetail | null>(null);
  const [seriesInfo, setSeriesInfo] = React.useState<SeriesInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [watched, setWatched] = React.useState(false);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [overviewNeedsTruncation, setOverviewNeedsTruncation] = React.useState(false);
  const overviewRef = React.useRef<HTMLParagraphElement>(null);

  const tmdbId = React.useMemo(() => {
    const dashIdx = rawId?.indexOf("-") ?? -1;
    return dashIdx >= 0 ? rawId.slice(dashIdx + 1) : "";
  }, [rawId]);

  const { season, ep } = React.useMemo(() => {
    const match = episodeRef?.match(/^s(\d+)e(\d+)$/);
    if (!match) return { season: "", ep: "" };
    return { season: match[1], ep: match[2] };
  }, [episodeRef]);

  const watchedId = tmdbId && season && ep ? `ep-${tmdbId}-s${season}e${ep}` : "";

  React.useEffect(() => {
    if (!tmdbId || !season || !ep) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/films/episode?id=${tmdbId}&season=${season}&episode=${ep}`).then((r) => r.json()),
      fetch(`/api/films/detail?type=tv&id=${tmdbId}`).then((r) => r.json()),
    ])
      .then(([epData, seriesData]: [EpisodeDetail, { title: string; certification: string }]) => {
        setEpisode(epData);
        setSeriesInfo({ title: seriesData.title, certification: seriesData.certification });
        if (watchedId) setWatched(isWatched(watchedId));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tmdbId, season, ep]);

  React.useEffect(() => {
    if (!overviewRef.current) return;
    setOverviewNeedsTruncation(overviewRef.current.scrollHeight > 191 + 24);
  }, [episode?.overview]);

  const metaParts = React.useMemo(() => {
    if (!episode) return "";
    const parts: string[] = [];
    parts.push(`Seizoen ${episode.seasonNumber} aflevering ${episode.episodeNumber}`);
    const dateStr = formatDate(episode.airDate);
    if (dateStr) parts.push(dateStr);
    if (seriesInfo?.certification) parts.push(seriesInfo.certification);
    if (episode.runtime) parts.push(episode.runtime);
    return parts.join("  ");
  }, [episode, seriesInfo]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

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

      {/* Scrollbare inhoud */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {loading ? (
          <DetailSkeleton />
        ) : !episode ? (
          <p className="py-8 text-center text-sm text-[var(--gray-400)]">Kan afleveringsdetails niet laden.</p>
        ) : (
          <>
            {/* Titel + rating */}
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

            {/* Still als hero banner */}
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

            {/* Still (portrait) + beschrijving */}
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

              {/* Beschrijving */}
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

            {/* Aflevering bekeken knop */}
            <button
              type="button"
              onClick={() => {
                if (!watchedId) return;
                if (watched) {
                  unmarkWatched(watchedId);
                  setWatched(false);
                } else {
                  markWatched(watchedId);
                  setWatched(true);
                }
              }}
              className={cn(
                "flex h-12 w-full items-center gap-3 rounded-[8px] p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                watched
                  ? "border border-[#595f6a] bg-transparent"
                  : "border border-[#4f55f1] bg-transparent",
              )}
            >
              <p className={cn(
                "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-base font-medium",
                watched ? "text-[#595f6a]" : "text-[#4f55f1]",
              )}>
                {watched ? "Bekeken" : "Aflevering bekeken"}
              </p>
              <MaskIcon
                src={watched ? "/icons/checkmark.svg" : "/icons/visible.svg"}
                className={cn("size-6 shrink-0", watched ? "bg-[#595f6a]" : "bg-[#4f55f1]")}
              />
            </button>

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
  );
}
