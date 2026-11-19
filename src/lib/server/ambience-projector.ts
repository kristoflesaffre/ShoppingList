import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyLoungeEvent,
  DEFAULT_MASK,
  isProjectorKey,
  parseLoungeChunks,
  parseMask,
  tvPositionAt,
  type ProjectorMask,
  type ProjectorSettings,
  type TvNowPlaying,
} from "@/lib/ambience-projector";
import { parseLoungeBind } from "@/lib/samsung-tv-protocol";
import { loungeToken, readTvConfig } from "./samsung-tv";

/**
 * «Ook rond de tv», op de Mac (net als de rest van «Sfeer op tv»): instellingen in `.cache/samsung-tv/projector.json`
 * (aan/uit, waar de tv zit, sleutel van de projectorpagina) en één blijvende Lounge-verbinding met YouTube op de tv,
 * zodat de projector weet welke video op welke tijd speelt. De verbinding loopt enkel zolang de projectorpagina
 * vraagt (± 1× per seconde) en sluit 30 s nadat niemand meer vraagt.
 */

const FILE = path.join(process.cwd(), ".cache/samsung-tv/projector.json");

type Stored = ProjectorSettings & { key: string };

/** Gedeeld over alle routes van de server (Next laadt modules per route apart). */
type Shared = {
  cached: Stored | null;
  calibratingUntil: number;
  calibrationMask: ProjectorMask | null;
  projectorReport: { at: number; status: string; videoId: string | null } | null;
  nowPlaying: TvNowPlaying;
  lastAsked: number;
  running: Promise<void> | null;
  connected: boolean;
};
const IDLE: TvNowPlaying = { videoId: null, time: 0, at: 0, state: "idle", duration: null };
const g = globalThis as unknown as { __ambienceProjector?: Shared };
const S: Shared = (g.__ambienceProjector ??= { cached: null, calibratingUntil: 0, calibrationMask: null, projectorReport: null, nowPlaying: IDLE, lastAsked: 0, running: null, connected: false });

export async function readProjectorSettings(): Promise<Stored> {
  if (S.cached) return S.cached;
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    /* nog niet ingesteld */
  }
  const mask = parseMask(raw) ?? DEFAULT_MASK;
  const key = isProjectorKey(raw.key) ? raw.key : randomBytes(32).toString("base64url");
  S.cached = { ...mask, enabled: raw.enabled === true, key };
  if (raw.key !== key) await persist(S.cached);
  return S.cached;
}

async function persist(value: Stored) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(value, null, 2), { mode: 0o600 });
}

export async function saveProjectorSettings(change: Partial<ProjectorSettings>): Promise<Stored> {
  const current = await readProjectorSettings();
  const mask = parseMask({ ...current, ...change }) ?? current;
  S.cached = { ...current, ...mask, enabled: typeof change.enabled === "boolean" ? change.enabled : current.enabled };
  await persist(S.cached);
  return S.cached;
}

export function projectorKeyMatches(stored: string, given: unknown): boolean {
  if (!isProjectorKey(given)) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Instellen van het masker: zolang dit loopt toont de projector een raster en een wit kader. */
export function setCalibration(on: boolean, mask?: ProjectorMask | null) {
  S.calibratingUntil = on ? Date.now() + 10 * 60_000 : 0;
  S.calibrationMask = on ? mask ?? S.calibrationMask : null;
}
export const calibration = () => (Date.now() < S.calibratingUntil ? { mask: S.calibrationMask } : null);

/** Wat de projectorpagina meldt (video mag niet buiten YouTube, …), voor het blad op de tablet. */
export function reportFromProjector(status: string, videoId: string | null) {
  S.projectorReport = { at: Date.now(), status, videoId };
}
export const lastProjectorReport = () => (S.projectorReport && Date.now() - S.projectorReport.at < 15_000 ? S.projectorReport : null);

// ---------------------------------------------------------------------------
// Lounge: één verbinding als «afstandsbediening», enkel om mee te lezen
// ---------------------------------------------------------------------------

const BASE = "https://www.youtube.com/api/lounge/bc/bind";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function follow() {
  let failures = 0;
  while (Date.now() - S.lastAsked < 30_000) {
    try {
      const config = await readTvConfig();
      if (!config) throw new Error("not-configured");
      const token = await loungeToken(config.host);
      const common = { device: "REMOTE_CONTROL", id: randomUUID(), name: "ShoppingList", app: "youtube-desktop", "mdx-version": "3", loungeIdToken: token, VER: "8", v: "2", CVER: "1", theme: "cl", capabilities: "", ui: "", t: "1" };
      const form = { "Content-Type": "application/x-www-form-urlencoded" };
      let rid = 10_000 + Math.floor(Math.random() * 80_000);
      const bind = await fetch(`${BASE}?${new URLSearchParams({ ...common, RID: String(rid++), zx: randomBytes(6).toString("hex") })}`, { method: "POST", headers: form, body: "count=0", signal: AbortSignal.timeout(10_000) });
      const text = await bind.text();
      const session = parseLoungeBind(text);
      if (!bind.ok || !session) throw new Error("bind-failed");
      let aid = 0;
      const take = (chunk: string) => {
        const { events, rest } = parseLoungeChunks(chunk);
        for (const event of events) {
          aid = Math.max(aid, event.id);
          S.nowPlaying = applyLoungeEvent(S.nowPlaying, event, Date.now());
        }
        return rest;
      };
      take(text);
      S.connected = true;
      failures = 0;
      let lastRefresh = Date.now();
      // Lange vraag: YouTube houdt ze open en stuurt elke wijziging (pauze, sprong, andere video) meteen.
      while (Date.now() - S.lastAsked < 30_000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25_000);
        try {
          const poll = await fetch(`${BASE}?${new URLSearchParams({ ...common, SID: session.sid, gsessionid: session.gsessionid, RID: "rpc", AID: String(aid), CI: "0", TYPE: "xmlhttp", zx: randomBytes(6).toString("hex") })}`, { signal: controller.signal });
          if (poll.status === 400 || poll.status === 404 || poll.status === 410) throw new Error("session-gone");
          if (!poll.ok || !poll.body) throw new Error("poll-failed");
          const reader = poll.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer = take(buffer + decoder.decode(value, { stream: true }));
            // Elke 15 s de positie opnieuw vragen: zo blijft de doorgerekende tijd juist.
            if (Date.now() - lastRefresh > 15_000) {
              lastRefresh = Date.now();
              const body = new URLSearchParams({ count: "1", ofs: "0", req0__sc: "getNowPlaying" });
              void fetch(`${BASE}?${new URLSearchParams({ ...common, SID: session.sid, gsessionid: session.gsessionid, RID: String(rid++), AID: String(aid), zx: randomBytes(6).toString("hex") })}`, { method: "POST", headers: form, body }).catch(() => undefined);
            }
            if (Date.now() - S.lastAsked >= 30_000) {
              controller.abort();
              break;
            }
          }
        } catch (error) {
          if (!(error instanceof Error && error.name === "AbortError")) throw error;
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {
      S.connected = false;
      failures += 1;
      // Tv uit of YouTube dicht: niets speelt.
      if (failures >= 2) S.nowPlaying = IDLE;
      await sleep(Math.min(10_000, 1500 * failures));
    }
  }
  S.connected = false;
  S.nowPlaying = IDLE;
}

/** Wat de tv nu speelt; start of verlengt het meelezen. */
export function tvNowPlaying(): { videoId: string | null; position: number; state: TvNowPlaying["state"]; duration: number | null; connected: boolean } {
  S.lastAsked = Date.now();
  if (!S.running) S.running = follow().finally(() => { S.running = null; });
  const np = S.nowPlaying;
  return { videoId: np.videoId, position: tvPositionAt(np, Date.now()), state: np.state, duration: np.duration, connected: S.connected };
}
