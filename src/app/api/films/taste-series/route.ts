import { NextRequest, NextResponse } from "next/server";
import { TMDB_BASE, tmdbHeaders } from "@/lib/tmdb";
import { tasteSeriesFromTmdb, type TasteSeries } from "@/lib/series-taste";
import { tasteMovieFromTmdb } from "@/lib/taste-kinds";

const MAX_IDS = 40;
const WEEK = 604800;

/** Kenmerken van series of films (`type=movie`) die je beoordeelde maar die niet in de catalogus staan (bv. een lagere score). */
export async function GET(request: NextRequest) {
  const movie = request.nextUrl.searchParams.get("type") === "movie";
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, MAX_IDS);
  const found = await Promise.all(
    ids.map(async (id): Promise<TasteSeries | null> => {
      try {
        const url = movie ? `/movie/${id}?language=nl-NL&append_to_response=keywords,credits` : `/tv/${id}?language=nl-NL&append_to_response=keywords`;
        const res = await fetch(`${TMDB_BASE}${url}`, {
          headers: tmdbHeaders,
          next: { revalidate: WEEK },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as Record<string, unknown>;
        return movie ? tasteMovieFromTmdb(data) : tasteSeriesFromTmdb(data);
      } catch {
        return null;
      }
    }),
  );
  return NextResponse.json(
    { series: found.filter((s): s is TasteSeries => s !== null) },
    { headers: { "Cache-Control": `public, max-age=86400, s-maxage=${WEEK}` } },
  );
}
