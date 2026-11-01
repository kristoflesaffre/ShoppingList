import type { TvSeasonInfo } from "./tv-watching-progress";
import { fetchFilmDetail } from "./film-detail-client";
type Mapping = { imdbId: string | null; seasons: TvSeasonInfo[] };
const cache = new Map<string, { expires: number; promise: Promise<Mapping> }>();

/**
 * Also kept on this device (public TMDB metadata only, never Stremio history): after a reload the watching cards can
 * match Stremio's IMDb ids at once instead of waiting for every watchlist series to be looked up again.
 */
const STORE_KEY = "stremio-title-mapping:v1";
/** IMDb ids don't change; seasons do, so a stored mapping is refreshed in the background after this. */
export const STORED_MAPPING_FRESH_MS = 12 * 3_600_000;
type Stored = Record<string, { at: number; mapping: Mapping }>;

function readStore(): Stored {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Stored;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(tmdbId: string, mapping: Mapping) {
  try {
    const store = readStore();
    store[tmdbId] = { at: Date.now(), mapping };
    // Hoogstens 300 titels: de oudste eerst weg.
    const entries = Object.entries(store).sort((a, b) => b[1].at - a[1].at).slice(0, 300);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Opslag vol of geblokkeerd: enkel in het geheugen.
  }
}

/** Mappings saved on this device for these titles, with when they were looked up. */
export function storedStremioTitleMappings(tmdbIds: readonly string[]): Record<string, { at: number; mapping: Mapping }> {
  const store = readStore();
  const found: Stored = {};
  for (const id of tmdbIds) {
    const entry = store[id];
    if (entry && typeof entry.at === "number" && entry.mapping && Array.isArray(entry.mapping.seasons)) found[id] = entry;
  }
  return found;
}

/** Public metadata is shared across consumers; Stremio credentials/history never enter this cache. */
export async function stremioTitleMapping(tmdbId: string): Promise<Mapping> {
  if (!/^\d+$/.test(tmdbId)) throw new Error("invalid-title");
  const cached = cache.get(tmdbId);
  if (cached && cached.expires > Date.now()) return cached.promise;
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  const entry = { expires: Date.now() + 3_600_000, promise: (async () => {
    const data = await fetchFilmDetail<{ id?: string; imdbId?: unknown; seasons?: unknown }>("tv", tmdbId).catch(() => { throw new Error("metadata-unavailable"); });
    if (data.id !== `tv-${tmdbId}`) throw new Error("metadata-unavailable");
    const mapping = { imdbId: typeof data.imdbId === "string" && /^tt\d{7,10}$/.test(data.imdbId) ? data.imdbId : null, seasons: Array.isArray(data.seasons) ? data.seasons as TvSeasonInfo[] : [] };
    if (typeof window !== "undefined") writeStored(tmdbId, mapping);
    return mapping;
  })() };
  cache.set(tmdbId, entry);
  try { return await entry.promise; }
  catch (error) { if (cache.get(tmdbId) === entry) cache.delete(tmdbId); throw error; }
}
