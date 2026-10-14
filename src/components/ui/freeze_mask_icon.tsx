"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FREEZE_MASK_STYLE: React.CSSProperties = {
  WebkitMaskImage: 'url("/icons/freeze.svg")',
  maskImage: 'url("/icons/freeze.svg")',
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export interface FreezeMaskIconProps {
  className?: string;
  /** Vulkleur van het masker (Tailwind `bg-*`). Standaard: `bg-action-primary`. */
  colorClassName?: string;
}

/** Sneeuwvlok uit `public/icons/freeze.svg` via CSS-mask. */
export function FreezeMaskIcon({
  className,
  colorClassName = "bg-action-primary",
}: FreezeMaskIconProps) {
  return (
    <span
      className={cn("inline-block size-6 shrink-0", colorClassName, className)}
      style={FREEZE_MASK_STYLE}
      aria-hidden
    />
  );
}

const PANTRY_MASK_STYLE: React.CSSProperties = {
  ...FREEZE_MASK_STYLE,
  WebkitMaskImage: 'url("/icons/pantry.svg")',
  maskImage: 'url("/icons/pantry.svg")',
};

/** Voorraadpot uit `public/icons/pantry.svg` via CSS-mask (tegenhanger van de sneeuwvlok). */
export function PantryMaskIcon({
  className,
  colorClassName = "bg-action-primary",
}: FreezeMaskIconProps) {
  return (
    <span
      className={cn("inline-block size-6 shrink-0", colorClassName, className)}
      style={PANTRY_MASK_STYLE}
      aria-hidden
    />
  );
}

/** Sneeuwvlok (diepvries) of voorraadpot (voorraadkast). */
export function StockSourceIcon({
  source,
  ...props
}: FreezeMaskIconProps & { source: "freezer" | "pantry" }) {
  return source === "pantry" ? <PantryMaskIcon {...props} /> : <FreezeMaskIcon {...props} />;
}
