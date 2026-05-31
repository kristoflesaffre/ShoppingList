/** Gedeelde TMDB-configuratie voor API-routes. */

export const TMDB_TOKEN =
  process.env.TMDB_ACCESS_TOKEN ??
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZjcwNTdlNmIyZDQ1YWNjMGM2MTA1ZDIzNGQ2ZmY3YSIsIm5iZiI6MTc3OTcxOTk3My4yNTUsInN1YiI6IjZhMTQ1ZjI1NzdlMDAzODI5NTVlOGExZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Cug3JDg_AK7xARootDKwEnQDHitdaEbQVbJTs5Y6iEI";

export const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG_POSTER = "https://image.tmdb.org/t/p/w185";

/** Bioscoop/streaming-regio (BE/NL). */
export const TMDB_REGION = process.env.TMDB_REGION ?? "BE";

export const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

export type TmdbMediaType = "movie" | "tv";

export type TmdbDiscoverItem = {
  id: string;
  tmdbId: number;
  type: TmdbMediaType;
  title: string;
  year: string;
  typeLabel: string;
  posterUrl: string | null;
  score: number | null;
  cast: string;
  popularity: number;
  genreIds: number[];
};

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function mapTmdbRow(
  row: Record<string, unknown>,
  type: TmdbMediaType,
): TmdbDiscoverItem | null {
  const posterPath = row.poster_path as string | null | undefined;
  if (!posterPath) return null;

  const title = type === "movie" ? (row.title as string) : (row.name as string);
  if (!title) return null;

  const date =
    type === "movie"
      ? (row.release_date as string | undefined)
      : (row.first_air_date as string | undefined);
  const year = (date ?? "").slice(0, 4);
  const avg = row.vote_average as number | undefined;
  const voteCount = row.vote_count as number | undefined;
  const score =
    avg && avg > 0 && voteCount && voteCount >= 50 ? Math.round(avg * 10) / 10 : null;
  const tmdbId = row.id as number;

  return {
    id: `${type}-${tmdbId}`,
    tmdbId,
    type,
    title,
    year,
    typeLabel: type === "movie" ? "Film" : "TV Serie",
    posterUrl: `${TMDB_IMG_POSTER}${posterPath}`,
    score,
    cast: "",
    popularity: (row.popularity as number) ?? 0,
    genreIds: (row.genre_ids as number[]) ?? [],
  };
}
