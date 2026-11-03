"use client";

import * as React from "react";
import { DatePickerField } from "@/components/list_date_stepper";
import { Button } from "@/components/ui/button";
import { EditFormRow } from "@/components/ui/edit_form_row";
import { ChosenProductCard } from "@/components/ui/chosen_product_card";
import { InputField } from "@/components/ui/input_field";
import { slugToDisplayName } from "@/components/ui/item_name_autocomplete";
import { SearchBar } from "@/components/ui/search_bar";
import { SelectField } from "@/components/ui/select_field";
import { Stepper } from "@/components/ui/stepper";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import {
  PANTRY_PRODUCT_UNITS,
  buildFreezerSearch,
  freezerStockLabel,
  type FreezerEntry,
} from "@/lib/freezer-search";
import { normalizeForMatch, useItemPhotoUrl, useItemSlugs, useItemSynonyms } from "@/lib/item-photos";
import { matchItemSlugsForAutocomplete } from "@/lib/item-slug-autocomplete";
import { isPantryProduct, pantryGroupOf, PANTRY_GROUPS } from "@/lib/pantry";
import { pantryExpiryQuickPicks } from "@/lib/pantry-expiry";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";

const MAX_RESULTS = 8;
const NO_IDS: ReadonlySet<string> = new Set();
const OTHER_UNIT = "__andere";

export type PantryAddition = {
  name: string;
  /** Al in de voorraadkast: het aantal komt daarbij. */
  stock: FreezerEntry | null;
  quantity: number;
  unit: string;
  /** ISO-datum, leeg = geen. */
  expiryDate: string;
};

/** Productfoto in een rij van de voorraadkast, of de beginletter als er geen foto is. */
export function PantryProductPhoto({ name }: { name: string }) {
  const getItemPhoto = useItemPhotoUrl(160);
  const photo = getItemPhoto(name);
  return photo ? (
    <span className="flex size-11 shrink-0 items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
      <img src={photo} alt="" width={36} height={36} className="size-9 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
    </span>
  ) : (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold" style={teKopenMonogramStyle(name)} aria-hidden>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

const rowClass =
  "flex w-full items-center gap-3 rounded-[14px] px-1 py-2 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

/** Canvas «Voorraadkast toevoegen», voorstel 1: eerst een product kiezen, dan aantal en vervaldatum, dan «Toevoegen». */
export function PantryAddSheet({
  items,
  initialQuery = "",
  onClose,
  onAdd,
}: {
  items: FreezerEntry[];
  initialQuery?: string;
  onClose: () => void;
  onAdd: (addition: PantryAddition) => void;
}) {
  const [query, setQuery] = React.useState(initialQuery);
  const [chosen, setChosen] = React.useState<{ name: string; stock: FreezerEntry | null } | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [unit, setUnit] = React.useState("stuk");
  const [unitCustom, setUnitCustom] = React.useState(false);
  const [expiryDate, setExpiryDate] = React.useState("");

  const getItemPhoto = useItemPhotoUrl();
  const itemSlugs = useItemSlugs();
  const itemSynonyms = useItemSynonyms();
  const typed = query.trim();
  const productMatches = React.useMemo(() => {
    const norm = normalizeForMatch(typed);
    if (!norm || !itemSlugs.length) return [];
    // Eerst filteren: anders vullen diepvries en vers de plaatsen van de maximumlijst op.
    const pantrySlugs = itemSlugs.filter((slug) => isPantryProduct(slugToDisplayName(slug)));
    return matchItemSlugsForAutocomplete(norm, pantrySlugs, itemSynonyms, MAX_RESULTS).map(slugToDisplayName);
  }, [itemSlugs, itemSynonyms, typed]);

  const results = typed
    ? buildFreezerSearch({ query: typed, items, recipes: [], productNames: productMatches, addedIds: NO_IDS, filter: "product" })
    : null;
  const rows = results
    ? [...results.inFreezer.map((stock) => ({ name: stock.name, stock })), ...results.products]
    : [];

  function choose(name: string, stock: FreezerEntry | null) {
    setChosen({ name, stock });
    setQuantity(1);
    setUnit(stock?.unit ?? "stuk");
    setUnitCustom(false);
    setExpiryDate(stock?.expiryDate ?? "");
  }

  return (
    <SlideInModal
      open
      onClose={onClose}
      title="Product toevoegen"
      cancelLabel="Annuleer"
      titleId="pantry-add-title"
      // Zoeken: vaste hoogte zodat de resultaten niet verspringen. Na het kiezen zo hoog als de inhoud (canvas «Product toevoegen» A).
      className={chosen ? undefined : "h-[566px]"}
      bodyClassName={chosen ? undefined : "!pt-0"}
      footer={
        <Button
          type="button"
          disabled={!chosen || !unit.trim()}
          onClick={() => chosen && onAdd({ ...chosen, quantity, unit: unit.trim(), expiryDate })}
        >
          Toevoegen
        </Button>
      }
    >
      {chosen ? (
        <div className="flex flex-col gap-4">
          <ChosenProductCard
            name={chosen.name}
            photoUrl={getItemPhoto(chosen.name)}
            subtitle={
              chosen.stock
                ? `Je hebt al ${freezerStockLabel(chosen.stock)} · dit komt erbij`
                : (
                    <>
                      {PANTRY_GROUPS.find((g) => g.key === pantryGroupOf(chosen.name))?.label ?? "Overig"}
                      <span className="hidden md:inline"> · nieuw in je voorraadkast</span>
                    </>
                  )
            }
            onChange={() => setChosen(null)}
          />
          <EditFormRow label="Aantal">
            <div className="flex items-center gap-2.5">
              <div className="w-[150px] shrink-0">
                <Stepper value={quantity} onValueChange={setQuantity} min={1} />
              </div>
              {chosen.stock ? (
                // Al in de kast: het aantal komt erbij in de bestaande eenheid.
                <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--text-secondary)]">{unit}</span>
              ) : (
                <SelectField
                  className="flex-1"
                  ariaLabel="Eenheid"
                  value={unitCustom ? OTHER_UNIT : unit}
                  onChange={(next) => {
                    if (next === OTHER_UNIT) {
                      setUnitCustom(true);
                      setUnit("");
                    } else {
                      setUnitCustom(false);
                      setUnit(next);
                    }
                  }}
                  options={[...PANTRY_PRODUCT_UNITS.map((u) => ({ value: u, label: u })), { value: OTHER_UNIT, label: "Andere…" }]}
                />
              )}
            </div>
            {unitCustom && !chosen.stock ? (
              <InputField
                className="mt-2.5"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Eenheid, bv. doos"
                aria-label="Eenheid"
                autoFocus
              />
            ) : null}
          </EditFormRow>
          <EditFormRow label="Vervaldatum">
            <DatePickerField
              hideLabel
              label="Vervaldatum"
              pickerTitle={`${chosen.name} houdbaar tot`}
              placeholder="Optioneel"
              value={expiryDate}
              onChange={setExpiryDate}
              quickPicks={pantryExpiryQuickPicks()}
            />
          </EditFormRow>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Blijft staan als de resultaten scrollen: het blad heeft een vaste hoogte. De witruimte dekt de rijen af. */}
          <div className="sticky top-0 z-10 bg-[var(--white)] pb-3 pt-6">
            <SearchBar
              autoFocus
              placeholder="Zoek een product"
              aria-label="Zoek een product"
              value={query}
              onValueChange={setQuery}
            />
          </div>
          {results ? (
            <div className="flex flex-col">
              {rows.map(({ name, stock }) => (
                <button key={name} type="button" onClick={() => choose(name, stock)} className={rowClass}>
                  <PantryProductPhoto name={name} />
                  <span className="min-w-0 flex-1 leading-[19px]">
                    <span className="block truncate text-[15px] font-semibold text-text-primary first-letter:uppercase">{name}</span>
                    <span className="block truncate text-[13px] text-[var(--text-secondary)]">
                      {stock ? `Al in je voorraadkast: ${freezerStockLabel(stock)}` : "Product"}
                    </span>
                  </span>
                </button>
              ))}
              {results.createName ? (
                <button
                  type="button"
                  onClick={() => choose(results.createName!, null)}
                  className="flex h-12 w-full items-center gap-2.5 rounded-[14px] px-3 text-left text-[15px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-[18px] shrink-0">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="min-w-0 truncate">«{results.createName}» als nieuw product</span>
                </button>
              ) : null}
            </div>
          ) : (
            <p className="px-1 text-[15px] leading-[22px] text-[var(--text-secondary)]">Typ wat je wilt toevoegen, bijvoorbeeld bloem, olie of koekjes.</p>
          )}
        </div>
      )}
    </SlideInModal>
  );
}
