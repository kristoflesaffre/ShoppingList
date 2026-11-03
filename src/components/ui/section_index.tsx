"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SectionIndexItem = {
  key: string;
  label: string;
  count?: number;
  /** Kleur van het bolletje (CSS-kleur), bv. de categoriekleur. */
  dotColor?: string;
  /** Klein icoon (15px) in plaats van een bolletje, bv. een waarschuwing bij «Bijna op». */
  icon?: React.ReactNode;
  /** Dunne scheidingslijn onder deze rij (bv. na «Alles» en «Bijna op»). */
  separatorAfter?: boolean;
};

/**
 * Design system «Inhoudstafel»: verticale lijst van secties naast de inhoud (desktop). Een rij springt
 * naar die sectie; de actieve rij (meestal via `useScrollSpy`) is wit met blauwe tekst. Op een
 * gekleurde achtergrond (Voorraadkast) een half doorzichtig wit vlak. Op gsm: een `FilterChipRow`.
 * (`white` is een CSS-variabele zonder alfa; daarom `fixed-white` voor de doorzichtige vlakken.)
 */
export function SectionIndex({
  items,
  activeKey,
  onSelect,
  ariaLabel,
  className,
}: {
  items: SectionIndexItem[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("rounded-[20px] bg-fixed-white/45 p-2 [[data-theme=dark]_&]:bg-fixed-white/5", className)}>
      <ul className="flex flex-col">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(item.key)}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[14px] transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  active
                    ? "bg-[var(--white)] font-bold text-[var(--blue-500)] shadow-card"
                    : "font-semibold text-[var(--text-primary)] [@media(hover:hover)]:hover:bg-fixed-white/60 [[data-theme=dark]_&]:[@media(hover:hover)]:hover:bg-fixed-white/10",
                )}
              >
                {item.icon ? (
                  <span aria-hidden className="flex size-[15px] shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                ) : item.dotColor ? (
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.dotColor }} />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.count != null ? <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[var(--text-tertiary)]">{item.count}</span> : null}
              </button>
              {item.separatorAfter ? (
                <div aria-hidden className="mx-3 my-2 h-px bg-[color-mix(in_srgb,var(--secondary-800)_15%,transparent)]" />
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
