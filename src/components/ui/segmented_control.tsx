"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  /** Zichtbare inhoud: tekst of een icoon. */
  label: React.ReactNode;
  /** Verplicht bij een icoon zonder tekst. */
  ariaLabel?: string;
};

/**
 * Design system «Segmentknop»: kiezen tussen 2–4 opties naast elkaar.
 * Grijze trog (gray-50, radius 13, 3px inzet), actieve optie wit met donkere tekst en zachte
 * schaduw. Blauw blijft voor acties. Onderlijn-tabs (TabGroup) blijven een apart patroon.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fill = true,
  size = "md",
  className,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Opties verdelen de volle breedte (standaard), of nemen enkel hun eigen breedte. */
  fill?: boolean;
  /** `md` = 32px hoog; `icon` = vierkante icoonknoppen. */
  size?: "md" | "icon";
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = e.key === "ArrowRight" ? index + 1 : e.key === "ArrowLeft" ? index - 1 : -1;
    if (next < 0 || next >= options.length) return;
    e.preventDefault();
    onChange(options[next].value);
    (e.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex gap-0.5 rounded-[13px] bg-[var(--gray-50)] p-[3px]", fill ? "w-full" : "w-fit shrink-0", className)}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.ariaLabel}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex h-8 items-center justify-center rounded-[10px] text-[13.5px] font-semibold transition-[background-color,color,box-shadow] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              size === "icon" ? "w-9" : "px-3",
              fill && size !== "icon" && "min-w-0 flex-1",
              on
                ? "bg-[var(--white)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(16,17,48,0.12)]"
                : "text-[var(--text-secondary)] [@media(hover:hover)]:hover:text-[var(--text-primary)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
