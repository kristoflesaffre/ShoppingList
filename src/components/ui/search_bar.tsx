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

/** public/icons/search.svg – 24×24 magnifying glass, uses currentColor for theme support */
export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21.363 20.656L15.986 15.279C17.18 13.921 17.91 12.146 17.91 10.2C17.91 5.949 14.451 2.49 10.2 2.49C5.94899 2.49 2.48999 5.948 2.48999 10.2C2.48999 14.451 5.94899 17.91 10.2 17.91C12.146 17.91 13.921 17.18 15.279 15.986L20.656 21.363C20.754 21.461 20.882 21.509 21.01 21.509C21.138 21.509 21.266 21.46 21.364 21.363C21.559 21.168 21.559 20.852 21.363 20.656ZM3.48999 10.2C3.48999 6.5 6.49999 3.49 10.2 3.49C13.9 3.49 16.91 6.5 16.91 10.2C16.91 13.9 13.9 16.91 10.2 16.91C6.49999 16.91 3.48999 13.9 3.48999 10.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Design system «Zoekveld» (zacht grijs): grijs vlak zonder rand, vergrootglas links, radius 16, h 48.
 * Focus: wit vlak met lavendel rand. Zelfde look als de zoek-trigger in ItemNameAutocomplete.
 */
export const SEARCH_FIELD_CLASS =
  "group flex h-12 w-full min-w-0 items-center gap-2.5 rounded-[16px] bg-[var(--gray-25)] px-3.5 transition-[background-color,box-shadow] duration-fast ease-out-strong focus-within:bg-[var(--white)] focus-within:shadow-[inset_0_0_0_1.5px_var(--blue-300)]";

/** Figma: placeholder Inter Light, neutrals/300. Value/focus: Inter Regular, neutrals/900. Disabled: placeholder opacity 0. Hide native search clear so only our clear button shows. */
const inputBase =
  "min-w-0 flex-1 border-none bg-transparent font-normal text-[15px] leading-24 tracking-normal text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:placeholder:opacity-0 disabled:text-[var(--text-disabled)] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-decoration]:hidden";

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
      SEARCH_FIELD_CLASS,
      sizeStyles[size],
      disabled && "cursor-not-allowed opacity-60",
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
        <span
          className={cn(
            "flex shrink-0 items-center justify-center transition-colors duration-fast",
            disabled ? "text-[var(--gray-300)]" : "text-[var(--text-tertiary)] group-focus-within:text-[var(--blue-500)]",
          )}
          aria-hidden="true"
        >
          <SearchIcon className="size-5" />
        </span>
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
        {hasContent && !disabled ? (
          <button
            type="button"
            aria-label="Wis zoekopdracht"
            onClick={handleClear}
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--gray-200)] text-white transition-colors hover:bg-[var(--gray-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden className="size-3">
              <path d="M7 7l10 10M17 7 7 17" />
            </svg>
          </button>
        ) : null}
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
