export type StremioTarget = { imdbId: string; type: "movie" | "tv"; season?: number; episode?: number };

export function cinemaCommand(target: StremioTarget): string {
  stremioLink(target);
  return `watch:${target.type}:${target.imdbId}${target.season !== undefined ? `:${target.season}:${target.episode}` : ""}`;
}

export function cinemaTarget(command: string): StremioTarget | null {
  const match = /^watch:(movie|tv):(tt\d{7,10})(?::(\d{1,3}):(\d{1,4}))?$/.exec(command);
  if (!match) return null;
  const target: StremioTarget = { type: match[1] as "movie" | "tv", imdbId: match[2], ...(match[3] !== undefined ? { season: Number(match[3]), episode: Number(match[4]) } : {}) };
  try { stremioLink(target); return target; } catch { return null; }
}

export function stremioLink(target: StremioTarget): string {
  if (!/^tt\d{7,10}$/.test(target.imdbId) || !["movie", "tv"].includes(target.type)) throw new Error("invalid-title");
  const hasEpisode = target.season !== undefined || target.episode !== undefined;
  if (hasEpisode && (target.type !== "tv" || !Number.isInteger(target.season) || target.season! < 0 || target.season! > 999 || !Number.isInteger(target.episode) || target.episode! < 1 || target.episode! > 9999)) throw new Error("invalid-episode");
  const video = target.type === "movie" ? target.imdbId : hasEpisode ? `${target.imdbId}:${target.season}:${target.episode}` : "";
  // Open the chosen title without guessing a stream or promising autoplay.
  return `stremio:///detail/${target.type === "tv" ? "series" : "movie"}/${target.imdbId}/${video}?autoPlay=false`;
}
