"use client";

import * as React from "react";

type SeasonEpisode = { episodeNumber: number; name: string; runtimeMinutes?: number | null };

export type EpisodeInfo = {
  /** Afleveringstitel; leeg als TMDB enkel «Aflevering n» kent. */
  name: string;
  minutes: number | null;
  /** Laatste aflevering van het seizoen. */
  finale: boolean;
};

/** Eén verzoek per seizoen, gedeeld door alle kaarten op de pagina. */
const seasonCache = new Map<string, Promise<SeasonEpisode[]>>();

function fetchSeason(tmdbId: string, season: number): Promise<SeasonEpisode[]> {
  const key = `${tmdbId}-${season}`;
  let promise = seasonCache.get(key);
  if (!promise) {
    promise = fetch(`/api/films/episodes?id=${encodeURIComponent(tmdbId)}&season=${season}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ episodes?: SeasonEpisode[] }>) : { episodes: [] }))
      .then((d) => d.episodes ?? [])
      .catch(() => {
        seasonCache.delete(key);
        return [];
      });
    seasonCache.set(key, promise);
  }
  return promise;
}

/** Titel, duur en «finale» van een aflevering (TMDB, via /api/films/episodes). */
export function useEpisodeInfo(tmdbId: string, season: number, episode: number): EpisodeInfo | null {
  const [info, setInfo] = React.useState<EpisodeInfo | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    setInfo(null);
    void fetchSeason(tmdbId, season).then((episodes) => {
      if (cancelled) return;
      const ep = episodes.find((e) => e.episodeNumber === episode);
      if (!ep) return;
      const last = episodes.reduce((m, e) => Math.max(m, e.episodeNumber), 0);
      setInfo({
        name: /^(aflevering|episode)\s*\d+$/i.test(ep.name.trim()) ? "" : ep.name,
        minutes: ep.runtimeMinutes ?? null,
        finale: last > 1 && episode === last,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [tmdbId, season, episode]);
  return info;
}
