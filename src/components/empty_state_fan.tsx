"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type EmptyStateFanItem = {
  key: string;
  /** Eindpositie t.o.v. het midden (px) en kanteling (graden). */
  dx: number;
  dy: number;
  rotate: number;
  node: React.ReactNode;
};

const DURATION_MS = 720;
/** Schiet licht voorbij en zet zich dan: de «bounce» van de waaier. */
const EASE_BOUNCE = "cubic-bezier(0.34, 1.45, 0.64, 1)";
/** Startwaaier: breder en schuiner dan de eindstand. */
const SPREAD = 1.7;
/** De voorste kaart start zoveel lager. */
const FRONT_RISE_PX = 16;

function place(dx: number, dy: number, rotate: number, scale = 1) {
  return `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${rotate}deg) scale(${scale})`;
}

/**
 * Design system «Waaier (lege staat)»: kaartjes in een waaier (achterste eerst). Bij het laden
 * vertrekken de achterste uit een bredere, schuinere waaier; de voorste staat er al en schuift van
 * wat lager omhoog. Alles veert met een lichte bounce naar zijn plek.
 * Zonder animatie bij «verminderde beweging».
 */
export function EmptyStateFan({ items, className }: { items: EmptyStateFanItem[]; className?: string }) {
  const refs = React.useRef<Array<HTMLSpanElement | null>>([]);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anims = items.map((it, i) => {
      const el = refs.current[i];
      if (!el) return null;
      const front = i === items.length - 1;
      // Voorste kaart staat er meteen (geen fade) en schuift enkel van wat lager omhoog;
      // de kaarten erachter waaieren vanuit een bredere stand in.
      const keyframes = front
        ? [
            { transform: place(it.dx, it.dy + FRONT_RISE_PX, it.rotate * 0.4) },
            { transform: place(it.dx, it.dy, it.rotate) },
          ]
        : [
            { transform: place(it.dx * SPREAD, it.dy * 1.4 + 10, it.rotate * SPREAD, 0.96), opacity: 0 },
            { opacity: 1, offset: 0.35 },
            { transform: place(it.dx, it.dy, it.rotate), opacity: 1 },
          ];
      return el.animate(
        keyframes,
        { duration: DURATION_MS, delay: i * 50, easing: EASE_BOUNCE, fill: "backwards" },
      );
    });
    return () => anims.forEach((a) => a?.cancel());
    // Alleen bij het verschijnen van de lege staat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden className={cn("relative shrink-0", className)}>
      {items.map((it, i) => (
        <span
          key={it.key}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="absolute left-1/2 top-1/2 block will-change-transform"
          style={{ transform: place(it.dx, it.dy, it.rotate), zIndex: i }}
        >
          {it.node}
        </span>
      ))}
    </div>
  );
}
