"use client";

import * as React from "react";
import Image from "next/image";
import ReactDOM from "react-dom";
import { InputField } from "@/components/ui/input_field";
import { ItemNameSearchSlideIn } from "@/components/ui/item_name_search_slide_in";
import { SearchIcon } from "@/components/ui/search_bar";
import {
  useItemSlugs,
  useItemSynonyms,
  useItemPhotoUrl,
  normalizeForMatch,
  itemPhotoUrlFromSlug,
} from "@/lib/item-photos";
import { matchItemSlugsForAutocomplete } from "@/lib/item-slug-autocomplete";
import {
  useIngredientSlugs,
  useIngredientPhotoUrl,
  useIngredientSynonyms,
  matchIngredientSlugsForAutocomplete,
} from "@/lib/ingredient-photos";
import type { SavedRecipe } from "@/lib/recipe_library";
import { matchRecipesForAutocomplete } from "@/lib/recipe-search";
import { FreezeMaskIcon } from "@/components/ui/freeze_mask_icon";
import { cn } from "@/lib/utils";

/** Slug "vleesje_noe" → "Vleesje noe" (eerste woord hoofdletter, rest kleine letters). */
function slugToDisplayName(slug: string): string {
  return slug
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const MAX_SUGGESTIONS = 8;
const ROW_HEIGHT = 56;

type AutocompleteSuggestion =
  | { kind: "item"; slug: string }
  | { kind: "recipe"; recipe: SavedRecipe };

/** True wanneer de viewport smaller is dan 768px (md breakpoint). */
export function useIsSmallScreen(): boolean {
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
  /** Toegankelijke naam wanneer het zichtbare label bewust wordt weggelaten. */
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  /** `ingredients` = suggesties en thumbnails uit /images/ingredients (webp); default = items jpg. */
  photoCatalog?: "items" | "ingredients";
  /** Alleen desktop-dropdown: focus op het invoerveld bij mount (bijv. modaal opent). */
  autoFocus?: boolean;
  /** Titel van de mobiele zoek-slide-in. Default: "Item toevoegen". */
  slideInTitle?: string;
  /** Recepten die naast items in dezelfde zoekopdracht mogen verschijnen. */
  recipes?: SavedRecipe[];
  /** Beperk de zoekresultaten tot items, recepten of beide. */
  suggestionScope?: "items" | "recipes" | "all";
  /** Wordt aangeroepen wanneer een bestaand itemresultaat wordt gekozen. */
  onSelectItem?: (name: string) => void;
  /** Wordt aangeroepen wanneer een receptresultaat wordt gekozen. */
  onSelectRecipe?: (recipe: SavedRecipe) => void;
  /** Wordt aangeroepen wanneer het sneeuwvlok-icoon bij een recept wordt gekozen. */
  onSelectRecipeFromFreezer?: (recipe: SavedRecipe) => void;
  /** `top`: zacht grijs zoekveld met icoon links; mobiele zoek-slide-in met zoekbalk bovenaan. */
  searchVariant?: "default" | "top";
};

// ─── Large-screen dropdown ────────────────────────────────────────────────────

function LargeScreenAutocomplete({
  value,
  onChange,
  label,
  ariaLabel,
  placeholder,
  className,
  photoCatalog = "items",
  autoFocus,
  recipes = [],
  suggestionScope = "all",
  onSelectItem,
  onSelectRecipe,
  onSelectRecipeFromFreezer,
}: ItemNameAutocompleteProps) {
  const itemSlugs = useItemSlugs();
  const itemSynonyms = useItemSynonyms();
  const ingredientSlugs = useIngredientSlugs();
  const ingredientSynonyms = useIngredientSynonyms();
  const slugs = photoCatalog === "ingredients" ? ingredientSlugs : itemSlugs;
  const synonyms =
    photoCatalog === "ingredients" ? ingredientSynonyms : itemSynonyms;
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const itemSuggestions = React.useMemo(() => {
    if (suggestionScope === "recipes") return [];
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
    return matchItemSlugsForAutocomplete(
      norm,
      slugs,
      synonyms,
      MAX_SUGGESTIONS,
    );
  }, [slugs, value, photoCatalog, suggestionScope, synonyms]);

  const recipeSuggestions = React.useMemo(() => {
    if (suggestionScope === "items" || !onSelectRecipe) return [];
    return matchRecipesForAutocomplete(value, recipes, MAX_SUGGESTIONS);
  }, [onSelectRecipe, recipes, suggestionScope, value]);

  const suggestions = React.useMemo<AutocompleteSuggestion[]>(
    () => [
      ...itemSuggestions.map((slug) => ({ kind: "item" as const, slug })),
      ...recipeSuggestions.map((recipe) => ({ kind: "recipe" as const, recipe })),
    ],
    [itemSuggestions, recipeSuggestions],
  );

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
    (suggestion: AutocompleteSuggestion) => {
      if (suggestion.kind === "recipe") {
        onSelectRecipe?.(suggestion.recipe);
      } else {
        const selectedName = slugToDisplayName(suggestion.slug);
        if (onSelectItem) {
          onSelectItem(selectedName);
        } else {
          onChange(selectedName);
        }
      }
      setOpen(false);
    },
    [onChange, onSelectItem, onSelectRecipe],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSelectItem && value.trim() && (!showDropdown || highlightedIndex < 0)) {
        e.preventDefault();
        onSelectItem(value.trim());
        setOpen(false);
        return;
      }
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
    [showDropdown, suggestions, highlightedIndex, handleSelect, onSelectItem, value],
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
            {suggestions.map((suggestion, i) => (
              <li
                key={
                  suggestion.kind === "item"
                    ? `item-${suggestion.slug}`
                    : `recipe-${suggestion.recipe.id}`
                }
                role="option"
                aria-selected={i === highlightedIndex}
              >
                {suggestion.kind === "item" ? (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(suggestion);
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
                            ? `/images/ingredients/${suggestion.slug}_160.webp`
                            : itemPhotoUrlFromSlug(suggestion.slug, 160)
                        }
                        alt=""
                        width={40}
                        height={40}
                        unoptimized
                        className="size-10 shrink-0 rounded-[4px] object-contain"
                        aria-hidden
                      />
                      <span className="min-w-0 truncate text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                        {slugToDisplayName(suggestion.slug)}
                      </span>
                </button>
                ) : (
                <div
                  className={cn(
                    "flex w-full items-center gap-1 px-3 py-2",
                    i === highlightedIndex
                      ? "bg-[var(--blue-25)]"
                      : "hover:bg-[var(--blue-25)]",
                    i > 0 && "border-t border-[var(--gray-100)]",
                  )}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(suggestion);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                      {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto kan een externe/data-URL zijn */}
                      <img
                        src={suggestion.recipe.photoUrl || "/images/ui/recept_320.webp"}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-[4px] object-cover"
                        aria-hidden
                        decoding="async"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium leading-20 text-[var(--text-primary)]">
                          {suggestion.recipe.name}
                        </span>
                        <span className="truncate text-xs leading-16 text-[var(--text-tertiary)]">
                          Recept · {suggestion.recipe.ingredients.length} ingrediënten
                        </span>
                      </span>
                  </button>
                      {onSelectRecipeFromFreezer ? (
                        <button
                          type="button"
                          aria-label={`${suggestion.recipe.name} toevoegen als diepvriesgerecht`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelectRecipeFromFreezer(suggestion.recipe);
                            setOpen(false);
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-pill text-[var(--blue-500)] transition-[color,background-color,transform] duration-fast ease-out-strong hover:bg-[var(--blue-25)] motion-safe:active:scale-90"
                        >
                          <FreezeMaskIcon />
                        </button>
                      ) : null}
                </div>
                )}
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
        aria-label={ariaLabel ?? label ?? placeholder}
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
  ariaLabel,
  placeholder,
  className,
  photoCatalog = "items",
  slideInTitle = "Item toevoegen",
  recipes,
  suggestionScope = "all",
  onSelectItem,
  onSelectRecipe,
  onSelectRecipeFromFreezer,
  searchVariant = "default",
}: ItemNameAutocompleteProps) {
  const [slideInOpen, setSlideInOpen] = React.useState(false);
  const getItemPhotoUrl = useItemPhotoUrl();
  const getIngredientPhotoUrl = useIngredientPhotoUrl(160);
  const getPhotoUrl =
    photoCatalog === "ingredients" ? getIngredientPhotoUrl : getItemPhotoUrl;
  const photoUrl =
    suggestionScope !== "recipes" && value ? getPhotoUrl(value) : null;

  return (
    <div className={cn("relative w-full", className)}>
      {label && (
        <p className="mb-1 text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
          {label}
        </p>
      )}
      {/* Opent de zoek-slide-in; het echte invoerveld krijgt daar meteen focus (mobiel toetsenbord). */}
      {searchVariant === "top" ? (
        <button
          type="button"
          onClick={() => setSlideInOpen(true)}
          className="flex h-12 w-full items-center gap-2.5 rounded-[16px] bg-[var(--gray-25)] px-3.5 text-left text-[15px] transition-colors active:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          aria-haspopup="dialog"
          aria-label={ariaLabel ?? label ?? placeholder}
        >
          <SearchIcon className="shrink-0 text-[var(--text-tertiary)]" />
          <span className="min-w-0 flex-1 truncate text-[var(--text-tertiary)]">{placeholder}</span>
        </button>
      ) : (
      <button
        type="button"
        onClick={() => setSlideInOpen(true)}
        className="flex h-12 w-full items-center gap-3 rounded-md border border-[var(--border-default)] bg-[var(--white)] px-4 text-left text-base leading-24 tracking-normal transition-colors hover:border-[var(--gray-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        aria-haspopup="dialog"
        aria-label={ariaLabel ?? label ?? placeholder}
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
            <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{value}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[var(--text-placeholder)]">
            {placeholder}
          </span>
        )}
        {/* Zelfde zoek-affordance als SearchBar: icoon rechts in primary-kleur */}
        <SearchIcon className="text-[var(--blue-500)]" />
      </button>
      )}

      <ItemNameSearchSlideIn
        variant={searchVariant}
        open={slideInOpen}
        onClose={() => setSlideInOpen(false)}
        initialValue={value}
        onSelect={(name) => {
          if (onSelectItem) {
            onSelectItem(name);
          } else {
            onChange(name);
          }
        }}
        photoCatalog={photoCatalog}
        title={slideInTitle}
        recipes={recipes}
        suggestionScope={suggestionScope}
        onSelectRecipe={onSelectRecipe}
        onSelectRecipeFromFreezer={onSelectRecipeFromFreezer}
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
