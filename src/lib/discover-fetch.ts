import {
  TMDB_BASE,
  TMDB_REGION,
  formatDate,
  mapTmdbRow,
  tmdbHeaders,
  type TmdbDiscoverItem,
  type TmdbMediaType,
} from "@/lib/tmdb";
import { hasOmdbKey, resolveImdbScore } from "@/lib/omdb";

const OMDB_CONCURRENCY = 5;

const REVALIDATE_SEC = 3600;
const VOTE_COUNT_MIN = 200;
const VOTE_AVG_MIN = 6.5;
const MAX_GENRE_PER_BUCKET = 3;
const MAX_TMDB_PAGES = 8;

async function fetchResults(url: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, { headers: tmdbHeaders, next: { revalidate: REVALIDATE_SEC } });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: unknown[] };
  return (data.results ?? []) as Record<string, unknown>[];
}

function buildSourceUrls(page: number, dates: { pastStr: string; todayStr: string; futureStr: string }) {
  const { pastStr, todayStr, futureStr } = dates;
  const lang = "nl-NL";
  const region = TMDB_REGION;
  const quality = `vote_count.gte=${VOTE_COUNT_MIN}&vote_average.gte=${VOTE_AVG_MIN}&include_adult=false`;

  return [
    `${TMDB_BASE}/trending/movie/week?language=${lang}&page=${page}`,
    `${TMDB_BASE}/trending/tv/week?language=${lang}&page=${page}`,
    `${TMDB_BASE}/movie/upcoming?language=${lang}&region=${region}&page=${page}`,
    `${TMDB_BASE}/tv/on_the_air?language=${lang}&page=${page}`,
    `${TMDB_BASE}/discover/movie?language=${lang}&region=${region}&sort_by=popularity.desc&${quality}&primary_release_date.gte=${pastStr}&primary_release_date.lte=${futureStr}&page=${page}`,
    `${TMDB_BASE}/discover/tv?language=${lang}&sort_by=popularity.desc&${quality}&first_air_date.gte=${pastStr}&first_air_date.lte=${futureStr}&page=${page}`,
    ...(page === 1
      ? [
          `${TMDB_BASE}/discover/movie?language=${lang}&region=${region}&sort_by=primary_release_date.desc&${quality}&primary_release_date.gte=${todayStr}&primary_release_date.lte=${futureStr}&page=1`,
        ]
      : []),
  ];
}

export type FetchDiscoverOptions = {
  limit: number;
  excludeIds?: Set<string>;
  /** Genre-spreiding alleen op eerste pagina (initiële load). */
  diversifyGenres?: boolean;
};

export type DiscoverApiItem = Omit<TmdbDiscoverItem, "popularity" | "genreIds"> & {
  scoreSource: "imdb" | "tmdb";
};

export type FetchDiscoverResult = {
  results: DiscoverApiItem[];
  hasMore: boolean;
};

async function fetchTmdbImdbId(type: TmdbMediaType, tmdbId: number): Promise<string | null> {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/external_ids`, {
      headers: tmdbHeaders,
      next: { revalidate: REVALIDATE_SEC },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { imdb_id?: string | null };
    return data.imdb_id ?? null;
  } catch {
    return null;
  }
}

/** Vervangt TMDB-score door IMDb waar OMDB een rating heeft. */
export async function enrichDiscoverWithOmdb(items: DiscoverApiItem[]): Promise<DiscoverApiItem[]> {
  if (!hasOmdbKey() || items.length === 0) {
    return items.map((item) => ({ ...item, scoreSource: item.scoreSource ?? "tmdb" }));
  }

  const enriched: DiscoverApiItem[] = items.map((item) => ({ ...item, scoreSource: "tmdb" }));

  for (let i = 0; i < enriched.length; i += OMDB_CONCURRENCY) {
    const batch = enriched.slice(i, i + OMDB_CONCURRENCY);
    await Promise.all(
      batch.map(async (item, batchIndex) => {
        const idx = i + batchIndex;
        const imdbId = await fetchTmdbImdbId(item.type, item.tmdbId);
        const omdb = await resolveImdbScore({
          imdbId,
          title: item.title,
          year: item.year,
          type: item.type,
        });
        if (omdb.score !== null) {
          enriched[idx] = { ...item, score: omdb.score, scoreSource: "imdb" };
        }
      }),
    );
  }

  return enriched;
}

export async function fetchDiscoverItems(options: FetchDiscoverOptions): Promise<FetchDiscoverResult> {
  const { limit, excludeIds = new Set(), diversifyGenres = true } = options;

  const today = new Date();
  const past = new Date(today);
  past.setDate(past.getDate() - 120);
  const future = new Date(today);
  future.setDate(future.getDate() + 75);

  const dates = {
    pastStr: formatDate(past),
    todayStr: formatDate(today),
    futureStr: formatDate(future),
  };

  const map = new Map<string, TmdbDiscoverItem>();
  const genreCounts = new Map<number, number>();

  for (let page = 1; page <= MAX_TMDB_PAGES && map.size < limit; page++) {
    const urls = buildSourceUrls(page, dates);
    const batches = await Promise.all(urls.map(fetchResults));
    let pageAdded = 0;

    for (const rows of batches) {
      for (const row of rows) {
        if (map.size >= limit) break;

        const type: TmdbMediaType =
          typeof row.media_type === "string" && row.media_type === "tv"
            ? "tv"
            : row.name != null
              ? "tv"
              : "movie";

        const item = mapTmdbRow(row, type);
        if (!item) continue;
        if (excludeIds.has(item.id)) continue;
        if (map.has(item.id)) continue;

        if (diversifyGenres && page === 1) {
          const primaryGenre = item.genreIds[0];
          if (primaryGenre != null) {
            const count = genreCounts.get(primaryGenre) ?? 0;
            if (count >= MAX_GENRE_PER_BUCKET) continue;
            genreCounts.set(primaryGenre, count + 1);
          }
        }

        map.set(item.id, item);
        pageAdded++;
      }
    }

    if (page > 1 && pageAdded === 0) break;
  }

  const raw = Array.from(map.values())
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map(({ popularity: _p, genreIds: _g, ...rest }) => ({
      ...rest,
      scoreSource: "tmdb" as const,
    }));

  const results = await enrichDiscoverWithOmdb(raw);
  const hasMore = results.length >= limit;

  return { results, hasMore };
}
