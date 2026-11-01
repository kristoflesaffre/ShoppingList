"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { CountStepper } from "@/components/ui/count_stepper";
import { FilterChip } from "@/components/ui/filter_chip";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { slugToDisplayName } from "@/components/ui/item_name_autocomplete";
import { SearchBar } from "@/components/ui/search_bar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { normalizeForMatch, useItemPhotoUrl, useItemSlugs, useItemSynonyms } from "@/lib/item-photos";
import { matchItemSlugsForAutocomplete } from "@/lib/item-slug-autocomplete";
import { matchRecipesForAutocomplete } from "@/lib/recipe-search";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";
import type { SavedRecipe, RecipeCategory } from "@/lib/recipe_library";

export interface NewFreezerItemModalProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (item: {
    name: string;
    quantityPerPackage: number;
    unit: string;
    packages: number;
    type: "product" | "gerecht";
    recipeId?: string;
    recipePhotoUrl?: string;
    recipePersons?: number;
  }) => void;
}

/** Eenheden voor de diepvries; g/kg = gewicht per pakket, de rest = aantal pakketten. */
const FREEZER_UNITS = ["stuk", "zak", "pak", "g", "kg"] as const;
const WEIGHT_UNITS = new Set<string>(["g", "kg"]);
const GRAM_STEP = 50;
const GRAM_START = 500;
const MAX_RESULTS = 8;

type Selection =
  | { kind: "recipe"; recipe: SavedRecipe }
  | { kind: "product"; name: string };

function selectionKey(selection: Selection): string {
  return selection.kind === "recipe" ? `recipe:${selection.recipe.id}` : `product:${selection.name.toLowerCase()}`;
}

function personsLabel(persons?: number | null): string {
  if (!persons) return "Recept";
  return `Recept · ${persons} ${persons === 1 ? "persoon" : "personen"}`;
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 text-[13px] font-bold leading-[18px] text-[var(--text-secondary)]">{children}</h3>;
}

function ProductThumb({ name }: { name: string }) {
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

function RecipeThumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- receptfoto
    <img src={src} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- illustratie
    <img src="/images/ui/empty_state_diepvries.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-full bg-[var(--gray-25)] object-contain p-1.5 opacity-60" />
  );
}

/** Canvas «03 · Toevoegen», 1 · Eén zoekveld: niet gekozen = plusknop, gekozen = lavendel vlak met stepper. */
function ResultRow({
  media,
  title,
  subtitle,
  selected,
  amount,
  onSelect,
  onChangeAmount,
  children,
}: {
  media: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  amount: number;
  onSelect: () => void;
  onChangeAmount: (next: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[14px]", selected && "bg-[var(--blue-25)] shadow-[inset_0_0_0_1.5px_var(--blue-500)]")}>
      <div className="flex items-center gap-3 py-[7px] pl-2.5 pr-2">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]">
          {media}
          <span className="min-w-0 flex-1 leading-[19px]">
            <span className={cn("block truncate text-[15px] text-text-primary first-letter:uppercase", selected ? "font-semibold" : "font-medium")}>{title}</span>
            <span className="block truncate text-[13px] text-[var(--text-secondary)]">{subtitle}</span>
          </span>
        </button>
        {selected ? (
          <CountStepper name={title} value={amount} tone="soft" onChange={onChangeAmount} />
        ) : (
          <RoundIconButton tone="primary" size={36} onClick={onSelect} aria-label={`${title} kiezen`}>
            {RoundIcons.plus}
          </RoundIconButton>
        )}
      </div>
      {children}
    </div>
  );
}

export function NewFreezerItemModal({ open, onClose, onAdd }: NewFreezerItemModalProps) {
  const [query, setQuery] = React.useState("");
  const [selection, setSelection] = React.useState<Selection | null>(null);
  const [amount, setAmount] = React.useState(1);
  const [unit, setUnit] = React.useState<string>("stuk");

  const itemSlugs = useItemSlugs();
  const itemSynonyms = useItemSynonyms();

  // Load recipes from DB
  const { data: recipeData } = db.useQuery(open ? { recipes: { ingredients: {} } } : null);

  const allRecipes: SavedRecipe[] = React.useMemo(() => {
    if (!recipeData?.recipes) return [];
    return [...recipeData.recipes]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((r) => ({
        id: r.id,
        name: r.name,
        link: r.link,
        steps: r.steps ?? "",
        persons: r.persons,
        photoUrl: r.photoUrl ?? null,
        category: ((r as Record<string, unknown>).category as RecipeCategory | undefined) ?? null,
        canBeFrozen: ((r as Record<string, unknown>).canBeFrozen as boolean | undefined) ?? false,
        ingredients: [...(r.ingredients ?? [])]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((ing) => ({ id: ing.id, name: ing.name, quantity: ing.quantity })),
      }));
  }, [recipeData]);

  const typed = query.trim();

  const recipes = React.useMemo(() => {
    if (typed) return matchRecipesForAutocomplete(typed, allRecipes, MAX_RESULTS);
    // Nog niets getypt: invriesbare recepten eerst.
    return [...allRecipes].sort((a, b) => Number(b.canBeFrozen) - Number(a.canBeFrozen));
  }, [allRecipes, typed]);

  const products = React.useMemo(() => {
    const norm = normalizeForMatch(typed);
    if (!norm || !itemSlugs.length) return [];
    return matchItemSlugsForAutocomplete(norm, itemSlugs, itemSynonyms, MAX_RESULTS).map(slugToDisplayName);
  }, [itemSlugs, itemSynonyms, typed]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelection(null);
      setAmount(1);
      setUnit("stuk");
    }
  }, [open]);

  function select(next: Selection) {
    if (selection && selectionKey(selection) === selectionKey(next)) return;
    setSelection(next);
    setAmount(1);
    setUnit("stuk");
  }

  function changeUnit(next: string) {
    setUnit(next);
    setAmount(next === "g" ? GRAM_START : 1);
  }

  function changeAmount(next: number) {
    // De stepper telt per 1; grammen gaan per 50.
    const value = unit === "g" ? amount + (next > amount ? GRAM_STEP : -GRAM_STEP) : next;
    if (value <= 0) {
      setSelection(null);
      setAmount(1);
      return;
    }
    setAmount(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selection) return;
    if (selection.kind === "recipe") {
      onAdd?.({
        name: selection.recipe.name,
        quantityPerPackage: 1,
        unit: "portie",
        packages: amount,
        type: "gerecht",
        recipeId: selection.recipe.id,
        recipePhotoUrl: selection.recipe.photoUrl ?? undefined,
        recipePersons: selection.recipe.persons ?? undefined,
      });
    } else {
      const isWeight = WEIGHT_UNITS.has(unit);
      onAdd?.({
        name: selection.name,
        // Gewicht (g/kg): één pakket van «aantal» g; anders «aantal» pakketten van 1 eenheid.
        quantityPerPackage: isWeight ? amount : 1,
        unit,
        packages: isWeight ? 1 : amount,
        type: "product",
      });
    }
    onClose();
  }

  const selectedKey = selection ? selectionKey(selection) : null;
  const unitChips = (
    <div role="group" aria-label="Eenheid" className="flex flex-wrap gap-1.5 px-2.5 pb-2.5 pt-0.5">
      {FREEZER_UNITS.map((u) => (
        <FilterChip key={u} selected={unit === u} onClick={() => changeUnit(u)}>
          {u}
        </FilterChip>
      ))}
    </div>
  );

  const recipeRow = (recipe: SavedRecipe) => (
    <ResultRow
      key={recipe.id}
      media={<RecipeThumb src={recipe.photoUrl ?? null} />}
      title={recipe.name}
      subtitle={personsLabel(recipe.persons)}
      selected={selectedKey === `recipe:${recipe.id}`}
      amount={amount}
      onSelect={() => select({ kind: "recipe", recipe })}
      onChangeAmount={changeAmount}
    />
  );

  const productRow = (name: string, subtitle: string) => {
    const selected = selectedKey === `product:${name.toLowerCase()}`;
    return (
      <ResultRow
        key={name}
        media={<ProductThumb name={name} />}
        title={name}
        subtitle={subtitle}
        selected={selected}
        amount={amount}
        onSelect={() => select({ kind: "product", name })}
        onChangeAmount={changeAmount}
      >
        {selected ? unitChips : null}
      </ResultRow>
    );
  };

  // Blijft zichtbaar als je verder zoekt en het gekozen item uit de resultaten valt.
  const selectionInResults =
    !selection ||
    (selection.kind === "recipe"
      ? recipes.some((r) => r.id === selection.recipe.id)
      : products.some((p) => p.toLowerCase() === selection.name.toLowerCase()));

  const showCreate =
    typed.length > 0 && !products.some((p) => p.toLowerCase() === typed.toLowerCase());

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Toevoegen aan diepvries"
      footer={
        <Button type="submit" form="new-freezer-item-form" variant="primary" disabled={!selection}>
          {selection?.kind === "recipe"
            ? `${amount} ${amount === 1 ? "portie" : "porties"} toevoegen`
            : "Toevoegen"}
        </Button>
      }
    >
      <form id="new-freezer-item-form" onSubmit={handleSubmit} className="flex min-h-[52dvh] w-full flex-col gap-4 md:min-h-[400px]">
        <SearchBar
          placeholder="Zoek een product of recept"
          aria-label="Zoek een product of recept"
          value={query}
          onValueChange={setQuery}
        />

        {!selectionInResults && selection ? (
          <div>
            <GroupTitle>Gekozen</GroupTitle>
            {selection.kind === "recipe" ? recipeRow(selection.recipe) : productRow(selection.name, "Product")}
          </div>
        ) : null}

        {recipes.length > 0 ? (
          <div>
            <GroupTitle>Recepten</GroupTitle>
            <div className="flex flex-col gap-0.5">{recipes.map(recipeRow)}</div>
          </div>
        ) : null}

        {products.length > 0 ? (
          <div>
            <GroupTitle>Producten</GroupTitle>
            <div className="flex flex-col gap-0.5">{products.map((name) => productRow(name, "Product"))}</div>
          </div>
        ) : null}

        {showCreate ? (
          <button
            type="button"
            onClick={() => select({ kind: "product", name: typed })}
            className="flex h-12 w-full items-center gap-2.5 rounded-[14px] px-3 text-left text-[15px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-[18px] shrink-0">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="min-w-0 truncate">«{typed}» als nieuw product</span>
          </button>
        ) : null}

        {!typed && recipes.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-secondary)]">Zoek een product om in te vriezen</p>
        ) : null}
      </form>
    </SlideInModal>
  );
}
