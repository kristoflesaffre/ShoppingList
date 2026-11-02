"use client";

import { HeaderEditButton, headerRoundButtonClass } from "@/components/ui/header_round_button";
import * as React from "react";
import { DoneButton } from "@/components/ui/title_edit_button";
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
import { RECIPE_CATEGORIES, groupBySubcategory } from "@/lib/recipe_library";
import { cn } from "@/lib/utils";
import { recipeHeroClickHandler } from "@/lib/recipe_hero_transition";
import { LongAgoSection, MostEatenSection, RecipeStatsSkeleton, useRecipeStats } from "@/app/recepten/recipe_stats_sections";
import { recipeTintColors, useIsDarkTheme, useRecipeTint } from "@/lib/recipe-tint";
import { EmptyStateFan } from "@/components/empty_state_fan";
import { OverviewPill } from "@/components/list_section_header";
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
    <div className="flex items-baseline gap-2">
      {section.meta ? (
        <span
          className="size-2 shrink-0 self-center rounded-full"
          style={{ backgroundColor: section.meta.dot }}
          aria-hidden
        />
      ) : null}
      <h2 className="min-w-0 truncate text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
        {section.meta ? section.meta.labelPlural : "Overige"}
      </h2>
      <span className="ml-auto shrink-0 text-sm leading-20 tracking-normal text-[var(--text-tertiary)]">
        {section.recipes.length}{" "}{section.recipes.length === 1 ? "recept" : "recepten"}
      </span>
    </div>
  );
}

/** Kop van een subsectie binnen een categorie (bv. «Puree» bij bijgerechten): kleiner en gedempter dan de categoriekop. */
function SubsectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <h3 className="flex items-baseline gap-1.5 pt-1 text-[15px] font-semibold leading-5 text-[var(--text-secondary)]">
      {label}
      <span className="text-[13px] font-medium tabular-nums text-[var(--text-tertiary)]">{count}</span>
    </h3>
  );
}

/**
 * Ronde gerechtfoto (canvas «Recepten 2»): cirkelvormige crop, schaduw naar rechtsonder zoals op de receptpagina.
 * Zonder foto (canvas «RM · 2 Wit bord»): wit bord met zachte schaduw, een rand in de categorietint en de
 * beginletter licht en dun erop.
 */
function RecipePlate({ recipe, tone }: { recipe: SavedRecipe; tone: string | null }) {
  const hasPhoto = typeof recipe.photoUrl === "string" && recipe.photoUrl.trim().length > 0;
  const ink = tone ?? "var(--blue-500)";
  return (
    <span
      data-hero-plate
      className={cn(
        "mx-auto flex aspect-square w-[84%] items-center justify-center overflow-hidden rounded-full",
        hasPhoto
          ? "[filter:drop-shadow(2px_3px_3px_rgba(80,50,10,0.22))_drop-shadow(8px_11px_10px_rgba(110,70,20,0.3))]"
          : "bg-[var(--white)]",
      )}
      style={hasPhoto ? undefined : { boxShadow: `0 10px 22px -14px rgba(16,17,48,0.28), inset 0 0 0 6px color-mix(in srgb, ${ink} 7%, var(--white))` }}
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL
        <img
          src={recipe.photoUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          /* iets ingezoomd zodat het bord de cirkel vult en de witte hoeken wegvallen */
          className="size-[108%] max-w-none object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="text-[42px] font-medium leading-none tracking-[-0.02em] opacity-70"
          style={{ color: `color-mix(in srgb, ${ink} 78%, var(--text-primary))` }}
        >
          {recipe.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function RecipePlateCard({ recipe }: { recipe: SavedRecipe }) {
  // Tegel in de kleur van het gerecht, automatisch uit de foto (canvas «Receptkleur»).
  const dark = useIsDarkTheme();
  const photoTint = recipeTintColors(useRecipeTint(recipe.photoUrl), dark);
  const n = recipe.ingredients.length;
  const itemCount = n === 1 ? "1 ingrediënt" : `${n} ingrediënten`;
  const dot = RECIPE_CATEGORIES.find((c) => c.id === recipe.category)?.dot ?? null;
  // Zonder foto: verloop in de categoriekleur in plaats van de lavendel terugval.
  const tint = !recipe.photoUrl?.trim() && dot
    ? dark
      ? { top: `color-mix(in srgb, ${dot} 22%, transparent)`, mid: `color-mix(in srgb, ${dot} 10%, transparent)` }
      : { top: `color-mix(in srgb, ${dot} 11%, var(--white))`, mid: `color-mix(in srgb, ${dot} 5%, var(--white))` }
    : photoTint;
  return (
    <Link
      href={`/recepten/${recipe.id}`}
      onClick={recipeHeroClickHandler(recipe.id, recipe.photoUrl)}
      style={{ backgroundImage: `linear-gradient(180deg, ${tint.top} 0%, ${tint.mid} 55%, transparent 100%)` }}
      className="flex h-full flex-col gap-3 rounded-[18px] bg-[var(--white)] px-2.5 pb-3.5 pt-4 text-center no-underline shadow-[inset_0_0_0_1px_var(--border-subtle),0_1px_2px_rgba(16,17,48,0.04)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      <RecipePlate recipe={recipe} tone={dot} />
      <span className="flex flex-1 flex-col items-center px-0.5">
        <span className="line-clamp-2 text-sm font-semibold leading-[19px] text-text-primary">{recipe.name}</span>
        <span className="mt-auto flex items-center gap-1.5 pt-[3px] text-xs leading-4 text-[var(--gray-400)]">
          {dot ? <span aria-hidden className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: dot }} /> : null}
          {itemCount}
        </span>
      </span>
    </Link>
  );
}

/** Canvas «Recepten leeg · A»: waaier van receptkaartjes, zelfde kanteling als de lege klantenkaarten. */
const EMPTY_STATE_FAN = [
  { name: "Rucolasoep", photo: "/images/recepten-leeg/rucolasoep_240.webp", category: "soep", count: 8, rotate: -12, dx: -74, dy: -6 },
  { name: "Paprikasoep", photo: "/images/recepten-leeg/paprikasoep_240.webp", category: "soep", count: 8, rotate: 10, dx: 74, dy: 4 },
  { name: "Spaghetti", photo: "/images/recepten-leeg/spaghetti_240.webp", category: "hoofdgerecht", count: 10, rotate: -2, dx: 0, dy: 10 },
] as const;

function EmptyStateRecipeCard({ name, photo, category, count }: { name: string; photo: string; category: string; count: number }) {
  const tint = recipeTintColors(useRecipeTint(photo), useIsDarkTheme());
  const dot = RECIPE_CATEGORIES.find((c) => c.id === category)?.dot ?? null;
  return (
    <span
      style={{ backgroundImage: `linear-gradient(180deg, ${tint.top} 0%, ${tint.mid} 55%, transparent 100%)` }}
      className="flex w-[128px] flex-col gap-2.5 rounded-[18px] bg-[var(--white)] px-[9px] pb-3 pt-3.5 text-center shadow-[0_18px_34px_-18px_rgba(16,17,48,0.4),inset_0_0_0_1px_var(--border-subtle)]"
    >
      <span className="mx-auto flex aspect-square w-[84%] items-center justify-center overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- decoratieve gerechtfoto */}
        <img src={photo} alt="" width={108} height={108} decoding="async" className="size-[108%] max-w-none object-cover" />
      </span>
      <span className="flex flex-col items-center">
        <span className="text-[13px] font-semibold leading-[18px] text-text-primary">{name}</span>
        <span className="flex items-center gap-[5px] pt-[3px] text-[11px] leading-4 text-[var(--gray-400)]">
          {dot ? <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} /> : null}
          {count} ingrediënten
        </span>
      </span>
    </span>
  );
}

function EmptyStateRecipeFan() {
  return (
    <EmptyStateFan
      className="mb-2 h-[200px] w-[300px]"
      items={EMPTY_STATE_FAN.map((c) => ({
        key: c.name,
        dx: c.dx,
        dy: c.dy,
        rotate: c.rotate,
        node: <EmptyStateRecipeCard name={c.name} photo={c.photo} category={c.category} count={c.count} />,
      }))}
    />
  );
}

/**
 * Eén categorie als rij (canvas «Recepten 2»): een veegrij (desktop zes kaarten breed) met rechts dezelfde
 * «Toon alle»-pil als op de startpagina, die de hele categorie als raster opent.
 */
function RecipeCategoryLane({
  section,
  onShowAll,
}: {
  section: { meta: (typeof RECIPE_CATEGORIES)[0] | null; recipes: SavedRecipe[] };
  onShowAll: () => void;
}) {
  const count = section.recipes.length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {section.meta ? (
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: section.meta.dot }} />
        ) : null}
        <h2 className="min-w-0 truncate text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
          {section.meta ? section.meta.labelPlural : "Overige"}
        </h2>
        <span className="flex-1" />
        <OverviewPill onClick={onShowAll} count={count} ariaLabel={`Alle ${section.meta ? section.meta.labelPlural.toLowerCase() : "overige recepten"}`} />
      </div>
      {/* Categorieën met subsecties (bijgerechten): één veegrij per subsectie, elk met een kleine kop. */}
      {(groupBySubcategory(section.meta?.id, section.recipes) ?? [{ id: "", label: "", recipes: section.recipes }]).map((group) => (
        <div key={group.id || "alle"} className="flex flex-col gap-2">
          {group.label ? <SubsectionHeader label={group.label} count={group.recipes.length} /> : null}
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 py-1 [scrollbar-width:none] md:mx-0 md:gap-3.5 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {group.recipes.map((r) => (
              <div key={r.id} className="w-[150px] shrink-0 snap-start md:w-[calc((100%-70px)/6)]">
                <RecipePlateCard recipe={r} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function ReceptenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading: dataLoading, data: recipeData } = db.useQuery({
    recipes: { ingredients: {} },
  });
  const recipeStats = useRecipeStats(user?.id ?? null);

  const savedRecipes: SavedRecipe[] = React.useMemo(() => {
    if (!recipeData?.recipes) return [];
    return [...recipeData.recipes]
      .filter((r) => {
        const rid = (r as Record<string, unknown>).ownerId;
        return rid == null || rid === ownerId;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((r) => ({
        id: r.id,
        name: r.name,
        link: r.link,
        steps: r.steps ?? "",
        persons: r.persons,
        photoUrl: r.photoUrl ?? null,
        category: ((r as Record<string, unknown>).category as RecipeCategory | undefined) ?? null,
        subcategory: ((r as Record<string, unknown>).subcategory as string | undefined) ?? null,
        canBeFrozen: ((r as Record<string, unknown>).canBeFrozen as boolean | undefined) ?? false,
        ingredients: [...(r.ingredients ?? [])]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((ing) => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
          })),
      }));
  }, [recipeData, ownerId]);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [recipeSearch, setRecipeSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<RecipeCategory | null>(null);
  // De open sectie staat in het adres (?categorie=…), zodat «terug» vanuit een recept weer in die sectie uitkomt.
  React.useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("categorie");
    const match = RECIPE_CATEGORIES.find((c) => c.id === fromUrl);
    if (match) setActiveCategory(match.id);
  }, []);
  const openCategory = React.useCallback((category: RecipeCategory | null) => {
    setActiveCategory(category);
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("categorie", category);
    else url.searchParams.delete("categorie");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
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
  const activeCategoryMeta = RECIPE_CATEGORIES.find((c) => c.id === activeCategory) ?? null;

  const handleReorderRecipes = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const oldIndex = savedRecipes.findIndex((r) => r.id === active.id);
      const newIndex = savedRecipes.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(savedRecipes, oldIndex, newIndex);
      // Alleen recepten die echt van plaats veranderen: één kleine transactie i.p.v. alle recepten.
      const stored = new Map((recipeData?.recipes ?? []).map((r) => [r.id, r.order]));
      const txns = reordered.flatMap((r, i) =>
        stored.get(r.id) === i ? [] : [db.tx.recipes[r.id].update({ order: i })],
      );
      if (txns.length === 0) return;
      // Mislukt het (bv. een time-out), dan zet Instant de volgorde zelf terug; geen onafgehandelde fout.
      db.transact(txns).catch((err) => console.warn("Recepten herschikken mislukt", err));
    },
    [savedRecipes, recipeData],
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

      db.transact(
        [
          ...snapshot.ingredients.map((ing) =>
            db.tx.recipeIngredients[ing.id].delete(),
          ),
          db.tx.recipes[recipeId].delete(),
        ] as Parameters<typeof db.transact>[0],
      ).catch((err) => console.warn("Recept verwijderen mislukt", err));

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
    db.transact(txns as Parameters<typeof db.transact>[0]).catch((err) => console.warn("Recept terugzetten mislukt", err));
    setLastDeletedRecipe(null);
    setSnackbarMessage(null);
  }, [lastDeletedRecipe]);

  if (authLoading || !user || dataLoading) {
    return <PageSpinner />;
  }

  const hasRecipes = savedRecipes.length > 0;
  /* Statistieken enkel in het gewone overzicht (niet bij zoeken, één categorie of bewerken). */
  const showStats = !isEditMode && !activeCategory && recipeSearch.trim() === "";

  return (
    <div
      className={cn(
        "relative flex min-h-dvh w-full flex-col px-[16px]",
        !hasRecipes && "bg-[var(--bg-app)]",
      )}
    >
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6 motion-safe:animate-fade-up">
          {hasRecipes ? (
            <div className="flex items-center gap-3">
              {/* Titel (+ hint in bewerkstand) */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h1 className="text-page-title font-bold leading-32 tracking-normal text-text-primary">
                  Recepten
                </h1>
                {isEditMode ? <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Sleep om te ordenen</p> : null}
              </div>
              {/* Rechts: zoeken + potlood; in de bewerkstand staat «Gereed» in de zwevende balk onderaan. */}
              {isEditMode ? null : (
                <>
                  <div className="hidden w-[320px] shrink-0 md:block">
                    <SearchBar surface="app" placeholder="Zoek recept" value={recipeSearch} onValueChange={setRecipeSearch} />
                  </div>
                  <HeaderEditButton onClick={() => setIsEditMode(true)} />
                </>
              )}
            </div>
          ) : null}

          {hasRecipes ? (
            <>
              {activeCategory && !isEditMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCategory(null)}
                    aria-label="Terug naar alle recepten"
                    className={headerRoundButtonClass}
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                      <path d="M10 3.5 5.5 8 10 12.5" />
                    </svg>
                  </button>
                  {activeCategoryMeta ? (
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: activeCategoryMeta.dot }} />
                  ) : null}
                  <h2 className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
                    {activeCategoryMeta?.labelPlural ?? "Recepten"}
                  </h2>
                  <span className="text-sm font-medium leading-20 text-[var(--text-secondary)] tabular-nums">{filteredRecipes.length}</span>
                </div>
              ) : null}
              <div className={cn("md:hidden", isEditMode && "hidden")}>
                <SearchBar surface="app" placeholder="Zoek recept" value={recipeSearch} onValueChange={setRecipeSearch} />
              </div>

              {showStats && recipeStats.isLoading ? (
                <RecipeStatsSkeleton />
              ) : showStats ? (
                <>
                  <MostEatenSection ranked={recipeStats.ranked} todayIso={recipeStats.todayIso} />
                  <LongAgoSection ranked={recipeStats.ranked} todayIso={recipeStats.todayIso} />
                </>
              ) : null}

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
                            {(groupBySubcategory(section.meta?.id, section.recipes) ?? [{ id: "", label: "", recipes: section.recipes }]).map((group) => (
                              <div key={group.id} className="flex flex-col gap-3">
                                {group.label ? <SubsectionHeader label={group.label} count={group.recipes.length} /> : null}
                                {group.recipes.map((r) => (
                                  <SortableRecipeRow
                                    key={r.id}
                                    recipe={r}
                                    isEditMode
                                    onEdit={openEdit}
                                    onDelete={handleDeleteRecipe}
                                  />
                                ))}
                              </div>
                            ))}
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
              ) : groupedSections && !activeCategory ? (
                <div className="flex flex-col gap-7">
                  {groupedSections.map((section) => (
                    <RecipeCategoryLane
                      key={section.meta?.id ?? "overige"}
                      section={section}
                      onShowAll={() => openCategory(section.meta?.id ?? null)}
                    />
                  ))}
                </div>
              ) : (
                /* Zoeken of één categorie open: alle kaarten in een raster (bij bijgerechten per subsectie). */
                <div className="flex flex-col gap-5">
                  {((!recipeSearch.trim() && groupBySubcategory(activeCategory, displayRecipes)) || [{ id: "", label: "", recipes: displayRecipes }]).map((group) => (
                    <div key={group.id} className="flex flex-col gap-3">
                      {group.label ? <SubsectionHeader label={group.label} count={group.recipes.length} /> : null}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {group.recipes.map((r) => (
                          <RecipePlateCard key={r.id} recipe={r} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Canvas «Recepten leeg · A» — waaier van receptkaartjes */
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
              <EmptyStateRecipeFan />
              <p className="max-w-[358px] text-center text-base font-medium leading-6 tracking-normal text-[var(--text-tertiary)]">
                Je hebt nog geen recepten
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
        ownerId={ownerId}
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

      {isEditMode ? (
        /* Bewerkstand: «Gereed» zwevend onderaan (zelfde patroon als Lijstjes beheren), op de plek van de plusknop
           zodat hij de navigatiebalk niet raakt; op de computer rechts naast de navigatie. */
        <div className={cn("pointer-events-none fixed inset-x-0 z-20 lg:bottom-[38px]", APP_FAB_BOTTOM_CLASS)}>
          <div className="px-[16px]">
            <div className="mx-auto flex w-full max-w-[956px] justify-end">
              <div className="pointer-events-auto flex w-full items-center gap-3 rounded-pill bg-[var(--white)] py-[7px] pl-[18px] pr-[7px] shadow-[0_10px_30px_-10px_rgba(16,17,48,0.35),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up lg:w-[260px]">
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">{savedRecipes.length} recepten</span>
                <DoneButton onClick={() => setIsEditMode(false)} aria-label="Gereed met bewerken" className="h-[42px] px-5 text-[15px] shadow-[0_6px_16px_-6px_rgba(79,85,241,0.6)]" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!snackbarMessage && hasRecipes && !isEditMode ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-20 lg:bottom-[38px]",
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
