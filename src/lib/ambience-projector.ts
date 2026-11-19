/**
 * «Ook rond de tv» (canvas «Ambience · Ook op de projector» A): de projector speelt dezelfde YouTube-video op de muur
 * rond de tv, zonder geluid en gelijk met de tv; over de tv zelf ligt een zwart vlak. Pure helpers, zonder netwerk,
 * zodat ze getest kunnen worden: instellingen controleren, de berichten van YouTube's Lounge lezen en beslissen
 * wanneer de projector moet bijspringen.
 */

export type Point = [number, number];

/** Hoeken van de tv op het beeld van de projector, in fracties (0–1) van breedte en hoogte. */
export type TvCorners = { tl: Point; tr: Point; br: Point; bl: Point };

export type ProjectorMask = {
  corners: TvCorners;
  /** Extra zwart rond de tv, 0–10 (stappen van 0,5 % van de beeldbreedte). */
  margin: number;
  /** Zachte rand: 0 geen · 1 licht · 2 middel · 3 sterk. */
  soft: number;
  /** Het beeld rond de tv licht vervagen en iets vergroten. */
  blur: boolean;
};

export type ProjectorSettings = ProjectorMask & { enabled: boolean };

export const DEFAULT_MASK: ProjectorMask = {
  corners: { tl: [0.3, 0.27], tr: [0.7, 0.27], br: [0.7, 0.73], bl: [0.3, 0.73] },
  margin: 2,
  soft: 1,
  blur: true,
};

export const CORNER_KEYS = ["tl", "tr", "br", "bl"] as const;
export type CornerKey = (typeof CORNER_KEYS)[number];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const isFraction = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

/** Een masker uit onbetrouwbare invoer (verzoek of bestand), of null. */
export function parseMask(value: unknown): ProjectorMask | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const raw = data.corners as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return null;
  const corners = {} as TvCorners;
  for (const key of CORNER_KEYS) {
    const p = raw[key];
    if (!Array.isArray(p) || p.length !== 2 || !isFraction(p[0]) || !isFraction(p[1])) return null;
    corners[key] = [p[0], p[1]];
  }
  if (typeof data.margin !== "number" || !Number.isFinite(data.margin)) return null;
  if (typeof data.soft !== "number" || !Number.isFinite(data.soft)) return null;
  if (typeof data.blur !== "boolean") return null;
  return { corners, margin: clamp(Math.round(data.margin * 2) / 2, 0, 10), soft: clamp(Math.round(data.soft), 0, 3), blur: data.blur };
}

/**
 * De hoeken van de tv, naar buiten geschoven met de marge (vanuit het midden), in pixels voor een beeld van
 * `width` × `height`. Volgorde linksboven → rechtsboven → rechtsonder → linksonder (voor een SVG-polygoon).
 */
export function maskPolygon(mask: ProjectorMask, width: number, height: number): Point[] {
  const pts = CORNER_KEYS.map((k) => [mask.corners[k][0] * width, mask.corners[k][1] * height] as Point);
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4;
  const cy = pts.reduce((s, p) => s + p[1], 0) / 4;
  const grow = mask.margin * 0.005 * width;
  return pts.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * grow * Math.SQRT2, y + (dy / len) * grow * Math.SQRT2];
  });
}

/** Breedte van de zachte rand in pixels. */
export const softEdgePx = (soft: number, width: number) => [0, 0.004, 0.009, 0.016][clamp(Math.round(soft), 0, 3)] * width;

// ---------------------------------------------------------------------------
// YouTube Lounge: wat speelt de tv?
// ---------------------------------------------------------------------------

/** YouTube-toestand: 1 speelt, 2 pauze, 3 laden, 0 gedaan, -1 niet gestart, 1081 reclame. */
export type TvPlayState = "playing" | "paused" | "buffering" | "ended" | "idle" | "ad";

export type TvNowPlaying = {
  videoId: string | null;
  /** Positie in seconden op tijdstip `at` (ms sinds epoch). */
  time: number;
  at: number;
  state: TvPlayState;
  duration: number | null;
};

export function loungeState(raw: unknown): TvPlayState {
  switch (String(raw)) {
    case "1": return "playing";
    case "2": return "paused";
    case "3": return "buffering";
    case "0": return "ended";
    case "1081": return "ad";
    default: return "idle";
  }
}

export type LoungeEvent = { id: number; name: string; data: Record<string, unknown> };

/**
 * Leest de berichten uit een stuk Lounge-antwoord («<lengte>\n[[id,["naam",{…}]],…]\n», mogelijk meerdere na
 * elkaar). Geeft de berichten en wat er nog onvolledig overblijft.
 */
export function parseLoungeChunks(buffer: string): { events: LoungeEvent[]; rest: string } {
  const events: LoungeEvent[] = [];
  let rest = buffer;
  for (;;) {
    const head = /^\s*(\d+)\n/.exec(rest);
    if (!head) break;
    const start = head[0].length;
    const length = Number(head[1]);
    // De lengte telt tekens; bij een ongewone telling zoeken we het einde van de JSON zelf.
    let body = rest.slice(start, start + length);
    let end = start + length;
    if (rest.length < end) break;
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      const next = rest.indexOf("]]\n", start);
      if (next < 0) break;
      body = rest.slice(start, next + 2);
      end = next + 3;
      try {
        parsed = JSON.parse(body);
      } catch {
        rest = rest.slice(end);
        continue;
      }
    }
    rest = rest.slice(end);
    if (!Array.isArray(parsed)) continue;
    for (const entry of parsed) {
      if (!Array.isArray(entry) || typeof entry[0] !== "number" || !Array.isArray(entry[1])) continue;
      const [name, data] = entry[1] as [unknown, unknown];
      if (typeof name !== "string") continue;
      events.push({ id: entry[0], name, data: data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {} });
    }
  }
  return { events, rest };
}

/** Werkt de toestand bij met één Lounge-bericht; geeft de oude terug als het bericht er niets mee te maken heeft. */
export function applyLoungeEvent(current: TvNowPlaying, event: LoungeEvent, now: number): TvNowPlaying {
  const d = event.data;
  const num = (v: unknown) => (typeof v === "string" || typeof v === "number") && Number.isFinite(Number(v)) ? Number(v) : null;
  if (event.name === "nowPlaying" || event.name === "onStateChange") {
    const time = num(d.currentTime);
    const videoId = typeof d.videoId === "string" && d.videoId ? d.videoId : event.name === "nowPlaying" && !d.videoId ? null : current.videoId;
    return {
      videoId,
      time: time ?? current.time,
      at: now,
      state: d.state === undefined ? current.state : loungeState(d.state),
      duration: num(d.duration) ?? current.duration,
    };
  }
  if (event.name === "onAdStateChange") {
    const playing = String(d.adState) === "1";
    return playing ? { ...current, state: "ad", at: now } : current.state === "ad" ? { ...current, state: "playing", at: now } : current;
  }
  return current;
}

/** Positie van de tv nu, doorgerekend zolang hij speelt. */
export function tvPositionAt(np: TvNowPlaying, now: number): number {
  return np.state === "playing" ? np.time + Math.max(0, now - np.at) / 1000 : np.time;
}

export type SyncAction =
  | { kind: "load"; videoId: string; at: number }
  | { kind: "seek"; at: number }
  | { kind: "play" }
  | { kind: "pause" }
  | { kind: "none" };

/** Kleinere afwijking laten we lopen: bij rustige beelden valt een sprong meer op dan een fractie van een seconde. */
export const DRIFT_LIMIT = 0.4;
/** Een sprong duurt even (bufferen): zet de projector iets vooruit. De pagina leert de juiste voorsprong bij (`nextLead`). */
export const SEEK_LEAD = 0.35;

/** Na een sprong: liep de projector `drift` s vóór (positief) of achter, dan volgende keer zoveel minder voorsprong. */
export function nextLead(lead: number, drift: number): number {
  return Math.min(2, Math.max(0, lead - drift));
}

/**
 * Wat de projector moet doen om gelijk te lopen met de tv. `player` = wat de projector nu speelt.
 * Enkel een sprong als het verschil groter is dan `DRIFT_LIMIT`.
 */
export function syncAction(
  tv: { videoId: string | null; position: number; state: TvPlayState },
  player: { videoId: string | null; position: number; playing: boolean },
  lead = SEEK_LEAD,
): SyncAction {
  if (!tv.videoId) return player.playing ? { kind: "pause" } : { kind: "none" };
  if (player.videoId !== tv.videoId) return { kind: "load", videoId: tv.videoId, at: tv.position + (tv.state === "playing" ? lead + 1 : 0) };
  const shouldPlay = tv.state === "playing";
  if (!shouldPlay) {
    if (player.playing) return { kind: "pause" };
    return Math.abs(player.position - tv.position) > DRIFT_LIMIT && tv.state === "paused" ? { kind: "seek", at: tv.position } : { kind: "none" };
  }
  if (Math.abs(player.position - tv.position) > DRIFT_LIMIT) return { kind: "seek", at: tv.position + lead };
  return player.playing ? { kind: "none" } : { kind: "play" };
}

/** Sleutel in de url van de projectorpagina: alleen URL-veilige tekens, 32–64 lang. */
export const isProjectorKey = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(value);
