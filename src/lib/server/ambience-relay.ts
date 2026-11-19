import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { DEFAULT_MASK, parseMask, type ProjectorMask } from "@/lib/ambience-projector";
import { verifiedUserId } from "./google-connection-store";
import { getInstantAdminDb } from "./instant-admin";
import { companionId } from "./cinema-companion";
import { bridgeOnline, enqueueProjector, ownerBridge, relayCommand, type Bridge } from "./projector-relay";
import type { AmbienceCommand } from "./ambience-routes";

/**
 * «Sfeer op tv» + «Ook rond de tv» via de Pi (bridge ≥ 1.31.0), zodat de Mac uit mag: werkt op Vercel en op de Mac.
 * De Pi zet de tv aan, start YouTube en de video, en opent de projector-app; de instellingen voor de projector staan
 * online (`cinemaCompanionData` «{owner}:ambience-settings») en gaan met elke opdracht mee naar de Pi.
 */

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const SETTINGS_KEY = "ambience-settings";

export type AmbienceSettings = { enabled: boolean; calibrating: boolean; mask: ProjectorMask };
const DEFAULT_SETTINGS: AmbienceSettings = { enabled: false, calibrating: false, mask: DEFAULT_MASK };

function database() {
  const db = getInstantAdminDb();
  if (!db) throw new Error("relay-unavailable");
  return db;
}

export async function readAmbienceSettings(owner: string): Promise<AmbienceSettings> {
  const result = await database().query({ cinemaCompanionData: { $: { where: { id: companionId(`${owner}:${SETTINGS_KEY}`) } } } });
  const row = result.cinemaCompanionData[0] as { ownerId?: string; payload?: Partial<AmbienceSettings> } | undefined;
  if (!row || row.ownerId !== owner || !row.payload) return DEFAULT_SETTINGS;
  return {
    enabled: row.payload.enabled === true,
    calibrating: row.payload.calibrating === true,
    mask: parseMask(row.payload.mask) ?? DEFAULT_MASK,
  };
}

async function saveAmbienceSettings(owner: string, value: AmbienceSettings) {
  const db = database();
  await db.transact(db.tx.cinemaCompanionData[companionId(`${owner}:${SETTINGS_KEY}`)].update({
    ownerId: owner,
    key: `${owner}:${SETTINGS_KEY}`,
    payload: value,
    expiresAt: Date.now() + 10 * 365 * 86400_000,
  }));
}

/** Opdracht voor de Pi: instellingen + wat de projector moet doen, als base64url (enkel URL-veilige tekens). */
export function ambienceSetAction(settings: AmbienceSettings, open: "show" | "show-if-tv" | "hide" | "push"): string {
  const json = JSON.stringify({ enabled: settings.enabled, calibrating: settings.calibrating, open, mask: settings.mask });
  return `ambience-set:${Buffer.from(json).toString("base64url")}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wacht tot de Pi de opdracht deed (of het opgaf). */
async function waitFor(id: string, ms: number): Promise<{ state: "sent" | "failed" | "pending"; error?: string }> {
  const until = Date.now() + ms;
  for (;;) {
    const command = await relayCommand(id);
    if (command?.state === "sent") return { state: "sent" };
    if (command?.state === "failed") return { state: "failed", error: command.error };
    if (Date.now() > until) return { state: "pending" };
    await sleep(1500);
  }
}

async function send(bridge: Bridge, action: string): Promise<{ id: string } | { problem: string }> {
  if (!bridgeOnline(bridge)) return { problem: "bridge-offline" };
  const command = await enqueueProjector(bridge, action);
  return command ? { id: command.id } : { problem: "bridge-busy" };
}

/** Null = dit account heeft geen Pi: de oude bediening vanaf de Mac blijft. */
export async function ambienceViaPi(request: NextRequest, parsed: AmbienceCommand | null): Promise<NextResponse | null> {
  if (request.headers.get("origin") !== googleRequestOrigin(request)) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  let bridge: Bridge | null;
  try {
    bridge = await ownerBridge(owner);
  } catch {
    return reply({ error: "relay-unavailable" }, 503);
  }
  if (!bridge) return null;
  if (!parsed) return reply({ error: "invalid-command" }, 400);
  try {
    const settings = await readAmbienceSettings(owner);
    const projector = { enabled: settings.enabled, mask: settings.mask, report: null, tv: null };

    if (parsed.action === "status") {
      return reply({ configured: bridgeOnline(bridge), power: null, youtubeSearch: Boolean(process.env.YOUTUBE_API_KEY), via: "pi", projector });
    }
    if (parsed.action === "play" || parsed.action === "pause" || parsed.action === "resume") {
      const action = parsed.action === "play" ? `tv-play:${parsed.videoId}` : parsed.action === "pause" ? "tv-pause" : "tv-resume";
      const sent = await send(bridge, action);
      if ("problem" in sent) return reply({ error: sent.problem === "bridge-busy" ? "busy" : sent.problem }, sent.problem === "bridge-busy" ? 409 : 503);
      // Tv aanzetten + YouTube + profiel + video duurt ± 20–40 s; pauze een paar seconden.
      const done = await waitFor(sent.id, parsed.action === "play" ? 52_000 : 15_000);
      if (done.state === "failed") return reply({ error: done.error && /^[a-z-]+$/.test(done.error) ? done.error : "command-not-confirmed" }, 503);
      return reply({ accepted: true, ...(parsed.action === "play" && settings.enabled ? { projector: "starting" } : {}) });
    }
    if (parsed.action === "projector") {
      const next = { ...settings, enabled: parsed.enabled, calibrating: false };
      await saveAmbienceSettings(owner, next);
      const sent = await send(bridge, ambienceSetAction(next, parsed.enabled ? "show-if-tv" : "hide"));
      return reply({ accepted: true, projector: { ...projector, enabled: next.enabled }, problem: "problem" in sent ? sent.problem : null });
    }
    if (parsed.action === "calibrate") {
      const next = { ...settings, calibrating: parsed.on };
      await saveAmbienceSettings(owner, next);
      const sent = await send(bridge, ambienceSetAction(next, parsed.on ? "show" : "push"));
      return reply({ accepted: true, problem: "problem" in sent ? sent.problem : null });
    }
    if (parsed.action !== "mask") return reply({ error: "invalid-command" }, 400);
    // Masker: live tijdens het instellen, of bewaren (dan stopt het instellen).
    const next = { ...settings, mask: parsed.mask, calibrating: !parsed.save };
    await saveAmbienceSettings(owner, next);
    const sent = await send(bridge, ambienceSetAction(next, "push"));
    return reply({ accepted: true, busy: "problem" in sent && sent.problem === "bridge-busy" });
  } catch {
    return reply({ error: "relay-unavailable" }, 503);
  }
}
