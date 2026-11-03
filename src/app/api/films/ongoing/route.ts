import { NextResponse } from "next/server";
import { TMDB_BASE, tmdbHeaders } from "@/lib/tmdb";
import { ongoingFromTmdbDetail, type OngoingSeries } from "@/lib/series-follow";

const POSTER = "https://image.tmdb.org/t/p/w342";
const MAX_PAGES = 20;
const DAY = 86400;
const EXCLUDED_GENRES = "10767,10763,10764,10766,10762";
const ANIMATION = 16;

type DiscoverResult = { id: number; genre_ids?: number[]; original_language?: string };
type DiscoverPage = { total_pages?: number; results?: DiscoverResult[] };

/** Alle pagina's van één discover-zoekopdracht (tot MAX_PAGES). */
async function discoverAll(query: string) {
  const get = (page: number): Promise<DiscoverPage> =>
    fetch(`${TMDB_BASE}/discover/tv?${query}&page=${page}`, { headers: tmdbHeaders, next: { revalidate: DAY } })
      .then((r) => (r.ok ? (r.json() as Promise<DiscoverPage>) : { results: [] }))
      .catch(() => ({ results: [] }));
  const first = await get(1);
  const pages = Math.min(first.total_pages ?? 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => get(i + 2)));
  return [first, ...rest].flatMap((p) => p.results ?? []);
}

/**
 * Goede lopende series (TMDB «Returning Series» of «In Production», alle talen, score ≥ 7 met ≥ 200 stemmen;
 * Nederlandstalige al vanaf 15 stemmen), zonder talkshows, nieuws, reality, soaps, kinderreeksen en anime.
 * Ook series die nu midden in een seizoen zitten (`airing`).
 */
export async function GET() {
  const common = `with_status=0|2&without_genres=${EXCLUDED_GENRES}&sort_by=popularity.desc&language=nl-NL`;
  const found = (
    await Promise.all([
      discoverAll(`${common}&vote_average.gte=7&vote_count.gte=200`),
      discoverAll(`${common}&vote_average.gte=6.8&vote_count.gte=15&with_original_language=nl`),
    ])
  ).flat();
  const isAnime = (r: DiscoverResult) =>
    Boolean(r.genre_ids?.includes(ANIMATION) && ["ja", "zh", "ko"].includes(r.original_language ?? ""));
  const ids = Array.from(new Set(found.filter((r) => !isAnime(r)).map((r) => r.id)));

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
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400" } },
  );
}
