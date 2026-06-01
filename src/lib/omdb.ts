/** Server-side OMDB helpers (gebruik OMDB_API_KEY in Vercel Environments). */

const OMDB_KEY = process.env.OMDB_API_KEY?.trim() ?? "";

export function hasOmdbKey(): boolean {
  return OMDB_KEY.length > 0;
}

export async function fetchOmdbRating(url: string): Promise<number | null> {
  if (!OMDB_KEY) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { imdbRating?: string; Response?: string; Error?: string };
    if (json.Response === "False") return null;
    const raw = json.imdbRating?.trim();
    if (!raw || raw === "N/A") return null;
    const rating = parseFloat(raw);
    return Number.isFinite(rating) ? rating : null;
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
  if (score === null) {
    score = await fetchOmdbRating(
      `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&type=${type === "movie" ? "movie" : "series"}&apikey=${OMDB_KEY}`,
    );
  }

  return { score, scoreSource: score !== null ? "imdb" : "tmdb" };
}
