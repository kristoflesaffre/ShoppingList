import type { TvSeasonInfo } from "./tv-watching-progress";
type Mapping = { imdbId: string | null; seasons: TvSeasonInfo[] };
const cache = new Map<string, { expires: number; promise: Promise<Mapping> }>();

/** Public metadata is shared across consumers; Stremio credentials/history never enter this cache. */
export async function stremioTitleMapping(tmdbId: string): Promise<Mapping> {
  if (!/^\d+$/.test(tmdbId)) throw new Error("invalid-title");
  const cached = cache.get(tmdbId);
  if (cached && cached.expires > Date.now()) return cached.promise;
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  const entry = { expires: Date.now() + 3_600_000, promise: (async () => {
    const response = await fetch(`/api/films/detail?type=tv&id=${tmdbId}`, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error("metadata-unavailable");
    const data = await response.json();
    if (data.id !== `tv-${tmdbId}`) throw new Error("metadata-unavailable");
    return { imdbId: typeof data.imdbId === "string" && /^tt\d{7,10}$/.test(data.imdbId) ? data.imdbId : null, seasons: Array.isArray(data.seasons) ? data.seasons as TvSeasonInfo[] : [] };
  })() };
  cache.set(tmdbId, entry);
  try { return await entry.promise; }
  catch (error) { if (cache.get(tmdbId) === entry) cache.delete(tmdbId); throw error; }
}
