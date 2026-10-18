"use client";

import * as React from "react";
import { googleAuthHeaders } from "./google-client";
import { mergeAgendaWindows, nextAgendaWindow } from "./agenda-future";

type Event = { id: string };
type Page<T> = { token: string; anchor: number; until: number; events: T[] };

/** Fetch one bounded window on demand, rather than repeatedly fetching an ever-widening date range. */
export function useAgendaFuture<T extends Event>(base: readonly T[], initialEnd: Date, token: string | null) {
  const anchor = initialEnd.getTime();
  const session = React.useMemo(() => ({ token, anchor }), [token, anchor]);
  const currentSession = React.useRef(session);
  currentSession.current = session;
  const request = React.useRef<{ session: object; controller: AbortController } | null>(null);
  const [page, setPage] = React.useState<Page<T> | null>(null);
  const [loadingSession, setLoadingSession] = React.useState<object | null>(null);
  const [failedSession, setFailedSession] = React.useState<object | null>(null);
  const active = page?.token === token && page?.anchor === anchor ? page : null;
  const until = active?.until ?? anchor;

  React.useEffect(() => () => {
    if (request.current?.session === session) {
      request.current.controller.abort();
      request.current = null;
    }
  }, [session]);

  const loadMore = React.useCallback(async () => {
    if (!token || request.current?.session === session) return;
    const controller = new AbortController();
    request.current = { session, controller };
    setLoadingSession(session);
    setFailedSession(null);
    const { timeMin, timeMax } = nextAgendaWindow(new Date(until));
    const params = new URLSearchParams({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() });
    try {
      const response = await fetch(`/api/google/dashboard?${params}`, { cache: "no-store", headers: googleAuthHeaders(token), signal: controller.signal });
      const data = await response.json() as { connected?: boolean; unavailable?: boolean; events?: T[] };
      if (!response.ok || !data.connected || data.unavailable || !Array.isArray(data.events) || data.events.some(e => !e || typeof e.id !== "string")) throw new Error("Agenda unavailable");
      if (currentSession.current !== session || controller.signal.aborted) return;
      setPage(previous => ({ token, anchor, until: timeMax.getTime(), events: mergeAgendaWindows(previous?.token === token && previous.anchor === anchor ? previous.events : [], data.events!) }));
    } catch {
      if (currentSession.current === session && !controller.signal.aborted) setFailedSession(session);
    } finally {
      if (request.current?.controller === controller) request.current = null;
      if (currentSession.current === session) setLoadingSession(null);
    }
  }, [token, anchor, until, session]);

  return {
    events: React.useMemo(() => mergeAgendaWindows(base, active?.events ?? []), [base, active]),
    loadedUntil: new Date(until),
    loading: loadingSession === session,
    failed: failedSession === session,
    loadMore,
  };
}
