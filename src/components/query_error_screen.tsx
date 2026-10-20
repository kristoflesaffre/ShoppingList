"use client";

import * as React from "react";

const KEY = "query-error-reloads";
const WINDOW_MS = 2 * 60_000;
const MAX_RELOADS = 3;
const DELAY_MS = 1200;

/** Herlaadpogingen van de laatste twee minuten (sessionStorage; leeg als het niet kan). */
function recentReloads(now: number): number[] {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(list) ? list.filter((t): t is number => typeof t === "number" && now - t < WINDOW_MS) : [];
  } catch {
    return [];
  }
}

function rememberReload(list: number[], now: number) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...list, now]));
  } catch {
    /* ignore */
  }
}

/**
 * Foutscherm voor InstantDB-query’s. Na de app uit de achtergrond te halen (iPhone) loopt de verbinding vaak
 * af met «Operation timed out: handle-receive» en herstelt de query niet meer vanzelf. Daarom: «Verbinding
 * herstellen…» tonen en de pagina zelf herladen — zonder netwerk pas zodra het terug is, en hoogstens drie keer
 * per twee minuten. Lukt het dan nog niet, dan de fout met een knop om opnieuw te proberen.
 */
export function QueryErrorScreen({ error }: { error: { message: string } }) {
  const [gaveUp, setGaveUp] = React.useState(false);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const retry = () => {
      const now = Date.now();
      const list = recentReloads(now);
      if (list.length >= MAX_RELOADS) {
        setGaveUp(true);
        return;
      }
      rememberReload(list, now);
      window.location.reload();
    };
    if (!navigator.onLine) {
      setOffline(true);
      const onOnline = () => retry();
      window.addEventListener("online", onOnline);
      return () => window.removeEventListener("online", onOnline);
    }
    const id = window.setTimeout(retry, DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (gaveUp) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base text-[var(--error-600)]">Er ging iets mis: {error.message}</p>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(KEY);
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
          className="min-h-11 rounded-full bg-[var(--text-primary)] px-5 text-sm font-bold text-[var(--bg-app)]"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center" role="status" aria-live="polite">
      <span className="size-7 animate-spin rounded-full border-[3px] border-[var(--border-subtle)] border-t-[var(--text-primary)]" aria-hidden />
      <p className="text-sm font-semibold text-[var(--text-secondary)]">{offline ? "Geen internet. Wacht op verbinding…" : "Verbinding herstellen…"}</p>
    </div>
  );
}
