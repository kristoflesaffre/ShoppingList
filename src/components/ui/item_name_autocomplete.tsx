"use client";

import * as React from "react";
import Image from "next/image";
import ReactDOM from "react-dom";
import { InputField } from "@/components/ui/input_field";
import { ItemNameSearchSlideIn } from "@/components/ui/item_name_search_slide_in";
import {
  useItemSlugs,
  useItemPhotoUrl,
  normalizeForMatch,
  itemPhotoUrlFromSlug,
} from "@/lib/item-photos";
import {
  useIngredientSlugs,
  useIngredientPhotoUrl,
  useIngredientSynonyms,
  matchIngredientSlugsForAutocomplete,
} from "@/lib/ingredient-photos";
import { cn } from "@/lib/utils";

/** Slug "vleesje_noe" → "Vleesje noe" (eerste woord hoofdletter, rest kleine letters). */
function slugToDisplayName(slug: string): string {
  return slug
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const MAX_SUGGESTIONS = 6;
const ROW_HEIGHT = 56;

/** True wanneer de viewport smaller is dan 768px (md breakpoint). */
function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsSmall(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isSmall;
}

export type ItemNameAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** `ingredients` = suggesties en thumbnails uit /images/ingredients (webp); default = items jpg. */
  photoCatalog?: "items" | "ingredients";
  /** Alleen desktop-dropdown: focus op het invoerveld bij mount (bijv. modaal opent). */
  autoFocus?: boolean;
};

// ─── Large-screen dropdown ────────────────────────────────────────────────────

function LargeScreenAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  className,
  photoCatalog = "items",
  autoFocus,
}: ItemNameAutocompleteProps) {
  const itemSlugs = useItemSlugs();
  const ingredientSlugs = useIngredientSlugs();
  const ingredientSynonyms = useIngredientSynonyms();
  const slugs = photoCatalog === "ingredients" ? ingredientSlugs : itemSlugs;
  const synonyms =
    photoCatalog === "ingredients" ? ingredientSynonyms : ({} as Record<string, string>);
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
    if (photoCatalog === "ingredients") {
      return matchIngredientSlugsForAutocomplete(
        norm,
        slugs,
        synonyms,
        MAX_SUGGESTIONS,
      );
    }
    const matching = slugs.filter((slug) =>
      slug.split("_").some((w) => w.startsWith(norm)),
    );
    matching.sort(
      (a, b) => (a.startsWith(norm) ? 0 : 1) - (b.startsWith(norm) ? 0 : 1),
    );
    return matching.slice(0, MAX_SUGGESTIONS);
  }, [slugs, value, photoCatalog, synonyms]);

  const showDropdown = open && suggestions.length > 0;

  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const recalcPosition = React.useCallback(() => {
    if (!containerRef.current || !showDropdown) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vv = window.visualViewport;
    const vvOffsetTop = vv?.offsetTop ?? 0;
    const vvHeight = vv?.height ?? window.innerHeight;
    const rectTopInVV = rect.top - vvOffsetTop;
    const rectBottomInVV = rect.bottom - vvOffsetTop;
    const estHeight = Math.min(suggestions.length, MAX_SUGGESTIONS) * ROW_HEIGHT;
    const spaceBelow = vvHeight - rectBottomInVV;
    const spaceAbove = rectTopInVV;

    if (spaceBelow < estHeight + 8) {
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
                  <Image
                    src={
                      photoCatalog === "ingredients"
                        ? `/images/ingredients/${slug}_160.webp`
                        : itemPhotoUrlFromSlug(slug, 160)
                    }
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-haspopup="listbox"
      />
      {dropdown}
    </div>
  );
}

// ─── Small-screen trigger + slide-in ─────────────────────────────────────────

function SmallScreenAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  className,
  photoCatalog = "items",
}: ItemNameAutocompleteProps) {
  const [slideInOpen, setSlideInOpen] = React.useState(false);
  const getItemPhotoUrl = useItemPhotoUrl();
  const getIngredientPhotoUrl = useIngredientPhotoUrl(160);
  const getPhotoUrl =
    photoCatalog === "ingredients" ? getIngredientPhotoUrl : getItemPhotoUrl;
  const photoUrl = value ? getPhotoUrl(value) : null;

  return (
    <div className={cn("relative w-full", className)}>
      {label && (
        <p className="mb-1 text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
          {label}
        </p>
      )}
      {/* Opent de zoek-slide-in; het echte invoerveld krijgt daar meteen focus (mobiel toetsenbord). */}
      <button
        type="button"
        onClick={() => setSlideInOpen(true)}
        className="flex h-12 w-full items-center gap-3 rounded-lg border border-[#c6c8ce] bg-[var(--white)] px-4 text-left text-base leading-24 tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        aria-haspopup="dialog"
      >
        {value ? (
          <>
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- lokale item-webp: Next/Image optimizer faalt op sommige iOS-builds
              <img
                src={photoUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 object-cover"
                aria-hidden
                decoding="async"
              />
            )}
            <span className="min-w-0 truncate text-[var(--text-primary)]">{value}</span>
          </>
        ) : (
          <span className="text-[var(--text-placeholder)]">{placeholder}</span>
        )}
      </button>

      <ItemNameSearchSlideIn
        open={slideInOpen}
        onClose={() => setSlideInOpen(false)}
        initialValue={value}
        onSelect={(name) => onChange(name)}
        photoCatalog={photoCatalog}
      />
    </div>
  );
}

// ─── Publieke component: kiest automatisch op basis van schermgrootte ─────────

export function ItemNameAutocomplete(props: ItemNameAutocompleteProps) {
  const isSmall = useIsSmallScreen();
  // Tijdens SSR/hydration (isSmall = false) renderen we de large versie;
  // na mount switcht hij correct.
  return isSmall ? (
    <SmallScreenAutocomplete {...props} />
  ) : (
    <LargeScreenAutocomplete {...props} />
  );
}
