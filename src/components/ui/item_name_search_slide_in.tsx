"use client";

import * as React from "react";
import Image from "next/image";
import ReactDOM from "react-dom";
import {
  useItemSlugs,
  normalizeForMatch,
  itemPhotoUrlFromSlug,
} from "@/lib/item-photos";
import {
  useIngredientSlugs,
  useIngredientSynonyms,
  matchIngredientSlugsForAutocomplete,
} from "@/lib/ingredient-photos";
import { cn } from "@/lib/utils";

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
                <span className="font-medium text-[#16181a]">
                  {dw.slice(0, norm.length)}
                </span>
                <span className="font-normal text-[#707784]">
                  {dw.slice(norm.length)}
                </span>
              </>
            ) : (
              <span className="font-normal text-[#707784]">{dw}</span>
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

/** icons/plus_circle — circle with a + inside (inset ~10.3% of 24px) */
function PlusCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke="var(--blue-500)" strokeWidth="1.25" />
      <path d="M12 8V16M8 12H16" stroke="var(--blue-500)" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
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
};

export function ItemNameSearchSlideIn({
  open,
  onClose,
  initialValue,
  onSelect,
  title = "Ingrediënt",
  photoCatalog = "items",
}: ItemNameSearchSlideInProps) {
  const itemSlugs = useItemSlugs();
  const ingredientSlugs = useIngredientSlugs();
  const ingredientSynonyms = useIngredientSynonyms();
  const slugs = photoCatalog === "ingredients" ? ingredientSlugs : itemSlugs;
  const synonyms =
    photoCatalog === "ingredients" ? ingredientSynonyms : ({} as Record<string, string>);
  const [query, setQuery] = React.useState(initialValue);
  const [domVisible, setDomVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useLayoutEffect(() => {
    if (open) {
      setDomVisible(true);
    } else {
      setDomVisible(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (open) setQuery(initialValue);
  }, [open, initialValue]);

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
    if (!norm || !slugs.length) return [];
    if (photoCatalog === "ingredients") {
      return matchIngredientSlugsForAutocomplete(
        norm,
        slugs,
        synonyms,
        SLIDE_IN_MAX_SUGGESTIONS,
      );
    }
    const matching = slugs.filter((slug) =>
      slug.split("_").some((w) => w.startsWith(norm)),
    );
    matching.sort(
      (a, b) => (a.startsWith(norm) ? 0 : 1) - (b.startsWith(norm) ? 0 : 1),
    );
    return matching.slice(0, SLIDE_IN_MAX_SUGGESTIONS);
  }, [slugs, norm, photoCatalog, synonyms]);

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

  if (!mounted || !domVisible) return null;

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
        className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-tl-[8px] rounded-tr-[8px] bg-white"
        style={{ top: TOP_OFFSET }}
      >
        {/* Header — 64px */}
        <div className="flex h-16 shrink-0 items-center gap-4 px-4">
          <span className="size-6 shrink-0" aria-hidden />
          <h2 className="min-w-0 flex-1 text-center text-base font-medium leading-6 tracking-normal text-[#302112]">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Sluiten"
            className="flex size-6 shrink-0 items-center justify-center text-[#302112] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <CrossIcon />
          </button>
        </div>

        {/* Search input */}
        <div className="shrink-0 px-4 pb-6">
          <div className="flex h-12 items-center gap-[10px] rounded-lg border border-[#c6c8ce] bg-white px-4">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek item…"
              autoComplete="off"
              enterKeyHint="search"
              inputMode="text"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-base leading-6 tracking-normal text-[#16181a] placeholder:text-[#8c929d] focus:outline-none"
            />
            {query.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Wis zoekopdracht"
                className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none"
              >
                <ClearIcon />
              </button>
            )}
          </div>
        </div>

        {/* Results list */}
        <ul
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(45px,env(safe-area-inset-bottom,45px))]"
        >
          {suggestions.map((slug) => (
            <li key={slug} role="option">
              <button
                type="button"
                onClick={() => handleSelect(slug)}
                className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                <Image
                  src={
                    photoCatalog === "ingredients"
                      ? `/images/ingredients/${slug}_160.webp`
                      : itemPhotoUrlFromSlug(slug, 160)
                  }
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                  className="size-8 shrink-0 object-contain"
                  aria-hidden
                />
                <HighlightedName slug={slug} norm={norm} />
              </button>
              <div className="h-px w-full bg-[var(--gray-100,#edeef0)]" aria-hidden />
            </li>
          ))}

          {/* "Toevoegen als nieuw item" — onderaan de lijst */}
          {query.trim().length > 0 && (
            <li role="option">
              <button
                type="button"
                onClick={handleSelectCustom}
                className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <PlusCircleIcon />
                </span>
                <span className="min-w-0 truncate text-base leading-6 tracking-normal text-[#16181a]">
                  <span className="font-medium">&ldquo;{query.trim()}&rdquo; </span>
                  <span className="font-normal">toevoegen</span>
                </span>
              </button>
              <div className="h-px w-full bg-[var(--gray-100,#edeef0)]" aria-hidden />
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
