"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PLUS_CIRCLE_MASK_STYLE: React.CSSProperties = {
  WebkitMaskImage: 'url("/icons/plus-circle.svg")',
  maskImage: 'url("/icons/plus-circle.svg")',
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export interface PlusCircleMaskIconProps {
  className?: string;
  /** Vulkleur van het masker (Tailwind `bg-*`). Standaard: `bg-action-primary`. */
  colorClassName?: string;
}

/** Plus-in-cirkel uit `public/icons/plus-circle.svg` via CSS-mask (24×24 tenzij `className` anders maat zet). */
export function PlusCircleMaskIcon({
  className,
  colorClassName = "bg-action-primary",
}: PlusCircleMaskIconProps) {
  return (
    <span
      className={cn("inline-block size-6 shrink-0", colorClassName, className)}
      style={PLUS_CIRCLE_MASK_STYLE}
      aria-hidden
    />
  );
}
