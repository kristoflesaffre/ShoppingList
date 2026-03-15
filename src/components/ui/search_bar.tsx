"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type SearchBarSize = "default";

/**
 * Search bar: single-line search input with search icon and optional clear (Figma design system).
 * Variants: without content (placeholder only), with content (value + clear button).
 * States: default, disabled, focus (focus-within).
 * @param asChild - When true, merges container props onto the single child (Radix Slot)
 */
export interface SearchBarProps
  extends Omit<
    React.ComponentPropsWithoutRef<"input">,
    "size" | "value" | "defaultValue"
  > {
  /** Controlled value (use with onValueChange) */
  value?: string;
  /** Uncontrolled default value */
  defaultValue?: string;
  /** Called when the value changes (e.g. user input or clear) */
  onValueChange?: (value: string) => void;
  /** Only "default" is defined (h-12, px-4, py-2.5) */
  size?: SearchBarSize;
  /** When true, the single child replaces the default search UI and receives merged container props */
  asChild?: boolean;
  /** When asChild, the single child element to merge onto */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Figma 474:2734/474:2735 information-func-search:
 * 24×24, icon-fill inset ~10.38% → outline magnifying glass (circle + short handle from bottom-right), rounded line ends.
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 14.5l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Figma 474:3261 system/action-close:
 * - 24×24 wrapper, 18px circle bg (centered), action-func-cross-mini 24×24 with icon-fill inset ~39.6% (small X in center).
 * - Light blue circle (primary/25), dark blue X (primary/600).
 */
function ClearButtonIcon() {
  return (
    <>
      <span
        className="absolute left-1/2 top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--blue-25)] transition-colors group-hover/clear:bg-[var(--blue-50)]"
        aria-hidden="true"
      />
      <span
        className="absolute left-0 top-0 flex size-6 items-center justify-center text-[var(--blue-600)]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-[10px] shrink-0"
          aria-hidden="true"
        >
          <path
            d="M7 7l10 10M17 7L7 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </>
  );
}

/** Figma: border bd-1, gap 10px, h 48px, px sp-16, py 10px, rounded rd-8. Default/Focus: white bg. Default: border neutrals/200. Focus: border primary/500 only (no ring). Disabled: bg primary/25, border neutrals/200. */
const containerBase =
  "group flex h-12 w-full min-w-0 items-center gap-[10px] rounded-md border bg-[var(--white)] px-4 py-2.5 transition-[border-color] focus-within:border-[var(--blue-500)]";

/** Figma: placeholder Inter Light, neutrals/300. Value/focus: Inter Regular, neutrals/900. Disabled: placeholder opacity 0. Hide native search clear so only our clear button shows. */
const inputBase =
  "min-w-0 flex-1 border-none bg-transparent font-normal text-base leading-24 tracking-normal text-[var(--gray-900)] outline-none placeholder:font-light placeholder:text-[var(--gray-300)] disabled:cursor-not-allowed disabled:placeholder:opacity-0 disabled:text-[var(--text-disabled)] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-decoration]:hidden";

const sizeStyles: Record<SearchBarSize, string> = {
  default: "h-12 py-2.5",
};

const SearchBar = React.forwardRef<HTMLDivElement, SearchBarProps>(
  (
    {
      className,
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onChange,
      size = "default",
      placeholder = "Search",
      disabled = false,
      asChild = false,
      children,
      ...inputProps
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue
    );
    const isControlled = valueProp !== undefined;
    const value = isControlled ? valueProp : uncontrolledValue;
    const hasContent = value.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
      onChange?.(e);
    };

    const handleClear = () => {
      if (!isControlled) setUncontrolledValue("");
      onValueChange?.("");
    };

    const containerClassName = cn(
      containerBase,
      sizeStyles[size],
      disabled &&
        "cursor-not-allowed border-[var(--gray-200)] bg-[var(--blue-25)] focus-within:border-[var(--gray-200)]",
      !disabled && "border-[var(--gray-200)]",
      className
    );

    const containerProps = {
      ref,
      "data-size": size,
      "data-state": disabled ? "disabled" : hasContent ? "with-content" : "default",
      className: containerClassName,
    };

    const defaultContent = (
      <>
        <input
          type="search"
          role="searchbox"
          aria-label={typeof placeholder === "string" ? placeholder : "Search"}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputBase}
          {...inputProps}
        />
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          {hasContent && !disabled ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClear}
              className="group/clear relative inline-flex size-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-0"
            >
              <ClearButtonIcon />
            </button>
          ) : null}
        </span>
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center",
            disabled ? "text-[var(--gray-300)]" : "text-[var(--blue-500)]"
          )}
          aria-hidden="true"
        >
          <SearchIcon />
        </span>
      </>
    );

    if (asChild) {
      return <Slot {...containerProps}>{children}</Slot>;
    }

    return <div {...containerProps}>{defaultContent}</div>;
  }
);

SearchBar.displayName = "SearchBar";

export { SearchBar };
