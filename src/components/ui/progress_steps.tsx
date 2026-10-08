"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Voortgangsstappen» (canvas «18 · bezig»): wat er gebeurt terwijl AI een recept
 * ophaalt. Klaar = blauw vinkje, bezig = draaiend rondje, nog te doen = grijs rondje.
 */
export function ProgressSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol
      aria-live="polite"
      className="m-0 flex list-none flex-col gap-3.5 rounded-[18px] bg-[var(--gray-25)] px-[18px] py-4"
    >
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "now" : "todo";
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-3 text-[15px] leading-5",
              state === "todo" ? "font-medium text-[var(--text-tertiary)]" : "text-[var(--text-primary)]",
              state === "now" ? "font-semibold" : "font-medium",
            )}
          >
            {state === "done" ? (
              <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-500)] text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
            ) : state === "now" ? (
              <span aria-hidden className="m-0.5 block size-[18px] shrink-0 animate-spin rounded-full border-[2.4px] border-[var(--blue-50)] border-t-[var(--blue-500)] motion-reduce:animate-none" />
            ) : (
              <span aria-hidden className="block size-[22px] shrink-0 rounded-full shadow-[inset_0_0_0_1.6px_var(--gray-100)]" />
            )}
            <span>
              {label}
              {state === "done" ? <span className="sr-only"> — klaar</span> : state === "now" ? <span className="sr-only"> — bezig</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Laat de stappen vooruitlopen terwijl een verzoek loopt (de server meldt geen tussenstappen):
 * na `delays[i]` ms gaat stap i+1 van start; de laatste stap blijft «bezig» tot het antwoord er is.
 */
export function useProgressSteps(active: boolean, delays: number[]): number {
  const [current, setCurrent] = React.useState(0);
  React.useEffect(() => {
    if (!active) {
      setCurrent(0);
      return;
    }
    const timers = delays.map((ms, i) => window.setTimeout(() => setCurrent((c) => Math.max(c, i + 1)), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return current;
}
