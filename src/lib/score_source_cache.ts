const KEY = "films_score_sources_v3";

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

/** Titels die TMDB niet (meer) kent: niet bij elke paginalading opnieuw opvragen. */
const MISSING_KEY = "films_missing_titles_v1";

export function getMissingTitles(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(MISSING_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markTitleMissing(id: string): void {
  const missing = getMissingTitles();
  missing.add(id);
  try {
    localStorage.setItem(MISSING_KEY, JSON.stringify(Array.from(missing)));
  } catch {
    /* opslag niet beschikbaar */
  }
}
