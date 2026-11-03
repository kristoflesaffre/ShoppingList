"use client";

import * as React from "react";

/**
 * Zachte fade aan de kant van een horizontale scrollrij waar nog iets volgt (klasse `.edge-fade`, enkel desktop).
 * Zet `data-fade-start` / `data-fade-end` op het element naargelang de scrollpositie.
 */
export function useEdgeFade(ref: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.toggleAttribute("data-fade-start", el.scrollLeft > 2);
      el.toggleAttribute("data-fade-end", el.scrollLeft < max - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  });
}
