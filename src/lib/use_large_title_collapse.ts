"use client";

import * as React from "react";

/**
 * «Large title»-patroon: de grote paginatitel staat in de content; de compacte
 * titel in de vaste topbalk verschijnt pas wanneer de grote titel uit beeld scrolt.
 *
 * Gebruik: `const { titleRef, collapsed } = useLargeTitleCollapse();`
 * Zet `titleRef` (callback-ref) op het grote titel-element en toon de compacte
 * titel op basis van `collapsed`. Werkt ook als de titel pas later mount
 * (bv. na laden) en binnen geneste scrollcontainers.
 *
 * @param topOffsetPx Hoogte van de vaste topbalk (px) zodat de observer pas triggert
 *                    wanneer de titel écht onder de balk verdwijnt.
 */
export function useLargeTitleCollapse<T extends HTMLElement = HTMLHeadingElement>(
  topOffsetPx = 56,
) {
  const [collapsed, setCollapsed] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  const titleRef = React.useCallback(
    (el: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!el || typeof IntersectionObserver === "undefined") {
        setCollapsed(false);
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          // Niet (meer) zichtbaar én boven de balk → compacte titel tonen.
          setCollapsed(
            !entry.isIntersecting && entry.boundingClientRect.top < topOffsetPx,
          );
        },
        { rootMargin: `-${topOffsetPx}px 0px 0px 0px`, threshold: 0 },
      );
      observer.observe(el);
      observerRef.current = observer;
    },
    [topOffsetPx],
  );

  React.useEffect(() => () => observerRef.current?.disconnect(), []);

  return { titleRef, collapsed } as const;
}
