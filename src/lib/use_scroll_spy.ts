"use client";

import * as React from "react";

/** DOM-id van een sectie die de scroll-spy volgt. */
export function scrollSpyId(prefix: string, key: string): string {
  return `${prefix}-${key}`;
}

/**
 * Inhoudstafel: welke sectie staat bovenaan (onder `getOffset()` px), en springen naar een sectie.
 * Na een sprong blijft de gekozen sectie actief tot de gebruiker zelf weer scrolt, ook als de
 * pagina niet ver genoeg kan scrollen om ze helemaal bovenaan te zetten.
 */
export function useScrollSpy(prefix: string, keys: string[], getOffset: () => number) {
  const [active, setActive] = React.useState<string | null>(keys[0] ?? null);
  const lock = React.useRef<number | null>(null);
  const offsetRef = React.useRef(getOffset);
  offsetRef.current = getOffset;
  const keysSig = keys.join("|");

  React.useEffect(() => {
    const list = keysSig ? keysSig.split("|") : [];
    if (list.length === 0) return;
    const release = () => {
      lock.current = null;
    };
    const update = () => {
      // Scrollen door een sprong: de gekozen sectie blijft actief tot het scrollen stopt.
      if (lock.current !== null) {
        window.clearTimeout(lock.current);
        lock.current = window.setTimeout(release, 150);
        return;
      }
      const line = offsetRef.current() + 8;
      let current = list[0];
      for (const key of list) {
        const el = document.getElementById(scrollSpyId(prefix, key));
        if (el && el.getBoundingClientRect().top <= line) current = key;
      }
      const root = document.documentElement;
      const scrollable = root.scrollHeight > window.innerHeight + 4;
      if (scrollable && window.innerHeight + window.scrollY >= root.scrollHeight - 2) current = list[list.length - 1];
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [prefix, keysSig]);

  const jumpTo = React.useCallback(
    (key: string) => {
      const el = document.getElementById(scrollSpyId(prefix, key));
      if (!el) return;
      setActive(key);
      if (lock.current !== null) window.clearTimeout(lock.current);
      lock.current = window.setTimeout(() => {
        lock.current = null;
      }, 300);
      const top = window.scrollY + el.getBoundingClientRect().top - offsetRef.current();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    },
    [prefix],
  );

  return { active, jumpTo };
}
