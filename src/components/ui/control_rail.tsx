"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ControlRailAction = { label: string; disabled?: boolean; onClick: () => void };

const icons = {
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 15 6-6 6 6" /></svg>,
  down: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>,
  stop: <svg viewBox="0 0 24 24" aria-hidden className="!size-3.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>,
};

/**
 * Design system «Bedieningsrail»: omhoog · stop · omlaag als één verbonden pil, even hoog als het rolluik ernaast.
 * Omhoog en omlaag zijn schakelknoppen: ze blijven ingedrukt (`pressed`) zolang de beweging loopt; stop veert altijd terug.
 * `tone="surface"` wit op de app-achtergrond, `tone="glass"` op een donker paneel of in een kaart.
 */
export function ControlRail({ name, up, stop, down, pressed = null, tone = "surface", className }: {
  name: string;
  up: ControlRailAction;
  stop: Omit<ControlRailAction, "label">;
  down: ControlRailAction;
  /** Welke richting nu loopt; die knop staat ingedrukt. */
  pressed?: "up" | "down" | null;
  tone?: "surface" | "glass";
  className?: string;
}) {
  const glass = tone === "glass";
  const segment = cn(
    "flex min-h-0 w-full flex-1 items-center justify-center transition-[background-color,color,box-shadow] duration-fast ease-out-strong [&_svg]:size-[22px]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40",
    glass ? "focus-visible:ring-fixed-white" : "focus-visible:ring-[var(--border-focus)]",
  );
  const toggle = (on: boolean) => on
    ? "bg-[var(--blue-500)] text-[var(--white)] shadow-[inset_0_2px_6px_rgba(16,17,48,0.28)]"
    : glass ? "text-fixed-white [@media(hover:hover)]:hover:bg-fixed-white/10" : "text-[var(--blue-500)] [@media(hover:hover)]:hover:bg-[var(--blue-25)]";
  const divider = <span aria-hidden className={cn("mx-2.5 h-px shrink-0", glass ? "bg-fixed-white/20" : "bg-[var(--border-subtle)]")} />;
  return <div role="group" aria-label={`${name} bedienen`} className={cn(
    "flex h-[200px] w-[52px] shrink-0 flex-col overflow-hidden rounded-full",
    glass ? "bg-fixed-white/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] backdrop-blur-[6px]" : "bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04),0_10px_22px_-16px_rgba(16,17,48,0.45)]",
    className,
  )}>
    <button type="button" aria-label={`${name}: ${up.label}`} title={up.label} aria-pressed={pressed === "up"} disabled={up.disabled} onClick={up.onClick} className={cn(segment, "rounded-t-full", toggle(pressed === "up"))}>{icons.up}</button>
    {divider}
    <button type="button" aria-label={`${name}: stop`} title="Stop" disabled={stop.disabled} onClick={stop.onClick}
      className={cn(segment, "!flex-[0.8] text-[var(--error-400)] active:bg-[var(--error-25)]", glass ? "[@media(hover:hover)]:hover:bg-fixed-white/10" : "[@media(hover:hover)]:hover:bg-[var(--error-25)]")}>{icons.stop}</button>
    {divider}
    <button type="button" aria-label={`${name}: ${down.label}`} title={down.label} aria-pressed={pressed === "down"} disabled={down.disabled} onClick={down.onClick} className={cn(segment, "rounded-b-full", toggle(pressed === "down"))}>{icons.down}</button>
  </div>;
}
