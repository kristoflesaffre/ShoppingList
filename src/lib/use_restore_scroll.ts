"use client";

import * as React from "react";

const KEY_PREFIX = "restore-scroll:";
/** De inhoud kan nog groeien (foto's, secties): tot zo lang blijven we de plek opnieuw zetten. */
const SETTLE_MS = 1500;

/** Onthoud de huidige scrollpositie voor je naar een andere pagina gaat (zie `useRestoreScroll`). */
export function rememberScroll(key: string) {
  try {
    sessionStorage.setItem(KEY_PREFIX + key, String(window.scrollY));
  } catch {
    /* Geen opslag: dan gewoon bovenaan. */
  }
}

/**
 * Terug op de onthouden plek zodra `ready` waar is. Stopt zodra de gebruiker zelf scrolt.
 * Eén keer per `rememberScroll`.
 */
export function useRestoreScroll(key: string, ready: boolean) {
  React.useEffect(() => {
    if (!ready) return;
    let target: number | null = null;
    try {
      const raw = sessionStorage.getItem(KEY_PREFIX + key);
      sessionStorage.removeItem(KEY_PREFIX + key);
      if (raw !== null) target = Number(raw);
    } catch {
      return;
    }
    if (target === null || !Number.isFinite(target) || target <= 0) return;
    const y = target;

    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
    const start = performance.now();
    const tick = () => {
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, behavior: "instant" });
      if (performance.now() - start < SETTLE_MS) frame = requestAnimationFrame(tick);
      else stop();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    tick();
    return stop;
  }, [key, ready]);
}
