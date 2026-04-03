"use client";

import * as React from "react";
import ReactDOM from "react-dom";
import { InputField } from "@/components/ui/input_field";
import { useItemSlugs, normalizeForMatch } from "@/lib/item-photos";
import { cn } from "@/lib/utils";

/** Slug "vleesje_noe" → "Vleesje noe" (eerste woord hoofdletter, rest kleine letters). */
function slugToDisplayName(slug: string): string {
  return slug
    .split("_")
    .map((word, i) =>
      i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

const MAX_SUGGESTIONS = 6;
/** Geschatte hoogte per rij (afbeelding 40px + py-2*2 = 16px). */
const ROW_HEIGHT = 56;

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
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
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

  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  /**
   * Herbereken de fixed-positie van de dropdown.
   *
   * Strategie (hetzelfde als native iOS-apps):
   * - Gebruik `visualViewport.height` als maatstaf voor de beschikbare ruimte.
   *   Wanneer het keyboard opent, krimpt visualViewport.height maar blijft
   *   window.innerHeight onveranderd. Zo detecteren we de keyboard.
   * - De "zichtbare ondergrens" in fixed-coördinaten =
   *     visualViewport.offsetTop + visualViewport.height
   * - Is er minder ruimte onder de input dan de dropdown nodig heeft?
   *   → Toon boven de input (standaard iOS-patroon).
   */
  const recalcPosition = React.useCallback(() => {
    if (!containerRef.current || !showDropdown) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vv = window.visualViewport;

    /**
     * `position: fixed` op iOS is relatief aan de visual viewport.
     * getBoundingClientRect() geeft layout viewport coördinaten.
     * Verschil = vv.offsetTop (hoeveel de visual viewport verschoven is t.o.v. layout viewport).
     *
     * Conversie:  coord_in_vv = coord_in_layout - vv.offsetTop
     * Voor fixed bottom:  bottom = vvHeight - rectTopInVV - 4
     * Voor fixed top:     top    = rectBottomInVV + 4
     */
    const vvOffsetTop = vv?.offsetTop ?? 0;
    const vvHeight = vv?.height ?? window.innerHeight;

    const rectTopInVV = rect.top - vvOffsetTop;
    const rectBottomInVV = rect.bottom - vvOffsetTop;

    const estHeight = Math.min(suggestions.length, MAX_SUGGESTIONS) * ROW_HEIGHT;
    const spaceBelow = vvHeight - rectBottomInVV;
    const spaceAbove = rectTopInVV;

    if (spaceBelow < estHeight + 8) {
      // Niet genoeg ruimte onder → toon boven de input
      const maxH = Math.min(estHeight, spaceAbove - 8);
      setDropdownStyle({
        position: "fixed",
        bottom: vvHeight - rectTopInVV + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: maxH > 0 ? maxH : estHeight,
        zIndex: 9999,
      });
    } else {
      // Genoeg ruimte onder → toon onder de input
      setDropdownStyle({
        position: "fixed",
        top: rectBottomInVV + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: spaceBelow - 8,
        zIndex: 9999,
      });
    }
  }, [showDropdown, suggestions.length]);

  // Herbereken bij open/dicht van dropdown, bij typen, en bij resize van visualViewport
  React.useLayoutEffect(() => {
    recalcPosition();
  }, [recalcPosition, value]);

  React.useEffect(() => {
    if (!showDropdown) return;
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener("resize", recalcPosition);
    vv.addEventListener("scroll", recalcPosition);
    return () => {
      vv.removeEventListener("resize", recalcPosition);
      vv.removeEventListener("scroll", recalcPosition);
    };
  }, [showDropdown, recalcPosition]);

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
        setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
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
            className="overflow-y-auto overflow-x-hidden rounded-[var(--radius-sm,6px)] border border-[var(--gray-100)] bg-[var(--white)] shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
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
