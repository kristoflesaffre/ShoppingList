"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSlidingIndicator } from "@/lib/use_sliding_indicator";

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
 * De witte pil schuift met een easing naar de gekozen optie.
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
  /** `md` = 32px hoog; `lg` = 38px (trog 44px, naast een zoekveld van 44px); `icon` = vierkante icoonknoppen. */
  size?: "md" | "lg" | "icon";
  className?: string;
}) {
  // De pil volgt meteen de keuze; de (soms zware) wissel in de ouder volgt twee frames later, zodat
  // de schuifanimatie al loopt voordat de pagina opnieuw tekent.
  const [shown, setShown] = React.useState(value);
  React.useEffect(() => setShown(value), [value]);
  const choose = (v: T) => {
    if (v === value) return;
    setShown(v);
    requestAnimationFrame(() => requestAnimationFrame(() => onChange(v)));
  };
  const { containerRef, indicatorStyle } = useSlidingIndicator(Math.max(0, options.findIndex((o) => o.value === shown)));
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = e.key === "ArrowRight" ? index + 1 : e.key === "ArrowLeft" ? index - 1 : -1;
    if (next < 0 || next >= options.length) return;
    e.preventDefault();
    choose(options[next].value);
    (e.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
  };
  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("relative isolate flex gap-0.5 rounded-[13px] bg-[var(--gray-50)] p-[3px]", fill ? "w-full" : "w-fit shrink-0", className)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 -z-10 rounded-[10px] bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.12)] motion-reduce:!transition-none"
        style={indicatorStyle}
      />
      {options.map((o, i) => {
        const on = o.value === shown;
        return (
          <button
            key={o.value}
            data-segment
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.ariaLabel}
            tabIndex={on ? 0 : -1}
            onClick={() => choose(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex items-center justify-center rounded-[10px] text-[13.5px] font-semibold transition-colors duration-200 ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              size === "lg" ? "h-[38px] px-4" : "h-8",
              size === "icon" ? "w-9" : size === "lg" ? "" : "px-3",
              fill && size !== "icon" && "min-w-0 flex-1",
              on ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] [@media(hover:hover)]:hover:text-[var(--text-primary)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
