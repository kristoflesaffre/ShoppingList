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

/**
 * Zoekresultaten ook in de browser bewaren (12 u, per toestel): het venster toont ze dan meteen,
 * zonder te wachten op de server. Lopende aanvragen worden gedeeld, nooit afgebroken.
 */
const SEARCH_TTL = 12 * 60 * 60 * 1000;
const SEARCH_KEY = "ambience-search-v1";
type CacheEntry = { at: number; videos: AmbienceVideo[] };
let memory: Map<string, CacheEntry> | null = null;
const inflight = new Map<string, Promise<AmbienceVideo[]>>();
function cache(): Map<string, CacheEntry> {
  if (memory) return memory;
  memory = new Map();
  try {
    const raw = window.localStorage.getItem(SEARCH_KEY);
    for (const [k, v] of Object.entries(raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {})) {
      if (Date.now() - v.at < SEARCH_TTL && Array.isArray(v.videos)) memory.set(k, v);
    }
  } catch {
    /* geen opslag: enkel in het geheugen */
  }
  return memory;
}
function persist(): void {
  try {
    window.localStorage.setItem(SEARCH_KEY, JSON.stringify(Object.fromEntries(cache())));
  } catch {
    /* vol of privémodus */
  }
}

/** Verse resultaten uit de cache, of null. Voor de eerste weergave zonder laadstaat. */
export function cachedAmbience(q: string): AmbienceVideo[] | null {
  const hit = cache().get(q.toLowerCase());
  return hit && Date.now() - hit.at < SEARCH_TTL ? hit.videos : null;
}

export function searchAmbience(token: string | null, q: string): Promise<AmbienceVideo[]> {
  const key = q.toLowerCase();
  const hit = cachedAmbience(key);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(key);
  if (running) return running;
  const request = post<{ videos: AmbienceVideo[] }>("/api/youtube/search", token, { q })
    .then(({ videos }) => {
      cache().set(key, { at: Date.now(), videos });
      persist();
      return videos;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

/** Rijen alvast ophalen (bv. zodra de tegel op het dashboard staat), zodat het venster meteen gevuld is. */
export function prefetchAmbience(token: string | null, queries: string[]): void {
  for (const q of queries) void searchAmbience(token, q).catch(() => undefined);
}

export async function playAmbienceOnTv(token: string | null, videoId: string): Promise<void> {
  const data = await post<{ accepted?: boolean }>("/api/tv/ambience", token, { action: "play", videoId });
  if (!data.accepted) throw new Error("command-not-confirmed");
}

export async function tvPlaybackCommand(token: string | null, action: "pause" | "resume"): Promise<void> {
  const data = await post<{ accepted?: boolean }>("/api/tv/ambience", token, { action });
  if (!data.accepted) throw new Error("command-not-confirmed");
}

/** Wat speelt er volgens deze app (gedeeld door tegel en venster; na herladen weer «idle»). */
export type AmbiencePlayState = "idle" | "playing" | "paused";
let playState: AmbiencePlayState = "idle";
const playListeners = new Set<() => void>();
export function getPlayState(): AmbiencePlayState {
  return playState;
}
export function setPlayState(next: AmbiencePlayState): void {
  playState = next;
  playListeners.forEach((cb) => cb());
}
export function subscribePlayState(cb: () => void): () => void {
  playListeners.add(cb);
  return () => playListeners.delete(cb);
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
