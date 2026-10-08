"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { EpisodeRow, EpisodeRowSkeleton, ListCard, SeasonPills, SubpageHeader } from "@/components/films/film_detail_ui";

type Season = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
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
  totalEpisodes: number | null;
};

export default function EpisodesPage() {
  const { markWatched, unmarkWatched, saveSeriesMeta, watchedSet } = useFilmsLibrary();
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;

  const [seriesInfo, setSeriesInfo] = React.useState<SeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [episodes, setEpisodes] = React.useState<Episode[]>([]);
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
      .then((data: { title: string; seasons: Season[]; posterUrl: string | null; year: string; totalEpisodes: number | null }) => {
        setSeriesInfo({ title: data.title, seasons: data.seasons ?? [], totalEpisodes: data.totalEpisodes ?? null });
        // ?s=2 vanaf de detailpagina opent meteen dat seizoen.
        const wanted = Number(new URLSearchParams(window.location.search).get("s"));
        const match = data.seasons?.find((x) => x.seasonNumber === wanted);
        if (match) setSelectedSeason(match.seasonNumber);
        else if (data.seasons?.length > 0) setSelectedSeason(data.seasons[0].seasonNumber);
        void saveSeriesMeta(tmdbId, {
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
      .then((data: { episodes: Episode[] }) => {
        setEpisodes(data.episodes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tmdbId, selectedSeason]);

  function toggleEpisode(ep: Episode) {
    const epId = `ep-${tmdbId}-s${selectedSeason}e${ep.episodeNumber}`;
    if (watchedEpisodes.has(epId)) {
      void unmarkWatched(epId);
      return;
    }
    const hasPreviousUnwatched = episodes
      .filter((e) => e.episodeNumber < ep.episodeNumber)
      .some((e) => !watchedEpisodes.has(`ep-${tmdbId}-s${selectedSeason}e${e.episodeNumber}`));
    if (hasPreviousUnwatched) setPendingEp({ id: epId, number: ep.episodeNumber });
    else void markWatched(epId);
  }

  const seasonPills = (seriesInfo?.seasons ?? []).map((s) => {
    const prefix = `ep-${tmdbId}-s${s.seasonNumber}e`;
    let watched = 0;
    watchedSet.forEach((id) => {
      if (id.startsWith(prefix)) watched += 1;
    });
    return { seasonNumber: s.seasonNumber, label: s.name, total: s.episodeCount, watched };
  });

  const subtitle = seriesInfo
    ? [seriesInfo.title, seriesInfo.totalEpisodes ? `${seriesInfo.totalEpisodes} afleveringen` : null].filter(Boolean).join(" · ")
    : undefined;

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Canvas «21 · Afleveringen — voorstel C»: grote titel, seizoenpillen met ringetje, lijstkaart. */}
      <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-10">
        <SubpageHeader title="Afleveringen" subtitle={subtitle} onBack={() => router.back()} />

        {seriesInfo && seriesInfo.seasons.length > 0 ? (
          <SeasonPills seasons={seasonPills} selected={selectedSeason} onSelect={setSelectedSeason} className="mt-[18px]" />
        ) : (
          <div className="mt-[18px] h-[34px]" />
        )}

        <ListCard className="mt-4">
          {loading
            ? [1, 2, 3, 4].map((i) => <EpisodeRowSkeleton key={i} />)
            : episodes.map((ep) => (
                <EpisodeRow
                  key={ep.episodeNumber}
                  ep={ep}
                  watched={watchedEpisodes.has(`ep-${tmdbId}-s${selectedSeason}e${ep.episodeNumber}`)}
                  showOverview
                  onOpen={() => router.push(`/films-series/${rawId}/episodes/s${selectedSeason}e${ep.episodeNumber}`)}
                  onToggle={() => toggleEpisode(ep)}
                />
              ))}
        </ListCard>
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
