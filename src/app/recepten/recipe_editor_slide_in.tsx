"use client";

import * as React from "react";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import { RecipeIngredientSortableList } from "@/app/recepten/recipe_ingredient_sortable_list";
import {
  RecipeIngredientFormSlideIn,
  type RecipeIngredientFormDraft,
} from "@/components/recipe_ingredient_form_slide_in";
import type { RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";

export const RECIPE_EDITOR_FORM_ID = "recepten-recipe-editor-form";

type RecipeRow = {
  id: string;
  ingredients?: Array<{ id: string }>;
  order?: number;
  photoUrl?: string;
};

export function RecipeEditorSlideIn({
  open,
  onClose,
  recipeToEdit,
  recipeData,
}: {
  open: boolean;
  onClose: () => void;
  recipeToEdit: SavedRecipe | null;
  recipeData: { recipes?: RecipeRow[] } | undefined;
}) {
  const [recipeName, setRecipeName] = React.useState("");
  const [recipeLink, setRecipeLink] = React.useState("");
  const [recipePersons, setRecipePersons] = React.useState(2);
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([]);
  const [ingredientSlideOpen, setIngredientSlideOpen] = React.useState(false);
  const [editingIngredientId, setEditingIngredientId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (!open) return;
    if (recipeToEdit) {
      setRecipeName(recipeToEdit.name);
      setRecipeLink(recipeToEdit.link);
      setRecipePersons(recipeToEdit.persons);
      setIngredients(recipeToEdit.ingredients);
    } else {
      setRecipeName("");
      setRecipeLink("");
      setRecipePersons(2);
      setIngredients([]);
    }
  }, [open, recipeToEdit]);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!recipeName.trim()) return;

      const isNew = recipeToEdit == null;
      const recipeId = isNew ? iid() : recipeToEdit.id;

      const existingIngredientIds = isNew
        ? []
        : (recipeData?.recipes
            ?.find((r) => r.id === recipeId)
            ?.ingredients?.map((i) => i.id) ?? []);

      const builtIngredients: RecipeIngredient[] = ingredients
        .filter((ing) => ing.name.trim().length > 0)
        .map((ing) => ({
          id: ing.id.startsWith("new-") ? iid() : ing.id,
          name: ing.name.trim(),
          quantity: ing.quantity.trim(),
        }));

      const newIngIds = new Set(builtIngredients.map((i) => i.id));
      const toDeleteIngIds = existingIngredientIds.filter(
        (eid) => !newIngIds.has(eid),
      );

      const allRecipes = recipeData?.recipes ?? [];
      const existingRow = allRecipes.find((r) => r.id === recipeId);
      const existingOrder = existingRow?.order ?? 0;
      const newOrder =
        allRecipes.length > 0
          ? Math.min(...allRecipes.map((r) => r.order ?? 0)) - 1
          : 0;

      const photoPatch =
        !isNew && existingRow?.photoUrl
          ? { photoUrl: existingRow.photoUrl }
          : {};

      const txns = [
        db.tx.recipes[recipeId].update({
          name: recipeName.trim(),
          link: recipeLink.trim(),
          persons: recipePersons,
          order: isNew ? newOrder : existingOrder,
          ...photoPatch,
        }),
        ...builtIngredients.map((ing, i) =>
          db.tx.recipeIngredients[ing.id]
            .update({
              name: ing.name,
              quantity: ing.quantity,
              order: i,
            })
            .link({ recipe: recipeId }),
        ),
        ...toDeleteIngIds.map((ingId) =>
          db.tx.recipeIngredients[ingId].delete(),
        ),
      ];
      void db.transact(txns as Parameters<typeof db.transact>[0]);
      onClose();
    },
    [
      recipeName,
      recipeLink,
      recipePersons,
      ingredients,
      recipeToEdit,
      recipeData?.recipes,
      onClose,
    ],
  );

  const openIngredientFormAdd = React.useCallback(() => {
    setEditingIngredientId(null);
    setIngredientSlideOpen(true);
  }, []);

  const openIngredientFormEdit = React.useCallback((id: string) => {
    const ing = ingredients.find((i) => i.id === id);
    if (!ing) return;
    setEditingIngredientId(id);
    setIngredientSlideOpen(true);
  }, [ingredients]);

  const closeIngredientForm = React.useCallback(() => {
    setIngredientSlideOpen(false);
    setEditingIngredientId(null);
  }, []);

  const handleDeleteIngredient = React.useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleIngredientFormSubmit = React.useCallback(
    (draft: RecipeIngredientFormDraft) => {
      if (draft.id) {
        setIngredients((prev) =>
          prev.map((i) =>
            i.id === draft.id
              ? { ...i, name: draft.name, quantity: draft.quantity }
              : i,
          ),
        );
      } else {
        setIngredients((prev) => [
          ...prev,
          {
            id: `new-${iid()}`,
            name: draft.name,
            quantity: draft.quantity,
          },
        ]);
      }
    },
    [],
  );

  const ingredientSlideInitial = editingIngredientId
    ? ingredients.find((i) => i.id === editingIngredientId) ?? null
    : null;
  const hasValidRecipeLink = isValidHttpUrl(recipeLink);

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={recipeToEdit ? "Recept wijzigen" : "Nieuw recept"}
      disableEscapeClose={ingredientSlideOpen}
      bodyFullWidth
      className="h-[calc(100dvh-48px)]"
      footer={
        <Button
          type="submit"
          form={RECIPE_EDITOR_FORM_ID}
          variant="primary"
          disabled={!recipeName.trim()}
        >
          Bewaren
        </Button>
      }
    >
      <form
        id={RECIPE_EDITOR_FORM_ID}
        className="mx-auto flex w-full max-w-[768px] flex-col gap-6 px-4"
        onSubmit={handleSubmit}
      >
        <InputField
          label="Naam recept"
          placeholder="Naam recept"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <InputField
            label="Link recept"
            placeholder="http://www.recept.com"
            value={recipeLink}
            onChange={(e) => setRecipeLink(e.target.value)}
          />
          {hasValidRecipeLink ? (
            <div className="flex justify-end">
              <MiniButton type="button" variant="secondary">
                Gebruik AI
              </MiniButton>
            </div>
          ) : null}
        </div>
        <Stepper
          label="Aantal personen"
          value={recipePersons}
          onValueChange={setRecipePersons}
          min={1}
        />

        <div className="mt-[48px] flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-[12px]">
              <FishIcon />
              <h3 className="min-w-0 text-section-title font-bold leading-24 tracking-normal text-[var(--text-primary)]">
                Ingrediënten
              </h3>
            </div>
            {ingredients.length > 0 && (
              <button
                type="button"
                aria-label="Ingrediënt toevoegen"
                onClick={openIngredientFormAdd}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <PlusCircleIcon />
              </button>
            )}
          </div>

          {ingredients.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                Je hebt nog geen ingrediënten toegevoegd
              </p>
              <MiniButton
                type="button"
                variant="primary"
                onClick={openIngredientFormAdd}
              >
                Voeg ingrediënt toe
              </MiniButton>
            </div>
          ) : (
            <RecipeIngredientSortableList
              ingredients={ingredients}
              onDragEndReorder={(reordered) => setIngredients(reordered)}
              onDelete={handleDeleteIngredient}
              onEdit={openIngredientFormEdit}
            />
          )}
        </div>
      </form>
      <RecipeIngredientFormSlideIn
        open={ingredientSlideOpen}
        onClose={closeIngredientForm}
        initial={ingredientSlideInitial}
        onSubmit={handleIngredientFormSubmit}
        titleId="recipe-editor-ingredient-form-slide-title"
        containerClassName="z-[60]"
        slideClassName="h-[calc(100dvh-48px)]"
      />
    </SlideInModal>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-6", className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5ZM12 2.5C17.2368 2.5 21.5 6.76315 21.5 12C21.5 17.2368 17.2368 21.5 12 21.5C6.76315 21.5 2.5 17.2368 2.5 12C2.5 6.76315 6.76315 2.5 12 2.5Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 7.38C12.2761 7.38 12.5 7.60386 12.5 7.88V11.5H16.12C16.3961 11.5 16.62 11.7239 16.62 12C16.62 12.2761 16.3961 12.5 16.12 12.5H12.5V16.12C12.5 16.3961 12.2761 16.62 12 16.62C11.7239 16.62 11.5 16.3961 11.5 16.12V12.5H7.88C7.60386 12.5 7.38 12.2761 7.38 12C7.38 11.7239 7.60386 11.5 7.88 11.5H11.5V7.88C11.5 7.60386 11.7239 7.38 12 7.38Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FishIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-6 shrink-0 bg-[var(--text-primary)]", className)}
      style={{
        WebkitMaskImage: 'url("/icons/fish.svg")',
        maskImage: 'url("/icons/fish.svg")',
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
