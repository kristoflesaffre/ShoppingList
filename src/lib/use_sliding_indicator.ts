"use client";

import * as React from "react";

/**
 * Schuivende achtergrond voor segmentknoppen: meet de actieve knop en geeft de positie en breedte
 * terug voor een absolute «pil» die er met een easing naartoe schuift. De eerste plaatsing gebeurt
 * zonder animatie (geen schuif bij het laden); daarna animeert elke wissel. Meet opnieuw als de
 * knoppen van grootte veranderen (lettertype geladen, vertaling, venster).
 */
export function useSlidingIndicator<T extends HTMLElement = HTMLDivElement>(activeIndex: number) {
  const containerRef = React.useRef<T>(null);
  const [box, setBox] = React.useState<{ left: number; width: number; top: number; height: number } | null>(null);
  const [animate, setAnimate] = React.useState(false);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const buttons = container?.querySelectorAll<HTMLElement>("[data-segment]");
    const active = buttons?.[activeIndex];
    if (!active) return;
    setBox({ left: active.offsetLeft, width: active.offsetWidth, top: active.offsetTop, height: active.offsetHeight });
  }, [activeIndex]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Pas na de eerste plaatsing animeren.
  React.useEffect(() => {
    if (!box || animate) return;
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, [box, animate]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    container.querySelectorAll("[data-segment]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measure]);

  const indicatorStyle: React.CSSProperties = box
    ? {
        transform: `translateX(${box.left}px)`,
        width: box.width,
        top: box.top,
        height: box.height,
        transition: animate
          ? // Zachte iOS-achtige curve: zichtbaar schuiven, rustig uitlopen.
            // Ook kleur, schaduw en hoeken: verandert de stijl van de schakelaar (bv. glas op het dashboard), dan
            // vloeit de pil mee i.p.v. te verspringen.
            "transform 380ms cubic-bezier(0.32, 0.72, 0, 1), width 380ms cubic-bezier(0.32, 0.72, 0, 1), background-color 420ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 420ms cubic-bezier(0.32, 0.72, 0, 1), border-radius 420ms cubic-bezier(0.32, 0.72, 0, 1)"
          : "none",
      }
    : { opacity: 0 };

  return { containerRef, indicatorStyle };
}
