"use client";

import * as React from "react";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { RecipeIngredientSortableList } from "@/app/recepten/recipe_ingredient_sortable_list";
import {
  RecipeIngredientFormSlideIn,
  type RecipeIngredientFormDraft,
} from "@/components/recipe_ingredient_form_slide_in";
import { RecipeLinkSlideIn, type ExtractedRecipeLinkData } from "@/components/recipe_link_slide_in";
import { RecipePhotoUploadSlideIn, type ExtractedRecipeData } from "@/components/recipe_photo_upload_slide_in";
import type { RecipeIngredient, SavedRecipe, RecipeCategory } from "@/lib/recipe_library";
import { RECIPE_CATEGORIES } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { useNormalizeIngredientName } from "@/lib/ingredient-photos";
import { normalizeQuantity } from "@/lib/recipe_ingredient_quantity";

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
  ownerId,
}: {
  open: boolean;
  onClose: () => void;
  recipeToEdit: SavedRecipe | null;
  recipeData: { recipes?: RecipeRow[] } | undefined;
  ownerId?: string;
}) {
  const [recipeName, setRecipeName] = React.useState("");
  const [recipeLink, setRecipeLink] = React.useState("");
  const [recipeStepsArray, setRecipeStepsArray] = React.useState<string[]>(["", ""]);
  const [recipePersons, setRecipePersons] = React.useState(2);
  const [recipeCategory, setRecipeCategory] = React.useState<RecipeCategory | null>(null);
  const [canBeFrozen, setCanBeFrozen] = React.useState(false);
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([]);
  const normalizeIngredientName = useNormalizeIngredientName();
  const [ingredientSlideOpen, setIngredientSlideOpen] = React.useState(false);
  const [editingIngredientId, setEditingIngredientId] = React.useState<
    string | null
  >(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [linkSlideOpen, setLinkSlideOpen] = React.useState(false);
  const [photoUploadSlideOpen, setPhotoUploadSlideOpen] = React.useState(false);
  const recipeLinkInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setAiLoading(false);
    setAiError(null);
    setLinkSlideOpen(false);
    setPhotoUploadSlideOpen(false);
    if (recipeToEdit) {
      setRecipeName(recipeToEdit.name);
      setRecipeLink(recipeToEdit.link);
      const parsed = parseStepsToArray(recipeToEdit.steps ?? "");
      setRecipeStepsArray(parsed.length >= 2 ? parsed : [...parsed, ...Array(2 - parsed.length).fill("")]);
      setRecipePersons(recipeToEdit.persons);
      setRecipeCategory(recipeToEdit.category ?? null);
      setCanBeFrozen(recipeToEdit.canBeFrozen ?? false);
      setIngredients(recipeToEdit.ingredients);
    } else {
      setRecipeName("");
      setRecipeLink("");
      setRecipeStepsArray(["", ""]);
      setRecipePersons(2);
      setRecipeCategory(null);
      setCanBeFrozen(false);
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
          ...(recipeCategory != null ? { category: recipeCategory } : {}),
          canBeFrozen,
          ...photoPatch,
          ...(isNew && ownerId ? { ownerId } : {}),
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
      recipeCategory,
      canBeFrozen,
      ingredients,
      recipeToEdit,
      recipeData?.recipes,
      onClose,
      ownerId,
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
            name: normalizeIngredientName(ing.name),
            quantity: normalizeQuantity(ing.quantity),
          })),
        );
      }
    },
    [recipeName, normalizeIngredientName],
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
            name: normalizeIngredientName(ing.name),
            quantity: normalizeQuantity(ing.quantity),
          })),
        );
      }
    },
    [recipeName, normalizeIngredientName],
  );

  const ingredientSlideInitial = editingIngredientId
    ? ingredients.find((i) => i.id === editingIngredientId) ?? null
    : null;
  const hasValidRecipeLink = isValidHttpUrl(recipeLink);

  const isNew = recipeToEdit == null;
  const filledSteps = recipeStepsArray.filter((st) => st.trim()).length;

  const basisCard = (
    <div className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_0_0_1px_var(--border-subtle)]">
      <label className="block px-4 pb-3 pt-3.5">
        <span className="block text-xs font-semibold text-[var(--text-tertiary)]">Naam recept</span>
        <input
          type="text"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          placeholder="Bv. lasagne van oma"
          className="mt-0.5 w-full bg-transparent text-[19px] font-bold tracking-[-0.01em] text-[var(--text-primary)] placeholder:font-semibold placeholder:text-[var(--text-placeholder)] focus-visible:outline-none"
        />
      </label>
      <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] py-2.5 pl-3.5 pr-2.5">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-[var(--blue-50)] text-[var(--blue-500)]">
          <PeopleIcon />
        </span>
        <span id="recept-personen" className="flex-1 text-[15px] font-semibold text-[var(--text-primary)]">
          Personen
        </span>
        <div className="w-[148px] shrink-0" role="group" aria-labelledby="recept-personen">
          <Stepper value={recipePersons} onValueChange={setRecipePersons} min={1} />
        </div>
      </div>
    </div>
  );

  const categorieSection = (
    <section>
      <SectionTitle>Categorie</SectionTitle>
      <FilterChipRow wrap ariaLabel="Categorie">
        {RECIPE_CATEGORIES.map((cat) => {
          const isActive = recipeCategory === cat.id;
          return (
            <FilterChip
              key={cat.id}
              selected={isActive}
              dotColor={cat.dot}
              onClick={() => setRecipeCategory(isActive ? null : cat.id)}
              className={cn(!isActive && "!bg-[var(--white)] !text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-subtle)] [@media(hover:hover)]:hover:!bg-[var(--gray-25)]")}
            >
              {cat.label}
            </FilterChip>
          );
        })}
      </FilterChipRow>
    </section>
  );

  const bronSection = (
    <section>
      <SectionTitle>Bron</SectionTitle>
      <div className="flex items-center gap-2.5 rounded-[20px] bg-[var(--white)] py-2 pl-3.5 pr-2 shadow-[0_0_0_1px_var(--border-subtle)] focus-within:shadow-[0_0_0_1.5px_var(--blue-300)]">
        <span aria-hidden className="flex shrink-0 text-[var(--text-secondary)]">
          <LinkIcon className="size-[18px]" />
        </span>
        <input
          ref={recipeLinkInputRef}
          type="url"
          inputMode="url"
          value={recipeLink}
          onChange={(e) => setRecipeLink(e.target.value)}
          placeholder="Plak een link naar het recept"
          aria-label="Link recept"
          className="h-9 min-w-0 flex-1 truncate bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus-visible:outline-none"
        />
        {hasValidRecipeLink ? (
          <button
            type="button"
            onClick={handleGebruikAI}
            disabled={aiLoading}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3 text-[13px] font-bold text-[var(--blue-500)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-60 [@media(hover:hover)]:hover:bg-[var(--blue-100)]"
          >
            <SparkIcon className="size-4" />
            {aiLoading ? "Bezig…" : "Vul aan met AI"}
          </button>
        ) : null}
      </div>
      {aiError ? <p className="px-1 pt-1.5 text-xs text-[var(--error-600)]">{aiError}</p> : null}
    </section>
  );

  const ingredientenSection = (
    <section>
      <SectionTitle count={ingredients.length > 0 ? String(ingredients.length) : undefined}>Ingrediënten</SectionTitle>
      <div className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_0_0_1px_var(--border-subtle)]">
        {ingredients.length > 0 ? (
          <RecipeIngredientSortableList
            variant="rows"
            ingredients={ingredients}
            onDragEndReorder={(reordered) => setIngredients(reordered)}
            onDelete={handleDeleteIngredient}
            onEdit={openIngredientFormEdit}
          />
        ) : null}
        <AddRow first={ingredients.length === 0} onClick={openIngredientFormAdd}>
          Ingrediënt toevoegen
        </AddRow>
      </div>
    </section>
  );

  const bereidingSection = (
    <section>
      <SectionTitle count={filledSteps > 0 ? `${filledSteps} ${filledSteps === 1 ? "stap" : "stappen"}` : undefined}>
        Bereiding
      </SectionTitle>
      <div className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_0_0_1px_var(--border-subtle)]">
        {recipeStepsArray.map((step, i) => (
          <div key={i} className="group/stap flex items-start gap-3 border-b border-[var(--border-subtle)] py-3 pl-3.5 pr-2">
            <span
              aria-hidden
              className="mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[13px] font-extrabold text-[var(--blue-500)]"
            >
              {i + 1}
            </span>
            <AutoGrowTextarea
              value={step}
              onChange={(next) => {
                const updated = [...recipeStepsArray];
                updated[i] = next;
                setRecipeStepsArray(updated);
              }}
              placeholder="Beschrijf de stap"
              aria-label={`Stap ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => setRecipeStepsArray((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label={`Stap ${i + 1} verwijderen`}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] group-focus-within/stap:opacity-100 [@media(hover:hover)]:group-hover/stap:opacity-100 [@media(hover:hover)]:hover:text-[var(--error-600)]"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
        <AddRow first onClick={() => setRecipeStepsArray((prev) => [...prev, ""])}>
          Stap toevoegen
        </AddRow>
      </div>
    </section>
  );

  return (
  <>
    <SlideInModal
      open={open}
      onClose={onClose}
      title={recipeToEdit ? "Recept wijzigen" : "Nieuw recept"}
      disableEscapeClose={ingredientSlideOpen || linkSlideOpen || photoUploadSlideOpen}
      bodyFullWidth
      className="h-[calc(100dvh-48px)] !bg-[var(--bg-app)] md:h-[min(860px,calc(100dvh-80px))]"
      bodyClassName="!pt-1"
      size="wide"
      cancelLabel={null}
      footer={
        <Button type="submit" form={RECIPE_EDITOR_FORM_ID} variant="primary" disabled={!recipeName.trim()}>
          Bewaren
        </Button>
      }
    >
      {/* Canvas «17 · Recept wijzigen — voorstel»: kaarten op grijs, AI bovenaan bij een nieuw recept. */}
      <form
        id={RECIPE_EDITOR_FORM_ID}
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[816px] flex-col gap-[22px] px-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:px-6"
      >
        <div className="flex flex-col gap-[22px]">
          {isNew ? <AiFillBanner onPhoto={handlePickPhotosForAi} onLink={handleUseLinkForAi} /> : null}
          {basisCard}
          {categorieSection}
          <div className="hidden md:block">{bronSection}</div>
        </div>
        <div className="flex flex-col gap-[22px]">
          {ingredientenSection}
          {bereidingSection}
          <div className="md:hidden">{bronSection}</div>
        </div>
      </form>
    </SlideInModal>
    <RecipeIngredientFormSlideIn
      open={ingredientSlideOpen}
      onClose={closeIngredientForm}
      initial={ingredientSlideInitial}
      onSubmit={handleIngredientFormSubmit}
      titleId="recipe-editor-ingredient-form-slide-title"
      containerClassName="z-[60]"
      onDelete={handleDeleteIngredient}
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

function SectionTitle({ children, count }: { children: React.ReactNode; count?: string }) {
  return (
    <h3 className="px-1 pb-2 text-[13px] font-bold tracking-[0.01em] text-[var(--text-secondary)]">
      {children}
      {count ? <span className="font-medium text-[var(--text-tertiary)]"> · {count}</span> : null}
    </h3>
  );
}

function AddRow({ children, first, onClick }: { children: React.ReactNode; first?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-[15px] font-semibold text-[var(--blue-500)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--blue-25)]",
        !first && "border-t border-[var(--border-subtle)]",
      )}
    >
      <span aria-hidden className="flex size-[26px] items-center justify-center rounded-full bg-[var(--blue-50)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="size-4">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      {children}
    </button>
  );
}

/** Nieuw recept: AI vult naam, ingrediënten en stappen in vanuit foto's of een link. */
function AiFillBanner({ onPhoto, onLink }: { onPhoto: () => void; onLink: () => void }) {
  const chip =
    "inline-flex h-[34px] items-center gap-1.5 rounded-pill bg-[var(--white)] px-3.5 text-[13.5px] font-bold text-[var(--blue-500)] shadow-[0_1px_3px_rgba(79,85,241,0.18)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
  return (
    <div className="rounded-[20px] bg-[linear-gradient(135deg,#eef0ff_0%,#f6efff_100%)] py-3.5 pl-4 pr-3.5 shadow-[inset_0_0_0_1px_var(--blue-100)] dark:bg-[var(--blue-25)]">
      <p className="flex items-center gap-2 text-[15px] font-bold text-[var(--blue-500)]">
        <SparkIcon className="size-4" />
        Snel invullen met AI
      </p>
      <p className="mb-3 mt-0.5 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
        Wij halen naam, ingrediënten en stappen uit je foto of link.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onPhoto} className={chip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
            <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Foto
        </button>
        <button type="button" onClick={onLink} className={chip}>
          <LinkIcon className="size-4" />
          Link
        </button>
      </div>
    </div>
  );
}

/** Tekstvak dat meegroeit met de inhoud (bereidingsstap over meerdere regels). */
function AutoGrowTextarea({
  value,
  onChange,
  ...props
}: { value: string; onChange: (next: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[26px] flex-1 resize-none overflow-hidden bg-transparent pt-[3px] text-[14.5px] leading-[21px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus-visible:outline-none"
      {...props}
    />
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="size-4">
      <path d="M6 6l12 12M18 6 6 18" />
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
