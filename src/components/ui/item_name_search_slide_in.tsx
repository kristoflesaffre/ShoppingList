"use client";

import * as React from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import {
  useItemSlugs,
  useItemSynonyms,
  normalizeForMatch,
  itemPhotoUrlFromSlug,
} from "@/lib/item-photos";
import { matchItemSlugsForAutocomplete } from "@/lib/item-slug-autocomplete";
import {
  useIngredientSlugs,
  useIngredientSynonyms,
  matchIngredientSlugsForAutocomplete,
} from "@/lib/ingredient-photos";
import type { SavedRecipe } from "@/lib/recipe_library";
import { matchRecipesForAutocomplete } from "@/lib/recipe-search";
import { PlusCircleMaskIcon } from "@/components/ui/plus_circle_mask_icon";
import { FreezeMaskIcon, StockSourceIcon } from "@/components/ui/freeze_mask_icon";
import { stockSourceForProduct, stockSourceLabel, type StockSource } from "@/lib/item-ingredient-category";
import { SEARCH_FIELD_CLASS, SearchIcon } from "@/components/ui/search_bar";
import { FilterChip } from "@/components/ui/filter_chip";
import { RoundIconButton } from "@/components/ui/round_icon_button";

/** Max treffers in slide-in; synoniemen kunnen de lijst verlengen. */
const SLIDE_IN_MAX_SUGGESTIONS = 400;
/** Pixels reserved at the top (iOS status bar area). */
const TOP_OFFSET = 48;

function slugToDisplayName(slug: string): string {
  return slug
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function HighlightedName({ slug, norm }: { slug: string; norm: string }) {
  const srcWords = slug.split("_");
  const displayWords = srcWords.map((w, i) =>
    i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w,
  );

  return (
    <span className="text-base leading-6 tracking-normal">
      {displayWords.map((dw, i) => {
        const lw = srcWords[i]!;
        const isMatch = lw.startsWith(norm);
        return (
          <React.Fragment key={i}>
            {i > 0 && " "}
            {isMatch ? (
              <>
                <span className="font-medium text-[var(--text-primary)]">
                  {dw.slice(0, norm.length)}
                </span>
                <span className="font-normal text-[var(--text-tertiary)]">
                  {dw.slice(norm.length)}
                </span>
              </>
            ) : (
              <span className="font-normal text-[var(--text-tertiary)]">{dw}</span>
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
}

function CrossIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.254 19.547C20.449 19.742 20.449 20.059 20.254 20.254C20.156 20.352 20.028 20.4 19.9 20.4C19.772 20.4 19.644 20.351 19.546 20.254L12 12.707L4.45298 20.254C4.35598 20.352 4.22798 20.4 4.09998 20.4C3.97198 20.4 3.84398 20.351 3.74598 20.254C3.55098 20.059 3.55098 19.742 3.74598 19.547L11.293 12L3.74698 4.454C3.55198 4.259 3.55198 3.942 3.74698 3.747C3.94198 3.552 4.25898 3.552 4.45398 3.747L12 11.293L19.547 3.746C19.742 3.551 20.059 3.551 20.254 3.746C20.449 3.941 20.449 4.258 20.254 4.453L12.707 12L20.254 19.547Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Replicates Figma node 935:10204: 18px gray circle + white X at inset 39.59% */
function ClearIcon() {
  return (
    <span className="relative flex size-6 items-center justify-center" aria-hidden>
      {/* 18×18 primary-50 circle, centered */}
      <span className="absolute left-1/2 top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--blue-50)]" />
      {/* X icon — primary-500, at ~39.6% inset */}
      <span className="absolute inset-0">
        <svg viewBox="0 0 24 24" fill="none" className="size-full">
          <path
            d="M9.5 9.5L14.5 14.5M14.5 9.5L9.5 14.5"
            stroke="var(--blue-500)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  );
}

export type ItemNameSearchSlideInProps = {
  open: boolean;
  onClose: () => void;
  initialValue: string;
  onSelect: (name: string) => void;
  title?: string;
  /** `ingredients` = webp onder /images/ingredients; default = item jpg’s. */
  photoCatalog?: "items" | "ingredients";
  /** Getoond wanneer de zoekbalk leeg is (bijv. alle vakantie-items). */
  defaultSlugs?: string[];
  /** Recepten die naast items in dezelfde zoekopdracht mogen verschijnen. */
  recipes?: SavedRecipe[];
  /** Beperk de zoekresultaten tot items, recepten of beide. */
  suggestionScope?: "items" | "recipes" | "all";
  /** Wordt aangeroepen wanneer een receptresultaat wordt gekozen. */
  onSelectRecipe?: (recipe: SavedRecipe) => void;
  /** Wordt aangeroepen wanneer het sneeuwvlok-icoon bij een recept wordt gekozen. */
  onSelectRecipeFromFreezer?: (recipe: SavedRecipe) => void;
  /** Sneeuwvlok (vlees/vis) of voorraadpot (kruiden, conserven…): product uit voorraad, niet kopen. */
  onSelectItemFromStock?: (name: string, source: StockSource) => void;
  /**
   * `top` (canvas «Items toevoegen 1b · zoeken»): zoekbalk helemaal bovenaan met «Annuleer»,
   * filterchips Alles / Producten / Recepten en rijen met enkel foto + naam.
   */
  variant?: "default" | "top";
  /**
   * Mobiel (`top`): het zoekveld waarop getikt werd. Bij openen schuift het zoekveld vanaf die plek
   * naar boven (en bij sluiten terug); de rest van het blad fadet in.
   */
  originRef?: React.RefObject<HTMLElement | null>;
};

/** Zelfde curve als de bladen (`--ease-drawer`). */
const FLY_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const FLY_MS = 380;

export function ItemNameSearchSlideIn({
  open,
  onClose,
  initialValue,
  onSelect,
  title = "Item toevoegen",
  photoCatalog = "items",
  defaultSlugs,
  recipes = [],
  suggestionScope = "all",
  onSelectRecipe,
  onSelectRecipeFromFreezer,
  onSelectItemFromStock,
  variant = "top",
  originRef,
}: ItemNameSearchSlideInProps) {
  const isTop = variant === "top";
  const itemSlugs = useItemSlugs();
  const itemSynonyms = useItemSynonyms();
  const ingredientSlugs = useIngredientSlugs();
  const ingredientSynonyms = useIngredientSynonyms();
  const slugs = photoCatalog === "ingredients" ? ingredientSlugs : itemSlugs;
  const synonyms =
    photoCatalog === "ingredients" ? ingredientSynonyms : itemSynonyms;
  const [query, setQuery] = React.useState(initialValue);
  const [topScope, setTopScope] = React.useState<"items" | "recipes" | "all">(suggestionScope);
  const scope = isTop ? topScope : suggestionScope;
  const [domVisible, setDomVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  /** `entered` stuurt de fades (achtergrond, chips, resultaten); het zoekveld vliegt apart. */
  const [entered, setEntered] = React.useState(false);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const exitTimerRef = React.useRef<number | null>(null);

  /** Vliegen enkel op mobiel, met een bronveld en zonder «verminderde beweging». */
  const canFly = React.useCallback(() => {
    if (!isTop || !originRef?.current || typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return window.matchMedia("(max-width: 767px)").matches;
  }, [isTop, originRef]);

  /** Zet het zoekveld visueel op de plek (en breedte) van het bronveld. */
  const placeFieldAtOrigin = React.useCallback(() => {
    const field = fieldRef.current;
    const origin = originRef?.current;
    if (!field || !origin) return null;
    field.style.transition = "none";
    field.style.transform = "none";
    field.style.width = "";
    field.style.flex = "";
    const to = field.getBoundingClientRect();
    const from = origin.getBoundingClientRect();
    // flex-1 zou de breedte overschrijven: tijdens de animatie een vaste breedte.
    field.style.flex = "none";
    field.style.width = `${from.width}px`;
    field.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    return to;
  }, [originRef]);

  React.useLayoutEffect(() => {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (open) {
      setDomVisible(true);
      return;
    }
    if (!domVisible) return;
    // Sluiten: zoekveld terug naar het bronveld, rest fadet weg; daarna pas uit de DOM.
    setEntered(false);
    if (canFly() && fieldRef.current && originRef?.current) {
      const field = fieldRef.current;
      const to = field.getBoundingClientRect();
      const from = originRef.current.getBoundingClientRect();
      field.style.transition = `transform ${FLY_MS}ms ${FLY_EASE}, width ${FLY_MS}ms ${FLY_EASE}`;
      field.style.flex = "none";
      field.style.width = `${to.width}px`;
      void field.offsetWidth;
      field.style.width = `${from.width}px`;
      field.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
      exitTimerRef.current = window.setTimeout(() => setDomVisible(false), FLY_MS);
    } else {
      exitTimerRef.current = window.setTimeout(() => setDomVisible(false), canFly() ? 0 : 180);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Openen: eerst op de plek van het bronveld, volgende frame naar de eindpositie. */
  React.useLayoutEffect(() => {
    if (!open || !domVisible) return;
    const field = fieldRef.current;
    if (!canFly() || !field) {
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    const to = placeFieldAtOrigin();
    void field.offsetWidth;
    const raf = requestAnimationFrame(() => {
      field.style.transition = `transform ${FLY_MS}ms ${FLY_EASE}, width ${FLY_MS}ms ${FLY_EASE}`;
      field.style.transform = "translate(0px, 0px)";
      field.style.width = to ? `${to.width}px` : "";
      setEntered(true);
    });
    const done = window.setTimeout(() => {
      field.style.transition = "";
      field.style.transform = "";
      field.style.width = "";
      field.style.flex = "";
    }, FLY_MS + 40);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [open, domVisible, canFly, placeFieldAtOrigin]);

  React.useEffect(
    () => () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    },
    [],
  );

  React.useEffect(() => {
    if (open) setQuery(initialValue);
  }, [open, initialValue]);

  React.useEffect(() => {
    if (open) setTopScope(suggestionScope);
  }, [open, suggestionScope]);

  /** Focus meteen bij openen. */
  React.useLayoutEffect(() => {
    if (!open || !domVisible) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const t0 = window.setTimeout(() => el.focus(), 0);
    return () => clearTimeout(t0);
  }, [open, domVisible]);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  const norm = React.useMemo(() => {
    const q = query.trim();
    return q ? normalizeForMatch(q) : "";
  }, [query]);

  const suggestions = React.useMemo(() => {
    if (scope === "recipes") return [];
    if (!norm) return defaultSlugs ?? [];
    if (!slugs.length) return [];
    if (photoCatalog === "ingredients") {
      return matchIngredientSlugsForAutocomplete(
        norm,
        slugs,
        synonyms,
        SLIDE_IN_MAX_SUGGESTIONS,
      );
    }
    return matchItemSlugsForAutocomplete(
      norm,
      slugs,
      synonyms,
      SLIDE_IN_MAX_SUGGESTIONS,
    );
  }, [slugs, norm, photoCatalog, scope, synonyms, defaultSlugs]);

  const recipeSuggestions = React.useMemo(() => {
    if (scope === "items" || !onSelectRecipe) return [];
    return matchRecipesForAutocomplete(
      query,
      recipes,
      SLIDE_IN_MAX_SUGGESTIONS,
    );
  }, [onSelectRecipe, query, recipes, scope]);

  const handleSelect = React.useCallback(
    (slug: string) => {
      onSelect(slugToDisplayName(slug));
      onClose();
    },
    [onSelect, onClose],
  );

  const handleSelectCustom = React.useCallback(() => {
    const q = query.trim();
    if (q) {
      onSelect(q);
      onClose();
    }
  }, [query, onSelect, onClose]);

  const handleSelectRecipe = React.useCallback(
    (recipe: SavedRecipe) => {
      onSelectRecipe?.(recipe);
      onClose();
    },
    [onClose, onSelectRecipe],
  );

  const handleSelectItemFromStock = React.useCallback(
    (slug: string, source: StockSource) => {
      onSelectItemFromStock?.(slugToDisplayName(slug), source);
      onClose();
    },
    [onClose, onSelectItemFromStock],
  );

  const handleSelectRecipeFromFreezer = React.useCallback(
    (recipe: SavedRecipe) => {
      onSelectRecipeFromFreezer?.(recipe);
      onClose();
    },
    [onClose, onSelectRecipeFromFreezer],
  );

  if (!mounted || !domVisible) return null;

  /** Chips, hint en resultaten: komen net na het zoekveld binnen (en gaan eerst weg). */
  const fadeClass = cn(
    "transition-[opacity,transform] duration-[260ms] ease-out-strong motion-reduce:transition-none",
    entered ? "translate-y-0 opacity-100 delay-[140ms]" : "translate-y-2 opacity-0",
  );

  if (isTop) {
    const showChips = Boolean(onSelectRecipe) && suggestionScope === "all";
    const chips: Array<{ value: "all" | "items" | "recipes"; label: string }> = [
      { value: "all", label: "Alles" },
      { value: "items", label: "Producten" },
      { value: "recipes", label: "Recepten" },
    ];
    const rowClass =
      "flex w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]";
    const highlight = (name: string) => {
      const lower = name.toLowerCase();
      const q = query.trim().toLowerCase();
      const at = q ? lower.indexOf(q) : -1;
      if (at < 0) return <span>{name}</span>;
      return (
        <span>
          {name.slice(0, at)}
          <span className="font-bold text-[var(--blue-500)]">{name.slice(at, at + q.length)}</span>
          {name.slice(at + q.length)}
        </span>
      );
    };
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
        <div
          className={cn("absolute inset-0 bg-black/50 transition-opacity duration-[260ms] ease-out-strong motion-reduce:transition-none", entered ? "opacity-100" : "opacity-0")}
          onClick={handleClose}
          aria-hidden
        />
        <div
          className={cn(
            "absolute bottom-0 left-1/2 top-12 isolate flex w-full max-w-[956px] -translate-x-1/2 flex-col overflow-hidden rounded-t-[26px]",
            /* Tablet+: gecentreerd venster zoals SlideInModal (design system «Blad»). */
            "md:bottom-auto md:top-1/2 md:h-[min(640px,calc(100dvh-48px))] md:max-w-[620px] md:-translate-y-1/2 md:rounded-[26px] md:shadow-[0_30px_60px_-20px_rgba(16,17,48,0.45)]",
          )}
        >
          {/* Achtergrond van het blad fadet in; het zoekveld erboven vliegt van het bronveld naar hier. */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 -z-10 bg-[var(--white)] transition-opacity duration-[240ms] ease-out-strong motion-reduce:transition-none",
              entered ? "opacity-100" : "opacity-0",
            )}
          />
          <span aria-hidden className={cn("mx-auto mt-2 block h-1 w-[38px] shrink-0 rounded-full bg-[var(--gray-100)] md:hidden", fadeClass)} />
          <div className="flex shrink-0 items-center gap-2.5 px-[18px] pb-3 pt-3 md:px-6 md:pt-5">
            {/* Design system «Zoekveld»: zelfde vlak als SearchBar. */}
            <div ref={fieldRef} className={cn(SEARCH_FIELD_CLASS, "will-change-transform")}>
              <SearchIcon className="shrink-0 text-[var(--text-tertiary)] group-focus-within:text-[var(--blue-500)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={scope === "recipes" ? "Zoek een recept" : onSelectRecipe ? "Zoek een product of recept" : "Zoek een product"}
                aria-label={title}
                autoComplete="off"
                enterKeyHint="search"
                inputMode="text"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-base leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Wis zoekopdracht"
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--gray-200)] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden className="size-3">
                    <path d="M7 7l10 10M17 7 7 17" />
                  </svg>
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                "shrink-0 rounded-md text-[15px] font-semibold text-[var(--blue-500)] transition-[opacity,transform] duration-[260ms] ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] motion-reduce:transition-none",
                entered ? "translate-x-0 opacity-100 delay-[120ms]" : "translate-x-3 opacity-0",
              )}
            >
              Annuleer
            </button>
          </div>
          {showChips ? (
            <div className={cn("flex shrink-0 gap-1.5 px-[18px] pb-2 md:px-6", fadeClass)} role="group" aria-label="Filter op type">
              {chips.map((c) => (
                <FilterChip key={c.value} selected={topScope === c.value} onClick={() => setTopScope(c.value)}>
                  {c.label}
                </FilterChip>
              ))}
            </div>
          ) : null}
          {!query.trim() ? (
            <p className={cn("px-6 pt-8 text-center text-[14px] leading-5 text-[var(--text-tertiary)]", fadeClass)}>
              {scope === "recipes" ? "Typ de naam van een recept." : "Typ de naam van een product. Staat het er niet bij, dan voeg je het toe als nieuw item."}
            </p>
          ) : null}
          <ul role="listbox" className={cn("min-h-0 flex-1 overflow-y-auto px-[18px] pb-[max(45px,env(safe-area-inset-bottom,45px))] md:px-6 md:pb-6", fadeClass)}>
            {suggestions.map((slug, i) => (
              <li key={slug} role="option" aria-selected={false} className={i > 0 ? "border-t border-[var(--border-subtle)]" : undefined}>
                <div className="flex w-full items-center gap-2">
                <button type="button" onClick={() => handleSelect(slug)} className={rowClass}>
                  <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element -- lokale webp */}
                    <img
                      src={photoCatalog === "ingredients" ? `/images/ingredients/${slug}_160.webp` : itemPhotoUrlFromSlug(slug, 160)}
                      alt=""
                      width={35}
                      height={35}
                      className="size-[35px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal"
                      decoding="async"
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-primary)]">
                    {highlight(slugToDisplayName(slug))}
                  </span>
                </button>
                {(() => {
                  const source = onSelectItemFromStock ? stockSourceForProduct(slugToDisplayName(slug)) : null;
                  return source ? (
                    <RoundIconButton
                      tone="primary"
                      size={28}
                      aria-label={`${slugToDisplayName(slug)}: ${stockSourceLabel(source).toLowerCase()} toevoegen`}
                      onClick={() => handleSelectItemFromStock(slug, source)}
                      className="mx-2"
                    >
                      <StockSourceIcon source={source} className="!size-4" colorClassName="bg-[var(--blue-500)]" />
                    </RoundIconButton>
                  ) : null;
                })()}
                </div>
              </li>
            ))}
            {recipeSuggestions.map((recipe) => (
              <li key={`recipe-${recipe.id}`} role="option" aria-selected={false} className="border-t border-[var(--border-subtle)] first:border-t-0">
                <div className="flex w-full items-center gap-2">
                  <button type="button" onClick={() => handleSelectRecipe(recipe)} className={rowClass}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto kan een externe/data-URL zijn */}
                    <img
                      src={recipe.photoUrl || "/images/ui/recept_320.webp"}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 shrink-0 rounded-full object-cover"
                      aria-hidden
                      decoding="async"
                    />
                    <span className="flex min-w-0 flex-1 flex-col leading-[18px]">
                      <span className="truncate text-[15px] font-medium text-[var(--text-primary)]">{highlight(recipe.name)}</span>
                      <span className="truncate text-[12.5px] text-[var(--text-tertiary)]">Recept</span>
                    </span>
                  </button>
                  {onSelectRecipeFromFreezer ? (
                    <RoundIconButton
                      tone="primary"
                      size={28}
                      aria-label={`${recipe.name} toevoegen als diepvriesgerecht`}
                      onClick={() => handleSelectRecipeFromFreezer(recipe)}
                      className="mx-2"
                    >
                      <FreezeMaskIcon className="!size-4" colorClassName="bg-[var(--blue-500)]" />
                    </RoundIconButton>
                  ) : null}
                </div>
              </li>
            ))}
            {scope !== "recipes" && query.trim().length > 0 ? (
              <li role="option" aria-selected={false} className="border-t border-[var(--border-subtle)] first:border-t-0">
                <button type="button" onClick={handleSelectCustom} className={rowClass}>
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--blue-25)] text-lg font-bold text-[var(--blue-500)]"
                    aria-hidden
                  >
                    {query.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-[18px]">
                    <span className="truncate text-[15px] font-medium text-[var(--text-primary)]">{query.trim()}</span>
                    <span className="truncate text-[12.5px] text-[var(--text-tertiary)]">Als nieuw item</span>
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      </div>,
      document.body,
    );
  }

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — altijd het volledige scherm */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden
      />

      {/* Paneel: bottom vast op layout-viewport; keyboard legt zich erover (geen omhoogschuiven). */}
      <div
        className="absolute bottom-0 left-1/2 w-full max-w-[956px] -translate-x-1/2 flex flex-col overflow-hidden rounded-tl-[8px] rounded-tr-[8px] bg-white"
        style={{ top: TOP_OFFSET }}
      >
        {/* Header — 64px */}
        <div className="flex h-16 shrink-0 items-center gap-4 px-4">
          <span className="size-6 shrink-0" aria-hidden />
          <h2 className="min-w-0 flex-1 text-center text-base font-medium leading-6 tracking-normal text-[var(--secondary-900)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Sluiten"
            className="flex size-6 shrink-0 items-center justify-center text-[var(--secondary-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <CrossIcon />
          </button>
        </div>

        {/* Search input */}
        <div className="shrink-0 px-4 pb-6">
          <div className="flex h-12 items-center gap-[10px] rounded-md border border-[var(--border-default)] bg-[var(--white)] px-4 transition-[border-color] focus-within:border-[var(--border-focus)]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                suggestionScope === "recipes"
                  ? "Zoek recept…"
                  : onSelectRecipe
                    ? "Zoek item of recept…"
                    : "Zoek item…"
              }
              autoComplete="off"
              enterKeyHint="search"
              inputMode="text"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-base leading-6 tracking-normal text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Wis zoekopdracht"
                className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <ClearIcon />
              </button>
            ) : (
              <SearchIcon className="text-[var(--blue-500)]" />
            )}
          </div>
        </div>

        {/* Results list */}
        <ul
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(45px,env(safe-area-inset-bottom,45px))]"
        >
          {onSelectRecipe && suggestions.length > 0 ? (
            <li
              role="presentation"
              className="pb-1 pt-2 text-xs font-medium leading-4 text-[var(--text-tertiary)]"
            >
              Items
            </li>
          ) : null}
          {suggestions.map((slug) => (
            <li key={slug} role="option" aria-selected={false}>
              <div className="flex w-full items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelect(slug)}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- lokale webp: Next/Image optimizer faalt op sommige iOS-builds */}
                <img
                  src={
                    photoCatalog === "ingredients"
                      ? `/images/ingredients/${slug}_160.webp`
                      : itemPhotoUrlFromSlug(slug, 160)
                  }
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 object-contain"
                  aria-hidden
                  decoding="async"
                />
                <HighlightedName slug={slug} norm={norm} />
              </button>
              {(() => {
                const source = onSelectItemFromStock ? stockSourceForProduct(slugToDisplayName(slug)) : null;
                return source ? (
                  <button
                    type="button"
                    aria-label={`${slugToDisplayName(slug)}: ${stockSourceLabel(source).toLowerCase()} toevoegen`}
                    onClick={() => handleSelectItemFromStock(slug, source)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-pill text-[var(--blue-500)] transition-[color,background-color,transform] duration-fast ease-out-strong hover:bg-[var(--blue-25)] motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    <StockSourceIcon source={source} />
                  </button>
                ) : null;
              })()}
              </div>
              <div className="h-px w-full bg-[var(--border-subtle)]" aria-hidden />
            </li>
          ))}

          {recipeSuggestions.length > 0 ? (
            <li
              role="presentation"
              className="pb-1 pt-4 text-xs font-medium leading-4 text-[var(--text-tertiary)]"
            >
              Recepten
            </li>
          ) : null}
          {recipeSuggestions.map((recipe) => (
            <li key={`recipe-${recipe.id}`} role="option" aria-selected={false}>
              <div className="flex w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectRecipe(recipe)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto kan een externe/data-URL zijn */}
                  <img
                    src={recipe.photoUrl || "/images/ui/recept_320.webp"}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-[4px] object-cover"
                    aria-hidden
                    decoding="async"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-medium leading-6 text-[var(--text-primary)]">
                      {recipe.name}
                    </span>
                    <span className="truncate text-sm leading-5 text-[var(--text-tertiary)]">
                      Recept · {recipe.ingredients.length} ingrediënten
                    </span>
                  </span>
                </button>
                {onSelectRecipeFromFreezer ? (
                  <button
                    type="button"
                    aria-label={`${recipe.name} toevoegen als diepvriesgerecht`}
                    onClick={() => handleSelectRecipeFromFreezer(recipe)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-pill text-[var(--blue-500)] transition-[color,background-color,transform] duration-fast ease-out-strong hover:bg-[var(--blue-25)] motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    <FreezeMaskIcon />
                  </button>
                ) : null}
              </div>
              <div className="h-px w-full bg-[var(--border-subtle)]" aria-hidden />
            </li>
          ))}

          {/* "Toevoegen als nieuw item" — onderaan de lijst */}
          {scope !== "recipes" && query.trim().length > 0 && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                onClick={handleSelectCustom}
                className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <PlusCircleMaskIcon />
                </span>
                <span className="min-w-0 truncate text-base leading-6 tracking-normal text-[var(--text-primary)]">
                  <span className="font-medium">&ldquo;{query.trim()}&rdquo; </span>
                  <span className="font-normal">toevoegen</span>
                </span>
              </button>
              <div className="h-px w-full bg-[var(--border-subtle)]" aria-hidden />
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
