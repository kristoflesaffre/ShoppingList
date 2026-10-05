"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type Rgb = [number, number, number];

/** Zacht verloop voor een categoriekop (16% → 5% van de categoriekleur). */
export function categoryGradient(rgb: Rgb): string {
  const c = rgb.join(",");
  return `linear-gradient(90deg, rgba(${c},0.16), rgba(${c},0.05))`;
}

/**
 * Design system «Categoriekaart»: witte kaart (radius 20) met een gekleurde kop
 * (bolletje · titel · aantal · actie). Gebruikt voor categorieën in lijstjes en favorieten.
 * Dagkaarten gebruiken dezelfde vorm met een eigen kop (datum of gerecht) via `header`.
 */
export function CategoryCard({
  rgb,
  title,
  count,
  action,
  header,
  gradient,
  children,
  className,
}: {
  rgb?: Rgb;
  title?: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  /** Eigen kopinhoud i.p.v. bolletje/titel/aantal. */
  header?: React.ReactNode;
  /** Eigen verloop i.p.v. de categoriekleur. */
  gradient?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("break-inside-avoid overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]", className)}>
      <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ background: gradient ?? (rgb ? categoryGradient(rgb) : undefined) }}>
        {header ?? (
          <>
            {rgb ? <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `rgb(${rgb.join(",")})` }} aria-hidden /> : null}
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{title}</h3>
            {count != null ? <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--text-secondary)]">{count}</span> : null}
            {action}
          </>
        )}
      </div>
      {children}
    </section>
  );
}
