"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { AppBottomNav } from "@/components/app_bottom_nav";
import { EditButton } from "@/components/ui/edit_button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { RecipeTile } from "@/components/ui/recipe_tile";
import { SearchBar } from "@/components/ui/search_bar";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import {
  APP_FAB_BOTTOM_CLASS,
  APP_FAB_INNER_FLUSH_CLASS,
} from "@/lib/app-layout";
import type { RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";

const RECEPT_FORM_ID = "recepten-form";

type DraftRow = { key: string; name: string; quantity: string };

function SortableRecipeRow({
  recipe,
  isEditMode,
  onOpen,
  onEdit,
  onDelete,
}: {
  recipe: SavedRecipe;
  isEditMode: boolean;
  onOpen: (r: SavedRecipe) => void;
  onEdit: (r: SavedRecipe) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recipe.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const n = recipe.ingredients.length;
  const itemCount = n === 1 ? "1 item" : `${n} items`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]",
      )}
    >
      <RecipeTile
        recipeName={recipe.name}
        itemCount={itemCount}
        state={isEditMode ? "editable" : "bare"}
        dragHandleProps={
          isEditMode ? { ...attributes, ...listeners } : undefined
        }
        onEdit={isEditMode ? () => onEdit(recipe) : undefined}
        onDelete={isEditMode ? () => onDelete(recipe.id) : undefined}
        className={cn(
          !isEditMode &&
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
        )}
        role={!isEditMode ? "button" : undefined}
        tabIndex={!isEditMode ? 0 : undefined}
        onClick={!isEditMode ? () => onOpen(recipe) : undefined}
        onKeyDown={
          !isEditMode
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(recipe);
                }
              }
            : undefined
        }
      />
    </div>
  );
}

export default function ReceptenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading: profileLoading, data: profileData } = db.useQuery({
    profiles: {
      $: { where: { instantUserId: ownerId } },
    },
  });

  const { data: recipeData, isLoading: recipesLoading } = db.useQuery({
    recipes: { ingredients: {} },
  });

  const existingProfile = profileData?.profiles?.[0];
  const profileAvatarUrl = existingProfile?.avatarUrl ?? null;
  const profileFirstName =
    (existingProfile?.firstName ?? "").trim() || null;

  const savedRecipes: SavedRecipe[] = React.useMemo(() => {
    if (!recipeData?.recipes) return [];
    return [...recipeData.recipes]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((r) => ({
        id: r.id,
        name: r.name,
        link: r.link,
        persons: r.persons,
        ingredients: [...(r.ingredients ?? [])]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((ing) => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
          })),
      }));
  }, [recipeData]);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [recipeSearch, setRecipeSearch] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRecipeId, setEditingRecipeId] = React.useState<string | null>(
    null,
  );
  const [recipeName, setRecipeName] = React.useState("");
  const [recipeLink, setRecipeLink] = React.useState("");
  const [recipePersons, setRecipePersons] = React.useState(2);
  const [draftRows, setDraftRows] = React.useState<DraftRow[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const resetForm = React.useCallback(() => {
    setEditingRecipeId(null);
    setRecipeName("");
    setRecipeLink("");
    setRecipePersons(2);
    setDraftRows([]);
  }, []);

  const openNew = React.useCallback(() => {
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const openEdit = React.useCallback((r: SavedRecipe) => {
    setEditingRecipeId(r.id);
    setRecipeName(r.name);
    setRecipeLink(r.link);
    setRecipePersons(r.persons);
    setDraftRows(
      r.ingredients.map((ing) => ({
        key: ing.id,
        name: ing.name,
        quantity: ing.quantity,
      })),
    );
    setModalOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setModalOpen(false);
    resetForm();
  }, [resetForm]);

  const filteredRecipes = React.useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    if (!q) return savedRecipes;
    return savedRecipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [savedRecipes, recipeSearch]);

  const displayRecipes = isEditMode ? savedRecipes : filteredRecipes;

  const handleReorderRecipes = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const oldIndex = savedRecipes.findIndex((r) => r.id === active.id);
      const newIndex = savedRecipes.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(savedRecipes, oldIndex, newIndex);
      const txns = reordered.map((r, i) =>
        db.tx.recipes[r.id].update({ order: i }),
      );
      void db.transact(txns);
    },
    [savedRecipes],
  );

  const handleDeleteRecipe = React.useCallback(
    (recipeId: string) => {
      const recipe = savedRecipes.find((r) => r.id === recipeId);
      const ingIds = recipe?.ingredients.map((i) => i.id) ?? [];
      void db.transact(
        [
          ...ingIds.map((id) => db.tx.recipeIngredients[id].delete()),
          db.tx.recipes[recipeId].delete(),
        ] as Parameters<typeof db.transact>[0],
      );
    },
    [savedRecipes],
  );

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!recipeName.trim()) return;

      const isNew = editingRecipeId == null;
      const recipeId = isNew ? iid() : editingRecipeId;

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
      const existingOrder = allRecipes.find((r) => r.id === recipeId)?.order ?? 0;
      const newOrder =
        allRecipes.length > 0
          ? Math.min(...allRecipes.map((r) => r.order ?? 0)) - 1
          : 0;

      const txns = [
        db.tx.recipes[recipeId].update({
          name: recipeName.trim(),
          link: recipeLink.trim(),
          persons: recipePersons,
          order: isNew ? newOrder : existingOrder,
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
      closeModal();
    },
    [
      recipeName,
      recipeLink,
      recipePersons,
      draftRows,
      editingRecipeId,
      recipeData?.recipes,
      closeModal,
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

  if (authLoading || !user || profileLoading || recipesLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-base text-text-secondary">Laden…</p>
      </div>
    );
  }

  const hasRecipes = savedRecipes.length > 0;

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-[16px]">
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6">
          <div className="flex items-start gap-4">
            <h1 className="min-w-0 flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Mijn recepten
            </h1>
            {hasRecipes ? (
              <EditButton
                type="button"
                variant={isEditMode ? "active" : "inactive"}
                onClick={() => setIsEditMode((v) => !v)}
                className="shrink-0"
              />
            ) : null}
          </div>

          {hasRecipes ? (
            <>
              <SearchBar
                placeholder="Zoek recept"
                value={recipeSearch}
                onValueChange={setRecipeSearch}
              />

              {!isEditMode && filteredRecipes.length === 0 ? (
                <p className="py-8 text-center text-base font-medium leading-24 text-[var(--text-tertiary)]">
                  Geen recepten gevonden
                </p>
              ) : displayRecipes.length === 0 ? null : isEditMode ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleReorderRecipes}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={savedRecipes.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-4">
                      {displayRecipes.map((r) => (
                        <SortableRecipeRow
                          key={r.id}
                          recipe={r}
                          isEditMode
                          onOpen={openEdit}
                          onEdit={openEdit}
                          onDelete={handleDeleteRecipe}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex flex-col gap-4">
                  {displayRecipes.map((r) => (
                    <SortableRecipeRow
                      key={r.id}
                      recipe={r}
                      isEditMode={false}
                      onOpen={openEdit}
                      onEdit={openEdit}
                      onDelete={handleDeleteRecipe}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
              <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                Je hebt nog geen recepten toegevoegd
              </p>
              <MiniButton variant="primary" onClick={openNew}>
                Voeg recept toe
              </MiniButton>
            </div>
          )}
        </div>
      </div>

      <SlideInModal
        open={modalOpen}
        onClose={closeModal}
        title={editingRecipeId ? "Recept wijzigen" : "Nieuw recept"}
        footer={
          <Button
            type="submit"
            form={RECEPT_FORM_ID}
            variant="primary"
            disabled={!recipeName.trim()}
          >
            Bewaren
          </Button>
        }
      >
        <form
          id={RECEPT_FORM_ID}
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

      <AppBottomNav
        active="recepten"
        profileAvatarUrl={profileAvatarUrl}
        profileFirstName={profileFirstName}
        onLijstjes={() => router.push("/")}
        onRecepten={() => router.push("/recepten")}
        onProfiel={() => router.push("/profiel")}
      />

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-20",
          APP_FAB_BOTTOM_CLASS,
        )}
      >
        <div className={APP_FAB_INNER_FLUSH_CLASS}>
          <FloatingActionButton
            aria-label="Nieuw recept"
            className="pointer-events-auto"
            onClick={openNew}
          />
        </div>
      </div>
    </div>
  );
}
