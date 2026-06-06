export type TvSeasonInfo = {
  seasonNumber: number;
  episodeCount: number;
  name?: string;
};

export type WatchedProgress = {
  season: number;
  episode: number;
};

export type WatchingTvItem = {
  tmdbId: string;
  id: string;
  title: string;
  posterUrl: string | null;
  year: string;
  lastWatched: WatchedProgress;
  nextSeason: number;
  nextEpisode: number;
};

const EP_PATTERN = /^ep-(\d+)-s(\d+)e(\d+)$/;

export function parseEpisodeWatchedId(
  id: string,
): { tmdbId: string; season: number; episode: number } | null {
  const m = id.match(EP_PATTERN);
  if (!m) return null;
  return {
    tmdbId: m[1],
    season: Number.parseInt(m[2], 10),
    episode: Number.parseInt(m[3], 10),
  };
}

/** Hoogste gemarkeerde aflevering voor een serie (ep-ids). */
export function getHighestWatchedProgress(
  watchedIds: readonly string[],
  tmdbId: string,
): WatchedProgress | null {
  let best: WatchedProgress | null = null;
  for (const id of watchedIds) {
    const parsed = parseEpisodeWatchedId(id);
    if (!parsed || parsed.tmdbId !== tmdbId) continue;
    if (
      !best ||
      parsed.season > best.season ||
      (parsed.season === best.season && parsed.episode > best.episode)
    ) {
      best = { season: parsed.season, episode: parsed.episode };
    }
  }
  return best;
}

export function mapSeasonsFromDetail(
  seasons: readonly { seasonNumber: number; episodeCount: number; name?: string }[] | undefined,
): TvSeasonInfo[] {
  return normalizeTvSeasons(
    (seasons ?? []).map((s) => ({
      seasonNumber: s.seasonNumber,
      episodeCount: s.episodeCount,
      name: s.name,
    })),
  );
}

/** Seizoenen > 0, gesorteerd op nummer. */
export function normalizeTvSeasons(
  seasons: readonly TvSeasonInfo[] | undefined,
): TvSeasonInfo[] {
  return [...(seasons ?? [])]
    .filter((s) => s.seasonNumber > 0 && s.episodeCount > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

/** Combineert lokale en API-seizoensdata; API wint bij meer seizoenen of hogere aantallen. */
export function mergeTvSeasons(
  ...sources: (readonly TvSeasonInfo[] | undefined)[]
): TvSeasonInfo[] {
  const byNumber = new Map<number, TvSeasonInfo>();
  for (const source of sources) {
    for (const season of source ?? []) {
      if (season.seasonNumber <= 0) continue;
      const existing = byNumber.get(season.seasonNumber);
      if (!existing || season.episodeCount > existing.episodeCount) {
        byNumber.set(season.seasonNumber, season);
      }
    }
  }
  return normalizeTvSeasons(Array.from(byNumber.values()));
}

/**
 * Volgende aflevering om te kijken na `lastWatched` (laatst gemarkeerde ep-id).
 * `null` = serie volledig bekeken.
 */
export function getNextEpisodeToWatch(
  lastWatched: WatchedProgress,
  seasons: readonly TvSeasonInfo[] | undefined,
): { season: number; episode: number } | null {
  const normalized = normalizeTvSeasons(seasons);
  if (normalized.length === 0) {
    return {
      season: lastWatched.season,
      episode: lastWatched.episode + 1,
    };
  }

  const current = normalized.find((s) => s.seasonNumber === lastWatched.season);
  if (!current) {
    return {
      season: normalized[0].seasonNumber,
      episode: 1,
    };
  }

  if (lastWatched.episode < current.episodeCount) {
    return {
      season: lastWatched.season,
      episode: lastWatched.episode + 1,
    };
  }

  const idx = normalized.findIndex((s) => s.seasonNumber === lastWatched.season);
  if (idx >= 0 && idx < normalized.length - 1) {
    return {
      season: normalized[idx + 1].seasonNumber,
      episode: 1,
    };
  }

  return null;
}

export function isSeriesFullyWatched(
  lastWatched: WatchedProgress,
  seasons: readonly TvSeasonInfo[] | undefined,
): boolean {
  return getNextEpisodeToWatch(lastWatched, seasons) === null;
}

/** Ep-id na «volgende aflevering bekeken» (oog-icoon). */
export function getEpisodeIdAfterWatchingNext(
  lastWatched: WatchedProgress,
  seasons: readonly TvSeasonInfo[] | undefined,
): { season: number; episode: number } | null {
  const next = getNextEpisodeToWatch(lastWatched, seasons);
  if (!next) return null;
  return next;
}

export function buildWatchingTvItems(input: {
  watchedIds: readonly string[];
  watchlist: readonly { id: string; type: string; title: string; year: string; posterUrl: string | null }[];
  seriesMeta: Record<
    string,
    { title: string; posterUrl: string | null; year: string; seasons?: TvSeasonInfo[] }
  >;
  seasonsByTmdbId?: Record<string, TvSeasonInfo[] | undefined>;
}): WatchingTvItem[] {
  const tmdbIds = new Set<string>();
  for (const id of input.watchedIds) {
    const parsed = parseEpisodeWatchedId(id);
    if (parsed) tmdbIds.add(parsed.tmdbId);
  }

  const watchlistById = new Map(
    input.watchlist
      .filter((i) => i.type === "tv")
      .map((i) => [i.id.replace(/^tv-/, ""), i]),
  );

  const items: WatchingTvItem[] = [];

  for (const tmdbId of Array.from(tmdbIds)) {
    const lastWatched = getHighestWatchedProgress(input.watchedIds, tmdbId);
    if (!lastWatched) continue;

    const seasons = mergeTvSeasons(
      input.seasonsByTmdbId?.[tmdbId],
      input.seriesMeta[tmdbId]?.seasons,
    );

    if (isSeriesFullyWatched(lastWatched, seasons)) continue;

    const next = getNextEpisodeToWatch(lastWatched, seasons);
    if (!next) continue;

    const wlItem = watchlistById.get(tmdbId);
    const meta = input.seriesMeta[tmdbId];
    if (!wlItem && !meta) continue;

    items.push({
      tmdbId,
      id: `tv-${tmdbId}`,
      title: wlItem?.title ?? meta?.title ?? "",
      posterUrl: wlItem?.posterUrl ?? meta?.posterUrl ?? null,
      year: wlItem?.year ?? meta?.year ?? "",
      lastWatched,
      nextSeason: next.season,
      nextEpisode: next.episode,
    });
  }

  return items;
}
