import { displayPosition, type Playback } from "./cinema-companion";
import type { StremioProgress } from "./stremio-progress";

/** X-Ray: snelle vragen (serie: net · afl · seizoen · eerder; film: net · afl · wie · open) + een vrije vraag. */
export const XRAY_KINDS = ["net", "afl", "seizoen", "eerder", "wie", "open", "vraag"] as const;
export type XrayKind = (typeof XRAY_KINDS)[number];

export type XrayIdentity = {
  imdbId: string; type: "movie" | "series"; season: number | null; episode: number | null;
  /** Stremio video-id: `tt…` (film) of `tt…:seizoen:aflevering` (serie). */
  videoId: string; title: string; source: "projector" | "stremio";
};

export type XrayMessage = {
  id: string; videoId: string; kind: XrayKind; question: string; answer: string;
  refs: { label: string; timeMs: number | null }[];
  /** Kijkmoment waarop de vraag gesteld is; ook de grens van wat de AI mocht zien. */
  askedAtMs: number; contextEndMs: number; createdAt: number; costUsd: number; model: string;
};

/**
 * Model (prijzen Google AI Studio, betaald niveau, nov. 2026): Gemini 3.1 Flash-Lite, $0,25 / $1,50 per miljoen tokens.
 * Gemini 2.5 Flash is niet meer beschikbaar voor nieuwe sleutels. Getest op samenvatten en op een «waarom»-vraag
 * uit dialoog: 3.1 Flash-Lite gaf het beste onderbouwde antwoord (1 s); 3.5 Flash-Lite en 3.8 Flash waren te letterlijk
 * en 3.8 Flash rekent bovendien altijd 200–500 «denk»-tokens aan (3–6 s). Daarom één model, zonder extra denken.
 * Te wijzigen met GEMINI_XRAY_MODEL (snelle vragen, samenvattingen) en GEMINI_XRAY_CHAT_MODEL (eigen vragen).
 */
export const XRAY_MODEL_DEFAULT = "gemini-3.1-flash-lite";
export const XRAY_CHAT_MODEL_DEFAULT = "gemini-3.1-flash-lite";

/** USD per miljoen tokens. Onbekend model = het duurste bekende tarief, zodat de schatting nooit te laag is. */
const PRICES: Record<string, { input: number; output: number }> = {
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
  // 3.8 Flash: $0,75 / $3,75 tot 31/12/2026, daarna $1,50 / $7,50.
  "gemini-3.8-flash": Date.now() < Date.UTC(2027, 0, 1) ? { input: 0.75, output: 3.75 } : { input: 1.5, output: 7.5 },
};
export function xrayCostUsd(model: string, inTokens: number, outTokens: number) {
  const price = PRICES[model] ?? { input: 1.5, output: 7.5 };
  return Math.round(((inTokens * price.input + outTokens * price.output) / 1e6) * 1e6) / 1e6;
}

/** Marge achter de huidige positie: een licht verschoven ondertitel kan zo nooit iets verklappen. */
export const XRAY_SAFETY_MS = 20_000;
export function xrayCutoff(p: Playback, now = Date.now()) {
  return Math.max(0, Math.floor((displayPosition(p, now) - p.uncertaintyMs - XRAY_SAFETY_MS) / 5000) * 5000);
}

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Welke titel speelt er? De projector kent enkel titel en duur; Stremio weet welke titel/aflevering je het laatst
 * opende. Een kandidaat moet de laatste 12 uur bekeken zijn én op titel of duur (± 3 %) passen.
 */
export function matchIdentity(p: Playback, items: StremioProgress[], now = Date.now()): XrayIdentity | null {
  if (p.imdbId) {
    const series = p.mediaType === "series" && p.season !== null && p.episode !== null;
    return { imdbId: p.imdbId, type: series ? "series" : "movie", season: series ? p.season : null, episode: series ? p.episode : null,
      videoId: series ? `${p.imdbId}:${p.season}:${p.episode}` : p.imdbId, title: p.title, source: "projector" };
  }
  const title = norm(p.title);
  const recent = items.filter(i => now - i.lastWatchedAt <= 12 * 3600_000).sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
  const titleMatch = (i: StremioProgress) => { const n = norm(i.title); return n.length > 1 && title.length > 1 && (n === title || title.includes(n) || n.includes(title)); };
  const durationMatch = (i: StremioProgress) => p.durationMs > 0 && i.durationMs > 0 && Math.abs(i.durationMs - p.durationMs) <= Math.max(60_000, p.durationMs * 0.03);
  const pick = recent.find(titleMatch) ?? recent.find(durationMatch);
  if (!pick) return null;
  const series = pick.type === "tv" && !!pick.season && !!pick.episode;
  return { imdbId: pick.imdbId, type: series ? "series" : "movie", season: series ? pick.season! : null, episode: series ? pick.episode! : null,
    videoId: series ? `${pick.imdbId}:${pick.season}:${pick.episode}` : pick.imdbId, title: pick.title, source: "stremio" };
}
