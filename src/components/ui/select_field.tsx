"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectFieldOption = {
  value: string;
  label: string;
  /** Kleur van het bolletje vóór het label (bv. een categorie). */
  dotColor?: string;
};

/**
 * Design system «Keuzeveld»: één waarde kiezen uit een lijst, in dezelfde vorm als het invoerveld
 * (grijs vlak zonder rand, radius 16, h 48; focus = wit met lavendel rand). Optioneel een gekleurd bolletje.
 * Onder het vlak ligt een gewone `<select>`, zodat gsm's hun eigen keuzelijst tonen en het toegankelijk blijft.
 */
export function SelectField({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectFieldOption>;
  ariaLabel: string;
  className?: string;
}) {
  const current = options.find((o) => o.value === value) ?? null;
  return (
    <div
      className={cn(
        "relative flex h-12 min-w-0 items-center gap-2 rounded-[16px] bg-[var(--gray-25)] pl-3.5 pr-3 transition-colors focus-within:bg-[var(--white)] focus-within:shadow-[inset_0_0_0_1.5px_var(--border-focus)]",
        className,
      )}
    >
      {current?.dotColor ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: current.dotColor }} /> : null}
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--text-primary)]">{current?.label ?? ""}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 shrink-0 text-[var(--text-secondary)]">
        <path d="m6 9 6 6 6-6" />
      </svg>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
