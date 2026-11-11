import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { readBoundedText } from "@/lib/server/read-bounded-text";
import { askXray, rewindStremio, xrayState } from "@/lib/server/cinema-xray";
import { XRAY_KINDS, type XrayKind } from "@/lib/cinema-xray";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// «Vorige afleveringen» maakt de eerste keer samenvattingen van eerdere afleveringen (daarna uit de cache).
export const maxDuration = 60;

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private" } });
const KNOWN = ["no-active-session", "title-unknown", "no-subtitles", "subtitle-provider-unavailable", "no-dialogue", "analysis-busy", "hourly-limit",
  "ai-not-configured", "ai-unavailable", "invalid-ai-output", "scene-changed", "invalid-question", "invalid-request", "bridge-unavailable", "projector-busy", "not-configured"];
const STATUS: Record<string, number> = { "hourly-limit": 429, "analysis-busy": 409, "scene-changed": 409, "projector-busy": 409, "no-active-session": 409, "invalid-question": 400, "invalid-request": 400 };

export async function GET(request: NextRequest) {
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  try { return reply(await xrayState(owner)); }
  catch (e) { const error = e instanceof Error && KNOWN.includes(e.message) ? e.message : "xray-unavailable"; return reply({ error }, 503); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== googleRequestOrigin(request)) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  try {
    const body = JSON.parse(await readBoundedText(request.body, 10_000));
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "invalid-request" }, 400);
    if (body.action === "rewind") return reply(await rewindStremio(owner, Number(body.minutes)));
    if (body.action === "ask" && XRAY_KINDS.includes(body.kind)) {
      const question = body.kind === "vraag" && typeof body.question === "string" ? body.question : null;
      return reply(await askXray(owner, body.kind as XrayKind, question));
    }
    return reply({ error: "invalid-request" }, 400);
  } catch (e) {
    const error = e instanceof Error && KNOWN.includes(e.message) ? e.message : "xray-unavailable";
    return reply({ error }, STATUS[error] ?? 503);
  }
}
