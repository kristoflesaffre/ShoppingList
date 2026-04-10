"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Wacht even voordat de spinner zichtbaar is: voorkomt flitsen bij zeer snelle navigatie. */
const SHOW_SPINNER_AFTER_MS = 220;

type RouteLoadingSpinnerProps = {
  /** Achtergrond: transparant (gradient van layout) of effen wit (detailpagina’s). */
  surface?: "transparent" | "white";
};

/**
 * Minimale route-loading: alleen een gecentreerde spinner, geen tekst.
 * Verschijnt pas na korte delay zodat korte laads geen storende flits geven.
 */
export function RouteLoadingSpinner({
  surface = "transparent",
}: RouteLoadingSpinnerProps) {
  const [showSpinner, setShowSpinner] = React.useState(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setShowSpinner(true), SHOW_SPINNER_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-dvh w-full flex-col",
        surface === "white" ? "bg-[var(--white)]" : "bg-transparent",
      )}
      role="status"
      aria-busy="true"
      aria-label="Bezig met laden"
    >
      {showSpinner ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="route-loading-spinner" aria-hidden />
        </div>
      ) : (
        <div className="flex-1" aria-hidden />
      )}
    </div>
  );
}
