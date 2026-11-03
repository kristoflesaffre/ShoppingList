import { NextResponse } from "next/server";
import { TMDB_BASE, tmdbHeaders } from "@/lib/tmdb";
import { ongoingFromTmdbDetail, type OngoingSeries } from "@/lib/series-follow";

const POSTER = "https://image.tmdb.org/t/p/w342";
const PAGES = 5;
const DAY = 86400;

/**
 * Populaire lopende series (TMDB «Returning Series», Engelstalig, score ≥ 7,5 met ≥ 400 stemmen,
 * geen talkshows, nieuws, reality, soaps of kinderreeksen) die nu tussen twee seizoenen zitten.
 */
export async function GET() {
  const query =
    "with_status=0&vote_average.gte=7.5&vote_count.gte=400&sort_by=popularity.desc" +
    "&without_genres=10767,10763,10764,10766,10762&with_original_language=en&language=nl-NL";
  const pages = await Promise.all(
    Array.from({ length: PAGES }, (_, i) =>
      fetch(`${TMDB_BASE}/discover/tv?${query}&page=${i + 1}`, { headers: tmdbHeaders, next: { revalidate: DAY } })
        .then((r) => (r.ok ? (r.json() as Promise<{ results?: { id: number }[] }>) : { results: [] }))
        .catch(() => ({ results: [] as { id: number }[] })),
    ),
  );
  const ids = Array.from(new Set(pages.flatMap((p) => (p.results ?? []).map((r) => r.id))));

  const results: (OngoingSeries | null)[] = new Array(ids.length).fill(null);
  let index = 0;
  const worker = async () => {
    while (index < ids.length) {
      const i = index++;
      try {
        const res = await fetch(`${TMDB_BASE}/tv/${ids[i]}?language=nl-NL`, { headers: tmdbHeaders, next: { revalidate: DAY } });
        if (res.ok) results[i] = ongoingFromTmdbDetail((await res.json()) as Record<string, unknown>, POSTER);
      } catch {
        /* Deze serie overslaan. */
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));

  return NextResponse.json(
    { series: results.filter((s): s is OngoingSeries => s !== null) },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
  );
}
