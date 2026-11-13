"use client";

import * as React from "react";
import { fitZoom } from "@/lib/fit-to-screen";

/** Vrije ruimte tussen de inhoud en de tabbalk (zoals op een iPad liggend, waar het ontwerp precies past). */
const GAP = 4;

/**
 * Laat een pagina op een tablet in één scherm passen (zie `fitZoom`): is de inhoud hoger dan het scherm tot
 * aan de tabbalk, dan verkleint de hele pagina met CSS `zoom`. Dezelfde opbouw, alleen kleiner; past ze al,
 * dan verandert er niets.
 *
 * - `frame`: de buitenste laag van de pagina; krijgt de zoom en `data-fit` zolang ze verkleind is (de pagina
 *   laat dan haar ondermarge voor de tabbalk vallen, anders zou ze nog net scrollen). Onder de verkleinde
 *   pagina loopt de achtergrond van `html` door: dezelfde kleur, dus geen naad.
 * - `content`: de inhoud op haar natuurlijke hoogte (niet uitgerekt tot de schermhoogte).
 *
 * Meet opnieuw als de inhoud of het scherm van grootte verandert. Enkel in de brede opbouw (lg, 1024 px).
 */
/** `spread`: de pagina gebruikt `--fit-spare` (marges die meegroeien); enkel dan wordt die ruimte berekend. */
export function useFitToScreen(enabled: boolean, designWidth: number, max = 1, spread = false) {
  const [frame, setFrame] = React.useState<HTMLElement | null>(null);
  const [content, setContent] = React.useState<HTMLElement | null>(null);

  React.useLayoutEffect(() => {
    if (!enabled || !frame || !content) return;
    const wide = window.matchMedia("(min-width: 1024px)");

    // Meetlat van 100 px in de pagina zelf. Browsers geven de afmetingen van iets dat gezoomd is anders terug
    // (oudere Chrome en Safari: zonder de zoom; Chrome vanaf 128: mét). Door de inhoud te vergelijken met een
    // vlak waarvan we de echte hoogte kennen, klopt de meting in beide gevallen.
    const ruler = document.createElement("span");
    ruler.setAttribute("aria-hidden", "true");
    ruler.style.cssText = "position:absolute;left:0;top:0;width:1px;height:100px;visibility:hidden;pointer-events:none";
    frame.appendChild(ruler);

    let current = 1;
    let previous = 1;
    let appliedAt = 0;
    // Vergroot maar nog ruimte over (de breedte was op voor de hoogte): de rest als `--fit-spare` (in paginapixels),
    // zodat de pagina die tussen haar blokken verdeelt i.p.v. een lege strook onderaan te laten.
    let spare = 0;
    const setSpare = (px: number) => {
      const next = Math.max(0, Math.floor(px));
      if (Math.abs(next - spare) < 2) return;
      spare = next;
      if (spare > 0) frame.style.setProperty("--fit-spare", `${spare}px`);
      else frame.style.removeProperty("--fit-spare");
    };
    const apply = (zoom: number) => {
      previous = current;
      current = zoom;
      appliedAt = performance.now();
      if (zoom === 1) {
        frame.style.removeProperty("zoom");
        frame.style.removeProperty("min-height");
        delete frame.dataset.fit;
      } else {
        frame.style.setProperty("zoom", String(zoom));
        // Vergroot: `min-h-dvh` zou mee vergroten en de pagina hoger maken dan het scherm.
        if (zoom > 1) frame.style.minHeight = `calc(100dvh / ${zoom} - 1px)`; // − 1px: afronding mag niet laten scrollen
        else frame.style.removeProperty("min-height");
        frame.dataset.fit = "";
      }
    };

    const measure = () => {
      if (!wide.matches) {
        if (current !== 1) apply(1);
        return;
      }
      const unit = ruler.getBoundingClientRect().height / 100;
      if (!(unit > 0)) return;
      // Een verschuiving van het binnenkomen (fade-up) telt niet mee: die is na een fractie van een seconde weg.
      let shift = 0;
      for (let el: HTMLElement | null = content; el && el !== frame; el = el.parentElement) {
        const t = getComputedStyle(el).transform;
        if (t && t !== "none") shift += new DOMMatrixReadOnly(t).m42;
      }
      // Zonder de verdeelde extra ruimte: die hangt zelf van de uitkomst af.
      const natural = (content.getBoundingClientRect().bottom - frame.getBoundingClientRect().top) / unit - shift - spare;
      // Tot waar mag de inhoud komen? Tot aan de tabbalk: haar hoogte plus haar afstand tot de schermrand. Niet de
      // plaats van de balk zelf meten: in always-on verschuift `body` (pixelbaan) en hangt de vaste balk aan de
      // pagina in plaats van aan het scherm. Ze is dan onzichtbaar maar telt nog mee, zodat de pagina bij het
      // indommelen niet van grootte verandert.
      const nav = document.querySelector<HTMLElement>("[data-app-bottom-nav]");
      const reserve = nav ? nav.offsetHeight + (parseFloat(getComputedStyle(nav).bottom) || 0) : 16;
      const available = window.innerHeight - reserve - GAP;
      const next = fitZoom({ available, content: natural, viewportWidth: document.documentElement.clientWidth, designWidth, max });
      setSpare(spread && next > 1 ? available / next - natural : 0);
      if (Math.abs(next - current) < 0.002) return;
      // Breekt een titel bij de ene zoom net wel en bij de andere net niet af, dan zou de pagina tussen twee
      // groottes blijven springen. Terug naar de grootte van daarnet mag daarom niet meteen: de kleinste blijft.
      if (next > current && Math.abs(next - previous) < 0.002 && performance.now() - appliedAt < 1000) return;
      apply(next);
    };

    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    };

    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(content);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    wide.addEventListener("change", schedule);
    // De pagina komt met een korte beweging binnen; daarna staat alles op zijn plaats.
    frame.addEventListener("animationend", schedule);

    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      wide.removeEventListener("change", schedule);
      frame.removeEventListener("animationend", schedule);
      ruler.remove();
      frame.style.removeProperty("--fit-spare");
      frame.style.removeProperty("zoom");
      frame.style.removeProperty("min-height");
      delete frame.dataset.fit;
    };
  }, [enabled, frame, content, designWidth, max, spread]);

  return { frameRef: setFrame, contentRef: setContent };
}
