"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Filterchip»: compact (30px), halfvet. Actief vol blauw met witte tekst,
 * inactief lichtgrijs met grijze tekst. Optioneel een gekleurd bolletje (categorie) en een teller.
 */
export function FilterChip({
  selected,
  onClick,
  children,
  dotColor,
  count,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Kleur van het categoriebolletje (CSS-kleur). */
  dotColor?: string;
  /** Aantal achter het label, bv. «Groenten 9». */
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-[11px] text-[12.5px] font-semibold transition-[background-color,color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1",
        selected
          ? "bg-[var(--blue-500)] text-white"
          : "bg-[var(--gray-50)] text-[var(--text-secondary)] [@media(hover:hover)]:hover:bg-[var(--gray-100)]",
        className,
      )}
    >
      {dotColor ? <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden /> : null}
      {children}
      {count != null ? <span className="font-medium opacity-70 tabular-nums">{count}</span> : null}
    </button>
  );
}

/** Horizontaal scrollbare rij chips die tot aan de schermrand doorloopt (of laat ze wrappen met `wrap`). */
export function FilterChipRow({
  children,
  wrap = false,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  wrap?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  if (wrap) {
    return (
      <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
        {children}
      </div>
    );
  }
  return (
    <div className={cn("-mx-4 min-w-0 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      <div role="group" aria-label={ariaLabel} className="flex w-max gap-1.5 pb-0.5">
        {children}
      </div>
    </div>
  );
}
