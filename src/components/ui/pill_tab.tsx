"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type PillTabVariant = "first" | "second";
export type PillTabSize = "default";

/**
 * Pill tab: two-segment pill (Figma 474-2712). One tab is active; clicking a tab activates it.
 * Container: gray-25 bg, gray-100 border. Active tab: white bg, primary blue text. Inactive: no bg, gray-300 text.
 * @param asChild - When true, merges container props onto the single child (Radix Slot)
 */
export interface PillTabProps {
  /** "first" = left tab active; "second" = right tab active. Controlled when provided. */
  value?: PillTabVariant;
  /** Initial active tab when uncontrolled */
  defaultValue?: PillTabVariant;
  /** Called when the active tab changes (e.g. user click) */
  onValueChange?: (value: PillTabVariant) => void;
  /** Bar size; only "default" is defined (px-4 py-2 per Figma padding) */
  size?: PillTabSize;
  /** Label for the first (left) tab */
  labelFirst?: React.ReactNode;
  /** Label for the second (right) tab */
  labelSecond?: React.ReactNode;
  /** When true, the single child replaces the default pill and receives merged container props */
  asChild?: boolean;
  /** When asChild, the single child element to merge onto */
  children?: React.ReactNode;
  className?: string;
}

/** Figma: container bg neutrals/25, border neutrals/100, rounded rd-256, gap 0. Tabs: px-16 py-10, font semibold, 16px, leading-24. Active: white bg, primary/500 text. Inactive: no bg, neutrals/300 text. */
const containerBase =
  "flex w-full gap-0 rounded-pill border border-[var(--gray-100)] bg-[var(--gray-25)]";

const tabBase =
  "flex flex-1 min-w-0 items-center justify-center font-semibold text-base leading-24 tracking-normal whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none";

const sizeStyles: Record<PillTabSize, string> = {
  default: "px-4 py-2",
};

const PillTab = React.forwardRef<HTMLDivElement, PillTabProps>(
  (
    {
      className,
      value: valueProp,
      defaultValue = "first",
      onValueChange,
      size = "default",
      labelFirst = "Active tab",
      labelSecond = "Inactive tab",
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] =
      React.useState<PillTabVariant>(defaultValue);
    const isControlled = valueProp !== undefined;
    const activeValue = isControlled ? valueProp : uncontrolledValue;
    const firstActive = activeValue === "first";

    const handleSelectFirst = () => {
      if (firstActive) return;
      if (!isControlled) setUncontrolledValue("first");
      onValueChange?.("first");
    };

    const handleSelectSecond = () => {
      if (!firstActive) return;
      if (!isControlled) setUncontrolledValue("second");
      onValueChange?.("second");
    };

    const containerClassName = cn(containerBase, className);
    const containerProps = {
      ref,
      role: "tablist",
      "aria-label": "Tabs",
      "data-variant": activeValue,
      "data-size": size,
      className: containerClassName,
      ...props,
    };

    const defaultContent = (
      <>
        <button
          type="button"
          role="tab"
          aria-selected={firstActive}
          tabIndex={firstActive ? 0 : -1}
          onClick={handleSelectFirst}
          className={cn(
            tabBase,
            sizeStyles[size],
            "rounded-pill",
            firstActive
              ? "bg-[var(--white)] text-[var(--blue-500)]"
              : "bg-transparent text-[var(--gray-300)] hover:text-[var(--gray-400)]"
          )}
        >
          {labelFirst}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!firstActive}
          tabIndex={!firstActive ? 0 : -1}
          onClick={handleSelectSecond}
          className={cn(
            tabBase,
            sizeStyles[size],
            "rounded-pill",
            !firstActive
              ? "bg-[var(--white)] text-[var(--blue-500)]"
              : "bg-transparent text-[var(--gray-300)] hover:text-[var(--gray-400)]"
          )}
        >
          {labelSecond}
        </button>
      </>
    );

    return asChild ? (
      <Slot {...containerProps}>{children}</Slot>
    ) : (
      <div {...containerProps}>{defaultContent}</div>
    );
  }
);

PillTab.displayName = "PillTab";

export { PillTab };
