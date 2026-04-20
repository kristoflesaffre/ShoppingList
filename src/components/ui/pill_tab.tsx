"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type PillTabVariant = "first" | "second" | "third";
export type PillTabSize = "default";

/**
 * Pill tab: two- or three-segment pill (Figma 474-2712). One tab is active; clicking a tab activates it.
 * Container: gray-25 bg, gray-100 border. Active tab: white bg, primary blue text. Inactive: no bg, gray-300 text.
 * @param asChild - When true, merges container props onto the single child (Radix Slot)
 */
export interface PillTabProps {
  /** "first" = left tab active; "second" = middle/right tab active; "third" = right tab active. Controlled when provided. */
  value?: PillTabVariant;
  /** Initial active tab when uncontrolled */
  defaultValue?: PillTabVariant;
  /** Called when the active tab changes (e.g. user click) */
  onValueChange?: (value: PillTabVariant) => void;
  /** Size of each tab (padding); only "default" is defined */
  size?: PillTabSize;
  /** Label for the first (left) tab */
  labelFirst?: React.ReactNode;
  /** Label for the second tab */
  labelSecond?: React.ReactNode;
  /** Label for the optional third (right) tab — when provided, renders a 3-tab pill */
  labelThird?: React.ReactNode;
  /** When true, the single child replaces the default pill and receives merged container props */
  asChild?: boolean;
  /** When asChild, the single child element to merge onto */
  children?: React.ReactNode;
  className?: string;
}

/** Figma: container bg neutrals/25, border neutrals/100, rounded rd-256, gap 0. Tabs: px-16 py-10, font semibold, 16px, leading-24. Active: white bg, primary/500 text. Inactive: no bg, neutrals/300 text. */
const containerBase =
  "relative flex w-full gap-0 overflow-hidden rounded-pill border border-[var(--gray-100)] bg-[var(--gray-25)]";

/** vaste min-h: actief (semibold) vs inactief (normal) mag de pill niet laten verspringen (Figma 903:6212). */
const tabBase =
  "flex min-h-[48px] flex-1 min-w-0 items-center justify-center text-base leading-[length:var(--leading-24)] tracking-normal whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none";

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
      labelFirst = "Tab 1",
      labelSecond = "Tab 2",
      labelThird,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const hasThird = labelThird !== undefined;

    const [uncontrolledValue, setUncontrolledValue] =
      React.useState<PillTabVariant>(defaultValue);
    const isControlled = valueProp !== undefined;
    const activeValue = isControlled ? valueProp : uncontrolledValue;

    const handleSelect = (tab: PillTabVariant) => {
      if (activeValue === tab) return;
      if (!isControlled) setUncontrolledValue(tab);
      onValueChange?.(tab);
    };

    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLButtonElement>,
      tab: PillTabVariant,
      tabs: PillTabVariant[],
    ) => {
      const idx = tabs.indexOf(tab);
      if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        handleSelect(tabs[idx - 1]);
      } else if (e.key === "ArrowRight" && idx < tabs.length - 1) {
        e.preventDefault();
        handleSelect(tabs[idx + 1]);
      }
    };

    const tabs: PillTabVariant[] = hasThird
      ? ["first", "second", "third"]
      : ["first", "second"];

    // Sliding indicator
    const indicatorWidth = hasThird ? "w-1/3" : "w-1/2";
    const indicatorTranslate =
      activeValue === "first"
        ? "translate-x-0"
        : activeValue === "second"
          ? hasThird
            ? "translate-x-full"
            : "translate-x-full"
          : "translate-x-[200%]";

    const tabDefs: { tab: PillTabVariant; label: React.ReactNode }[] = [
      { tab: "first", label: labelFirst },
      { tab: "second", label: labelSecond },
      ...(hasThird ? [{ tab: "third" as const, label: labelThird }] : []),
    ];

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
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 rounded-pill bg-[var(--white)] transition-transform duration-200 ease-out",
            indicatorWidth,
            indicatorTranslate,
          )}
        />
        {tabDefs.map(({ tab, label }) => {
          const isActive = activeValue === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(tab)}
              onKeyDown={(e) => handleKeyDown(e, tab, tabs)}
              className={cn(
                tabBase,
                sizeStyles[size],
                "relative z-10 rounded-pill bg-transparent",
                isActive
                  ? "font-semibold text-[var(--blue-500)]"
                  : "font-normal text-[var(--gray-300)] hover:text-[var(--gray-400)]",
              )}
            >
              {label}
            </button>
          );
        })}
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
