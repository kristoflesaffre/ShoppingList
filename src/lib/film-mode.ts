import { awaitProjectorReceipt } from "./projector-client";
import { stremioLink, type StremioTarget } from "./stremio";

/**
 * Starting uses one sensor-guarded Pi command, without a local RF fallback. With a title it is the same cinema start
 * that also opens that title in Stremio (the series you are watching); without one, it only starts the cinema.
 * Stopping is one Pi command too («cinema-stop»): screen down, projector off, living room to 20 %.
 */
export type FilmStep = "projector" | "screen" | "light";
export type FilmResult = Record<FilmStep, boolean>;

export const FILM_ROOM = "Woonkamer";
export const FILM_SCENE = "Cinema";
export const FILM_STOP_BRIGHTNESS = 20;

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

/**
 * Wat er misging bij «cinema-stop»: de Pi doet de drie stappen naast elkaar en meldt de eerste fout. Een schermfout
 * (screen-…) laat projector en licht bevestigd; elke andere fout telt voor alles.
 */
export function stopResult(result: { accepted?: boolean; detail?: unknown }): FilmResult {
  if (result.accepted === true) return { projector: true, screen: true, light: true };
  const screenOnly = typeof result.detail === "string" && result.detail.startsWith("screen-");
  return { projector: screenOnly, screen: false, light: screenOnly };
}

export async function runFilmMode(start: boolean, token: string, target?: StremioTarget | null): Promise<FilmResult> {
  if (start) {
    try {
      const { ok, data } = target ? await post("/api/projector/stremio", token, target) : await post("/api/projector", token, { action: "cinema" });
      if (!ok || !data) return { projector: false, screen: false, light: false };
      const result = data.pending ? await awaitProjectorReceipt(data as Parameters<typeof awaitProjectorReceipt>[0], token, undefined, 185_000) : data;
      const accepted = result.accepted === true;
      return { projector: accepted, screen: accepted, light: accepted };
    } catch { return { projector: false, screen: false, light: false }; }
  }
  // Stoppen gaat net als starten via de Pi: scherm omlaag tot het contact dicht is, projector uit, woonkamer op 20 %.
  try {
    const { ok, data } = await post("/api/projector", token, { action: "cinema-stop" });
    if (!ok || !data) return { projector: false, screen: false, light: false };
    const result = data.pending ? await awaitProjectorReceipt(data as Parameters<typeof awaitProjectorReceipt>[0], token, undefined, 125_000) : data;
    return stopResult(result as { accepted?: boolean; detail?: unknown });
  } catch { return { projector: false, screen: false, light: false }; }
}

const LABEL: Record<FilmStep, string> = { projector: "projector", screen: "scherm", light: "licht" };

export function filmMessage(start: boolean, result: FilmResult): string {
  const failed = (Object.keys(LABEL) as FilmStep[]).filter((k) => !result[k]);
  if (failed.length === 0) return start ? "Film gestart: projector aan, scherm naar je hoogte, woonkamer op Cinema." : "Film gestopt: projector uit, scherm omlaag, woonkamer op 20 %.";
  if (failed.length === 3) return "Niets bevestigd. Controleer projector, scherm en licht voor je opnieuw probeert.";
  return `Niet bevestigd: ${failed.map((k) => LABEL[k]).join(" en ")}. Controleer dat zelf; er wordt niets herhaald.`;
}

/** Title to open with «Film starten»: the series on screen and its next episode. `null` = cinema without a title. */
export async function filmTarget(
  media: { type: "movie" | "tv"; tmdbId: string; season?: number; episode?: number },
  lookupImdbId: (type: "movie" | "tv", tmdbId: string) => Promise<string | null>,
): Promise<StremioTarget | null> {
  try {
    const imdbId = await lookupImdbId(media.type, media.tmdbId);
    if (!imdbId) return null;
    const withEpisode: StremioTarget = { imdbId, type: media.type, ...(media.type === "tv" && media.season !== undefined && media.episode !== undefined ? { season: media.season, episode: media.episode } : {}) };
    try { stremioLink(withEpisode); return withEpisode; } catch { /* aflevering ongeldig: dan de serie zelf */ }
    const plain: StremioTarget = { imdbId, type: media.type };
    stremioLink(plain);
    return plain;
  } catch {
    return null;
  }
}

/**
 * «on:2026-11-09» = film gestart op die dag. Een film loopt nooit tot de volgende dag, en als het scherm met de
 * hand dicht ging weet het dashboard dat niet: vanaf de volgende dag toont de knop dus weer «Film starten».
 */
export function filmModeIsOn(stored: string | null, today: string): boolean {
  return stored === `on:${today}`;
}
