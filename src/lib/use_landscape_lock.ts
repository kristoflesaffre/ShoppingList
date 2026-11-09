"use client";

import * as React from "react";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

/** Tablet = kortste schermzijde vanaf 600 px (geen gsm, ook niet liggend). */
function isTablet(): boolean {
  return Math.min(window.screen.width, window.screen.height) >= 600;
}

/**
 * Houdt het scherm liggend zolang `enabled` (het tablet-dashboard): niet meer kantelen naar staand.
 * `"landscape"` laat beide liggende richtingen toe, dus 180° omdraaien blijft werken.
 *
 * Werkt enkel waar de browser het toelaat: de geïnstalleerde app (manifest `display: fullscreen`) of
 * volledig scherm in Chrome op Android. Safari op iPad kent geen vergrendeling; dan gebeurt er niets.
 * Na terugkeren naar de app (visibilitychange) vragen we het opnieuw, want sommige browsers laten de
 * vergrendeling dan los.
 */
export function useLandscapeLock(enabled: boolean): void {
  React.useEffect(() => {
    if (!enabled || !isTablet()) return;
    const orientation = window.screen.orientation as LockableOrientation | undefined;
    if (!orientation?.lock) return;
    let cancelled = false;
    const lock = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      orientation.lock?.("landscape").catch(() => undefined);
    };
    lock();
    document.addEventListener("visibilitychange", lock);
    document.addEventListener("fullscreenchange", lock);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", lock);
      document.removeEventListener("fullscreenchange", lock);
      try {
        orientation.unlock?.();
      } catch {
        /* niet vergrendeld */
      }
    };
  }, [enabled]);
}
