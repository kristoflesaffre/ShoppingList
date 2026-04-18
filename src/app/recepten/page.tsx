"use client";

import * as React from "react";
import Link from "next/link";
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
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { RecipeTile } from "@/components/ui/recipe_tile";
import { SearchBar } from "@/components/ui/search_bar";
import { MiniButton } from "@/components/ui/mini_button";
import dynamic from "next/dynamic";

const RecipeEditorSlideIn = dynamic(
  () => import("@/app/recepten/recipe_editor_slide_in").then((m) => m.RecipeEditorSlideIn),
  { ssr: false },
);
import { Snackbar } from "@/components/ui/snackbar";
import { APP_FAB_BOTTOM_CLASS, APP_SNACKBAR_FIXTURE_CLASS } from "@/lib/app-layout";
import type { SavedRecipe, RecipeCategory } from "@/lib/recipe_library";
import { RECIPE_CATEGORIES } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";

/** Snapshot voor Snackbar-undo na verwijderen (zelfde ids als InstantDB). */
type RecipeUndoSnapshot = {
  id: string;
  name: string;
  link: string;
  steps?: string;
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

/** `public/icons/toggle_*.svg` — monochrome mask, kleur primary 500 (`--action-primary`). */
function ToggleViewIcon({
  src,
  active,
  className,
}: {
  src: string;
  active: boolean;
  /** bv. size-6 in de 48px-hoge toggle naast SearchBar */
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-5 shrink-0 bg-action-primary",
        !active && "opacity-[0.42]",
        className,
      )}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

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
  const itemCount = n === 1 ? "1 ingrediënt" : `${n} ingrediënten`;

  const tile = (
    <RecipeTile
      recipeName={recipe.name}
      itemCount={itemCount}
      photoUrl={recipe.photoUrl ?? undefined}
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
    />
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]",
      )}
    >
      {isEditMode ? (
        tile
      ) : (
        <Link
          href={`/recepten/${recipe.id}`}
          className="block no-underline"
        >
          {tile}
        </Link>
      )}
    </div>
  );
}

function SectionHeader({ section }: { section: { meta: typeof RECIPE_CATEGORIES[0] | null; recipes: SavedRecipe[] } }) {
  return (
    <div className="flex items-center gap-2">
      {section.meta ? (
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: section.meta.dot }} />
      ) : null}
      <span className="text-[11px] font-semibold uppercase leading-16 tracking-[0.8px] text-[var(--text-tertiary)]">
        {section.meta ? section.meta.labelPlural : "Overige"}
      </span>
      <span className="ml-auto text-xs leading-16 text-[var(--text-quaternary,var(--neutrals-400,#a9adb5))]">
        {section.recipes.length}{" "}{section.recipes.length === 1 ? "recept" : "recepten"}
      </span>
    </div>
  );
}

function RecipeGridCard({ recipe }: { recipe: SavedRecipe }) {
  const n = recipe.ingredients.length;
  const itemCount = n === 1 ? "1 ingrediënt" : `${n} ingrediënten`;
  const hasPhoto =
    typeof recipe.photoUrl === "string" && recipe.photoUrl.trim().length > 0;

  return (
    <Link href={`/recepten/${recipe.id}`} className="no-underline">
      {/* h-full + flex-col so the card stretches to the full grid-row height */}
      <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-drop">
        {/* Photo – vaste aspect-ratio, hoogte wijzigt nooit */}
        <div className="relative aspect-square w-full shrink-0 bg-[var(--blue-25)]">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.photoUrl!}
              alt=""
              className="absolute inset-0 size-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
                <path d="M26 6H6C4.9 6 4 6.9 4 8v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 18H6V8h20v16zm-9-3l-4-5-3 4-2-2.5L5 21h22l-5-6-5 6z" fill="var(--blue-200,#b0b4f8)"/>
              </svg>
            </div>
          )}
        </div>
        {/* Info – flex-1 zodat dit gedeelte uitbreidt als de rij hoger wordt door meer tekst */}
        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-2.5 text-center">
          <span className="line-clamp-2 text-sm font-medium leading-20 tracking-normal text-text-primary">
            {recipe.name}
          </span>
          <span className="text-xs font-normal leading-16 tracking-normal text-[var(--gray-400)]">
            {itemCount}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ReceptenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading: dataLoading, data: recipeData } = db.useQuery({
    recipes: { ingredients: {} },
  });

  const savedRecipes: SavedRecipe[] = React.useMemo(() => {
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
  const [activeCategory, setActiveCategory] = React.useState<RecipeCategory | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
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
    let result = savedRecipes;
    const q = recipeSearch.trim().toLowerCase();
    if (q) result = result.filter((r) => r.name.toLowerCase().includes(q));
    if (activeCategory) result = result.filter((r) => r.category === activeCategory);
    return result;
  }, [savedRecipes, recipeSearch, activeCategory]);

  // Only show category filter chips when there are categorised recipes
  const usedCategoryIds = React.useMemo(
    () => new Set(savedRecipes.map((r) => r.category).filter(Boolean)),
    [savedRecipes],
  );
  const visibleCategories = RECIPE_CATEGORIES.filter((c) => usedCategoryIds.has(c.id));

  // Group filtered recipes by category for the sectioned view
  const groupedSections = React.useMemo(() => {
    if (recipeSearch.trim()) {
      // Search active – flat list without sections
      return null;
    }
    // Group by category order; uncategorised at the end
    const sections: Array<{ meta: typeof RECIPE_CATEGORIES[0] | null; recipes: SavedRecipe[] }> = [];
    for (const cat of RECIPE_CATEGORIES) {
      const recipes = filteredRecipes.filter((r) => r.category === cat.id);
      if (recipes.length > 0) sections.push({ meta: cat, recipes });
    }
    const uncategorised = filteredRecipes.filter((r) => !r.category);
    if (uncategorised.length > 0) sections.push({ meta: null, recipes: uncategorised });
    // If everything is uncategorised, return null (render flat list as before)
    if (sections.length === 1 && sections[0].meta === null) return null;
    return sections.length > 0 ? sections : null;
  }, [filteredRecipes, activeCategory, recipeSearch]);

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
        steps: r.steps ?? "",
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
        steps: s.steps ?? "",
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

  if (authLoading || !user || dataLoading) {
    return <PageSpinner />;
  }

  const hasRecipes = savedRecipes.length > 0;

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-[16px]">
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6">
          <div className="flex items-center gap-3">
            {/* Titel + potlood */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h1 className="text-page-title font-bold leading-32 tracking-normal text-text-primary">
                Mijn recepten
              </h1>
              {hasRecipes ? (
                <button
                  type="button"
                  aria-label={isEditMode ? "Stop bewerken" : "Bewerken"}
                  onClick={() => setIsEditMode((v) => !v)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z" fill="currentColor"/>
                  </svg>
                </button>
              ) : null}
            </div>
            {/* Rechts: toggle (normaal) of Gereed-knop (edit mode) */}
            {hasRecipes ? (
              isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="h-9 shrink-0 rounded-pill bg-[var(--blue-500)] px-4 text-sm font-medium leading-20 text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  Gereed
                </button>
              ) : (
                <div
                  className="box-border flex h-9 shrink-0 items-stretch overflow-hidden rounded-md border border-[var(--gray-200)] bg-[var(--white)]"
                  role="group"
                  aria-label="Weergave"
                >
                  <button
                    type="button"
                    aria-label="Lijstweergave"
                    aria-pressed={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "flex w-9 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-inset",
                      viewMode === "list" ? "bg-[var(--blue-25)]" : "bg-[var(--white)]",
                    )}
                  >
                    <ToggleViewIcon src="/icons/toggle_list.svg" active={viewMode === "list"} />
                  </button>
                  <div className="w-px shrink-0 self-stretch bg-[var(--gray-200)]" aria-hidden />
                  <button
                    type="button"
                    aria-label="Tegelweergave"
                    aria-pressed={viewMode === "grid"}
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "flex w-9 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-inset",
                      viewMode === "grid" ? "bg-[var(--blue-25)]" : "bg-[var(--white)]",
                    )}
                  >
                    <ToggleViewIcon src="/icons/toggle_grid.svg" active={viewMode === "grid"} />
                  </button>
                </div>
              )
            ) : null}
          </div>

          {hasRecipes ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="order-1 w-full md:max-w-[360px] lg:order-2 lg:w-[280px] lg:max-w-none lg:shrink-0">
                <SearchBar
                  placeholder="Zoek recept"
                  value={recipeSearch}
                  onValueChange={setRecipeSearch}
                />
              </div>

              {/* Category filter chips */}
              {visibleCategories.length > 0 ? (
                <div className="order-2 -mx-4 min-w-0 overflow-x-auto px-4 lg:order-1 lg:mx-0 lg:flex-1 lg:px-0" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
                  <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(null)}
                      className={cn(
                        "shrink-0 rounded-pill px-3 py-1.5 text-[13px] leading-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                        activeCategory === null
                          ? "bg-[#4f55f1] font-medium text-white"
                          : "bg-white font-normal text-[#707784]",
                      )}
                    >
                      Alle
                    </button>
                    {visibleCategories.map((cat) => {
                      const isActive = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(isActive ? null : cat.id)}
                          className={cn(
                            "flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] leading-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                            isActive
                              ? "bg-[#4f55f1] font-medium text-white"
                              : "bg-white font-normal text-[#707784]",
                          )}
                        >
                          {isActive && (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.dot }}
                            />
                          )}
                          {cat.labelPlural}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              </div>

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
                    {groupedSections ? (
                      <div className="flex flex-col gap-6">
                        {groupedSections.map((section) => (
                          <div key={section.meta?.id ?? "overige"} className="flex flex-col gap-3">
                            <SectionHeader section={section} />
                            <div className="flex flex-col gap-3">
                              {section.recipes.map((r) => (
                                <SortableRecipeRow
                                  key={r.id}
                                  recipe={r}
                                  isEditMode
                                  onEdit={openEdit}
                                  onDelete={handleDeleteRecipe}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
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
                    )}
                  </SortableContext>
                </DndContext>
              ) : groupedSections ? (
                <div className="flex flex-col gap-6">
                  {groupedSections.map((section) => (
                    <div key={section.meta?.id ?? "overige"} className="flex flex-col gap-3">
                      <SectionHeader section={section} />
                      {/* Tiles / grid */}
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                          {section.recipes.map((r) => (
                            <RecipeGridCard key={r.id} recipe={r} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {section.recipes.map((r) => (
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
                    </div>
                  ))}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {displayRecipes.map((r) => (
                    <RecipeGridCard key={r.id} recipe={r} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
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
        <div className={APP_SNACKBAR_FIXTURE_CLASS}>
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDeleteRecipe}
          />
        </div>
      )}

      {!snackbarMessage ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-20",
            APP_FAB_BOTTOM_CLASS,
          )}
        >
          <div className="px-[16px]">
            <div className="mx-auto flex w-full max-w-[956px] justify-end">
              <FloatingActionButton
                aria-label="Nieuw recept"
                className="pointer-events-auto"
                onClick={openNew}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
