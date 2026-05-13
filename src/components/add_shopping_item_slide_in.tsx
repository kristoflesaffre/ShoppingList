"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MASTER_STORE_OPTIONS } from "@/lib/master-stores";
import { ItemNameSearchSlideIn } from "@/components/ui/item_name_search_slide_in";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M21.4 19.993L16.347 14.94C17.369 13.664 18 12.054 18 10.3C18 6.274 14.726 3 10.7 3C6.674 3 3.4 6.274 3.4 10.3C3.4 14.326 6.674 17.6 10.7 17.6C12.454 17.6 14.064 16.969 15.34 15.947L20.393 21L21.4 19.993ZM4.85 10.3C4.85 7.073 7.473 4.45 10.7 4.45C13.927 4.45 16.55 7.073 16.55 10.3C16.55 13.527 13.927 16.15 10.7 16.15C7.473 16.15 4.85 13.527 4.85 10.3Z" fill="currentColor"/>
    </svg>
  );
}

export interface AddShoppingItemSlideInProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, quantity: string, store: string | null) => void;
  /** Pre-select a store when opening from a section header */
  initialStore?: string | null;
}

export function AddShoppingItemSlideIn({
  open,
  onClose,
  onAdd,
  initialStore,
}: AddShoppingItemSlideInProps) {
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unit, setUnit] = React.useState("stuk");
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);
  const [searchMode, setSearchMode] = React.useState(false);
  const [storeSearch, setStoreSearch] = React.useState("");
  // True while the fullscreen autocomplete is open (step 1)
  const [searchOpen, setSearchOpen] = React.useState(false);
  // Tracks whether onSelect fired before onClose so we don't close the whole flow
  const didSelectRef = React.useRef(false);

  // When the slide-in opens: reset state and show autocomplete first
  React.useEffect(() => {
    if (open) {
      setName("");
      setQuantity("1");
      setUnit("stuk");
      setSelectedStore(initialStore ?? null);
      setSearchMode(false);
      setStoreSearch("");
      setSearchOpen(true);
    } else {
      setSearchOpen(false);
    }
  }, [open, initialStore]);

  // User picked a name from autocomplete → close search, show main slide-in
  const handleNameSelected = React.useCallback((picked: string) => {
    didSelectRef.current = true;
    setName(picked);
    setSearchOpen(false);
  }, []);

  // ItemNameSearchSlideIn calls onClose after onSelect, so guard against that
  const handleSearchClose = React.useCallback(() => {
    if (didSelectRef.current) {
      didSelectRef.current = false;
      return;
    }
    setSearchOpen(false);
    onClose();
  }, [onClose]);

  const filteredStores = (searchMode && storeSearch.trim()
    ? MASTER_STORE_OPTIONS.filter((s) =>
        s.label.toLowerCase().includes(storeSearch.toLowerCase()),
      )
    : MASTER_STORE_OPTIONS) as typeof MASTER_STORE_OPTIONS;

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const qty = `${quantity.trim() || "1"} ${unit.trim() || "stuk"}`.trim();
    onAdd(trimmed, qty, selectedStore);
    onClose();
  };

  // Main slide-in is visible once a name is chosen (searchOpen = false but open = true)
  const mainSlideOpen = open && !searchOpen;

  return (
    <>
      {/* Step 1: fullscreen autocomplete — sits on top of everything */}
      <ItemNameSearchSlideIn
        open={open && searchOpen}
        onClose={handleSearchClose}
        initialValue=""
        onSelect={handleNameSelected}
        title="Naam product"
        photoCatalog="items"
      />

      {/* Step 2: store/quantity slide-in — visible under autocomplete, opens when name is set */}
      <SlideInModal
        open={mainSlideOpen}
        onClose={onClose}
        title="Nieuw te kopen product"
        containerClassName="z-40"
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="w-full"
          >
            Toevoegen
          </Button>
        }
      >
        <div className="flex flex-col gap-6 w-full">
          {/* Gekozen productnaam — klikbaar om autocomplete opnieuw te openen */}
          <div className="flex flex-col gap-2 w-full">
            <span className="text-sm font-normal leading-5 text-[var(--text-primary)]">
              Naam product
            </span>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-12 w-full items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-4 text-left focus-visible:border-[var(--border-focus)] focus-visible:outline-none"
            >
              <span className={cn(
                "flex-1 text-base leading-6 tracking-normal",
                name ? "text-[var(--text-primary)]" : "font-light text-[var(--text-tertiary)]",
              )}>
                {name || "Naam product"}
              </span>
            </button>
          </div>

          {/* Hoeveelheid — stepper + eenheid */}
          <div className="flex flex-col gap-2 w-full">
            <span className="text-sm font-normal leading-5 text-[var(--text-primary)]">
              Hoeveelheid
            </span>
            {/* Stepper */}
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white h-12 overflow-hidden">
              <button
                type="button"
                aria-label="Verminderen"
                onClick={() =>
                  setQuantity((v) => String(Math.max(1, (parseInt(v, 10) || 1) - 1)))
                }
                className="flex size-12 shrink-0 items-center justify-center text-[var(--blue-500)] transition-colors hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
              >
                <span className="text-xl font-light leading-none select-none">−</span>
              </button>
              <div className="w-px self-stretch bg-[var(--border-subtle)]" aria-hidden />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "") || "1")}
                className="flex-1 text-center text-base font-normal leading-6 text-[var(--text-primary)] bg-transparent focus:outline-none"
              />
              <div className="w-px self-stretch bg-[var(--border-subtle)]" aria-hidden />
              <button
                type="button"
                aria-label="Verhogen"
                onClick={() =>
                  setQuantity((v) => String((parseInt(v, 10) || 0) + 1))
                }
                className="flex size-12 shrink-0 items-center justify-center text-[var(--blue-500)] transition-colors hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
              >
                <span className="text-xl font-light leading-none select-none">+</span>
              </button>
            </div>
            {/* Eenheid */}
            <div className="flex rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white h-12 items-center px-4">
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="eenheid"
                className="w-full text-center text-base font-normal leading-6 text-[var(--text-primary)] bg-transparent placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
            </div>
          </div>

          {/* Winkel */}
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-normal leading-5 text-[var(--text-primary)]">
                Winkel
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchMode((v) => !v);
                  setStoreSearch("");
                }}
                className="text-xs font-medium leading-4 text-[var(--blue-500)] hover:text-[var(--blue-600)] focus-visible:outline-none"
              >
                {searchMode ? "Sluiten" : "Zoeken"}
              </button>
            </div>

            {/* Winkelzoekbalk */}
            {searchMode && (
              <div className="relative w-full">
                <input
                  type="search"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Zoek winkel"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-4 py-[10px] pr-10 text-base font-normal leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:outline-none"
                  autoFocus
                />
                <SearchIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-5 text-[var(--text-tertiary)]" />
              </div>
            )}

            {/* Store tiles — exact zelfde als supermarkt swimlane in page.tsx */}
            <div
              role="radiogroup"
              aria-label="Winkel, optioneel"
              className="-mx-1 flex gap-[var(--space-3)] overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {filteredStores.map((store) => {
                const selected = selectedStore === store.label;
                return (
                  <button
                    key={store.slug}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setSelectedStore((prev) =>
                        prev === store.label ? null : store.label,
                      )
                    }
                    className={cn(
                      "relative flex w-[100px] shrink-0 flex-col items-center gap-[var(--space-2)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--white)] p-[var(--space-3)] text-center transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                      selected
                        ? "border border-action-primary"
                        : "border border-[var(--gray-100)]",
                      !selected &&
                        "[@media(hover:hover)]:hover:border-[var(--gray-200)]",
                    )}
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={store.logoSrc}
                        alt=""
                        width={48}
                        height={48}
                        className="size-full object-contain object-center"
                      />
                    </div>
                    <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
                      {store.label}
                    </p>
                    {selected ? (
                      <span
                        className="pointer-events-none absolute right-0 top-0 size-[36px]"
                        aria-hidden
                      >
                        <span
                          className="absolute inset-0 bg-action-primary"
                          style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
                        />
                        <svg
                          className="absolute right-[7px] top-[7px]"
                          width="10" height="10" viewBox="0 0 10 10"
                          fill="none" aria-hidden
                        >
                          <path d="M1 5.80002L3.3999 8.1999L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SlideInModal>
    </>
  );
}
