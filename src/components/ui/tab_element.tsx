"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Context geleverd door {@link TabGroup}; nodig om selectie te koppelen. */
export const TabGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  /** `true`: parent tekent één bewegende onderlijn i.p.v. per-tab lijn. */
  useSlidingUnderline?: boolean;
} | null>(null);

export type TabElementSize = "default";

export interface TabElementProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "role" | "children"
  > {
  /**
   * Unieke id van dit tabblad; moet overeenkomen met `value` van de parent {@link TabGroup}.
   */
  value: string;
  children: React.ReactNode;
  size?: TabElementSize;
}

const sizeStyles: Record<TabElementSize, string> = {
  default: "",
};

/**
 * Enkel tabblad (Figma 860-5330): label + 2px primary-onderlijn bij selectie.
 * Plaats binnen {@link TabGroup}; gebruikt {@link TabGroupContext} voor `selected` en klik.
 */
export const TabElement = React.forwardRef<HTMLButtonElement, TabElementProps>(
  (
    {
      className,
      value,
      children,
      size = "default",
      disabled,
      onKeyDown,
      onClick,
      ...props
    },
    ref,
  ) => {
    const ctx = React.useContext(TabGroupContext);
    const selected = ctx != null && ctx.value === value;
    const sliding = ctx?.useSlidingUnderline === true;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || disabled || !ctx) return;
      ctx.onValueChange(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || disabled || !ctx) return;

      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

      const list = e.currentTarget.closest('[role="tablist"]');
      if (!list) return;

      const tabs = Array.from(
        list.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]:not([disabled])',
        ),
      );
      const i = tabs.indexOf(e.currentTarget);
      if (i === -1) return;

      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const j = (i + dir + tabs.length) % tabs.length;
      const next = tabs[j];
      const nextValue = next?.dataset.tabValue;
      if (nextValue != null) {
        ctx.onValueChange(nextValue);
        next.focus();
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        data-tab-value={value}
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        disabled={disabled}
        data-selected={selected ? "true" : "false"}
        data-size={size}
        className={cn(
          "flex min-w-0 shrink-0 flex-col items-stretch gap-[var(--space-2)] bg-transparent p-0 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeStyles[size],
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span
          className={cn(
            "text-base leading-24 tracking-normal whitespace-nowrap",
            selected
              ? "font-medium text-[var(--text-primary)]"
              : "font-normal text-[var(--gray-400)]",
          )}
        >
          {children}
        </span>
        <span
          aria-hidden
          className={cn(
            "h-[2px] w-full shrink-0",
            sliding
              ? "bg-transparent"
              : cn(
                  "bg-[var(--blue-500)] transition-opacity duration-200 ease-out",
                  selected ? "opacity-100" : "opacity-0",
                ),
          )}
        />
      </button>
    );
  },
);

TabElement.displayName = "TabElement";
