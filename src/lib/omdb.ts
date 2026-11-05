/** Server-side OMDB helpers (gebruik OMDB_API_KEY in Vercel Environments). */

import { unstable_cache } from "next/cache";

const OMDB_KEY = process.env.OMDB_API_KEY?.trim() ?? "";

export function hasOmdbKey(): boolean {
  return OMDB_KEY.length > 0;
}

/** OMDb geeft 1000 vragen per dag: na «Request limit reached!» een uur niets meer vragen. */
const LIMIT_PAUSE_MS = 60 * 60 * 1000;
let limitedUntil = 0;

class OmdbUnavailable extends Error {}

async function fetchOmdbRatingUncached(url: string): Promise<number | null> {
  if (Date.now() < limitedUntil) throw new OmdbUnavailable("limit");
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new OmdbUnavailable("network");
  }
  const json = (await res.json().catch(() => null)) as
    | { imdbRating?: string; Response?: string; Error?: string }
    | null;
  if (json?.Error && /limit/i.test(json.Error)) {
    limitedUntil = Date.now() + LIMIT_PAUSE_MS;
    throw new OmdbUnavailable("limit");
  }
  // Andere fouten (sleutel, server) niet bewaren: volgende keer opnieuw proberen.
  if (!res.ok || !json) throw new OmdbUnavailable(`status ${res.status}`);
  if (json.Response === "False") return null;
  const raw = json.imdbRating?.trim();
  if (!raw || raw === "N/A") return null;
  const rating = parseFloat(raw);
  return Number.isFinite(rating) ? rating : null;
}

/**
 * Bewaard in de Next-datacache (3 dagen), zodat dezelfde titel niet bij elke paginaweergave
 * opnieuw een OMDb-vraag kost. Een fout (limiet, netwerk) gooit en wordt dus niet bewaard.
 */
const fetchOmdbRatingCached = unstable_cache(fetchOmdbRatingUncached, ["omdb-rating-v1"], {
  revalidate: 3 * 24 * 60 * 60,
});

export async function fetchOmdbRating(url: string): Promise<number | null> {
  if (!OMDB_KEY) return null;
  try {
    return await fetchOmdbRatingCached(url);
  } catch {
    return null;
  }
}

export async function resolveImdbScore(options: {
  imdbId: string | null;
  title: string;
  year: string;
  type: "movie" | "tv";
}): Promise<{ score: number | null; scoreSource: "imdb" | "tmdb" }> {
  const { imdbId, title, year, type } = options;
  let score: number | null = null;

  if (imdbId) {
    score = await fetchOmdbRating(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`,
    );
  }
  // Met een IMDb-id geeft zoeken op titel hetzelfde (meestal «N/A»): dat kost enkel een extra vraag.
  if (score === null && !imdbId) {
    score = await fetchOmdbRating(
      `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&type=${type === "movie" ? "movie" : "series"}&apikey=${OMDB_KEY}`,
    );
  }

  return { score, scoreSource: score !== null ? "imdb" : "tmdb" };
}
