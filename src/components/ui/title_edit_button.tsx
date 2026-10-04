"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bewerkknop naast een paginatitel (canvas «Bewerkknop · 5 Zacht bolletje»):
 * potlood in een zacht lavendel bolletje, zodat het duidelijk een knop is.
 */
export function TitleEditButton({
  className,
  "aria-label": ariaLabel = "Bewerken",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-95 [@media(hover:hover)]:hover:bg-[var(--blue-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
      </svg>
    </button>
  );
}

/** «Gereed»-pil die de bewerkmodus afsluit (canvas «Bewerkknop · 3 Zachte pil», actieve stand). */
export function DoneButton({
  className,
  children = "Gereed",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-pill bg-[var(--blue-500)] px-3.5 text-sm font-semibold text-white transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] [@media(hover:hover)]:hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      {children}
    </button>
  );
}
