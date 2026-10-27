export type StremioProgress = {
  imdbId: string; type: "tv" | "movie"; title: string;
  season?: number; episode?: number;
  positionMs: number; durationMs: number; percent: number | null; lastWatchedAt: number;
};
const object = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const millis = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 604_800_000 ? Math.floor(v) : 0;

/** Imported playback state is not proof of completion and never becomes a manual watched mark. */
export function parseStremioProgress(value: unknown): StremioProgress[] {
  if (!Array.isArray(value) || value.length > 20_000) throw new Error("invalid-library");
  const items = new Map<string, StremioProgress>();
  for (const raw of value) {
    const row = object(raw), state = object(row?.state);
    if (!row || !state || typeof row._id !== "string" || !/^tt\d{7,10}$/.test(row._id) || (row.removed === true && row.temp !== true)) continue;
    if (row.type !== "series" && row.type !== "movie") continue;
    const lastWatchedAt = typeof state.lastWatched === "string" ? Date.parse(state.lastWatched) : NaN;
    if (!Number.isFinite(lastWatchedAt) || lastWatchedAt <= 0 || lastWatchedAt > Date.now() + 300_000) continue;
    const episode = typeof state.video_id === "string" ? /^(tt\d{7,10}):(\d{1,3}):(\d{1,4})$/.exec(state.video_id) : null;
    if (row.type === "series" && (!episode || episode[1] !== row._id || Number(episode[3]) < 1)) continue;
    const durationMs = millis(state.duration), positionMs = millis(state.timeOffset);
    const item: StremioProgress = {
      imdbId: row._id, type: row.type === "series" ? "tv" : "movie",
      title: typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 300) : row._id,
      ...(episode && row.type === "series" ? { season: Number(episode[2]), episode: Number(episode[3]) } : {}),
      positionMs, durationMs, percent: durationMs ? Math.min(100, Math.round(positionMs / durationMs * 100)) : null, lastWatchedAt,
    };
    if (!items.has(item.imdbId) || items.get(item.imdbId)!.lastWatchedAt < lastWatchedAt) items.set(item.imdbId, item);
  }
  return Array.from(items.values()).sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
}

export function stremioTimeLabel(item: StremioProgress) {
  return `${Math.floor(item.positionMs / 60_000)}${item.durationMs ? ` / ${Math.floor(item.durationMs / 60_000)}` : ""} min`;
}
export function stremioProgressLabel(item: StremioProgress) {
  const episode = item.type === "tv" ? `S${item.season} A${item.episode}` : "Film";
  return `${episode} · ${stremioTimeLabel(item)}`;
}
