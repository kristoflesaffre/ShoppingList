"use client";

import * as React from "react";
import { applyTheme, readThemePreference } from "@/lib/theme";
import { keepScreenAwake } from "@/lib/screen-wake-lock";

/**
 * Always-on-scherm voor het tablet-dashboard (AMOLED): na `idleMs` zonder aanraking wordt het
 * dashboard donker (canvas «Always-on · 2 Schemering»). Exact dezelfde opbouw — enkel kleuren wijzigen.
 *
 * Tegen inbranden en voor minder verbruik (details in globals.css, «Always-on-scherm»):
 * - donker thema op een zwarte achtergrond (`html[data-aod]`);
 * - pixelbaan: het scherm springt onzichtbaar 2 px per 2,5 min in een 3×3-raster;
 * - pixelrust: elk uur 2 s naar zwart; tabbalk verborgen;
 * - nachtstand 22–7 u: alles extra gedimd (`data-aod="night"`);
 * - elementen leven: foto's zoomen traag, wolken drijven, de klok knippert, voorbije afspraken vervagen;
 * - het scherm blijft aan via Screen Wake Lock zolang het dashboard open en zichtbaar is.
 * Een tik eender waar zet het gewone dashboard terug; die eerste tik opent niets (behalve op `[data-aod-pass]`).
 * Met `?aod=1` in de adresbalk start het meteen (handig om te testen). Met `?aod=demo` start het meteen
 * én loopt alles versneld (pixelbaan elke 3 s, pixelrust elke 30 s), zodat je ziet dat het werkt.
 */
export function useAlwaysOn(enabled: boolean, idleMs = 2 * 60_000): boolean {
  const [active, setActive] = React.useState(false);
  const [wide, setWide] = React.useState(false);

  // Enkel op tablet/desktop (zelfde breekpunt als het dashboard, md = 768 px).
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const on = enabled && wide;

  // Safari kan de aanvraag bij het openen weigeren of de lock later zelf loslaten.
  // Herstel bij de eerste aanraking, na terugkeren en na een release van iPadOS.
  React.useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    const stop = keepScreenAwake({
      wakeLock: navigator.wakeLock,
      document,
      window,
      onState: (state) => { root.dataset.aodWakeLock = state; },
    });
    return () => {
      stop();
      delete root.dataset.aodWakeLock;
    };
  }, [on]);

  // Inactiviteit: na idleMs naar always-on; elke aanraking zet de teller terug.
  React.useEffect(() => {
    if (!on) {
      setActive(false);
      return;
    }
    const forced = new URLSearchParams(window.location.search).get("aod");
    if (forced === "1" || forced === "demo") setActive(true);
    let timer = window.setTimeout(() => setActive(true), idleMs);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setActive(true), idleMs);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [on, idleMs]);

  // Wakker worden: de eerste tik zet het dashboard terug en wordt niet doorgegeven (geen link openen).
  React.useEffect(() => {
    if (!active) return;
    const wake = (e: Event) => {
      // Elementen met `data-aod-pass` (bv. een gerecht op de always-on-kalender) werken meteen, zonder eerst wakker te maken.
      if (e.target instanceof Element && e.target.closest("[data-aod-pass]")) return;
      e.preventDefault();
      e.stopPropagation();
      setActive(false);
      const swallowClick = (c: Event) => {
        c.preventDefault();
        c.stopPropagation();
      };
      window.addEventListener("click", swallowClick, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallowClick, { capture: true }), 600);
    };
    window.addEventListener("pointerdown", wake, { capture: true });
    window.addEventListener("keydown", wake, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", wake, { capture: true });
      window.removeEventListener("keydown", wake, { capture: true });
    };
  }, [active]);

  // Donker thema en nachtstand. Pixelbaan, pixelrust en de animaties zijn pure CSS (globals.css),
  // zodat ze blijven lopen ook als JavaScript-timers vertragen of stilvallen.
  React.useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const demo = new URLSearchParams(window.location.search).get("aod") === "demo";
    const updateNight = () => {
      const h = new Date().getHours();
      root.dataset.aod = h >= 22 || h < 7 ? "night" : "on";
    };
    root.dataset.theme = "dark";
    if (demo) root.dataset.aodDemo = "";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", "#000000"));
    updateNight();
    const interval = window.setInterval(updateNight, 60_000);
    document.addEventListener("visibilitychange", updateNight);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateNight);
      delete root.dataset.aod;
      delete root.dataset.aodDemo;
      applyTheme(readThemePreference());
    };
  }, [active]);

  return active;
}
