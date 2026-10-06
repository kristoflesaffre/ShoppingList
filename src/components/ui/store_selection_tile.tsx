"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Rond blauw vinkje rechtsboven op de gekozen tegel. */
function StoreSelectionCheckBadge() {
  return (
    <span
      className="pointer-events-none absolute right-1.5 top-1.5 flex size-[18px] items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] motion-safe:animate-pop"
      aria-hidden
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d="M1.5 5.5 4 8l4.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export interface StoreSelectionTileProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Winkelnaam onder het logo */
  label: string;
  /** Logo-URL (bijv. uit /public/logos of master-stores) */
  logoSrc?: string;
  /** Eigen icoon i.p.v. een logo (bv. «Algemeen»). */
  icon?: React.ReactNode;
  /** Geselecteerde staat: wit met blauwe rand + rond vinkje */
  selected?: boolean;
}

/**
 * Design system «Winkeltegel»: zacht grijs vlak (gray-25, radius 16), logo + naam;
 * gekozen = wit met blauwe rand en rond vinkje rechtsboven.
 * Selecteerbare winkeltegel voor horizontale swimlanes (slide-ins te kopen, nieuw supermarktlijstje).
 * Gebruik in een `role="radiogroup"` met `role="radio"` en `aria-checked` op elke tegel.
 */
const StoreSelectionTile = React.forwardRef<
  HTMLButtonElement,
  StoreSelectionTileProps
>(
  (
    { className, label, logoSrc, icon, selected = false, type = "button", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        data-selected={selected || undefined}
        className={cn(
          "relative flex size-[84px] shrink-0 flex-col items-center justify-center gap-[7px] overflow-hidden rounded-[16px] px-1.5 text-center transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
          selected
            ? "bg-[var(--white)] shadow-[inset_0_0_0_2px_var(--blue-500)]"
            : "bg-[var(--gray-25)] [@media(hover:hover)]:hover:bg-[var(--gray-50)]",
          className,
        )}
        {...props}
      >
        {icon ?? (logoSrc ? <StoreLogo src={logoSrc} /> : null)}
        <p className="w-full truncate text-xs font-semibold leading-4 tracking-normal text-[var(--text-primary)]">
          {label}
        </p>
        {selected ? <StoreSelectionCheckBadge /> : null}
      </button>
    );
  },
);

StoreSelectionTile.displayName = "StoreSelectionTile";

function StoreLogo({ src }: { src: string }) {
  return (
    <div className="relative size-8 shrink-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={32}
        height={32}
        className="size-full object-contain object-center"
      />
    </div>
  );
}

export { StoreSelectionTile };
