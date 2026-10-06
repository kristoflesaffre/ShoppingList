"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { StoreSelectionTile } from "@/components/ui/store_selection_tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TE_KOPEN_STORE_OPTIONS } from "@/lib/master-stores";
import { ItemNameSearchSlideIn } from "@/components/ui/item_name_search_slide_in";
import { Stepper } from "@/components/ui/stepper";
import { FilterChip } from "@/components/ui/filter_chip";
import { InputField } from "@/components/ui/input_field";
import { SearchBar } from "@/components/ui/search_bar";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { useItemPhotoUrl } from "@/lib/item-photos";
import {
  TE_KOPEN_ALGEMEEN_RGB,
  teKopenMonogramStyle,
} from "@/lib/te-kopen-style";

const STORE_FREQ_KEY = "te-kopen-store-freq";

function loadStoreFreq(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORE_FREQ_KEY);
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch {
    /* ignore */
  }
  return {};
}

function incrementStoreFreq(store: string | null): void {
  if (typeof window === "undefined" || !store) return;
  const freq = loadStoreFreq();
  freq[store] = (freq[store] ?? 0) + 1;
  localStorage.setItem(STORE_FREQ_KEY, JSON.stringify(freq));
}

const UNIT_OPTIONS = ["stuk", "pak", "fles", "kg", "g"] as const;

function FieldLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex min-h-7 items-center justify-between">
      <span className="text-[13px] font-semibold leading-[18px] text-[var(--text-secondary)]">
        {children}
      </span>
      {action}
    </div>
  );
}

export interface AddShoppingItemSlideInProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, quantity: string, store: string | null) => void;
  /** Pre-select a store when opening from a section header */
  initialStore?: string | null;
  /** Bestaand product wijzigen: slaat het zoekblad over en vult alles in. */
  editItem?: { name: string; quantity: string; store?: string | null } | null;
}

export function AddShoppingItemSlideIn({
  open,
  onClose,
  onAdd,
  initialStore,
  editItem,
}: AddShoppingItemSlideInProps) {
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unit, setUnit] = React.useState("stuk");
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);
  const [searchMode, setSearchMode] = React.useState(false);
  /** «Andere…» gekozen: vrij eenheidsveld tonen. */
  const [customUnit, setCustomUnit] = React.useState(false);
  const getPhoto = useItemPhotoUrl(80);
  const [storeSearch, setStoreSearch] = React.useState("");
  // True while the fullscreen autocomplete is open (step 1)
  const [searchOpen, setSearchOpen] = React.useState(false);
  // Tracks whether onSelect fired before onClose so we don't close the whole flow
  const didSelectRef = React.useRef(false);
  const storeTileRefs = React.useRef(new Map<string, HTMLButtonElement>());

  // When the slide-in opens: reset state and show autocomplete first
  React.useEffect(() => {
    if (open) {
      const m = editItem?.quantity.trim().match(/^(\d+)\s*(.*)$/);
      setName(editItem?.name ?? "");
      setQuantity(m ? m[1] : "1");
      const initialUnit = m ? m[2] || "stuk" : "stuk";
      setUnit(initialUnit);
      setCustomUnit(!(UNIT_OPTIONS as readonly string[]).includes(initialUnit));
      setSelectedStore(
        editItem ? (editItem.store ?? null) : (initialStore ?? null),
      );
      setSearchMode(false);
      setStoreSearch("");
      setSearchOpen(!editItem);
    } else {
      setSearchOpen(false);
    }
  }, [open, initialStore, editItem]);

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

  const [storeFreq] = React.useState<Record<string, number>>(() =>
    loadStoreFreq(),
  );

  const sortedStoreOptions = React.useMemo(() => {
    return [...TE_KOPEN_STORE_OPTIONS].sort(
      (a, b) => (storeFreq[b.label] ?? 0) - (storeFreq[a.label] ?? 0),
    );
  }, [storeFreq]);

  const filteredStores =
    searchMode && storeSearch.trim()
      ? sortedStoreOptions.filter((s) =>
          s.label.toLowerCase().includes(storeSearch.toLowerCase()),
        )
      : sortedStoreOptions;
  const selectedStoreVisible = selectedStore
    ? filteredStores.some((s) => s.label === selectedStore)
    : false;

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const qty = `${quantity.trim() || "1"} ${unit.trim() || "stuk"}`.trim();
    incrementStoreFreq(selectedStore);
    onAdd(trimmed, qty, selectedStore);
    onClose();
  };

  // Main slide-in is visible once a name is chosen (searchOpen = false but open = true)
  const mainSlideOpen = open && !searchOpen;

  React.useEffect(() => {
    if (!mainSlideOpen || !selectedStore || !selectedStoreVisible) return;
    const tile = storeTileRefs.current.get(selectedStore);
    if (!tile) return;
    const frameId = requestAnimationFrame(() => {
      tile.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [mainSlideOpen, selectedStore, selectedStoreVisible]);

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
        title={editItem ? "Product wijzigen" : "Nieuw te kopen product"}
        containerClassName="z-40"
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="w-full"
          >
            {editItem ? "Opslaan" : "Toevoegen"}
          </Button>
        }
      >
        <div className="flex w-full flex-col gap-[22px]">
          {/* Product — zacht veld met foto, naam en «Wijzig» (opent het zoekblad) */}
          <div>
            <FieldLabel>Product</FieldLabel>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-[58px] w-full items-center gap-3 rounded-[16px] bg-[var(--gray-25)] pl-2 pr-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              {name && getPhoto(name) ? (
                <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--white)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
                  <img
                    src={getPhoto(name)!}
                    alt=""
                    width={34}
                    height={34}
                    className="size-[34px] object-contain"
                  />
                </span>
              ) : name ? (
                <span
                  className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold"
                  style={teKopenMonogramStyle(name)}
                  aria-hidden
                >
                  {name.trim().charAt(0).toUpperCase()}
                </span>
              ) : null}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-base first-letter:uppercase",
                  name
                    ? "font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)]",
                )}
              >
                {name || "Kies een product"}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-[var(--blue-500)]">
                Wijzig
              </span>
            </button>
          </div>

          {/* Hoeveelheid — formulier-stepper + eenheidschips */}
          <div>
            <FieldLabel>Hoeveelheid</FieldLabel>
            {/* Tablet+: compacte stepper met de eenheidschips ernaast */}
            <div className="md:flex md:items-center md:gap-3.5">
              <div className="md:w-[176px] md:shrink-0">
                <Stepper
                  value={parseInt(quantity, 10) || 1}
                  min={1}
                  onValueChange={(v) => setQuantity(String(v))}
                />
              </div>
              <div
                role="group"
                aria-label="Eenheid"
                className="mt-2.5 flex flex-wrap gap-1.5 md:mt-0"
              >
                {UNIT_OPTIONS.map((u) => (
                  <FilterChip
                    key={u}
                    selected={!customUnit && unit === u}
                    onClick={() => {
                      setCustomUnit(false);
                      setUnit(u);
                    }}
                  >
                    {u}
                  </FilterChip>
                ))}
                <FilterChip
                  selected={customUnit}
                  onClick={() => {
                    setCustomUnit(true);
                    setUnit("");
                  }}
                >
                  Andere…
                </FilterChip>
              </div>
            </div>
            {customUnit ? (
              <InputField
                className="mt-2.5"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Eenheid, bv. doos"
                aria-label="Eenheid"
                autoFocus
              />
            ) : null}
          </div>

          {/* Winkel — Algemeen + winkeltegels; zoeken via ronde knop */}
          <div>
            <FieldLabel
              action={
                <RoundIconButton
                  tone={searchMode ? "primary" : "neutral"}
                  size={28}
                  aria-label={
                    searchMode ? "Winkel zoeken sluiten" : "Winkel zoeken"
                  }
                  aria-pressed={searchMode}
                  onClick={() => {
                    setSearchMode((v) => !v);
                    setStoreSearch("");
                  }}
                >
                  {RoundIcons.search}
                </RoundIconButton>
              }
            >
              Winkel
            </FieldLabel>
            {searchMode ? (
              <SearchBar
                className="mb-3"
                value={storeSearch}
                onValueChange={setStoreSearch}
                placeholder="Zoek winkel"
                autoFocus
              />
            ) : null}
            <div
              role="radiogroup"
              aria-label="Winkel"
              className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-[repeat(6,84px)] md:justify-between md:gap-y-2.5 md:overflow-visible md:px-0"
            >
              {!searchMode || !storeSearch.trim() ? (
                <StoreSelectionTile
                  role="radio"
                  aria-checked={selectedStore === null}
                  label="Algemeen"
                  selected={selectedStore === null}
                  onClick={() => setSelectedStore(null)}
                  icon={
                    <span
                      className="flex size-8 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `rgba(${TE_KOPEN_ALGEMEEN_RGB.join(",")},0.14)`,
                      }}
                    >
                      <span className="size-2.5 rounded-full bg-[var(--blue-500)]" />
                    </span>
                  }
                />
              ) : null}
              {filteredStores.map((store) => {
                const selected = selectedStore === store.label;
                return (
                  <StoreSelectionTile
                    key={store.slug}
                    ref={(node) => {
                      if (node) {
                        storeTileRefs.current.set(store.label, node);
                      } else {
                        storeTileRefs.current.delete(store.label);
                      }
                    }}
                    role="radio"
                    aria-checked={selected}
                    label={store.label}
                    logoSrc={store.logoSrc}
                    selected={selected}
                    onClick={() => setSelectedStore(store.label)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </SlideInModal>
    </>
  );
}
