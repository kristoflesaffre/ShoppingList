"use client";

import * as React from "react";
import ReactDOM from "react-dom";
import { InputField } from "@/components/ui/input_field";
import { useItemSlugs, normalizeForMatch } from "@/lib/item-photos";
import { cn } from "@/lib/utils";

/** Slug "vleesje_noe" → "Vleesje noe" (eerste woord hoofdletter, rest kleine letters). */
function slugToDisplayName(slug: string): string {
  const words = slug.split("_");
  return words
    .map((word, i) =>
      i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

const MAX_SUGGESTIONS = 6;

export type ItemNameAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
};

export function ItemNameAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  className,
}: ItemNameAutocompleteProps) {
  const slugs = useItemSlugs();
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>(
    {},
  );
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const suggestions = React.useMemo(() => {
    const q = value.trim();
    if (!q || !slugs.length) return [];
    const norm = normalizeForMatch(q);
    if (!norm) return [];

    const matching = slugs.filter((slug) => slug.includes(norm));

    // Sorteer: prefix > woord-prefix > bevat
    matching.sort((a, b) => {
      const rank = (s: string) => {
        if (s.startsWith(norm)) return 0;
        if (s.split("_").some((w) => w.startsWith(norm))) return 1;
        return 2;
      };
      return rank(a) - rank(b);
    });

    return matching.slice(0, MAX_SUGGESTIONS);
  }, [slugs, value]);

  const showDropdown = open && suggestions.length > 0;

  // Reset highlight bij nieuwe suggesties
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // Herbereken positie wanneer dropdown zichtbaar wordt of waarde wijzigt
  React.useLayoutEffect(() => {
    if (!containerRef.current || !showDropdown) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estHeight = Math.min(suggestions.length, MAX_SUGGESTIONS) * 56;

    if (spaceBelow < estHeight + 8 && rect.top > estHeight + 8) {
      // Render boven de input
      setDropdownStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [showDropdown, value, suggestions.length]);

  const handleSelect = React.useCallback(
    (slug: string) => {
      onChange(slugToDisplayName(slug));
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) =>
          Math.min(i + 1, suggestions.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]!);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [showDropdown, suggestions, highlightedIndex, handleSelect],
  );

  const dropdown =
    mounted && showDropdown
      ? ReactDOM.createPortal(
          <ul
            role="listbox"
            style={dropdownStyle}
            className="overflow-hidden rounded-[var(--radius-sm,6px)] border border-[var(--gray-100)] bg-[var(--white)] shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((slug, i) => (
              <li key={slug} role="option" aria-selected={i === highlightedIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(slug);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                    i === highlightedIndex
                      ? "bg-[var(--blue-25)]"
                      : "hover:bg-[var(--blue-25)]",
                    i > 0 && "border-t border-[var(--gray-100)]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/items/${slug}.jpg`}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-[4px] object-contain"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                    {slugToDisplayName(slug)}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <InputField
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Kleine vertraging zodat mousedown op de dropdown eerst vuurt
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-haspopup="listbox"
      />
      {dropdown}
    </div>
  );
}
