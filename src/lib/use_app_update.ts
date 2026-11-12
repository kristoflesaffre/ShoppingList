"use client";

import * as React from "react";

/**
 * Het tablet-dashboard blijft dagen open (ook in always-on), en zou anders de app-versie van de eerste keer blijven
 * tonen. Zolang `enabled`: elk halfuur vragen of er een nieuwe service worker is; neemt die het over
 * (`skipWaiting` + `clientsClaim` in src/app/sw.ts), dan herlaadt de pagina. Niet terwijl je iets typt.
 *
 * Niet meteen: een verse pagina krijgt op iPad pas weer een wake lock na een tik (zie screen-wake-lock.ts),
 * dus herladen terwijl niemand kijkt laat het scherm vergrendelen. Daarom enkel als de pagina verborgen is
 * (de lock is dan toch al weg) of bij de tik die het donkere always-on-scherm wekt (die opent toch niets).
 */
export function useAppUpdate(enabled: boolean, intervalMs = 30 * 60_000): void {
  React.useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    let reloading = false;
    const reloadWhenIdle = () => {
      if (reloading) return;
      const busy = () => {
        const el = document.activeElement;
        return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
      };
      if (busy()) { window.setTimeout(reloadWhenIdle, 60_000); return; }
      reloading = true;
      window.location.reload();
    };
    // Eerste overname bij een verse installatie is geen nieuwe versie: enkel herladen als er al een controller was.
    const hadController = !!navigator.serviceWorker.controller;
    let pending = false;
    const onChange = () => {
      if (!hadController) return;
      pending = true;
      if (document.visibilityState === "hidden") reloadWhenIdle();
    };
    const onHidden = () => { if (pending && document.visibilityState === "hidden") reloadWhenIdle(); };
    const onWakeTap = () => { if (pending && document.documentElement.dataset.aod) reloadWhenIdle(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pointerdown", onWakeTap, { capture: true });
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    const check = () => { void navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined); };
    const timer = window.setInterval(check, intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pointerdown", onWakeTap, { capture: true });
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs]);
}
