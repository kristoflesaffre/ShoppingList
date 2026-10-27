import { awaitProjectorReceipt, sendProjectorCommand } from "./projector-client";

/**
 * Starting uses one sensor-guarded Pi command, without a title change or local RF fallback.
 * Stopping retains the existing explicit projector/screen/light actions.
 */
export type FilmStep = "projector" | "screen" | "light";
export type FilmResult = Record<FilmStep, boolean>;

export const FILM_ROOM = "Woonkamer";
export const FILM_SCENE = "Cinema";
export const FILM_STOP_BRIGHTNESS = 20;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

async function post(path: string, token: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> | null }> {
  const response = await fetch(path, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: response.ok, data };
}

async function screen(start: boolean, token: string): Promise<boolean> {
  if (start) return false;
  const { ok, data } = await post("/api/broadlink", token, { action: start ? "preset" : "down", projector: false });
  return ok && data?.accepted === true;
}

async function light(start: boolean, token: string): Promise<boolean> {
  if (start) {
    const { ok, data } = await post("/api/hue/scene", token, { room: FILM_ROOM, scene: FILM_SCENE, othersOff: false });
    return ok && data?.ok === true;
  }
  const rooms = await post("/api/hue/rooms", token, {});
  const list = Array.isArray(rooms.data?.rooms) ? (rooms.data.rooms as { id: string; name: string }[]) : [];
  const room = list.find((r) => norm(r.name) === norm(FILM_ROOM));
  if (!rooms.ok || !room) return false;
  const { ok, data } = await post("/api/hue/light", token, { id: room.id, on: true, brightness: FILM_STOP_BRIGHTNESS });
  return ok && data?.ok === true;
}

async function projector(start: boolean, token: string): Promise<boolean> {
  const result = await sendProjectorCommand(start ? "on" : "off", token);
  return result.accepted === true;
}

const settle = (p: Promise<boolean>) => p.catch(() => false);

export async function runFilmMode(start: boolean, token: string): Promise<FilmResult> {
  if (start) {
    try {
      const { ok, data } = await post("/api/projector", token, { action: "cinema" });
      if (!ok || !data) return { projector: false, screen: false, light: false };
      const result = data.pending ? await awaitProjectorReceipt(data as Parameters<typeof awaitProjectorReceipt>[0], token, undefined, 185_000) : data;
      const accepted = result.accepted === true;
      return { projector: accepted, screen: accepted, light: accepted };
    } catch { return { projector: false, screen: false, light: false }; }
  }
  const [p, s, l] = await Promise.all([settle(projector(start, token)), settle(screen(start, token)), settle(light(start, token))]);
  return { projector: p, screen: s, light: l };
}

const LABEL: Record<FilmStep, string> = { projector: "projector", screen: "scherm", light: "licht" };

export function filmMessage(start: boolean, result: FilmResult): string {
  const failed = (Object.keys(LABEL) as FilmStep[]).filter((k) => !result[k]);
  if (failed.length === 0) return start ? "Film gestart: projector aan, scherm naar je hoogte, woonkamer op Cinema." : "Film gestopt: projector uit, scherm omlaag, woonkamer op 20 %.";
  if (failed.length === 3) return "Niets bevestigd. Controleer projector, scherm en licht voor je opnieuw probeert.";
  return `Niet bevestigd: ${failed.map((k) => LABEL[k]).join(" en ")}. Controleer dat zelf; er wordt niets herhaald.`;
}
