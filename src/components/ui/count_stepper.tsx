"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Stepper · lijst»: blauwe pil met witte bolletjes (− / aantal / +). Bij 1 wordt de
 * min een rood vuilbakje (`onChange(0)` = weghalen). `tone="soft"`: zachte lavendel pil voor rijen
 * waar de stepper altijd zichtbaar is (diepvries). Voor formulieren: Stepper (breed grijs veld).
 */
export function CountStepper({
  name,
  value,
  onChange,
  tone = "solid",
  className,
}: {
  /** Naam van het item, voor de toegankelijke labels. */
  name: string;
  value: number;
  /** 0 = item weghalen. */
  onChange: (next: number) => void;
  tone?: "solid" | "soft";
  className?: string;
}) {
  const soft = tone === "soft";
  const btn = cn(
    "flex shrink-0 items-center justify-center rounded-full transition-transform duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2",
    soft ? "size-[38px] focus-visible:ring-[var(--border-focus)]" : "size-7 bg-[var(--white)] focus-visible:ring-[var(--white)]",
  );
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-pill",
        soft ? "h-[38px] bg-[var(--blue-25)]" : "h-[34px] gap-0.5 bg-[var(--blue-500)] px-[3px]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label={value <= 1 ? `${name} verwijderen` : `Minder ${name}`}
        className={cn(btn, value <= 1 ? "text-[var(--error-400)]" : "text-[var(--blue-500)]")}
      >
        {value <= 1 ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
            <path d="M6 12h12" />
          </svg>
        )}
      </button>
      <span
        className={cn("text-center tabular-nums", soft ? "min-w-5 text-[15px] font-bold text-[var(--blue-500)]" : "min-w-[22px] text-sm font-bold text-white")}
        aria-live="polite"
      >
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label={`Meer ${name}`} className={cn(btn, "text-[var(--blue-500)]")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </span>
  );
}
