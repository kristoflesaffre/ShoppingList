"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { ChoiceRow } from "@/components/ui/choice_row";
import { QuantityUnitField } from "@/components/ui/quantity_unit_field";
import { ItemNameAutocomplete } from "@/components/ui/item_name_autocomplete";
import { SearchBar } from "@/components/ui/search_bar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { SavedRecipe, RecipeCategory } from "@/lib/recipe_library";

export interface NewFreezerItemModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "first" | "second";
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
const WEIGHT_UNITS = new Set(["g", "kg"]);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[13px] font-semibold leading-[18px] text-[var(--text-secondary)]">{children}</p>;
}

function RecipeThumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- receptfoto
    <img src={src} alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-full object-cover" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- illustratie
    <img src="/images/ui/empty_state_diepvries.png" alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-full bg-[var(--gray-25)] object-contain p-1.5 opacity-60" />
  );
}

export function NewFreezerItemModal({
  open,
  onClose,
  initialTab = "first",
  onAdd,
}: NewFreezerItemModalProps) {
  const [tab, setTab] = React.useState<"first" | "second">(initialTab);

  // Product tab state — canvas «04»: één «Aantal» + eenheid.
  const [productName, setProductName] = React.useState("");
  const [amount, setAmount] = React.useState(1);
  const [unit, setUnit] = React.useState("stuk");

  // Gerecht tab state
  const [recipeSearch, setRecipeSearch] = React.useState("");
  const [selectedRecipeId, setSelectedRecipeId] = React.useState<string | null>(null);
  const [portions, setPortions] = React.useState(1);

  // Load recipes from DB
  const { data: recipeData } = db.useQuery(
    open ? { recipes: { ingredients: {} } } : null,
  );

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

  const filteredRecipes = React.useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    if (!q) return allRecipes;
    return allRecipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [allRecipes, recipeSearch]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setTab(initialTab);
      setProductName("");
      setAmount(1);
      setUnit("stuk");
      setRecipeSearch("");
      setSelectedRecipeId(null);
      setPortions(1);
    }
  }, [open, initialTab]);

  // Reset recipe selection when switching to gerecht tab
  function handleTabChange(value: "first" | "second" | "third") {
    if (value === "third") return; // derde tab niet gebruikt in diepvriesmodal
    setTab(value);
    if (value === "second") {
      setSelectedRecipeId(null);
      setRecipeSearch("");
      setPortions(1);
    }
  }

  function handleSelectRecipe(id: string) {
    if (selectedRecipeId === id) {
      // Deselect
      setSelectedRecipeId(null);
      setPortions(1);
    } else {
      setSelectedRecipeId(id);
      setPortions(1);
    }
  }

  const isProductTab = tab === "first";

  const canSubmit = isProductTab
    ? productName.trim().length > 0
    : selectedRecipeId !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const selectedRecipe = allRecipes.find((r) => r.id === selectedRecipeId);
    const productUnit = unit.trim() || "stuk";
    const isWeight = WEIGHT_UNITS.has(productUnit);
    onAdd?.({
      name: isProductTab ? productName.trim() : (selectedRecipe?.name ?? ""),
      // Gewicht (g/kg): één pakket van «aantal» g; anders «aantal» pakketten van 1 eenheid.
      quantityPerPackage: isProductTab ? (isWeight ? amount : 1) : 1,
      unit: isProductTab ? productUnit : "portie",
      packages: isProductTab ? (isWeight ? 1 : amount) : portions,
      type: isProductTab ? "product" : "gerecht",
      recipeId: selectedRecipeId ?? undefined,
      recipePhotoUrl: selectedRecipe?.photoUrl ?? undefined,
      recipePersons: selectedRecipe?.persons ?? undefined,
    });
    onClose();
  }

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Toevoegen aan diepvries"
      footer={
        <Button
          type="submit"
          form="new-freezer-item-form"
          variant="primary"
          disabled={!canSubmit}
        >
          Toevoegen
        </Button>
      }
    >
      <form
        id="new-freezer-item-form"
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-5"
      >
        <SegmentedControl
          options={[
            { value: "first", label: "Product" },
            { value: "second", label: "Gerecht" },
          ]}
          value={tab}
          onChange={(v) => handleTabChange(v)}
          ariaLabel="Soort"
          fill
        />

        {isProductTab ? (
          <>
            <div>
              <FieldLabel>Product</FieldLabel>
              <ItemNameAutocomplete
                placeholder="Kies een product"
                value={productName}
                onChange={setProductName}
              />
            </div>
            <div>
              <FieldLabel>Aantal</FieldLabel>
              <QuantityUnitField
                value={amount}
                onValueChange={setAmount}
                unit={unit}
                onUnitChange={setUnit}
                units={FREEZER_UNITS}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <FieldLabel>Recept</FieldLabel>
              <SearchBar
                placeholder="Zoek een recept"
                value={recipeSearch}
                onValueChange={setRecipeSearch}
              />
              {filteredRecipes.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                  {recipeSearch.trim() ? "Geen recepten gevonden" : "Je hebt nog geen recepten"}
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Recept"
                  className="-mx-1 mt-2.5 flex max-h-[264px] flex-col gap-1 overflow-y-auto px-1 py-0.5"
                >
                  {filteredRecipes.map((recipe) => (
                    <ChoiceRow
                      key={recipe.id}
                      selected={selectedRecipeId === recipe.id}
                      onSelect={() => handleSelectRecipe(recipe.id)}
                      media={<RecipeThumb src={recipe.photoUrl ?? null} />}
                      title={recipe.name}
                      subtitle={recipe.persons ? `${recipe.persons} ${recipe.persons === 1 ? "persoon" : "personen"}` : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Aantal</FieldLabel>
              <QuantityUnitField value={portions} onValueChange={setPortions} />
            </div>
          </>
        )}
      </form>
    </SlideInModal>
  );
}
