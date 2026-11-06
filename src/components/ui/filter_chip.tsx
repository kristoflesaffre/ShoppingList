"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Filterchip»: compact (30px), halfvet. Actief vol blauw met witte tekst,
 * inactief lichtgrijs met grijze tekst. Optioneel een gekleurd bolletje (categorie) en een teller.
 * Op een gekleurde achtergrond (Frost, Voorraadkast): `surface="onColor"`, inactief wit.
 */
export function FilterChip({
  selected,
  onClick,
  children,
  dotColor,
  count,
  surface = "default",
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Kleur van het categoriebolletje (CSS-kleur). */
  dotColor?: string;
  /** Aantal achter het label, bv. «Groenten 9». */
  count?: number;
  /** `onColor`: inactief wit i.p.v. grijs, voor op een gekleurde achtergrond. */
  surface?: "default" | "onColor";
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-[11px] text-[12.5px] font-semibold transition-[background-color,color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1",
        selected
          ? "bg-[var(--blue-500)] text-[var(--action-primary-foreground)]"
          : surface === "onColor"
            ? "bg-[var(--white)] text-[var(--text-secondary)] shadow-card [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
            : "bg-[var(--gray-50)] text-[var(--text-secondary)] [@media(hover:hover)]:hover:bg-[var(--gray-100)]",
        className,
      )}
    >
      {dotColor ? <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden /> : null}
      {children}
      {count != null ? <span className="font-medium opacity-70 tabular-nums">{count}</span> : null}
    </button>
  );
}

/**
 * Horizontaal scrollbare rij chips die tot aan de schermrand doorloopt (of laat ze wrappen met `wrap`).
 * `wrap="md"`: op de gsm een veegrij, vanaf tablet wrappen zodat alle chips zichtbaar zijn.
 */
export function FilterChipRow({
  children,
  wrap = false,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  wrap?: boolean | "md";
  ariaLabel?: string;
  className?: string;
}) {
  // Bij het openen (bv. terug uit een detail met een filter actief) de gekozen chip in beeld schuiven.
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!scroller || !chip || scroller.scrollWidth <= scroller.clientWidth) return;
    const left = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
    scroller.scrollLeft = Math.max(0, left);
  }, []);
  if (wrap === true) {
    return (
      <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
        {children}
      </div>
    );
  }
  return (
    <div
      ref={scrollerRef}
      className={cn(
        "-mx-4 min-w-0 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        wrap === "md" && "md:mx-0 md:overflow-visible md:px-0",
        className,
      )}
    >
      <div role="group" aria-label={ariaLabel} className={cn("flex w-max gap-1.5 pb-0.5", wrap === "md" && "md:w-auto md:flex-wrap")}>
        {children}
      </div>
    </div>
  );
}
