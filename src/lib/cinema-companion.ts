/** Shared, pure boundaries. Device estimates are for display, never AI authorization. */
export type Playback = {
  streamEvidence?: boolean; sessionId: string; sequence: number; mediaKey: string; streamFingerprint: string;
  imdbId: string | null; mediaType: "movie" | "series"; season: number | null; episode: number | null;
  title: string; positionMs: number; durationMs: number; speed: number;
  state: "playing" | "paused" | "buffering" | "stopped" | "unknown";
  observedAt: number; uncertaintyMs: number; deviceUpdateElapsedMs: number | null;
};
export type Cue = { id: string; startMs: number; endMs: number; text: string; speaker: string | null };
export type SpoilerMode = "strict" | "previously-watched" | "unrestricted";
export const STALE_MS = 12_000;
export function parsePlayback(value: unknown): Playback | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Playback;
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(p.sessionId) || !Number.isSafeInteger(p.sequence) || p.sequence < 0 ||
      !["movie", "series"].includes(p.mediaType) || !["playing", "paused", "buffering", "stopped", "unknown"].includes(p.state) ||
      typeof p.title !== "string" || p.title.length > 300 || typeof p.mediaKey !== "string" || p.mediaKey.length > 200 ||
      !/^[a-f0-9]{16,64}$/.test(p.streamFingerprint) ||
      (p.imdbId !== null && !/^tt\d{5,12}$/.test(p.imdbId)) ||
      [p.positionMs, p.durationMs, p.observedAt, p.uncertaintyMs, p.speed].some(n => typeof n !== "number" || !Number.isFinite(n) || n < 0) ||
      (p.durationMs > 0 && p.positionMs > p.durationMs) || p.positionMs > 86_400_000 || p.durationMs > 86_400_000 || p.speed > 4 || p.uncertaintyMs > 60_000 ||
      (p.deviceUpdateElapsedMs !== null && (!Number.isFinite(p.deviceUpdateElapsedMs) || p.deviceUpdateElapsedMs < 0)) ||
      [p.season, p.episode].some(n => n !== null && (!Number.isSafeInteger(n) || n < 0 || n > 10000))) return null;
  return p;
}
export function freshPlayback(p: Playback | null, now = Date.now()) {
  return !!p && p.observedAt <= now + 2000 && now - p.observedAt <= STALE_MS && ["playing", "paused", "buffering"].includes(p.state);
}
export function displayPosition(p: Playback, now = Date.now()) {
  return Math.min(p.durationMs || 86_400_000, p.positionMs + (p.state === "playing" && freshPlayback(p, now) ? Math.max(0, now - p.observedAt) * p.speed : 0));
}
export function contextEnd(p: Playback, validation: { sessionId: string; fingerprint: string; expiresAt: number } | null, now = Date.now()) {
  if (!freshPlayback(p, now) || p.streamEvidence !== true || !p.imdbId || !validation || validation.sessionId !== p.sessionId ||
      validation.fingerprint !== p.streamFingerprint || validation.expiresAt <= now) return null;
  return Math.max(0, Math.floor(p.positionMs - p.uncertaintyMs));
}
function timestamp(value: string): number {
  const match = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value);
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) throw new Error("invalid-subtitle-time");
  return ((Number(match[1] || 0) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000 + Number(match[4]);
}
export function parseSubtitles(source: string): Cue[] {
  if (new TextEncoder().encode(source).length > 1_000_000 || source.includes("\0")) throw new Error("subtitle-too-large");
  const blocks = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n"), at = lines.findIndex(l => l.includes("-->"));
    if (at < 0) continue;
    const timing = /^(\S+)\s+-->\s+(\S+)/.exec(lines[at]);
    if (!timing) throw new Error("invalid-subtitle-time");
    const startMs = timestamp(timing[1]), endMs = timestamp(timing[2]);
    if (endMs <= startMs || endMs > 86_400_000) throw new Error("invalid-subtitle-time");
    const raw = lines.slice(at + 1).join(" ");
    const voice = /<v\s+([^>]{1,80})>/.exec(raw)?.[1] ?? /^([A-ZÀ-Ÿ][A-ZÀ-Ÿ '\-]{1,50}):\s/.exec(raw)?.[1] ?? null;
    const text = raw.replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    if (text.length > 4000) throw new Error("subtitle-line-too-long");
    if (text) cues.push({ id: `cue-${cues.length}`, startMs, endMs, text, speaker: voice });
    if (cues.length > 12000) throw new Error("too-many-cues");
  }
  if (!cues.length) throw new Error("no-subtitles");
  return cues.sort((a, b) => a.startMs - b.startMs);
}
export function allowedCues(cues: Cue[], endMs: number, offsetMs: number, windowMs = Infinity) {
  return cues.filter(c => c.endMs + offsetMs <= endMs && c.endMs + offsetMs >= endMs - windowMs);
}
export function clockTime(ms: number) { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
