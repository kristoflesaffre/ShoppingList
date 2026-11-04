import { NextRequest, NextResponse } from "next/server";
import { TMDB_BASE, tmdbHeaders } from "@/lib/tmdb";
import { tasteSeriesFromTmdb, type TasteSeries } from "@/lib/series-taste";

const MAX_IDS = 40;
const WEEK = 604800;

/** Kenmerken van series die je beoordeelde maar die niet in de catalogus staan (bv. score onder 7,5). */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, MAX_IDS);
  const found = await Promise.all(
    ids.map(async (id): Promise<TasteSeries | null> => {
      try {
        const res = await fetch(`${TMDB_BASE}/tv/${id}?language=nl-NL&append_to_response=keywords`, {
          headers: tmdbHeaders,
          next: { revalidate: WEEK },
        });
        return res.ok ? tasteSeriesFromTmdb((await res.json()) as Record<string, unknown>) : null;
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
