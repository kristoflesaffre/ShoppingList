"use client";

import * as React from "react";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";

/**
 * Gedeelde cache voor Google-agenda-antwoorden (home, dashboard, kalender). Toont meteen wat er al was
 * (in het geheugen of op dit toestel bewaard) en ververst enkel op de achtergrond. Eén verzoek tegelijk per
 * sleutel, ook als home-sectie en dashboard tegelijk vragen. De sleutel bevat de datum, dus gisteren telt niet.
 */

export type AgendaCacheEntry<T> = { state: T | null; failed: boolean };

const STORAGE_PREFIX = "agenda-cache:";
const memory = new Map<string, AgendaCacheEntry<unknown>>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<(e: AgendaCacheEntry<unknown>) => void>>();

export function localDayIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readStored<T>(key: string): AgendaCacheEntry<T> | null {
  if (memory.has(key)) return memory.get(key) as AgendaCacheEntry<T>;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = { state: JSON.parse(raw) as T, failed: false };
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

function store(key: string, entry: AgendaCacheEntry<unknown>) {
  memory.set(key, entry);
  listeners.get(key)?.forEach((fn) => fn(entry));
  if (entry.failed || !entry.state) return;
  try {
    // Enkel de nieuwste dag bewaren: oude sleutels van hetzelfde soort opruimen.
    const kind = key.split(":")[0];
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(`${STORAGE_PREFIX}${kind}:`) && k !== STORAGE_PREFIX + key) window.localStorage.removeItem(k);
    }
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry.state));
  } catch {
    // Opslag vol of geblokkeerd: dan enkel in het geheugen.
  }
}

export function fetchAgenda(key: string, timeMin: Date, timeMax: Date, token: string): Promise<void> {
  const running = inflight.get(key);
  if (running) return running;
  const params = new URLSearchParams({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() });
  const p = fetch(`/api/google/dashboard?${params.toString()}`, { cache: "no-store", headers: googleAuthHeaders(token) })
    .then(async (r) => ({ state: (await r.json()) as unknown, failed: !r.ok }))
    .catch(() => ({ state: memory.get(key)?.state ?? null, failed: true }))
    .then((entry) => store(key, entry))
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Na ontkoppelen: niets oud meer tonen. */
export function clearAgendaCache() {
  memory.clear();
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) window.localStorage.removeItem(k);
    }
  } catch {
    // niets
  }
}

/**
 * Agenda voor een periode met cache. `range` geeft sleutel + periode; ververst bij focus en elke 5 minuten.
 */
export function useCachedAgenda<T>(range: () => { key: string; timeMin: Date; timeMax: Date }) {
  const token = useGoogleAuthToken();
  const [now, setNow] = React.useState(() => new Date());
  const { key } = range();
  const [entry, setEntry] = React.useState<AgendaCacheEntry<T> | null>(() => (memory.get(key) as AgendaCacheEntry<T>) ?? null);
  const rangeRef = React.useRef(range);
  rangeRef.current = range;

  // Bewaarde versie vóór de eerste weergave lezen (geen flits van de laadanimatie).
  React.useLayoutEffect(() => {
    setEntry(readStored<T>(key));
    const set = listeners.get(key) ?? new Set();
    const fn = (e: AgendaCacheEntry<unknown>) => setEntry(e as AgendaCacheEntry<T>);
    set.add(fn);
    listeners.set(key, set);
    return () => {
      set.delete(fn);
    };
  }, [key]);

  const load = React.useCallback(() => {
    if (!token) return;
    const r = rangeRef.current();
    void fetchAgenda(r.key, r.timeMin, r.timeMax, token);
  }, [token]);

  React.useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const refresh = window.setInterval(load, 5 * 60_000);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, [load, key]);

  const setState = React.useCallback(
    (state: T | null) => {
      store(key, { state, failed: false });
    },
    [key],
  );

  return { token, state: entry?.state ?? null, failed: entry?.failed ?? false, load, now, setState };
}
