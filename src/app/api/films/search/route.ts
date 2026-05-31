import { NextRequest, NextResponse } from "next/server";

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZjcwNTdlNmIyZDQ1YWNjMGM2MTA1ZDIzNGQ2ZmY3YSIsIm5iZiI6MTc3OTcxOTk3My4yNTUsInN1YiI6IjZhMTQ1ZjI1NzdlMDAzODI5NTVlOGExZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Cug3JDg_AK7xARootDKwEnQDHitdaEbQVbJTs5Y6iEI";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w185";
/** Stel OMDB_API_KEY in via .env.local voor echte IMDb-scores. */
const OMDB_KEY = process.env.OMDB_API_KEY ?? "";

const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  // 1. TMDB multi-search (films + series)
  const searchRes = await fetch(
    `${TMDB_BASE}/search/multi?query=${encodeURIComponent(q)}&language=nl-NL&include_adult=false`,
    { headers: tmdbHeaders, next: { revalidate: 120 } },
  );
  if (!searchRes.ok) return NextResponse.json({ results: [] }, { status: 502 });
  const searchData = (await searchRes.json()) as { results?: unknown[] };

  const items = ((searchData.results ?? []) as Record<string, unknown>[])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 5);

  // 2. Per resultaat: credits + external_ids ophalen (parallel)
  const results = await Promise.all(
    items.map(async (item) => {
      const type = item.media_type as "movie" | "tv";
      const id = item.id as number;

      let cast = "";
      let imdbId: string | null = null;

      try {
        const detailRes = await fetch(
          `${TMDB_BASE}/${type}/${id}?append_to_response=credits,external_ids&language=en-US`,
          { headers: tmdbHeaders, next: { revalidate: 300 } },
        );
        if (detailRes.ok) {
          const detail = (await detailRes.json()) as {
            credits?: { cast?: { name: string }[] };
            external_ids?: { imdb_id?: string };
          };
          cast = (detail.credits?.cast ?? [])
            .slice(0, 2)
            .map((c) => c.name)
            .join(", ");
          imdbId = detail.external_ids?.imdb_id ?? null;
        }
      } catch { /* negeer netfouten */ }

      const title = type === "movie" ? (item.title as string) : (item.name as string);
      const date =
        type === "movie"
          ? (item.release_date as string | undefined)
          : (item.first_air_date as string | undefined);
      const year = (date ?? "").slice(0, 4);

      // 3. IMDb-score via OMDB (als API-key beschikbaar)
      async function tryOmdb(url: string): Promise<number | null> {
        try {
          const res = await fetch(url, { next: { revalidate: 3600 } });
          if (!res.ok) return null;
          const json = (await res.json()) as { imdbRating?: string; Response?: string };
          if (json.Response === "False") return null;
          const rating = parseFloat(json.imdbRating ?? "");
          return isNaN(rating) ? null : rating;
        } catch { return null; }
      }

      let score: number | null = null;
      let scoreSource: "imdb" | "tmdb" = "tmdb";
      if (OMDB_KEY) {
        if (imdbId) {
          const r = await tryOmdb(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`);
          if (r !== null) { score = r; scoreSource = "imdb"; }
        }
        if (score === null) {
          const r = await tryOmdb(
            `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&type=${type === "movie" ? "movie" : "series"}&apikey=${OMDB_KEY}`,
          );
          if (r !== null) { score = r; scoreSource = "imdb"; }
        }
      }

      // Fallback: TMDB-stemgemiddelde
      if (score === null) {
        const avg = item.vote_average as number | undefined;
        if (avg && avg > 0) score = Math.round(avg * 10) / 10;
      }
      const typeLabel = type === "movie" ? "Film" : "TV Serie";
      const posterUrl = item.poster_path
        ? `${TMDB_IMG}${item.poster_path as string}`
        : null;

      return { id: `${type}-${id}`, tmdbId: id, type, title, year, typeLabel, posterUrl, score, scoreSource, cast };
    }),
  );

  return NextResponse.json({ results });
}
