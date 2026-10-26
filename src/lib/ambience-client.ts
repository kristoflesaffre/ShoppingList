"use client";
import { googleAuthHeaders } from "@/lib/google-client";
import type { AmbienceVideo } from "@/lib/server/ambience-routes";

export type { AmbienceVideo };

export const AMBIENCE_ERRORS: Record<string, string> = {
  "no-api-key": "Zoeken staat nog niet aan: zet YOUTUBE_API_KEY in .env.local op je Mac en herstart de app.",
  "quota-or-key": "YouTube weigert de zoekopdracht (sleutel of daglimiet). Probeer het later opnieuw.",
  "mac-required": "Open de app op je Mac (of op het thuisnetwerk) om de tv te bedienen.",
  "not-configured": "De tv is nog niet gekoppeld.",
  "tv-not-waking": "De tv reageert niet. Staat «Inschakelen met mobiel» aan en zit de netwerkkabel erin?",
  "tv-remote-unauthorized": "De tv weigert de bediening. Koppel opnieuw en klik «Toestaan» op de tv.",
  busy: "De tv is al bezig met een vorige opdracht.",
};

export const ambienceErrorText = (code: string, fallback: string) => AMBIENCE_ERRORS[code] ?? fallback;

async function post<T>(url: string, token: string | null, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" }, body: JSON.stringify(body), signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "failed");
  return data as T;
}

export async function searchAmbience(token: string | null, q: string, signal?: AbortSignal): Promise<AmbienceVideo[]> {
  return (await post<{ videos: AmbienceVideo[] }>("/api/youtube/search", token, { q }, signal)).videos;
}

export async function playAmbienceOnTv(token: string | null, videoId: string): Promise<void> {
  const data = await post<{ accepted?: boolean }>("/api/tv/ambience", token, { action: "play", videoId });
  if (!data.accepted) throw new Error("command-not-confirmed");
}

/** Is de tv vanaf hier bedienbaar (Mac of thuisnetwerk, gekoppeld) en staat zoeken aan? Eén keer per sessie. */
let statusPromise: Promise<boolean> | null = null;
export function ambienceAvailable(token: string | null): Promise<boolean> {
  if (!token) return Promise.resolve(false);
  statusPromise ??= post<{ configured?: boolean; youtubeSearch?: boolean }>("/api/tv/ambience", token, { action: "status" })
    .then((s) => s.configured === true && s.youtubeSearch === true)
    .catch(() => {
      statusPromise = null;
      return false;
    });
  return statusPromise;
}

/** Laatst gekozen video (per toestel), voor de tegel op het dashboard. */
const LAST_KEY = "ambience-last-played";
export function readLastAmbience(): AmbienceVideo | null {
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    const v = raw ? (JSON.parse(raw) as AmbienceVideo) : null;
    return v && typeof v.id === "string" && typeof v.title === "string" ? v : null;
  } catch {
    return null;
  }
}
export function saveLastAmbience(video: AmbienceVideo): void {
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(video));
    window.dispatchEvent(new Event(LAST_KEY));
  } catch {
    /* privémodus: niet erg */
  }
}
export function onLastAmbienceChange(cb: () => void): () => void {
  window.addEventListener(LAST_KEY, cb);
  return () => window.removeEventListener(LAST_KEY, cb);
}
