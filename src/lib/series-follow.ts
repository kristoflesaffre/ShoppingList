/**
 * «Series volgen»: lopende series tussen twee seizoenen overlopen en onthouden welke je kijkt.
 * Komt er een nieuw seizoen uit van een serie die je volgt, dan gaat ze vanzelf op de watchlist.
 *
 * Bewaard als gewone markeringen in `filmsWatchedMarks` (gedeeld met je partner, geen schemawijziging):
 * - `ep-{id}-s{n}e{m}`: de afleveringen die je zag (zoals elders in de app);
 * - `follow-tv-{id}`: je volgt de serie;
 * - `follow-no-tv-{id}`: je kijkt ze niet, niet meer vragen;
 * - `follow-added-tv-{id}-s{n}`: seizoen n al eens vanzelf op de watchlist gezet (niet opnieuw na verwijderen).
 */

export type OngoingSeason = {
  seasonNumber: number;
  episodeCount: number;
  airDate: string | null;
};

export type OngoingSeries = {
  tmdbId: string;
  title: string;
  year: string;
  posterUrl: string | null;
  overview: string;
  score: number | null;
  voteCount: number;
  genres: string[];
  /** Uitgezonden seizoenen (met afleveringen), oplopend. */
  seasons: OngoingSeason[];
  /** Laatste seizoen dat al (helemaal) uit is. */
  lastSeason: number;
  lastAirDate: string | null;
  /** Volgend seizoen zoals TMDB het kent; airDate null = aangekondigd zonder datum. */
  nextSeason: { seasonNumber: number; airDate: string | null } | null;
  /** Het laatste seizoen loopt nog: `seasons` telt daarvan enkel de uitgezonden afleveringen. */
  airing: boolean;
};

export const followMarkId = (tmdbId: string) => `follow-tv-${tmdbId}`;
export const skipMarkId = (tmdbId: string) => `follow-no-tv-${tmdbId}`;
export const autoAddedMarkId = (tmdbId: string, season: number) => `follow-added-tv-${tmdbId}-s${season}`;

type TmdbEpisodeRef = { season_number?: number; air_date?: string | null } | null | undefined;

/**
 * Een TMDB-serie (detail) als kandidaat, of null als ze nog niets uitzond. Zit ze midden in een
 * seizoen, dan telt dat seizoen enkel de afleveringen die al uit zijn (`airing`).
 */
export function ongoingFromTmdbDetail(
  data: Record<string, unknown>,
  imgBase: string,
): OngoingSeries | null {
  const last = data.last_episode_to_air as TmdbEpisodeRef;
  const next = data.next_episode_to_air as TmdbEpisodeRef;
  const lastSeason = last?.season_number ?? 0;
  if (lastSeason <= 0) return null;
  // Volgende aflevering in hetzelfde seizoen: het seizoen loopt nog.
  const airing = next?.season_number === lastSeason;
  const airedInLast = (last as { episode_number?: number } | undefined)?.episode_number ?? 0;

  const rawSeasons = (data.seasons as { season_number: number; episode_count: number; air_date?: string | null }[] | undefined) ?? [];
  const seasons: OngoingSeason[] = rawSeasons
    .filter((s) => s.season_number > 0 && s.season_number <= lastSeason && s.episode_count > 0)
    .map((s) => ({
      seasonNumber: s.season_number,
      episodeCount: airing && s.season_number === lastSeason && airedInLast > 0 ? Math.min(s.episode_count, airedInLast) : s.episode_count,
      airDate: s.air_date || null,
    }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  if (seasons.length === 0) return null;

  const upcoming = rawSeasons
    .filter((s) => s.season_number > lastSeason)
    .sort((a, b) => a.season_number - b.season_number)[0];
  const nextAir = airing ? upcoming?.air_date || null : next?.air_date || upcoming?.air_date || null;
  const nextNumber = airing ? upcoming?.season_number ?? null : next?.season_number ?? upcoming?.season_number ?? null;

  const title = data.name as string | undefined;
  if (!title) return null;
  const avg = data.vote_average as number | undefined;
  const posterPath = data.poster_path as string | null | undefined;
  return {
    tmdbId: String(data.id),
    title,
    year: ((data.first_air_date as string | undefined) ?? "").slice(0, 4),
    posterUrl: posterPath ? `${imgBase}${posterPath}` : null,
    overview: (data.overview as string | undefined) ?? "",
    score: avg && avg > 0 ? Math.round(avg * 10) / 10 : null,
    voteCount: (data.vote_count as number | undefined) ?? 0,
    genres: ((data.genres as { name: string }[] | undefined) ?? []).map((g) => g.name),
    seasons,
    lastSeason,
    lastAirDate: (last as { air_date?: string | null } | undefined)?.air_date ?? null,
    nextSeason: nextNumber ? { seasonNumber: nextNumber, airDate: nextAir } : null,
    airing,
  };
}

/** Alle afleveringen t.e.m. seizoen `through`, als ep-ids. */
export function episodeIdsThrough(tmdbId: string, seasons: readonly OngoingSeason[], through: number): string[] {
  const ids: string[] = [];
  for (const s of seasons) {
    if (s.seasonNumber > through) continue;
    for (let e = 1; e <= s.episodeCount; e++) ids.push(`ep-${tmdbId}-s${s.seasonNumber}e${e}`);
  }
  return ids;
}

/**
 * Alle afleveringen die al uitgezonden zijn, t.e.m. de laatste (`lastAired` uit TMDB
 * `last_episode_to_air`), als ep-ids. Zonder `lastAired` (nog niets uit): leeg.
 */
export function airedEpisodeIds(
  tmdbId: string,
  seasons: readonly { seasonNumber: number; episodeCount: number }[],
  lastAired: { season: number; episode: number } | null,
): string[] {
  if (!lastAired || lastAired.season <= 0) return [];
  const ids: string[] = [];
  for (const s of seasons) {
    if (s.seasonNumber <= 0 || s.seasonNumber > lastAired.season) continue;
    const count = s.seasonNumber === lastAired.season ? Math.min(s.episodeCount, lastAired.episode) : s.episodeCount;
    for (let e = 1; e <= count; e++) ids.push(`ep-${tmdbId}-s${s.seasonNumber}e${e}`);
  }
  return ids;
}

/** Al eens beantwoord (of al bezig/op de watchlist): niet meer vragen in de wizard. */
export function isSeriesReviewed(
  tmdbId: string,
  watched: ReadonlySet<string>,
  watchlistIds: ReadonlySet<string>,
): boolean {
  if (watched.has(followMarkId(tmdbId)) || watched.has(skipMarkId(tmdbId))) return true;
  if (watchlistIds.has(`tv-${tmdbId}`)) return true;
  const prefix = `ep-${tmdbId}-s`;
  for (const id of Array.from(watched)) if (id.startsWith(prefix)) return true;
  return false;
}

/** Hoeveel series je volgt. */
export function followedCount(watched: readonly string[]): number {
  return watched.filter((id) => /^follow-tv-\d+$/.test(id)).length;
}

/**
 * Nieuwe seizoenen die vanzelf op de watchlist moeten: uit, van een serie die je volgt, en
 * nog niet eerder automatisch toegevoegd.
 */
export function seasonsToAutoAdd<T extends { tmdbId: string; season: number; released: boolean }>(
  items: readonly T[],
  watched: ReadonlySet<string>,
): T[] {
  return items.filter(
    (i) => i.released && watched.has(followMarkId(i.tmdbId)) && !watched.has(autoAddedMarkId(i.tmdbId, i.season)),
  );
}

/** TMDB-statussen van een serie die nog seizoenen kan krijgen. */
export function isReturningStatus(status: string | null | undefined): boolean {
  return status === "Returning Series" || status === "In Production" || status === "Planned";
}

/**
 * Automatisch volgen: een lopende serie die je helemaal zag (alles wat uit is), tenzij je ze al volgt
 * of ooit liet vallen (`follow-no-tv-…`).
 */
export function shouldAutoFollow(
  tmdbId: string,
  status: string | null | undefined,
  fullyWatched: boolean,
  watched: ReadonlySet<string>,
): boolean {
  if (!fullyWatched || !isReturningStatus(status)) return false;
  return !watched.has(followMarkId(tmdbId)) && !watched.has(skipMarkId(tmdbId));
}

type DetailSeason = { seasonNumber: number; episodeCount: number; airDate?: string | null };

/**
 * Stand van een gevolgde serie uit de seizoenen van de detailpagina: laatste uitgezonden seizoen,
 * het volgende (met datum als die bekend is) en of het laatste nu nog loopt.
 */
export function seasonStatusFromDetail(
  seasons: readonly DetailSeason[],
  today = new Date().toISOString().slice(0, 10),
): Pick<OngoingSeries, "lastSeason" | "nextSeason" | "airing"> {
  const sorted = seasons.filter((s) => s.seasonNumber > 0).slice().sort((a, b) => a.seasonNumber - b.seasonNumber);
  const aired = sorted.filter((s) => s.airDate && s.airDate <= today && s.episodeCount > 0);
  const lastSeason = aired[aired.length - 1]?.seasonNumber ?? 0;
  const next = sorted.find((s) => s.seasonNumber > lastSeason) ?? null;
  return {
    lastSeason,
    nextSeason: next ? { seasonNumber: next.seasonNumber, airDate: next.airDate || null } : null,
    airing: false,
  };
}
