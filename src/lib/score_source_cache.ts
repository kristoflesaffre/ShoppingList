const KEY = "films_score_sources_v2";

export function getScoreSourceCache(): Record<string, "imdb" | "tmdb"> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, "imdb" | "tmdb">;
  } catch {
    return {};
  }
}

export function setScoreSource(id: string, source: "imdb" | "tmdb"): void {
  const cache = getScoreSourceCache();
  cache[id] = source;
  localStorage.setItem(KEY, JSON.stringify(cache));
}
