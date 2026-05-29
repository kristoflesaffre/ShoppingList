"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";

type Season = {
  seasonNumber: number;
  name: string;
};

type Episode = {
  episodeNumber: number;
  name: string;
  airDate: string | null;
  runtime: string;
  rating: number | null;
  overview: string;
  stillUrl: string | null;
};

type SeriesInfo = {
  title: string;
  seasons: Season[];
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
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="size-4 shrink-0">
      <path
        d="M8 1.5l1.545 3.13 3.455.503-2.5 2.437.59 3.44L8 9.387l-3.09 1.623.59-3.44L3 5.133l3.455-.503L8 1.5z"
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

function EpisodeSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-4 rounded-[8px] border border-[#dcddfc] bg-[#f6f6fe] p-2">
      <div className="h-[131px] w-[87px] shrink-0 rounded bg-[var(--gray-100)]" />
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div className="h-5 w-3/4 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-12 rounded bg-[var(--gray-100)]" />
        <div className="h-3 w-full rounded bg-[var(--gray-100)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--gray-100)]" />
      </div>
    </div>
  );
}

export default function EpisodesPage() {
  const { markWatched, unmarkWatched, saveSeriesMeta, watchedSet } = useFilmsLibrary();
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;

  const [seriesInfo, setSeriesInfo] = React.useState<SeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [episodes, setEpisodes] = React.useState<Episode[]>([]);
  const [year, setYear] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [pendingEp, setPendingEp] = React.useState<{ id: string; number: number } | null>(null);

  // Parse tmdbId uit rawId (bijv. "tv-1234" → "1234")
  const tmdbId = React.useMemo(() => {
    const dashIdx = rawId?.indexOf("-") ?? -1;
    return dashIdx >= 0 ? rawId.slice(dashIdx + 1) : "";
  }, [rawId]);

  const watchedEpisodes = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of episodes) {
      const id = `ep-${tmdbId}-s${selectedSeason}e${e.episodeNumber}`;
      if (watchedSet.has(id)) set.add(id);
    }
    return set;
  }, [episodes, tmdbId, selectedSeason, watchedSet]);

  // Laad seriedetails voor de seizoentabs en titel
  React.useEffect(() => {
    if (!tmdbId) return;
    fetch(`/api/films/detail?type=tv&id=${tmdbId}`)
      .then((r) => r.json())
      .then((data: { title: string; seasons: Season[]; posterUrl: string | null; year: string }) => {
        setSeriesInfo({ title: data.title, seasons: data.seasons ?? [] });
        if (data.seasons?.length > 0) {
          setSelectedSeason(data.seasons[0].seasonNumber);
        }
        void saveSeriesMeta(tmdbId, { title: data.title, posterUrl: data.posterUrl, year: data.year });
      })
      .catch(() => {});
  }, [tmdbId]);

  // Laad afleveringen wanneer seizoen verandert
  React.useEffect(() => {
    if (!tmdbId) return;
    setLoading(true);
    setEpisodes([]);
    fetch(`/api/films/episodes?id=${tmdbId}&season=${selectedSeason}`)
      .then((r) => r.json())
      .then((data: { episodes: Episode[]; year: string }) => {
        const eps = data.episodes ?? [];
        setEpisodes(eps);
        setYear(data.year ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tmdbId, selectedSeason]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px]"
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
        {/* Seizoentabs */}
        {seriesInfo && seriesInfo.seasons.length > 0 && (
          <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-6 border-b border-[#e2e4e6]" style={{ width: "max-content" }}>
              {seriesInfo.seasons.map((s) => {
                const active = s.seasonNumber === selectedSeason;
                return (
                  <button
                    key={s.seasonNumber}
                    type="button"
                    onClick={() => setSelectedSeason(s.seasonNumber)}
                    className={cn(
                      "flex shrink-0 flex-col gap-2 pb-0 focus-visible:outline-none",
                      active ? "font-medium text-[#16181a]" : "font-normal text-[#8c929d]",
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

        {/* Jaar-header */}
        {year && (
          <p className="text-sm font-semibold leading-4 text-[#4f55f1]">{year}</p>
        )}

        {/* Afleveringenlijst */}
        <div className="flex flex-col gap-3">
          {loading
            ? [1, 2, 3, 4].map((i) => <EpisodeSkeleton key={i} />)
            : episodes.map((ep) => {
                const meta = [formatDate(ep.airDate), ep.runtime].filter(Boolean).join(", ");
                const epId = `ep-${tmdbId}-s${selectedSeason}e${ep.episodeNumber}`;
                const epWatched = watchedEpisodes.has(epId);
                return (
                  <button
                    key={ep.episodeNumber}
                    type="button"
                    onClick={() => router.push(`/films-series/${rawId}/episodes/s${selectedSeason}e${ep.episodeNumber}`)}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-[8px] border border-[#dcddfc] bg-[#f6f6fe] p-2 text-left transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                      epWatched && "opacity-80",
                    )}
                  >
                    {/* Still (portretcrop) */}
                    <div className="relative h-[131px] w-[87px] shrink-0 overflow-hidden rounded bg-[var(--gray-50)]">
                      {ep.stillUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ep.stillUrl}
                          alt=""
                          className="absolute inset-0 size-full object-cover object-center"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex min-w-px flex-1 flex-col gap-2">
                      {/* Titel-rij + bekeken icoon */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <ol
                            className="min-w-px flex-1 list-decimal text-base font-medium leading-6 text-[#16181a]"
                            start={ep.episodeNumber}
                          >
                            <li className="ms-6">{ep.name}</li>
                          </ol>
                          {/* Losse knop zodat klikken het icoon togglet zonder naar detail te navigeren */}
                          <span
                            role="button"
                            aria-label={epWatched ? "Markeer als niet bekeken" : "Markeer als bekeken"}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (epWatched) {
                                void unmarkWatched(epId);
                              } else {
                                const hasPreviousUnwatched = episodes
                                  .filter((e) => e.episodeNumber < ep.episodeNumber)
                                  .some((e) => !watchedEpisodes.has(`ep-${tmdbId}-s${selectedSeason}e${e.episodeNumber}`));
                                if (hasPreviousUnwatched) {
                                  setPendingEp({ id: epId, number: ep.episodeNumber });
                                } else {
                                  void markWatched(epId);
                                }
                              }
                            }}
                            className="shrink-0 focus-visible:outline-none"
                          >
                            <MaskIcon
                              src={epWatched ? "/icons/checkmark.svg" : "/icons/visible.svg"}
                              className={cn("size-6", epWatched ? "bg-[#34C759]" : "bg-[#4f55f1]")}
                            />
                          </span>
                        </div>
                        {meta && (
                          <p className="text-sm leading-5 text-[#8c929d]">{meta}</p>
                        )}
                      </div>
                      {/* Rating */}
                      {ep.rating !== null && (
                        <div className="flex items-center gap-1">
                          <StarIcon />
                          <span className="text-[12px] leading-4 text-[#16181a]">
                            {ep.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {/* Beschrijving */}
                      {ep.overview && (
                        <p className="line-clamp-3 text-xs leading-4 text-[#8c929d]">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      {/* Slide-in: markeer deze of alle voorgaande afleveringen als bekeken */}
      <SlideInModal
        open={pendingEp !== null}
        onClose={() => setPendingEp(null)}
        title="Bekeken"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!pendingEp) return;
                void markWatched(pendingEp.id);
                setPendingEp(null);
              }}
            >
              Deze aflevering
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!pendingEp) return;
                const toMark = episodes
                  .filter((e) => e.episodeNumber <= pendingEp.number)
                  .map((e) => `ep-${tmdbId}-s${selectedSeason}e${e.episodeNumber}`);
                toMark.forEach((id) => void markWatched(id));
                setPendingEp(null);
              }}
            >
              Deze en voorgaande afleveringen
            </Button>
          </>
        }
      >
        <></>
      </SlideInModal>
    </div>
  );
}
