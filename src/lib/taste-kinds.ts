/**
 * Smaak werkt voor series én films: oordelen, voorstellen en muur zijn hetzelfde, enkel de catalogus, de
 * bewaarde sleutels en de woorden verschillen. Een film en een serie kunnen hetzelfde TMDB-nummer hebben,
 * dus hun oordelen staan onder aparte sleutels (`taste-tv-…`, `taste-movie-…`).
 */
import {
  TASTE_UNSEEN_ID,
  autoLikedSeriesIds,
  parseTasteMediaId,
  tasteMediaId,
  type TasteSeries,
} from "@/lib/series-taste";

export type TasteKind = {
  type: "tv" | "movie";
  catalogUrl: string;
  extrasUrl: string;
  mediaId: (tmdbId: number) => string;
  parseMediaId: (mediaId: string) => number | null;
  unseenId: string;
  /** Titels die vanzelf als «goed» meetellen. */
  autoLiked: (watchedIds: readonly string[]) => Set<number>;
  /** Pad onder `/films-series/` en sleutel op de watchlist. */
  libraryId: (tmdbId: number) => string;
  overviewPath: string;
  ratePath: string;
  title: string;
  words: {
    /** «serie» / «film» */
    one: string;
    /** «series» / «films» */
    many: string;
    /** «Series» / «Films» */
    Many: string;
    /** «de serie» / «de film» */
    theOne: string;
    /** Waarom een titel vanzelf meetelt. */
    autoReason: string;
  };
};

export const MOVIE_TASTE_UNSEEN_ID = "taste-movie-unseen";
export const movieTasteMediaId = (tmdbId: number) => `taste-movie-${tmdbId}`;

export function parseMovieTasteMediaId(mediaId: string): number | null {
  const m = /^taste-movie-(\d+)$/.exec(mediaId);
  return m ? Number(m[1]) : null;
}

/** Films die vanzelf meetellen: ze staan op gezien. */
export function autoLikedMovieIds(watchedIds: readonly string[]): Set<number> {
  const liked = new Set<number>();
  for (const id of watchedIds) {
    const m = /^movie-(\d+)$/.exec(id);
    if (m) liked.add(Number(m[1]));
  }
  return liked;
}

/** Een TMDB-film (detail met `append_to_response=keywords,credits`) in de vorm van de catalogus: regisseurs in `c`, hoofdrollen in `w`. */
export function tasteMovieFromTmdb(d: Record<string, unknown>): TasteSeries | null {
  const title = d.title as string | undefined;
  if (!title || typeof d.id !== "number") return null;
  const credits = d.credits as { crew?: { job?: string; name: string }[]; cast?: { name: string }[] } | undefined;
  const collection = (d.belongs_to_collection as { name?: string } | null | undefined)?.name;
  const keywords = ((d.keywords as { keywords?: { name: string }[] } | undefined)?.keywords ?? []).map((x) => x.name);
  return {
    id: d.id,
    n: title,
    y: Number(((d.release_date as string | undefined) ?? "").slice(0, 4)) || null,
    p: (d.poster_path as string | null | undefined) ?? null,
    r: Math.round(((d.vote_average as number | undefined) ?? 0) * 10) / 10,
    v: (d.vote_count as number | undefined) ?? 0,
    s: null,
    l: (d.original_language as string | undefined) ?? null,
    g: ((d.genres as { name: string }[] | undefined) ?? []).map((x) => x.name),
    c: (credits?.crew ?? []).filter((x) => x.job === "Director").map((x) => x.name).slice(0, 3),
    w: (credits?.cast ?? []).slice(0, 3).map((x) => x.name),
    k: (collection ? [`reeks: ${collection}`, ...keywords] : keywords).slice(0, 12),
  };
}

export const SERIES_TASTE: TasteKind = {
  type: "tv",
  catalogUrl: "/data/series-taste-catalog.json",
  extrasUrl: "/api/films/taste-series?type=tv",
  mediaId: tasteMediaId,
  parseMediaId: parseTasteMediaId,
  unseenId: TASTE_UNSEEN_ID,
  autoLiked: autoLikedSeriesIds,
  libraryId: (tmdbId) => `tv-${tmdbId}`,
  overviewPath: "/films-series/smaak",
  ratePath: "/films-series/smaak/beoordelen",
  title: "Jouw seriesmaak",
  words: { one: "serie", many: "series", Many: "Series", theOne: "de serie", autoReason: "omdat je ze volgt of zag" },
};

export const MOVIE_TASTE: TasteKind = {
  type: "movie",
  catalogUrl: "/data/movie-taste-catalog.json",
  extrasUrl: "/api/films/taste-series?type=movie",
  mediaId: movieTasteMediaId,
  parseMediaId: parseMovieTasteMediaId,
  unseenId: MOVIE_TASTE_UNSEEN_ID,
  autoLiked: autoLikedMovieIds,
  libraryId: (tmdbId) => `movie-${tmdbId}`,
  overviewPath: "/films-series/filmsmaak",
  ratePath: "/films-series/filmsmaak/beoordelen",
  title: "Jouw filmsmaak",
  words: { one: "film", many: "films", Many: "Films", theOne: "de film", autoReason: "omdat je ze op gezien zette" },
};
