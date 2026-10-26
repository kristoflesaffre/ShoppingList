import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { formatYoutubeDuration, isYoutubeVideoId } from "@/lib/samsung-tv-protocol";
import { verifiedUserId } from "./google-connection-store";
import { screenLanHost } from "./projector-temporary";
import { readTvConfig, startAmbience, tvPower } from "./samsung-tv";

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

/** `{ action: "status" }` or `{ action: "play", videoId }`. */
export function ambienceRequest(value: unknown): { action: "status" } | { action: "play"; videoId: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.action === "status" && Object.keys(data).length === 1) return { action: "status" };
  if (data.action === "play" && Object.keys(data).length === 2 && isYoutubeVideoId(data.videoId)) return { action: "play", videoId: data.videoId };
  return null;
}

export async function ambienceTv(request: NextRequest) {
  const guard = await localOwner(request);
  if (guard instanceof NextResponse) return guard;
  const parsed = ambienceRequest(await request.json().catch(() => null));
  if (!parsed) return reply({ error: "invalid-command" }, 400);
  const config = await readTvConfig();
  if (!config) return reply({ error: "not-configured", configured: false }, 503);
  if (config.ownerId !== guard.ownerId) return reply({ error: "not-authorized" }, 403);
  if (parsed.action === "status") return reply({ configured: true, power: await tvPower(config.host), youtubeSearch: Boolean(process.env.YOUTUBE_API_KEY) });
  try {
    const { wasOn } = await startAmbience(config, parsed.videoId);
    return reply({ accepted: true, wasOn });
  } catch (error) {
    const code = error instanceof Error && /^[a-z-]+$/.test(error.message) ? error.message : "command-not-confirmed";
    return reply({ error: code }, code === "busy" ? 409 : 503);
  }
}

export type AmbienceVideo = { id: string; title: string; channel: string; thumbnail: string; duration: string | null; live: boolean };

/** `{ q }` → up to 24 YouTube videos (Data API v3: search.list 100 units + videos.list 1 unit). */
export async function youtubeSearch(request: NextRequest) {
  const guard = await localOwner(request);
  if (guard instanceof NextResponse) return guard;
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return reply({ error: "no-api-key" }, 503);
  const body = (await request.json().catch(() => null)) as { q?: unknown } | null;
  const q = typeof body?.q === "string" ? body.q.trim().slice(0, 100) : "";
  if (!q) return reply({ error: "invalid-query" }, 400);
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
    return reply({ videos });
  } catch {
    return reply({ error: "search-failed" }, 502);
  }
}

/** search.list returns HTML-escaped titles (&amp;, &#39;, …). */
function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, e: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[e] ?? _);
}
