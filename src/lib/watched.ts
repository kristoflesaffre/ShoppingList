const KEY = "watchlist_watched";

function getIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveIds(ids: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(ids));
}

export function isWatched(id: string): boolean {
  return getIds().includes(id);
}

export function markWatched(id: string): void {
  const ids = getIds();
  if (!ids.includes(id)) saveIds([...ids, id]);
}

export function unmarkWatched(id: string): void {
  saveIds(getIds().filter((i) => i !== id));
}

export function getWatchedIds(): string[] {
  return getIds();
}

const META_KEY = "watchlist_series_meta";

export type SeriesSeasonMeta = {
  seasonNumber: number;
  episodeCount: number;
  name?: string;
};

export type SeriesMeta = {
  title: string;
  posterUrl: string | null;
  year: string;
  seasons?: SeriesSeasonMeta[];
};

export function saveSeriesMeta(tmdbId: string, meta: SeriesMeta): void {
  if (typeof window === "undefined") return;
  try {
    const map = JSON.parse(localStorage.getItem(META_KEY) ?? "{}") as Record<string, SeriesMeta>;
    map[tmdbId] = meta;
    localStorage.setItem(META_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function getAllSeriesMeta(): Record<string, SeriesMeta> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "{}") as Record<string, SeriesMeta>;
  } catch { return {}; }
}
