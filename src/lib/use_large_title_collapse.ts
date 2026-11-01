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
  const titleElRef = React.useRef<T | null>(null);

  const observe = React.useCallback(
    (el: T) => {
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

  const titleRef = React.useCallback(
    (el: T | null) => {
      titleElRef.current = el;
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!el || typeof IntersectionObserver === "undefined") {
        setCollapsed(false);
        return;
      }
      observe(el);
    },
    [observe],
  );

  React.useEffect(() => {
    // Strict Mode ruimt effecten één keer extra op zonder de ref opnieuw aan te roepen.
    if (titleElRef.current && !observerRef.current && typeof IntersectionObserver !== "undefined") {
      observe(titleElRef.current);
    }
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [observe]);

  return { titleRef, collapsed } as const;
}
