import { current, getData, putData } from "./cinema-companion";
import { enqueueProjector, ownerBridge } from "./projector-relay";
import { gemini, identify, titleInfo } from "./cinema-xray";
import { tmdbHeaders, TMDB_BASE } from "../tmdb";
import { xrayCostUsd, type XrayIdentity } from "../cinema-xray";

/**
 * X-Ray «Nu in beeld»: wie er nu in beeld is.
 * - `frame`: één screenshot van de projector (Pi-bridge ≥ 1.21.0 schrijft het als JPEG in «xray-frame»). Gratis; de
 *   tablet herkent de gezichten zelf (src/lib/face).
 * - `sceneAi`: «Gebruik AI»: het screenshot + de castlijst van deze aflevering/film naar Gemini, enkel op vraag.
 */

export type XrayFrame = { at: number; width: number; height: number; brightness: number; jpeg: string };
export type SceneCast = { name: string; character: string; profileUrl: string | null };
export type ScenePerson = SceneCast & { position: "links" | "midden" | "rechts" | "achtergrond" };

const FRAME_WAIT_MS = 15_000;
const SCENE_PER_HOUR = 30;
const IMG = "https://image.tmdb.org/t/p/w185";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Een recent screenshot (hoogstens `maxAgeMs` oud), anders een nieuw vragen aan de Pi en tot 15 s wachten. */
export async function requestFrame(owner: string, maxAgeMs = 6000): Promise<XrayFrame> {
  const fresh = (f: XrayFrame | null, after: number) => (f && typeof f.jpeg === "string" && f.at > after ? f : null);
  const existing = fresh(await getData<XrayFrame>(owner, "xray-frame"), Date.now() - maxAgeMs);
  if (existing) return existing;
  const bridge = await ownerBridge(owner);
  if (!bridge) throw new Error("bridge-unavailable");
  const asked = Date.now();
  // Bezig met een andere opdracht (pauze, terugspoelen, of een screenshot van een ander scherm): wachten op dat beeld.
  await enqueueProjector(bridge, "xray-frame");
  while (Date.now() - asked < FRAME_WAIT_MS) {
    await sleep(700);
    const frame = fresh(await getData<XrayFrame>(owner, "xray-frame"), asked - 1500);
    if (frame) return frame;
  }
  throw new Error("frame-unavailable");
}

/** De cast van wat er speelt: aflevering (vaste cast + gasten) of film, zoals in TMDB, in volgorde van belang. */
export async function sceneCast(id: XrayIdentity, tmdbId: number): Promise<SceneCast[]> {
  const opts = { headers: tmdbHeaders, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } };
  const url = id.type === "series" && id.season && id.episode
    ? `${TMDB_BASE}/tv/${tmdbId}/season/${id.season}/episode/${id.episode}?append_to_response=credits`
    : id.type === "series" ? `${TMDB_BASE}/tv/${tmdbId}/aggregate_credits` : `${TMDB_BASE}/movie/${tmdbId}/credits`;
  const data = await fetch(url, opts).then(r => (r.ok ? r.json() : null)).catch(() => null);
  type Row = { id?: number; name?: string; character?: string; roles?: { character?: string }[]; profile_path?: string | null };
  const rows: Row[] = data?.credits ? [...(data.credits.cast ?? []), ...(data.credits.guest_stars ?? [])] : data?.cast ?? [];
  const seen = new Set<number | string>();
  return rows.flatMap(r => {
    const key = r.id ?? r.name ?? "";
    if (!r.name || seen.has(key)) return [];
    seen.add(key);
    return [{ name: r.name.slice(0, 120), character: (r.character ?? r.roles?.[0]?.character ?? "").slice(0, 160), profileUrl: r.profile_path ? `${IMG}${r.profile_path}` : null }];
  }).slice(0, 60);
}

async function sceneBudget(owner: string) {
  const key = `xray-budget:scene:${Math.floor(Date.now() / 3600_000)}`;
  const used = (await getData<{ used: number }>(owner, key))?.used ?? 0;
  if (used >= SCENE_PER_HOUR) throw new Error("hourly-limit");
  await putData(owner, key, { used: used + 1 }, 7200_000);
}

const POSITIONS = ["links", "midden", "rechts", "achtergrond"] as const;
const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Gemini-antwoord → personen uit de castlijst. Namen die niet in de cast staan, vallen weg. */
export function parseScenePeople(text: string, cast: SceneCast[]): ScenePerson[] {
  let rows: unknown;
  try { rows = JSON.parse(text); } catch { throw new Error("invalid-ai-output"); }
  const list = Array.isArray(rows) ? rows : Array.isArray((rows as { people?: unknown })?.people) ? (rows as { people: unknown[] }).people : null;
  if (!list) throw new Error("invalid-ai-output");
  const out: ScenePerson[] = [];
  for (const row of list.slice(0, 12)) {
    if (!row || typeof row !== "object") continue;
    const r = row as { actor?: unknown; character?: unknown; position?: unknown };
    const actor = typeof r.actor === "string" ? norm(r.actor) : "", character = typeof r.character === "string" ? norm(r.character) : "";
    const hit = cast.find(c => (actor && norm(c.name) === actor) || (character && c.character && norm(c.character) === character));
    if (!hit || out.some(p => p.name === hit.name)) continue;
    const position = POSITIONS.includes(r.position as (typeof POSITIONS)[number]) ? (r.position as ScenePerson["position"]) : "midden";
    out.push({ ...hit, position });
  }
  const order = { links: 0, midden: 1, rechts: 2, achtergrond: 3 };
  return out.sort((a, b) => order[a.position] - order[b.position]);
}

/** «Gebruik AI»: wie staat er nu in beeld, volgens Gemini (± € 0,0005 per keer). */
export async function sceneAi(owner: string): Promise<{ people: ScenePerson[]; at: number; costUsd: number; model: string }> {
  const s = await current(owner);
  if (!s.playback || !s.live) throw new Error("no-active-session");
  const id = await identify(owner, s.playback).catch(() => null);
  const info = id ? await titleInfo(id).catch(() => null) : null;
  if (!id || !info?.tmdbId) throw new Error("title-unknown");
  const [cast, frame] = await Promise.all([sceneCast(id, info.tmdbId), requestFrame(owner, 8000)]);
  if (!cast.length) throw new Error("title-unknown");
  await sceneBudget(owner);
  const where = id.type === "series" && id.season && id.episode ? `${info.name}, seizoen ${id.season} aflevering ${id.episode}` : info.name;
  const system = "Je herkent personages in een beeld uit een film of serie. Je krijgt de castlijst; noem enkel mensen uit die lijst die je in het beeld ziet. Twijfel je, laat de persoon weg. Antwoord als JSON: {\"people\":[{\"actor\":\"…\",\"character\":\"…\",\"position\":\"links|midden|rechts|achtergrond\"}]}. Een lege lijst mag.";
  const list = cast.map(c => `- ${c.character || "?"} (gespeeld door ${c.name})`).join("\n");
  const r = await gemini(system, [{ text: `Beeld uit ${where}. Cast:\n${list}` }, { inlineData: { mimeType: "image/jpeg", data: frame.jpeg } }], 400, true);
  return { people: parseScenePeople(r.text, cast), at: frame.at, costUsd: xrayCostUsd(r.model, r.inTokens, r.outTokens), model: r.model };
}
