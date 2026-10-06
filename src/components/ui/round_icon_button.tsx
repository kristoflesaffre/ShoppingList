"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type RoundIconButtonTone = "primary" | "danger" | "neutral" | "surface" | "onColor";
export type RoundIconButtonSize = 28 | 32 | 36;

const TONES: Record<RoundIconButtonTone, string> = {
  /** Zacht lavendel: acties (potlood, diepvries, +). */
  primary: "bg-[var(--blue-50)] text-[var(--blue-500)] [@media(hover:hover)]:hover:bg-[var(--blue-100)]",
  /** Zacht rood: verwijderen. */
  danger: "bg-[var(--error-25)] text-[var(--error-400)] [@media(hover:hover)]:hover:bg-[var(--error-50,#fde2e2)]",
  /** Lichtgrijs: sluiten. */
  neutral: "bg-[var(--gray-50)] text-[var(--text-secondary)] [@media(hover:hover)]:hover:bg-[var(--gray-100)]",
  /** Wit met schaduw, los op de pagina (zoeken). */
  surface: "bg-[var(--white)] text-[var(--text-secondary)] shadow-[0_1px_3px_rgba(16,17,48,0.10)]",
  /** Wit op een gekleurde kaartkop (+ in kaartkop). */
  onColor: "bg-[rgba(255,255,255,0.75)] text-[var(--blue-500)]",
};

const ICON_SIZE: Record<RoundIconButtonSize, string> = {
  28: "[&_svg]:size-3.5",
  32: "[&_svg]:size-4",
  36: "[&_svg]:size-[18px]",
};

/**
 * Design system «Ronde icoonknop». Maten: 28 in kaartkoppen en lijstrijen, 32 naast een titel
 * (potlood), 36 los op de pagina (zoeken, sluiten). Altijd een `aria-label`.
 */
export const RoundIconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: RoundIconButtonTone;
    size?: RoundIconButtonSize;
    "aria-label": string;
  }
>(function RoundIconButton({ tone = "primary", size = 32, className, children, style, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:pointer-events-none disabled:opacity-40",
        TONES[tone],
        ICON_SIZE[size],
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      {children}
    </button>
  );
});

/** Veelgebruikte iconen voor ronde icoonknoppen (stroke = currentColor). */
export const RoundIcons = {
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  ),
  pencil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  ),
};
