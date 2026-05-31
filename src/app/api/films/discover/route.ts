import { NextResponse } from "next/server";
import {
  TMDB_BASE,
  TMDB_REGION,
  formatDate,
  mapTmdbRow,
  tmdbHeaders,
  type TmdbDiscoverItem,
  type TmdbMediaType,
} from "@/lib/tmdb";

const REVALIDATE_SEC = 3600;
const VOTE_COUNT_MIN = 200;
const VOTE_AVG_MIN = 6.5;
const MAX_GENRE_PER_BUCKET = 3;
const MAX_RESULTS = 30;

async function fetchResults(url: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, { headers: tmdbHeaders, next: { revalidate: REVALIDATE_SEC } });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: unknown[] };
  return (data.results ?? []) as Record<string, unknown>[];
}

function addItems(
  map: Map<string, TmdbDiscoverItem>,
  rows: Record<string, unknown>[],
  type: TmdbMediaType,
  genreCounts: Map<number, number>,
) {
  for (const row of rows) {
    const item = mapTmdbRow(row, type);
    if (!item) continue;
    if (map.has(item.id)) continue;

    const primaryGenre = item.genreIds[0];
    if (primaryGenre != null) {
      const count = genreCounts.get(primaryGenre) ?? 0;
      if (count >= MAX_GENRE_PER_BUCKET) continue;
      genreCounts.set(primaryGenre, count + 1);
    }

    map.set(item.id, item);
    if (map.size >= MAX_RESULTS) break;
  }
}

export async function GET() {
  const today = new Date();
  const past = new Date(today);
  past.setDate(past.getDate() - 120);
  const future = new Date(today);
  future.setDate(future.getDate() + 75);

  const pastStr = formatDate(past);
  const todayStr = formatDate(today);
  const futureStr = formatDate(future);

  const lang = "nl-NL";
  const region = TMDB_REGION;
  const quality = `vote_count.gte=${VOTE_COUNT_MIN}&vote_average.gte=${VOTE_AVG_MIN}&include_adult=false`;

  const urls = [
    `${TMDB_BASE}/trending/movie/week?language=${lang}`,
    `${TMDB_BASE}/trending/tv/week?language=${lang}`,
    `${TMDB_BASE}/movie/upcoming?language=${lang}&region=${region}&page=1`,
    `${TMDB_BASE}/tv/on_the_air?language=${lang}&page=1`,
    `${TMDB_BASE}/discover/movie?language=${lang}&region=${region}&sort_by=popularity.desc&${quality}&primary_release_date.gte=${pastStr}&primary_release_date.lte=${futureStr}`,
    `${TMDB_BASE}/discover/tv?language=${lang}&sort_by=popularity.desc&${quality}&first_air_date.gte=${pastStr}&first_air_date.lte=${futureStr}`,
    `${TMDB_BASE}/discover/movie?language=${lang}&region=${region}&sort_by=primary_release_date.desc&${quality}&primary_release_date.gte=${todayStr}&primary_release_date.lte=${futureStr}`,
  ];

  const [
    trendingMovies,
    trendingTv,
    upcomingMovies,
    onAirTv,
    discoverMovies,
    discoverTv,
    newMovies,
  ] = await Promise.all(urls.map(fetchResults));

  const map = new Map<string, TmdbDiscoverItem>();
  const genreCounts = new Map<number, number>();

  addItems(map, trendingMovies, "movie", genreCounts);
  addItems(map, trendingTv, "tv", genreCounts);
  addItems(map, upcomingMovies, "movie", genreCounts);
  addItems(map, onAirTv, "tv", genreCounts);
  addItems(map, newMovies, "movie", genreCounts);
  addItems(map, discoverMovies, "movie", genreCounts);
  addItems(map, discoverTv, "tv", genreCounts);

  const results = Array.from(map.values())
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, MAX_RESULTS)
    .map(({ popularity: _p, genreIds: _g, ...rest }) => rest);

  return NextResponse.json({ results });
}
