import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { readBoundedText } from "@/lib/server/read-bounded-text";
import { isRateLimited } from "@/lib/server/instant-admin";
import { warmSummaries, askXray, playPauseStremio, rewindStremio, stopCinema, transcribeXray, xrayState, startXrayTest, stopXrayTest, controlXrayTest, parseXrayLength } from "@/lib/server/cinema-xray";
import { XRAY_KINDS, type XrayKind } from "@/lib/cinema-xray";
import { requestFrame, sceneAi } from "@/lib/server/xray-scene";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// «Vorige afleveringen» maakt de eerste keer samenvattingen van eerdere afleveringen (daarna uit de cache).
// Een eigen vraag = zoeken + antwoord + spoilercontrole (samen soms 30–60 s).
export const maxDuration = 120;

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private" } });
const KNOWN = ["frame-unavailable", "no-active-session", "title-unknown", "no-subtitles", "subtitle-provider-unavailable", "no-dialogue", "analysis-busy", "hourly-limit",
  "ai-not-configured", "ai-unavailable", "invalid-ai-output", "scene-changed", "invalid-question", "invalid-request", "bridge-unavailable", "projector-busy", "not-configured", "database-busy", "invalid-audio", "no-test-title"];
const STATUS: Record<string, number> = { "frame-unavailable": 409, "hourly-limit": 429, "database-busy": 429, "analysis-busy": 409, "scene-changed": 409, "projector-busy": 409, "no-active-session": 409, "invalid-question": 400, "invalid-request": 400, "invalid-audio": 400, "no-test-title": 409 };

/** Gekende fout = code voor de app. Al de rest komt in het logboek (zonder vraag of antwoord), zodat «niet bereikbaar» te verklaren is. */
function errorCode(e: unknown, where: string) {
  if (isRateLimited(e)) return "database-busy";
  if (e instanceof Error && KNOWN.includes(e.message)) return e.message;
  console.error(`X-Ray ${where} failed:`, e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  return "xray-unavailable";
}

export async function GET(request: NextRequest) {
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  try { return reply(await xrayState(owner, request.nextUrl.searchParams.get("test") === "1")); }
  catch (e) { const error = errorCode(e, "state"); return reply({ error }, STATUS[error] ?? 503); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== googleRequestOrigin(request)) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  try {
    const body = JSON.parse(await readBoundedText(request.body, 1_500_000));
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "invalid-request" }, 400);
    // Testmodus: een gesimuleerde sessie; play/pauze, terugspoelen en stop raken de projector niet.
    const test = body.test === true;
    if (body.action === "test-start") return reply(await startXrayTest(owner));
    if (body.action === "test-stop" || (test && body.action === "stop")) return reply(await stopXrayTest(owner));
    if (test && body.action === "play-pause") return reply(await controlXrayTest(owner, "play-pause"));
    if (test && body.action === "rewind") return reply(await controlXrayTest(owner, "rewind", Number(body.minutes)));
    if (body.action === "rewind") return reply(await rewindStremio(owner, Number(body.minutes)));
    if (body.action === "play-pause") return reply(await playPauseStremio(owner));
    // Samenvattingen van eerdere afleveringen vooraf maken (zes per oproep), zodat een vrije vraag alles kent.
    if (body.action === "warm") return reply(await warmSummaries(owner, test));
    if (body.action === "transcribe") return reply(await transcribeXray(owner, body.audio, body.hint));
    if (body.action === "stop") return reply(await stopCinema(owner));
    // «Nu in beeld»: een screenshot van de projector (gratis herkenning op de tablet) of «Gebruik AI» (Gemini).
    // In de testmodus is er geen projectorbeeld.
    if (body.action === "frame") {
      if (test) return reply({ error: "frame-unavailable" }, 409);
      const f = await requestFrame(owner, 6000);
      return reply({ at: f.at, width: f.width, height: f.height, brightness: f.brightness, image: `data:image/jpeg;base64,${f.jpeg}` });
    }
    if (body.action === "scene-ai") {
      if (test) return reply({ error: "frame-unavailable" }, 409);
      return reply(await sceneAi(owner));
    }
    if (body.action === "ask" && XRAY_KINDS.includes(body.kind)) {
      const question = body.kind === "vraag" && typeof body.question === "string" ? body.question : null;
      return reply(await askXray(owner, body.kind as XrayKind, question, test, parseXrayLength(body.length), body.spoilers === true));
    }
    return reply({ error: "invalid-request" }, 400);
  } catch (e) {
    const error = errorCode(e, "action");
    return reply({ error }, STATUS[error] ?? 503);
  }
}
