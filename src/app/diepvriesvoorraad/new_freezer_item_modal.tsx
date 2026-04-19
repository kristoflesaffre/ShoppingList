"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { PillTab } from "@/components/ui/pill_tab";
import { InputField } from "@/components/ui/input_field";
import { Stepper } from "@/components/ui/stepper";
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

/** Radio button circle — unchecked or checked */
function RadioCircle({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.3px] bg-white transition-colors",
        checked
          ? "border-[var(--blue-500)]"
          : "border-[var(--blue-300,#9599f7)]",
      )}
      aria-hidden
    >
      {checked && (
        <span className="size-[18px] rounded-full bg-[var(--blue-500)]" />
      )}
    </span>
  );
}

/** Single recipe row card */
function RecipeCard({
  recipe,
  selected,
  onSelect,
}: {
  recipe: SavedRecipe;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-[72px] w-full items-center gap-3 rounded-lg border py-3 pl-4 pr-3 text-left transition-colors",
        selected
          ? "border-[var(--blue-500)] bg-white"
          : "border-[var(--gray-100,#e2e4e6)] bg-white",
      )}
    >
      <RadioCircle checked={selected} />
      {/* Recipe photo */}
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-[var(--gray-100)]">
        {recipe.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.photoUrl}
            alt=""
            width={48}
            height={48}
            className="size-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/ui/empty_state_diepvries.png"
            alt=""
            width={48}
            height={48}
            className="size-full object-cover opacity-40"
          />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-base font-medium leading-6 tracking-normal text-[var(--text-primary)]">
        {recipe.name}
      </span>
    </button>
  );
}

export function NewFreezerItemModal({
  open,
  onClose,
  initialTab = "first",
  onAdd,
}: NewFreezerItemModalProps) {
  const [tab, setTab] = React.useState<"first" | "second">(initialTab);

  // Product tab state
  const [productName, setProductName] = React.useState("");
  const [quantityPerPackage, setQuantityPerPackage] = React.useState(1);
  const [packages, setPackages] = React.useState(1);
  const [unit, setUnit] = React.useState("stuk");

  // Auto-pluralize stuk/stuks when stepper changes, but don't override custom values
  React.useEffect(() => {
    setUnit((prev) => {
      if (prev === "stuk" && quantityPerPackage >= 2) return "stuks";
      if (prev === "stuks" && quantityPerPackage === 1) return "stuk";
      return prev;
    });
  }, [quantityPerPackage]);

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
      setQuantityPerPackage(1);
      setPackages(1);
      setUnit("stuk");
      setRecipeSearch("");
      setSelectedRecipeId(null);
      setPortions(1);
    }
  }, [open, initialTab]);

  // Reset recipe selection when switching to gerecht tab
  function handleTabChange(value: "first" | "second") {
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
    onAdd?.({
      name: isProductTab ? productName.trim() : (selectedRecipe?.name ?? ""),
      quantityPerPackage: isProductTab ? quantityPerPackage : portions,
      unit: isProductTab ? unit : "portie",
      packages: isProductTab ? packages : portions,
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
      title="Item(s) toevoegen"
      className="h-[calc(100dvh-48px)]"
      bodyClassName={!isProductTab ? "pb-0" : undefined}
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
        className="flex w-full flex-col gap-6"
      >
        <PillTab
          value={tab}
          onValueChange={handleTabChange}
          labelFirst="Product"
          labelSecond="Gerecht"
        />

        {isProductTab ? (
          <>
            <InputField
              label="Naam product"
              placeholder="Naam item"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              autoComplete="off"
              autoFocus
            />

            <div className="flex w-full flex-col gap-2">
              <Stepper
                label="Hoeveelheid in één diepvriespakket"
                value={quantityPerPackage}
                min={1}
                onValueChange={setQuantityPerPackage}
              />
              {/* Editable unit field — auto-selects all text on focus */}
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="flex h-12 w-full items-center rounded-md border border-[var(--border-default)] bg-white px-4 text-center text-base leading-6 tracking-normal text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focus)]"
              />
            </div>

            <Stepper
              label="Aantal diepvriespakketten"
              value={packages}
              min={1}
              onValueChange={setPackages}
            />
          </>
        ) : (
          /* Gerecht tab */
          <div className="flex w-full flex-col gap-4">
            {/* Search bar — hidden once a recipe is selected */}
            {!selectedRecipeId && (
              <SearchBar
                placeholder="Zoek gerecht"
                value={recipeSearch}
                onValueChange={setRecipeSearch}
              />
            )}

            <div className="flex w-full flex-col gap-4">
              {selectedRecipeId ? (
                /* Selected state: only the chosen card + portions stepper */
                <>
                  {allRecipes
                    .filter((r) => r.id === selectedRecipeId)
                    .map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        selected
                        onSelect={() => handleSelectRecipe(recipe.id)}
                      />
                    ))}
                  <Stepper
                    label="Aantal diepvriesporties"
                    value={portions}
                    min={1}
                    onValueChange={setPortions}
                  />
                </>
              ) : filteredRecipes.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                  {recipeSearch.trim()
                    ? "Geen gerechten gevonden"
                    : "Je hebt nog geen gerechten"}
                </p>
              ) : (
                filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    selected={false}
                    onSelect={() => handleSelectRecipe(recipe.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </form>
    </SlideInModal>
  );
}
