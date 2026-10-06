"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Aantalpil»: zachte lavendel pil met een aantal (alleen tonen, niet aanpasbaar).
 * Gebruik in lijstrijen waar het aantal belangrijk is (bv. porties in de diepvries).
 * Om aan te passen wissel je in bewerkmodus naar `CountStepper`.
 */
export function CountBadge({
  value,
  label,
  className,
}: {
  value: number;
  /** Toegankelijk label, bv. «3 porties». */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[30px] min-w-[30px] shrink-0 items-center justify-center rounded-pill bg-[var(--blue-50)] px-2.5 text-[15px] font-bold tabular-nums text-[var(--blue-500)]",
        className,
      )}
      aria-label={label}
    >
      {value}
    </span>
  );
}
