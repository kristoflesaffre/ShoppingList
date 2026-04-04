"use client";

import * as React from "react";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import { TabGroup } from "@/components/ui/tab_group";
import { TabElement } from "@/components/ui/tab_element";
import { RecipeIngredientSortableList } from "@/app/recepten/recipe_ingredient_sortable_list";
import {
  RecipeIngredientFormSlideIn,
  type RecipeIngredientFormDraft,
} from "@/components/recipe_ingredient_form_slide_in";
import { SelectTile } from "@/components/ui/select_tile";
import { RecipeLinkSlideIn, type ExtractedRecipeLinkData } from "@/components/recipe_link_slide_in";
import { RecipePhotoUploadSlideIn, type ExtractedRecipeData } from "@/components/recipe_photo_upload_slide_in";
import type { RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";

export const RECIPE_EDITOR_FORM_ID = "recepten-recipe-editor-form";

type RecipeRow = {
  id: string;
  ingredients?: Array<{ id: string }>;
  order?: number;
  steps?: string;
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
  const [recipeStepsArray, setRecipeStepsArray] = React.useState<string[]>(["", ""]);
  const [recipePersons, setRecipePersons] = React.useState(2);
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([]);
  const [ingredientSlideOpen, setIngredientSlideOpen] = React.useState(false);
  const [editingIngredientId, setEditingIngredientId] = React.useState<
    string | null
  >(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [isEditingSteps, setIsEditingSteps] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"manueel" | "ai">("manueel");
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [linkSlideOpen, setLinkSlideOpen] = React.useState(false);
  const [photoUploadSlideOpen, setPhotoUploadSlideOpen] = React.useState(false);
  const recipeLinkInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setAiLoading(false);
    setAiError(null);
    setActiveTab("manueel");
    setLinkSlideOpen(false);
    setPhotoUploadSlideOpen(false);
    if (recipeToEdit) {
      setRecipeName(recipeToEdit.name);
      setRecipeLink(recipeToEdit.link);
      const parsed = parseStepsToArray(recipeToEdit.steps ?? "");
      setRecipeStepsArray(parsed.length >= 2 ? parsed : [...parsed, ...Array(2 - parsed.length).fill("")]);
      setRecipePersons(recipeToEdit.persons);
      setIngredients(recipeToEdit.ingredients);
    } else {
      setRecipeName("");
      setRecipeLink("");
      setRecipeStepsArray(["", ""]);
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
          steps: recipeStepsArray
            .map((s) => s.trim())
            .filter(Boolean)
            .join("\n"),
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
      recipeStepsArray,
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

  const handleGebruikAI = React.useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: recipeLink }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Onbekende fout" }));
        throw new Error(
          typeof err?.error === "string" ? err.error : "Onbekende fout",
        );
      }
      const data = (await res.json()) as {
        name?: string | null;
        persons?: number | null;
        steps?: string;
        ingredients?: Array<{ name: string; quantity: string }>;
      };
      if (data.steps) setRecipeStepsArray(parseStepsToArray(data.steps));
      if (data.persons) setRecipePersons(data.persons);
      if (data.name && !recipeName.trim()) setRecipeName(data.name);
      if (data.ingredients?.length) {
        setIngredients(
          data.ingredients.map((ing) => ({
            id: `new-${iid()}`,
            name: ing.name,
            quantity: ing.quantity,
          })),
        );
      }
    } catch (e) {
      setAiError(
        e instanceof Error
          ? e.message
          : "Kon recept niet extraheren. Probeer het opnieuw.",
      );
    } finally {
      setAiLoading(false);
    }
  }, [recipeLink, recipeName]);

  const handlePickPhotosForAi = React.useCallback(() => {
    setPhotoUploadSlideOpen(true);
  }, []);

  const handlePhotoUploadBack = React.useCallback(() => {
    setPhotoUploadSlideOpen(false);
    setActiveTab("ai");
  }, []);

  const closePhotoUploadSlide = React.useCallback(() => {
    setPhotoUploadSlideOpen(false);
  }, []);

  const handlePhotoExtracted = React.useCallback(
    (data: ExtractedRecipeData) => {
      if (data.steps) setRecipeStepsArray(parseStepsToArray(data.steps));
      if (data.persons) setRecipePersons(data.persons);
      if (data.name && !recipeName.trim()) setRecipeName(data.name);
      if (data.ingredients?.length) {
        setIngredients(
          data.ingredients.map((ing) => ({
            id: `new-${iid()}`,
            name: ing.name,
            quantity: ing.quantity,
          })),
        );
      }
      setActiveTab("manueel");
    },
    [recipeName],
  );

  const handleUseLinkForAi = React.useCallback(() => {
    setLinkSlideOpen(true);
  }, []);

  const handleLinkExtracted = React.useCallback(
    (data: ExtractedRecipeLinkData) => {
      if (data.steps) setRecipeStepsArray(parseStepsToArray(data.steps));
      if (data.persons) setRecipePersons(data.persons);
      if (data.name && !recipeName.trim()) setRecipeName(data.name);
      if (data.ingredients?.length) {
        setIngredients(
          data.ingredients.map((ing) => ({
            id: `new-${iid()}`,
            name: ing.name,
            quantity: ing.quantity,
          })),
        );
      }
      setActiveTab("manueel");
    },
    [recipeName],
  );

  const ingredientSlideInitial = editingIngredientId
    ? ingredients.find((i) => i.id === editingIngredientId) ?? null
    : null;
  const hasValidRecipeLink = isValidHttpUrl(recipeLink);
  const isAiTab = activeTab === "ai";

  return (
  <>
    <SlideInModal
      open={open}
      onClose={onClose}
      title={recipeToEdit ? "Recept wijzigen" : "Nieuw recept"}
      disableEscapeClose={ingredientSlideOpen || linkSlideOpen || photoUploadSlideOpen}
      bodyFullWidth
      className="h-[calc(100dvh-48px)]"
      footer={
        !isAiTab ? (
          <Button
            type="submit"
            form={RECIPE_EDITOR_FORM_ID}
            variant="primary"
            disabled={!recipeName.trim()}
          >
            Bewaren
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto flex w-full max-w-[768px] flex-col gap-6 px-4">
        <TabGroup
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "manueel" | "ai")}
          aria-label="Recept invoermethode"
        >
          <TabElement value="manueel">Manueel ingeven</TabElement>
          <TabElement value="ai">Toevoegen met AI</TabElement>
        </TabGroup>

        {isAiTab ? (
          <div className="flex flex-col gap-4">
            <p className="text-base font-light leading-24 tracking-normal text-[var(--text-primary)]">
              Laat AI je recept voor je invullen. Selecteer hieronder de methode die je wilt gebruiken.
            </p>
            <button type="button" onClick={handlePickPhotosForAi} className="w-full bg-transparent p-0 text-left">
              <SelectTile
                title="Foto's opladen"
                subtitle="Selecteer één of meerdere foto's"
                icon={<AiOptionIcon maskUrl="/icons/icons/image.svg" ariaLabel="Foto opladen" />}
              />
            </button>
            <button type="button" onClick={handleUseLinkForAi} className="w-full bg-transparent p-0 text-left">
              <SelectTile
                title="Een link plakken"
                subtitle="Plak een link van een website"
                icon={<AiOptionIcon maskUrl="/icons/icons/link.svg" ariaLabel="Link plakken" />}
              />
            </button>
          </div>
        ) : (
          <form
            id={RECIPE_EDITOR_FORM_ID}
            className="flex flex-col gap-6"
            onSubmit={handleSubmit}
          >
        <InputField
          label="Naam recept"
          placeholder="Naam recept"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
        />
        <Stepper
          label="Aantal personen"
          value={recipePersons}
          onValueChange={setRecipePersons}
          min={1}
        />
        <div className="flex flex-col gap-2">
          <InputField
            label="Link recept"
            placeholder="http://www.recept.com"
            value={recipeLink}
            ref={recipeLinkInputRef}
            onChange={(e) => setRecipeLink(e.target.value)}
          />
          {hasValidRecipeLink ? (
            <div className="flex flex-col items-end gap-1">
              <MiniButton
                type="button"
                variant="secondary"
                onClick={handleGebruikAI}
                disabled={aiLoading}
              >
                {aiLoading ? "Bezig…" : "Gebruik AI"}
              </MiniButton>
              {aiError ? (
                <p className="text-xs text-[var(--color-error,#ef4444)]">
                  {aiError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="flex-1 text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
              Bereidingsstappen
            </label>
            <button
              type="button"
              onClick={() => setIsEditingSteps((v) => !v)}
              className="text-sm font-normal leading-20 tracking-normal text-[var(--blue-500)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              {isEditingSteps ? "Gereed" : "Wijzigen"}
            </button>
          </div>
          {recipeStepsArray.map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-4 shrink-0 text-2xl font-bold leading-24 tracking-normal text-[var(--text-primary)]">
                {i + 1}
              </span>
              <div className="flex h-12 flex-1 items-center rounded-lg border border-[var(--border-default)] bg-[var(--white)] pl-4 pr-3 transition-colors focus-within:border-[var(--border-focus)]">
                <input
                  type="text"
                  value={step}
                  onChange={(e) => {
                    const updated = [...recipeStepsArray];
                    updated[i] = e.target.value;
                    setRecipeStepsArray(updated);
                  }}
                  placeholder="Beschrijf de stap"
                  className="flex-1 bg-transparent text-base font-light leading-24 tracking-normal text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus-visible:outline-none"
                />
                {isEditingSteps && (
                  <>
                    <div className="mx-3 h-6 w-px shrink-0 bg-[var(--border-default)]" />
                    <button
                      type="button"
                      onClick={() =>
                        setRecipeStepsArray((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      aria-label="Stap verwijderen"
                      className="flex size-6 shrink-0 items-center justify-center text-[var(--error-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <BinIcon />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <span className="w-4 shrink-0 text-2xl font-bold leading-24 tracking-normal text-[var(--gray-100)]">
              {recipeStepsArray.length + 1}
            </span>
            <button
              type="button"
              onClick={() => setRecipeStepsArray((prev) => [...prev, ""])}
              className="flex h-12 flex-1 items-center justify-between rounded-lg border border-dashed border-[var(--blue-200)] pl-4 pr-3 py-3 text-[var(--blue-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <span className="text-base font-normal leading-24 tracking-normal">
                Stap toevoegen
              </span>
              <PlusCircleIcon className="size-[19px] shrink-0" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
            Ingrediënten
          </label>
          {ingredients.length > 0 && (
            <RecipeIngredientSortableList
              ingredients={ingredients}
              onDragEndReorder={(reordered) => setIngredients(reordered)}
              onDelete={handleDeleteIngredient}
              onEdit={openIngredientFormEdit}
            />
          )}
          <button
            type="button"
            onClick={openIngredientFormAdd}
            className="flex h-12 w-full items-center justify-between rounded-lg border border-dashed border-[var(--blue-200)] pl-4 pr-3 py-3 text-[var(--blue-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <span className="text-base font-normal leading-24 tracking-normal">
              Ingrediënt toevoegen
            </span>
            <PlusCircleIcon className="size-[19px] shrink-0" />
          </button>
        </div>
          </form>
        )}
      </div>
    </SlideInModal>
    <RecipeIngredientFormSlideIn
      open={ingredientSlideOpen}
      onClose={closeIngredientForm}
      initial={ingredientSlideInitial}
      onSubmit={handleIngredientFormSubmit}
      titleId="recipe-editor-ingredient-form-slide-title"
      containerClassName="z-[60]"
      slideClassName="h-[calc(100dvh-48px)]"
    />
    <RecipeLinkSlideIn
      open={linkSlideOpen}
      onClose={() => setLinkSlideOpen(false)}
      onExtracted={handleLinkExtracted}
      containerClassName="z-[70]"
    />
    <RecipePhotoUploadSlideIn
      open={photoUploadSlideOpen}
      onClose={closePhotoUploadSlide}
      onBack={handlePhotoUploadBack}
      onExtracted={handlePhotoExtracted}
    />
  </>
  );
}

function AiOptionIcon({ maskUrl, ariaLabel }: { maskUrl: string; ariaLabel: string }) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="inline-block size-10 shrink-0 bg-[var(--action-primary)]"
      style={{
        WebkitMaskImage: `url("${maskUrl}")`,
        maskImage: `url("${maskUrl}")`,
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


function BinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18.938 9.5933V19.2223C18.938 19.7893 18.717 20.3243 18.317 20.7253C17.916 21.1253 17.381 21.3463 16.814 21.3463H7.18595C6.61795 21.3463 6.08395 21.1253 5.68395 20.7253C5.28295 20.3233 5.06095 19.7893 5.06095 19.2223V9.5933C5.06095 9.3063 5.29395 9.0733 5.58095 9.0733C5.86795 9.0733 6.10095 9.3063 6.10095 9.5933V19.2223C6.10095 19.5073 6.21695 19.7873 6.41895 19.9893C6.62395 20.1943 6.89595 20.3073 7.18595 20.3073H16.815C17.105 20.3073 17.377 20.1943 17.582 19.9893C17.787 19.7853 17.9 19.5123 17.9 19.2223V9.5933C17.9 9.3063 18.132 9.0733 18.42 9.0733C18.708 9.0733 18.938 9.3063 18.938 9.5933ZM21.346 6.3843C21.346 6.6713 21.114 6.9043 20.826 6.9043H3.17295C2.88595 6.9043 2.65295 6.6713 2.65295 6.3843C2.65295 6.0973 2.88595 5.8643 3.17295 5.8643H8.26995V3.1743C8.26995 2.8873 8.50295 2.6543 8.78995 2.6543H15.209C15.496 2.6543 15.729 2.8873 15.729 3.1743V5.8643H20.826C21.113 5.8643 21.346 6.0973 21.346 6.3843ZM9.31095 5.8643H14.691V3.6943H9.31095V5.8643ZM14.659 16.8143V12.0003C14.659 11.7133 14.427 11.4803 14.139 11.4803C13.851 11.4803 13.619 11.7133 13.619 12.0003V16.8143C13.619 17.1013 13.851 17.3343 14.139 17.3343C14.427 17.3343 14.659 17.1023 14.659 16.8143ZM10.38 16.8143V12.0003C10.38 11.7133 10.147 11.4803 9.85995 11.4803C9.57295 11.4803 9.33995 11.7133 9.33995 12.0003V16.8143C9.33995 17.1013 9.57295 17.3343 9.85995 17.3343C10.147 17.3343 10.38 17.1023 10.38 16.8143Z" fill="currentColor"/>
    </svg>
  );
}

function parseStepsToArray(steps: string): string[] {
  if (!steps.trim()) return [];
  return steps
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean);
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
