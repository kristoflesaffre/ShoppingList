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
import { db } from "@/lib/db";
import { AppBottomNav } from "@/components/app_bottom_nav";
import { EditButton } from "@/components/ui/edit_button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { RecipeTile } from "@/components/ui/recipe_tile";
import { SearchBar } from "@/components/ui/search_bar";
import { MiniButton } from "@/components/ui/mini_button";
import { RecipeEditorSlideIn } from "@/app/recepten/recipe_editor_slide_in";
import { Snackbar } from "@/components/ui/snackbar";
import {
  APP_FAB_BOTTOM_CLASS,
  APP_FAB_INNER_PX4_CLASS,
} from "@/lib/app-layout";
import type { SavedRecipe } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";

/** Snapshot voor Snackbar-undo na verwijderen (zelfde ids als InstantDB). */
type RecipeUndoSnapshot = {
  id: string;
  name: string;
  link: string;
  persons: number;
  order: number;
  photoUrl?: string | null;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: string;
    order: number;
  }>;
};

function SortableRecipeRow({
  recipe,
  isEditMode,
  onEdit,
  onDelete,
}: {
  recipe: SavedRecipe;
  isEditMode: boolean;
  onEdit: (r: SavedRecipe) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
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
        onClick={
          !isEditMode
            ? () => {
                void router.push(`/recepten/${recipe.id}`);
              }
            : undefined
        }
        onKeyDown={
          !isEditMode
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void router.push(`/recepten/${recipe.id}`);
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
        photoUrl: r.photoUrl ?? null,
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
  const [recipeEditorOpen, setRecipeEditorOpen] = React.useState(false);
  const [recipeEditorTarget, setRecipeEditorTarget] =
    React.useState<SavedRecipe | null>(null);
  const [lastDeletedRecipe, setLastDeletedRecipe] =
    React.useState<RecipeUndoSnapshot | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(
    null,
  );

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

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeletedRecipe(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  const openNew = React.useCallback(() => {
    setRecipeEditorTarget(null);
    setRecipeEditorOpen(true);
  }, []);

  const openEdit = React.useCallback((r: SavedRecipe) => {
    setRecipeEditorTarget(r);
    setRecipeEditorOpen(true);
  }, []);

  const closeRecipeEditor = React.useCallback(() => {
    setRecipeEditorOpen(false);
    setRecipeEditorTarget(null);
  }, []);

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

  const buildRecipeUndoSnapshot = React.useCallback(
    (recipeId: string): RecipeUndoSnapshot | null => {
      const r = recipeData?.recipes?.find((x) => x.id === recipeId);
      if (!r) return null;
      const ings = [...(r.ingredients ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      return {
        id: r.id,
        name: r.name,
        link: r.link,
        persons: r.persons,
        order: r.order ?? 0,
        photoUrl: r.photoUrl ?? null,
        ingredients: ings.map((ing, i) => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
          order: ing.order ?? i,
        })),
      };
    },
    [recipeData],
  );

  const handleDeleteRecipe = React.useCallback(
    (recipeId: string) => {
      const snapshot = buildRecipeUndoSnapshot(recipeId);
      if (!snapshot) return;

      void db.transact(
        [
          ...snapshot.ingredients.map((ing) =>
            db.tx.recipeIngredients[ing.id].delete(),
          ),
          db.tx.recipes[recipeId].delete(),
        ] as Parameters<typeof db.transact>[0],
      );

      if (recipeEditorTarget?.id === recipeId) {
        closeRecipeEditor();
      }

      setLastDeletedRecipe(snapshot);
      setSnackbarMessage(`'${snapshot.name}' verwijderd`);
    },
    [buildRecipeUndoSnapshot, recipeEditorTarget?.id, closeRecipeEditor],
  );

  const handleUndoDeleteRecipe = React.useCallback(() => {
    if (!lastDeletedRecipe) return;
    const s = lastDeletedRecipe;
    const txns = [
      db.tx.recipes[s.id].update({
        name: s.name,
        link: s.link,
        persons: s.persons,
        order: s.order,
        ...(s.photoUrl ? { photoUrl: s.photoUrl } : {}),
      }),
      ...s.ingredients.map((ing) =>
        db.tx.recipeIngredients[ing.id]
          .update({
            name: ing.name,
            quantity: ing.quantity,
            order: ing.order,
          })
          .link({ recipe: s.id }),
      ),
    ];
    void db.transact(txns as Parameters<typeof db.transact>[0]);
    setLastDeletedRecipe(null);
    setSnackbarMessage(null);
  }, [lastDeletedRecipe]);

  if (authLoading || !user || profileLoading || recipesLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-base text-text-secondary">Laden…</p>
      </div>
    );
  }

  const hasRecipes = savedRecipes.length > 0;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[var(--white)] px-[16px]">
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

      <RecipeEditorSlideIn
        open={recipeEditorOpen}
        onClose={closeRecipeEditor}
        recipeToEdit={recipeEditorTarget}
        recipeData={recipeData}
      />

      {snackbarMessage && (
        <div className="fixed inset-x-0 bottom-[calc(183px+env(safe-area-inset-bottom,0px))] z-30 flex justify-center px-2">
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDeleteRecipe}
          />
        </div>
      )}

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
        <div className={APP_FAB_INNER_PX4_CLASS}>
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
