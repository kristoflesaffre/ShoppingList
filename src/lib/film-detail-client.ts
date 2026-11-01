import { sharedRead } from "./shared-read";

/**
 * Publieke film-/seriedetails (TMDB) in de browser: één verzoek per titel, een uur gedeeld door alle onderdelen
 * (aan het kijken, avondkaart, Stremio-koppeling). Geen persoonlijke gegevens in deze cache.
 */
export function fetchFilmDetail<T = Record<string, unknown>>(type: "movie" | "tv", tmdbId: string): Promise<T> {
  return sharedRead(`film-detail|${type}|${tmdbId}`, async () => {
    const response = await fetch(`/api/films/detail?type=${type}&id=${tmdbId}`, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(String(response.status));
    const data = (await response.json()) as T & { id?: unknown };
    // Een antwoord voor een andere titel nooit een uur bewaren.
    if (data.id !== `${type}-${tmdbId}`) throw new Error("metadata-mismatch");
    return data;
  }, 3_600_000);
}
