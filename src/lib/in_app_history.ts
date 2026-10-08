"use client";

/**
 * Houdt bij hoeveel stappen je binnen de app terug kan. Een pagina die rechtstreeks via een link
 * geopend werd heeft geen app-geschiedenis: `router.back()` doet dan niets of verlaat de app.
 */
let depth = 0;
let lastPath: string | null = null;
let popPending = false;
let replacePending = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popPending = true;
  });
}

/** Aangeroepen bij elke paginawissel (zie `InAppHistoryTracker`). */
export function noteInAppNavigation(path: string) {
  // Zelfde pad = geen wissel (React draait effects in dev twee keer).
  if (path === lastPath) return;
  if (lastPath === null) {
    lastPath = path;
    return;
  }
  lastPath = path;
  if (popPending) {
    depth = Math.max(0, depth - 1);
  } else if (!replacePending) {
    depth += 1;
  }
  popPending = false;
  replacePending = false;
}

export function hasInAppHistory(): boolean {
  return depth > 0;
}

/**
 * Terug in de geschiedenis als je binnen de app hierheen kwam, anders naar de bovenliggende
 * pagina (vervangen, zodat «terug» daar niet opnieuw hier uitkomt).
 */
export function backOr(router: { back: () => void; replace: (href: string) => void }, fallback: string) {
  if (hasInAppHistory()) {
    router.back();
  } else {
    replacePending = true;
    router.replace(fallback);
  }
}
