"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type PillTabVariant = "first" | "second" | "third";
export type PillTabSize = "default";

/**
 * Pill tab: two- or three-segment pill (Figma 474-2712). One tab is active; clicking a tab activates it.
 * Container: primary/50 trog met 4px inzet. Active tab: witte thumb (shadow-card), primary blue text. Inactive: no bg, text-secondary.
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
  /** Toegankelijke naam van de tablist (standaard "Tabs"). */
  "aria-label"?: string;
}

/**
 * Segmented control: getinte trog (primary/50) met 4px inzet, witte “thumb” met zachte schaduw.
 * Tabs: px-16, font semibold, 16px, leading-24. Actief: wit + primary/500 tekst.
 * Inactief: text-secondary (AA-contrast; voorheen neutrals/300 haalde geen 3:1).
 */
/* Design system «Segmentknop»: zelfde grijze stijl als SegmentedControl (radius 13, 3px inzet). */
const containerBase =
  "relative flex w-full gap-0 overflow-hidden rounded-[13px] bg-[var(--gray-50)] p-[3px]";

/** vaste min-h: actief (semibold) vs inactief (normal) mag de pill niet laten verspringen (Figma 903:6212). */
const tabBase =
  "flex min-h-[36px] flex-1 min-w-0 items-center justify-center text-[15px] leading-[length:var(--leading-24)] tracking-normal whitespace-nowrap transition-[color,background-color,box-shadow,transform] duration-base ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none";

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
    /* Breedte = (container − 2×4px inzet) / n; translate-x-full is relatief aan die eigen breedte. */
    const indicatorWidth = hasThird ? "w-[calc((100%-6px)/3)]" : "w-[calc(50%-3px)]";
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
            "absolute inset-y-[3px] left-[3px] rounded-[10px] bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.12)] motion-safe:transition-transform motion-safe:duration-slow motion-safe:ease-in-out-strong",
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
                "relative z-10 rounded-[10px] bg-transparent",
                isActive
                  ? "font-semibold text-[var(--text-primary)]"
                  : "font-normal text-[var(--text-secondary)] [@media(hover:hover)]:hover:text-[var(--text-primary)]",
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
