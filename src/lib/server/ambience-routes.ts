import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { formatYoutubeDuration, isYoutubeVideoId } from "@/lib/samsung-tv-protocol";
import { verifiedUserId } from "./google-connection-store";
import { screenLanHost } from "./projector-temporary";
import { readTvConfig, startAmbience, tvPlayback, tvPower } from "./samsung-tv";
import { parseMask, type ProjectorMask } from "@/lib/ambience-projector";
import {
  calibration,
  lastProjectorReport,
  projectorKeyMatches,
  readProjectorSettings,
  reportFromProjector,
  saveProjectorSettings,
  setCalibration,
  tvNowPlaying,
} from "./ambience-projector";
import { bridgeOnline, enqueueProjector, ownerBridge } from "./projector-relay";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const loopback = ["localhost", "127.0.0.1", "[::1]"];

/** Same boundary as the projection screen: on the Mac (or the one opted-in LAN origin), same origin, signed in. */
async function localOwner(request: NextRequest): Promise<{ ownerId: string } | NextResponse> {
  const lan = screenLanHost(request);
  if (process.env.NETLIFY || process.env.VERCEL || (!lan && !loopback.includes(request.nextUrl.hostname))) return reply({ error: "mac-required" }, 503);
  const origin = googleRequestOrigin(request);
  if (!lan && !loopback.includes(new URL(origin).hostname)) return reply({ error: "mac-required" }, 503);
  if (request.headers.get("origin") !== origin) return reply({ error: "invalid-origin" }, 403);
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return reply({ error: "not-signed-in" }, 401);
  return { ownerId };
}

/** Wat de tablet mag vragen. «projector»/«calibrate»/«mask» = «Ook rond de tv» (canvas «Ambience · Ook op de projector» A). */
export type AmbienceCommand =
  | { action: "status" | "pause" | "resume" }
  | { action: "play"; videoId: string }
  | { action: "projector"; enabled: boolean }
  | { action: "calibrate"; on: boolean }
  | { action: "mask"; mask: ProjectorMask; save: boolean };

export function ambienceRequest(value: unknown): AmbienceCommand | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data).length;
  if ((data.action === "status" || data.action === "pause" || data.action === "resume") && keys === 1) return { action: data.action };
  if (data.action === "play" && keys === 2 && isYoutubeVideoId(data.videoId)) return { action: "play", videoId: data.videoId };
  if (data.action === "projector" && keys === 2 && typeof data.enabled === "boolean") return { action: "projector", enabled: data.enabled };
  if (data.action === "calibrate" && keys === 2 && typeof data.on === "boolean") return { action: "calibrate", on: data.on };
  if (data.action === "mask" && keys === 3 && typeof data.save === "boolean") {
    const mask = parseMask(data.mask);
    return mask ? { action: "mask", mask, save: data.save } : null;
  }
  return null;
}

/** De Pi opent de projectorpagina (of zet de projector weer uit). Mislukt = enkel op tv, nooit een fout voor de tv. */
async function projectorCommand(ownerId: string, action: "ambience-show" | "ambience-hide"): Promise<string | null> {
  try {
    const bridge = await ownerBridge(ownerId);
    if (!bridge || !bridgeOnline(bridge)) return "bridge-offline";
    return (await enqueueProjector(bridge, action)) ? null : "bridge-busy";
  } catch {
    return "bridge-offline";
  }
}

async function projectorStatus() {
  const settings = await readProjectorSettings();
  const report = lastProjectorReport();
  return {
    enabled: settings.enabled,
    mask: { corners: settings.corners, margin: settings.margin, soft: settings.soft, blur: settings.blur },
    report: report?.status ?? null,
    tv: settings.enabled ? tvNowPlaying().state : null,
  };
}

export async function ambienceTv(request: NextRequest) {
  const guard = await localOwner(request);
  if (guard instanceof NextResponse) return guard;
  const parsed = ambienceRequest(await request.json().catch(() => null));
  if (!parsed) return reply({ error: "invalid-command" }, 400);
  const config = await readTvConfig();
  if (!config) return reply({ error: "not-configured", configured: false }, 503);
  if (config.ownerId !== guard.ownerId) return reply({ error: "not-authorized" }, 403);
  if (parsed.action === "status") return reply({ configured: true, power: await tvPower(config.host), youtubeSearch: Boolean(process.env.YOUTUBE_API_KEY), projector: await projectorStatus() });
  if (parsed.action === "projector") {
    await saveProjectorSettings({ enabled: parsed.enabled });
    // Aan terwijl de tv al iets speelt: meteen de projector erbij. Uit: projector uit.
    const playing = parsed.enabled && (await tvPower(config.host)) === "on";
    const problem = parsed.enabled ? (playing ? await projectorCommand(guard.ownerId, "ambience-show") : null) : await projectorCommand(guard.ownerId, "ambience-hide");
    return reply({ accepted: true, projector: await projectorStatus(), problem });
  }
  if (parsed.action === "calibrate") {
    setCalibration(parsed.on);
    const problem = parsed.on ? await projectorCommand(guard.ownerId, "ambience-show") : null;
    return reply({ accepted: true, problem });
  }
  if (parsed.action === "mask") {
    if (parsed.save) {
      await saveProjectorSettings(parsed.mask);
      setCalibration(false);
    } else setCalibration(true, parsed.mask);
    return reply({ accepted: true });
  }
  try {
    if (parsed.action !== "play") {
      await tvPlayback(config, parsed.action === "pause" ? "pause" : "resume");
      return reply({ accepted: true });
    }
    const { wasOn } = await startAmbience(config, parsed.videoId);
    const settings = await readProjectorSettings();
    const problem = settings.enabled ? await projectorCommand(guard.ownerId, "ambience-show") : null;
    return reply({ accepted: true, wasOn, ...(settings.enabled ? { projector: problem ?? "starting" } : {}) });
  } catch (error) {
    const code = error instanceof Error && /^[a-z-]+$/.test(error.message) ? error.message : "command-not-confirmed";
    return reply({ error: code }, code === "busy" ? 409 : 503);
  }
}

/**
 * De projectorpagina (op de projector, via het thuisnetwerk naar deze Mac): wat de tv speelt, waar de tv zit, en of
 * er ingesteld wordt. Geen aanmelding op de projector: een lange sleutel in de url (`.cache/samsung-tv/projector.json`).
 * POST = melding van de pagina (`embed-blocked`, `playing`, …) voor het blad op de tablet.
 */
export async function ambienceProjector(request: NextRequest) {
  if (process.env.NETLIFY || process.env.VERCEL) return reply({ error: "mac-required" }, 503);
  const settings = await readProjectorSettings();
  const given = request.method === "GET" ? request.nextUrl.searchParams.get("key") : ((await request.clone().json().catch(() => null)) as { key?: unknown } | null)?.key;
  if (!projectorKeyMatches(settings.key, given)) return reply({ error: "not-authorized" }, 403);
  const config = await readTvConfig();
  if (!config) return reply({ error: "not-configured" }, 503);
  if (request.method === "POST") {
    const body = (await request.json().catch(() => null)) as { status?: unknown; videoId?: unknown } | null;
    const status = typeof body?.status === "string" && /^[a-z-]{1,32}$/.test(body.status) ? body.status : null;
    if (!status) return reply({ error: "invalid-report" }, 400);
    reportFromProjector(status, isYoutubeVideoId(body?.videoId) ? body.videoId : null);
    return reply({ accepted: true });
  }
  const calib = calibration();
  const mask = calib?.mask ?? { corners: settings.corners, margin: settings.margin, soft: settings.soft, blur: settings.blur };
  const tv = settings.enabled || calib ? tvNowPlaying() : null;
  return reply({ serverNow: Date.now(), enabled: settings.enabled, calibrating: Boolean(calib), mask, tv });
}

export type AmbienceVideo = { id: string; title: string; channel: string; thumbnail: string; duration: string | null; live: boolean };

/**
 * Zoekresultaten 12 uur bewaren: één zoekopdracht kost 100 van de 10.000 dagelijkse eenheden en het venster
 * vraagt telkens 7 rijen op. Zo kost een tweede opening niets.
 */
const SEARCH_TTL = 12 * 60 * 60 * 1000;
const searchCache = new Map<string, { at: number; videos: AmbienceVideo[] }>();
// Ook op schijf (.cache/), zodat een herstart of hot reload van de dev-server de cache niet wist.
const CACHE_FILE = path.join(process.cwd(), ".cache/youtube-search.json");
let cacheLoaded: Promise<void> | null = null;
function loadSearchCache(): Promise<void> {
  cacheLoaded ??= readFile(CACHE_FILE, "utf8")
    .then((raw) => {
      for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, { at: number; videos: AmbienceVideo[] }>)) {
        if (Date.now() - v.at < SEARCH_TTL && !searchCache.has(k)) searchCache.set(k, v);
      }
    })
    .catch(() => undefined);
  return cacheLoaded;
}
function saveSearchCache(): void {
  void mkdir(path.dirname(CACHE_FILE), { recursive: true })
    .then(() => writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(searchCache)), { mode: 0o600 }))
    .catch(() => undefined);
}

/** `{ q }` → up to 24 YouTube videos (Data API v3: search.list 100 units + videos.list 1 unit). */
export async function youtubeSearch(request: NextRequest) {
  const guard = await localOwner(request);
  if (guard instanceof NextResponse) return guard;
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return reply({ error: "no-api-key" }, 503);
  const body = (await request.json().catch(() => null)) as { q?: unknown } | null;
  const q = typeof body?.q === "string" ? body.q.trim().slice(0, 100) : "";
  if (!q) return reply({ error: "invalid-query" }, 400);
  const cacheKey = q.toLowerCase();
  await loadSearchCache();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SEARCH_TTL) return reply({ videos: cached.videos });
  try {
    const search = await fetch(`https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({ part: "snippet", type: "video", maxResults: "24", q, safeSearch: "moderate", regionCode: "BE", key })}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!search.ok) return reply({ error: search.status === 403 ? "quota-or-key" : "search-failed" }, 502);
    const items = ((await search.json()).items ?? []) as { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; liveBroadcastContent?: string; thumbnails?: Record<string, { url?: string }> } }[];
    const ids = items.map((i) => i.id?.videoId).filter(isYoutubeVideoId);
    const durations = new Map<string, string>();
    if (ids.length > 0) {
      const details = await fetch(`https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "contentDetails", id: ids.join(","), key })}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (details.ok) for (const v of ((await details.json()).items ?? []) as { id: string; contentDetails?: { duration?: string } }[]) if (v.contentDetails?.duration) durations.set(v.id, v.contentDetails.duration);
    }
    const videos: AmbienceVideo[] = items
      .filter((i) => isYoutubeVideoId(i.id?.videoId))
      .map((i) => {
        const id = i.id!.videoId!;
        const live = i.snippet?.liveBroadcastContent === "live";
        return {
          id,
          title: decodeEntities(i.snippet?.title ?? ""),
          channel: decodeEntities(i.snippet?.channelTitle ?? ""),
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          duration: live ? "Live" : formatYoutubeDuration(durations.get(id)),
          live,
        };
      });
    if (searchCache.size > 200) searchCache.clear();
    searchCache.set(cacheKey, { at: Date.now(), videos });
    saveSearchCache();
    return reply({ videos });
  } catch {
    return reply({ error: "search-failed" }, 502);
  }
}

/** search.list returns HTML-escaped titles (&amp;, &#39;, …). */
function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, e: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[e] ?? _);
}
