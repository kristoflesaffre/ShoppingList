"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Keuzerij»: één item kiezen uit een lijst (bv. een recept).
 * Rij met beeld · titel · subtitel · keuzerondje; gekozen = lavendel vlak, blauwe rand en rond blauw vinkje.
 * Zet de rijen in een `role="radiogroup"`.
 */
export function ChoiceRow({
  selected,
  onSelect,
  media,
  title,
  subtitle,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  media?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[14px] px-2.5 py-[9px] text-left transition-[background-color,box-shadow] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        selected
          ? "bg-[var(--blue-25)] shadow-[inset_0_0_0_1.5px_var(--blue-500)]"
          : "[@media(hover:hover)]:hover:bg-[var(--gray-25)]",
        className,
      )}
    >
      {media}
      <span className="min-w-0 flex-1 leading-[19px]">
        <span className="block truncate text-[15px] font-medium text-text-primary">{title}</span>
        {subtitle ? <span className="block truncate text-[13px] text-[var(--text-tertiary)]">{subtitle}</span> : null}
      </span>
      {selected ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] motion-safe:animate-pop" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      ) : (
        <span className="size-[22px] shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_var(--blue-200)]" aria-hidden />
      )}
    </button>
  );
}
