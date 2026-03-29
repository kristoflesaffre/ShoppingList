"use client";

import * as React from "react";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import type { RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";

type DraftRow = { key: string; name: string; quantity: string };

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
  const [draftRows, setDraftRows] = React.useState<DraftRow[]>([]);

  React.useEffect(() => {
    if (!open) return;
    if (recipeToEdit) {
      setRecipeName(recipeToEdit.name);
      setRecipeLink(recipeToEdit.link);
      setRecipePersons(recipeToEdit.persons);
      setDraftRows(
        recipeToEdit.ingredients.map((ing) => ({
          key: ing.id,
          name: ing.name,
          quantity: ing.quantity,
        })),
      );
    } else {
      setRecipeName("");
      setRecipeLink("");
      setRecipePersons(2);
      setDraftRows([]);
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

      const builtIngredients: RecipeIngredient[] = draftRows
        .filter((row) => row.name.trim().length > 0)
        .map((row) => ({
          id: row.key.startsWith("new-") ? iid() : row.key,
          name: row.name.trim(),
          quantity: row.quantity.trim(),
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
      draftRows,
      recipeToEdit,
      recipeData?.recipes,
      onClose,
    ],
  );

  const addDraftRow = React.useCallback(() => {
    setDraftRows((rows) => [
      ...rows,
      { key: `new-${iid()}`, name: "", quantity: "" },
    ]);
  }, []);

  const removeDraftRow = React.useCallback((key: string) => {
    setDraftRows((rows) => rows.filter((r) => r.key !== key));
  }, []);

  const updateDraftRow = React.useCallback(
    (key: string, patch: Partial<Pick<DraftRow, "name" | "quantity">>) => {
      setDraftRows((rows) =>
        rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={recipeToEdit ? "Recept wijzigen" : "Nieuw recept"}
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
        className="flex w-full flex-col gap-6"
        onSubmit={handleSubmit}
      >
        <InputField
          label="Naam recept"
          placeholder="Naam recept"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
        />
        <InputField
          label="Link recept"
          placeholder="http://www.recept.com"
          value={recipeLink}
          onChange={(e) => setRecipeLink(e.target.value)}
        />
        <Stepper
          label="Aantal personen"
          value={recipePersons}
          onValueChange={setRecipePersons}
          min={1}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-section-title font-bold leading-24 text-text-primary">
              Ingrediënten
            </h3>
            <MiniButton type="button" variant="secondary" onClick={addDraftRow}>
              Rij toevoegen
            </MiniButton>
          </div>
          {draftRows.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">
              Nog geen rijen. Voeg ingrediënten toe of bewaar het recept zonder
              lijst.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {draftRows.map((row) => (
                <li
                  key={row.key}
                  className="flex flex-col gap-2 rounded-md border border-[var(--blue-200)] p-3"
                >
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-[var(--error-600)]"
                      onClick={() => removeDraftRow(row.key)}
                    >
                      Verwijderen
                    </button>
                  </div>
                  <InputField
                    label="Naam"
                    placeholder="Bijv. tomaten"
                    value={row.name}
                    onChange={(e) =>
                      updateDraftRow(row.key, { name: e.target.value })
                    }
                  />
                  <InputField
                    label="Hoeveelheid"
                    placeholder="Bijv. 400 g"
                    value={row.quantity}
                    onChange={(e) =>
                      updateDraftRow(row.key, { quantity: e.target.value })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </SlideInModal>
  );
}
