"use client";

import * as React from "react";

/**
 * Het tablet-dashboard blijft dagen open (ook in always-on), en zou anders de app-versie van de eerste keer blijven
 * tonen. Zolang `enabled`: elk halfuur vragen of er een nieuwe service worker is; neemt die het over
 * (`skipWaiting` + `clientsClaim` in src/app/sw.ts), dan herlaadt de pagina vanzelf. Niet terwijl je iets typt.
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
    const onChange = () => { if (hadController) reloadWhenIdle(); };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    const check = () => { void navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined); };
    const timer = window.setInterval(check, intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs]);
}
