"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function StoreSelectionCornerBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute right-0 top-0 size-[36px]",
        className,
      )}
      aria-hidden
    >
      <span
        className="absolute inset-0 bg-action-primary"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />
      <svg
        className="absolute right-[7px] top-[7px]"
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden
      >
        <path
          d="M1 5.80002L3.3999 8.1999L9 1"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export interface StoreSelectionTileProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Winkelnaam onder het logo */
  label: string;
  /** Logo-URL (bijv. uit /public/logos of master-stores) */
  logoSrc: string;
  /** Geselecteerde staat: blauwe rand + hoekvinkje */
  selected?: boolean;
}

/**
 * Selecteerbare winkeltegel voor horizontale swimlanes (slide-ins te kopen, nieuw supermarktlijstje).
 * Gebruik in een `role="radiogroup"` met `role="radio"` en `aria-checked` op elke tegel.
 */
const StoreSelectionTile = React.forwardRef<
  HTMLButtonElement,
  StoreSelectionTileProps
>(
  (
    { className, label, logoSrc, selected = false, type = "button", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        data-selected={selected || undefined}
        className={cn(
          "relative flex w-[100px] shrink-0 flex-col items-center gap-[var(--space-2)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--white)] p-[var(--space-3)] text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
          selected
            ? "border border-action-primary"
            : "border border-[var(--gray-100)]",
          !selected &&
            "[@media(hover:hover)]:hover:border-[var(--gray-200)]",
          className,
        )}
        {...props}
      >
        <StoreLogo src={logoSrc} />
        <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
          {label}
        </p>
        {selected ? <StoreSelectionCornerBadge /> : null}
      </button>
    );
  },
);

StoreSelectionTile.displayName = "StoreSelectionTile";

function StoreLogo({ src }: { src: string }) {
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        className="size-full object-contain object-center"
      />
    </div>
  );
}

export { StoreSelectionTile };
