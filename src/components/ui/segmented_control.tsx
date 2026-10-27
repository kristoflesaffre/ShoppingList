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
 *
 * `tone="glass"` (dashboard, canvas «Schakelaar in glas» G3): op de avondlucht ([data-sunset]) een rookglazen
 * pil met witte keuze; in het donkere thema en always-on een donker glas met een licht glasplaatje als keuze
 * (een witte pil zou daar verblinden). Op een lichte achtergrond blijft het de gewone grijze trog.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fill = true,
  size = "md",
  className,
  tone = "default",
  glassFor,
  onSelect,
  commitDelay = 0,
  disabled = false,
}: {
  /** Tijdelijk niet te bedienen (bv. terwijl een opdracht loopt): gedimd, tikken doet niets. */
  disabled?: boolean;
  /** ms tussen de tik en onChange: bij een zware wissel eerst de animatie afmaken, dan pas de inhoud. */
  commitDelay?: number;
  tone?: "default" | "glass";
  /** Glas zodra déze optie gekozen is: de stijl wisselt mee met de pil, op hetzelfde moment (geen wachten op de ouder). */
  glassFor?: T;
  /** Meteen bij de tik (vóór de vertraagde onChange), bv. om de achtergrond tegelijk te laten meelopen. */
  onSelect?: (value: T) => void;
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
    if (v === value || disabled) return;
    onSelect?.(v);
    setShown(v);
    if (commitDelay > 0) window.setTimeout(() => onChange(v), commitDelay);
    else requestAnimationFrame(() => requestAnimationFrame(() => onChange(v)));
  };
  const glass = glassFor !== undefined ? shown === glassFor : tone === "glass";
  const shownIndex = options.findIndex((o) => o.value === shown);
  const { containerRef, indicatorStyle } = useSlidingIndicator(Math.max(0, shownIndex));
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
      className={cn(
        "relative isolate flex gap-0.5 rounded-[13px] bg-[var(--gray-50)] p-[3px]",
        // Zelfde curve als de pil: oppervlak, rand en hoeken lopen mee als «smart animate».
        "transition-[background-color,box-shadow,border-radius,backdrop-filter] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        glass && GLASS_TROUGH,
        disabled && "opacity-40",
        fill ? "w-full" : "w-fit shrink-0",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 -z-10 rounded-[10px] bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.12)] motion-reduce:!transition-none",
          glass && GLASS_PILL,
          // Geen geldige keuze (bv. twee rolluiken in een andere stand): geen pil.
          shownIndex < 0 && "opacity-0",
        )}
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
            disabled={disabled}
            tabIndex={on ? 0 : -1}
            onClick={() => choose(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex items-center justify-center rounded-[10px] text-[13.5px] font-semibold disabled:cursor-not-allowed transition-[color,border-radius] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              size === "lg" ? "h-[38px] px-4" : "h-8",
              size === "icon" ? (fill ? "min-w-0 flex-1" : "w-9") : size === "lg" ? "" : "px-3",
              fill && size !== "icon" && "min-w-0 flex-1",
              on ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] [@media(hover:hover)]:hover:text-[var(--text-primary)]",
              glass && (on ? GLASS_TEXT_ON : GLASS_TEXT_OFF),
              glass && GLASS_ROUND,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Glastoon: avondlucht (licht thema), donker thema en always-on. Zonder die context: gewone trog.
// Voluit geschreven: Tailwind maakt enkel klassen die letterlijk in de bron staan. Geen rounded-full en geen
// andere padding: hoeken van 13 → 19px (pil van 38px) en 10 → 16px laten zich vloeiend animeren.
const GLASS_TROUGH =
  "[[data-sunset]_&]:rounded-[19px] [[data-sunset]_&]:bg-[rgba(30,12,48,0.28)] [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] [[data-sunset]_&]:backdrop-blur-[14px] " +
  "[[data-theme=dark]_&]:rounded-[19px] [[data-theme=dark]_&]:bg-[rgba(0,0,0,0.28)] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] [[data-theme=dark]_&]:backdrop-blur-[14px] " +
  "[[data-aod]_&]:rounded-[19px] [[data-aod]_&]:bg-[rgba(0,0,0,0.28)] [[data-aod]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]";
const GLASS_PILL =
  "[[data-sunset]_&]:rounded-[16px] [[data-sunset]_&]:bg-fixed-white [[data-sunset]_&]:shadow-[0_6px_14px_-8px_rgba(42,24,56,0.6)] " +
  "[[data-theme=dark]_&]:rounded-[16px] [[data-theme=dark]_&]:bg-fixed-white/[0.16] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] " +
  "[[data-aod]_&]:rounded-[16px] [[data-aod]_&]:bg-fixed-white/[0.16] [[data-aod]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
const GLASS_ROUND = "[[data-sunset]_&]:rounded-[16px] [[data-theme=dark]_&]:rounded-[16px] [[data-aod]_&]:rounded-[16px]";
const GLASS_TEXT_ON = "[[data-sunset]_&]:text-[#2a1838] [[data-theme=dark]_&]:text-fixed-white [[data-aod]_&]:text-fixed-white";
const GLASS_TEXT_OFF =
  "[[data-sunset]_&]:text-fixed-white/85 [[data-sunset]_&]:hover:text-fixed-white [[data-theme=dark]_&]:text-fixed-white/60 [[data-theme=dark]_&]:hover:text-fixed-white [[data-aod]_&]:text-fixed-white/60";
