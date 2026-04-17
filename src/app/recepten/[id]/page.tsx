"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { MiniButton } from "@/components/ui/mini_button";
import { TabGroup } from "@/components/ui/tab_group";
import { TabElement } from "@/components/ui/tab_element";
import dynamic from "next/dynamic";
import type { RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";
import { RecipeIngredientSortableList } from "@/app/recepten/recipe_ingredient_sortable_list";
import type { RecipeIngredientFormDraft } from "@/components/recipe_ingredient_form_slide_in";
import type { FoodImageGenerationResult } from "@/components/food-image-generator";

const RecipeEditorSlideIn = dynamic(
  () => import("@/app/recepten/recipe_editor_slide_in").then((m) => m.RecipeEditorSlideIn),
  { ssr: false },
);
const RecipeIngredientFormSlideIn = dynamic(
  () => import("@/components/recipe_ingredient_form_slide_in").then((m) => m.RecipeIngredientFormSlideIn),
  { ssr: false },
);
const PhotoSourceSlideIn = dynamic(
  () => import("@/components/photo_source_slide_in").then((m) => m.PhotoSourceSlideIn),
  { ssr: false },
);
const FoodImageGeneratorSlideIn = dynamic(
  () => import("@/components/food_image_generator_slide_in").then((m) => m.FoodImageGeneratorSlideIn),
  { ssr: false },
);
const RecipeShareSlideIn = dynamic(
  () => import("@/components/recipe_share_slide_in").then((m) => m.RecipeShareSlideIn),
  { ssr: false },
);
import { fileToAvatarDataUrl } from "@/lib/profile_crypto";
import {
  APP_FAB_BOTTOM_NO_NAV_CLASS,
  APP_FAB_INNER_PX4_CLASS,
} from "@/lib/app-layout";
import { useIngredientPhotoUrl } from "@/lib/ingredient-photos";
import { cn } from "@/lib/utils";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/share.svg */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7.96595 6.95401C7.77095 6.75901 7.77095 6.44201 7.96595 6.24701L11.6459 2.56701C11.6919 2.52101 11.7469 2.48401 11.8079 2.45901C11.8679 2.43401 11.9329 2.42001 11.9999 2.42001C12.0669 2.42001 12.1319 2.43401 12.1919 2.45901C12.2529 2.48401 12.3079 2.52101 12.3539 2.56701L16.0329 6.24701C16.2279 6.44201 16.2279 6.75901 16.0329 6.95401C15.8379 7.14901 15.5209 7.14901 15.3259 6.95401L12.4999 4.12701V14.49C12.4999 14.766 12.2759 14.99 11.9999 14.99C11.7239 14.99 11.4999 14.766 11.4999 14.49V4.12701L8.67295 6.95401C8.57595 7.05101 8.44795 7.10001 8.31995 7.10001C8.19195 7.10001 8.06395 7.05101 7.96595 6.95401ZM16.8399 8.39001H14.2699C13.9939 8.39001 13.7699 8.61401 13.7699 8.89001C13.7699 9.16601 13.9939 9.39001 14.2699 9.39001H16.8399C17.5789 9.39001 18.1799 9.99101 18.1799 10.73V19.24C18.1799 19.979 17.5789 20.581 16.8399 20.581H7.15995C6.42095 20.581 5.81995 19.979 5.81995 19.24V10.73C5.81995 9.99101 6.42095 9.39001 7.15995 9.39001H9.49995C9.77595 9.39001 9.99995 9.16601 9.99995 8.89001C9.99995 8.61401 9.77595 8.39001 9.49995 8.39001H7.15995C5.86895 8.39001 4.81995 9.44001 4.81995 10.73V19.24C4.81995 20.531 5.86995 21.581 7.15995 21.581H16.8399C18.1299 21.581 19.1799 20.531 19.1799 19.24V10.73C19.1799 9.43901 18.1299 8.39001 16.8399 8.39001Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MoreDotsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14.1 12C14.1 13.16 13.16 14.1 12 14.1C10.84 14.1 9.9 13.16 9.9 12C9.9 10.84 10.84 9.9 12 9.9C13.16 9.9 14.1 10.84 14.1 12ZM4.6 9.9C3.44 9.9 2.5 10.84 2.5 12C2.5 13.16 3.44 14.1 4.6 14.1C5.76 14.1 6.7 13.16 6.7 12C6.7 10.84 5.76 9.9 4.6 9.9ZM19.4 9.9C18.24 9.9 17.3 10.84 17.3 12C17.3 13.16 18.24 14.1 19.4 14.1C20.56 14.1 21.5 13.16 21.5 12C21.5 10.84 20.56 9.9 19.4 9.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

type DetailTab = "ingredienten" | "recept" | "lijstje";

export default function ReceptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recipeId = typeof params.id === "string" ? params.id : "";

  const { isLoading: authLoading, user } = db.useAuth();
  const { data: recipeData, isLoading: recipesLoading } = db.useQuery(
    recipeId
      ? { recipes: { ingredients: {}, $: { where: { id: recipeId } } } }
      : null,
  );

  const [detailTab, setDetailTab] = React.useState<DetailTab>("ingredienten");
  const [ingredientView, setIngredientView] = React.useState<"groot" | "klein" | "lijst">("groot");

  React.useEffect(() => {
    const saved = localStorage.getItem("ingredientView");
    if (saved === "groot" || saved === "klein" || saved === "lijst") {
      setIngredientView(saved);
    }
  }, []);

  const handleIngredientViewChange = React.useCallback((view: "groot" | "klein" | "lijst") => {
    setIngredientView(view);
    localStorage.setItem("ingredientView", view);
  }, []);
  const getPhotoUrl = useIngredientPhotoUrl();
  const [shareSlideOpen, setShareSlideOpen] = React.useState(false);
  const [recipeEditorOpen, setRecipeEditorOpen] = React.useState(false);
  /** Figma 863:5339 — na tik op Wijzigen: knop Gereed, foto 10%, overlay «Foto wijzigen». */
  const [detailPhotoEditMode, setDetailPhotoEditMode] =
    React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = React.useState(false);
  const [ingredientSlideOpen, setIngredientSlideOpen] = React.useState(false);
  const [editingIngredientId, setEditingIngredientId] = React.useState<string | null>(null);
  const [photoSourceSlideOpen, setPhotoSourceSlideOpen] =
    React.useState(false);
  const [aiFoodImageSlideOpen, setAiFoodImageSlideOpen] =
    React.useState(false);
  const [aiFoodImageSlideKey, setAiFoodImageSlideKey] = React.useState(0);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const savedRecipe: SavedRecipe | null = React.useMemo(() => {
    if (!recipeData?.recipes || !recipeId) return null;
    const r = recipeData.recipes.find((x) => x.id === recipeId);
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      link: r.link,
      steps: r.steps ?? "",
      persons: r.persons,
      photoUrl: r.photoUrl ?? null,
      ingredients: [...(r.ingredients ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
        })),
    };
  }, [recipeData, recipeId]);

  const openEditor = React.useCallback(() => {
    setDetailPhotoEditMode(false);
    setRecipeEditorOpen(true);
  }, []);

  const toggleDetailPhotoEditMode = React.useCallback(() => {
    setDetailPhotoEditMode((v) => !v);
  }, []);

  const closeEditor = React.useCallback(() => {
    setRecipeEditorOpen(false);
  }, []);

  const handleLijstjeIngredientReorder = React.useCallback(
    async (reordered: RecipeIngredient[]) => {
      const txns = reordered.map((ing, i) =>
        db.tx.recipeIngredients[ing.id].update({ order: i }),
      );
      await db.transact(txns as Parameters<typeof db.transact>[0]);
    },
    [],
  );

  const handleLijstjeIngredientDelete = React.useCallback(
    async (ingredientId: string) => {
      await db.transact(db.tx.recipeIngredients[ingredientId].delete());
    },
    [],
  );

  const handleLijstjeIngredientEdit = React.useCallback((id: string) => {
    setEditingIngredientId(id);
    setDetailPhotoEditMode(false);
    setIngredientSlideOpen(true);
  }, []);

  const openFabAddIngredient = React.useCallback(() => {
    setDetailPhotoEditMode(false);
    setEditingIngredientId(null);
    setIngredientSlideOpen(true);
  }, []);

  const closeIngredientSlide = React.useCallback(() => {
    setIngredientSlideOpen(false);
    setEditingIngredientId(null);
  }, []);

  const handleAddIngredientFromFab = React.useCallback(
    async (draft: RecipeIngredientFormDraft) => {
      if (!savedRecipe) return;
      const r = recipeData?.recipes?.find((x) => x.id === savedRecipe.id);
      const ings = r?.ingredients ?? [];
      const nextOrder =
        ings.length === 0
          ? 0
          : Math.max(...ings.map((i) => i.order ?? 0)) + 1;
      const ingId = iid();
      await db.transact(
        db.tx.recipeIngredients[ingId]
          .update({
            name: draft.name,
            quantity: draft.quantity,
            order: nextOrder,
          })
          .link({ recipe: savedRecipe.id }),
      );
    },
    [recipeData?.recipes, savedRecipe],
  );

  const handleEditIngredient = React.useCallback(
    async (draft: RecipeIngredientFormDraft) => {
      if (!draft.id) return;
      await db.transact(
        db.tx.recipeIngredients[draft.id].update({
          name: draft.name,
          quantity: draft.quantity,
        }),
      );
    },
    [],
  );

  const editingIngredient = React.useMemo(
    () => savedRecipe?.ingredients.find((i) => i.id === editingIngredientId) ?? null,
    [savedRecipe?.ingredients, editingIngredientId],
  );

  const openPhotoPicker = React.useCallback(() => {
    setPhotoError(null);
    photoInputRef.current?.click();
  }, []);

  const photoSourceSlideTitle = detailPhotoEditMode
    ? savedRecipe?.photoUrl
      ? "Foto wijzigen"
      : "Foto toevoegen"
    : "Foto toevoegen";

  const openPhotoSourceSlide = React.useCallback(() => {
    setPhotoSourceSlideOpen(true);
  }, []);

  const closePhotoSourceSlide = React.useCallback(() => {
    setPhotoSourceSlideOpen(false);
  }, []);

  const handlePickPhotoFromDevice = React.useCallback(() => {
    closePhotoSourceSlide();
    requestAnimationFrame(() => openPhotoPicker());
  }, [closePhotoSourceSlide, openPhotoPicker]);

  const openAiFoodImageSlide = React.useCallback(() => {
    closePhotoSourceSlide();
    setAiFoodImageSlideKey((k) => k + 1);
    setAiFoodImageSlideOpen(true);
  }, [closePhotoSourceSlide]);

  const closeAiFoodImageSlide = React.useCallback(() => {
    setAiFoodImageSlideOpen(false);
  }, []);

  const handleAiFoodImageBack = React.useCallback(() => {
    setAiFoodImageSlideOpen(false);
    setPhotoSourceSlideOpen(true);
  }, []);

  const handleAiFoodImageApplied = React.useCallback(
    async (result: FoodImageGenerationResult) => {
      if (!savedRecipe) {
        throw new Error("Geen recept geladen.");
      }
      setPhotoError(null);
      setPhotoSaving(true);
      try {
        const absolute = new URL(
          result.imageUrl,
          window.location.origin,
        ).toString();
        const imgRes = await fetch(absolute);
        if (!imgRes.ok) {
          throw new Error("Gegenereerde afbeelding ophalen mislukt.");
        }
        const blob = await imgRes.blob();
        const file = new File([blob], "generated-food.png", {
          type: blob.type || "image/png",
        });
        const dataUrl = await fileToAvatarDataUrl(file);
        await db.transact(
          db.tx.recipes[savedRecipe.id].update({ photoUrl: dataUrl }),
        );
        setDetailPhotoEditMode(false);
        setAiFoodImageSlideOpen(false);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Foto opslaan mislukt.";
        setPhotoError(msg);
        throw err;
      } finally {
        setPhotoSaving(false);
      }
    },
    [savedRecipe],
  );

  const handleRecipePhotoChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file?.type.startsWith("image/")) {
        setPhotoError("Kies een afbeeldingsbestand.");
        return;
      }
      if (!savedRecipe) return;
      setPhotoError(null);
      setPhotoSaving(true);
      try {
        const dataUrl = await fileToAvatarDataUrl(file);
        await db.transact(
          db.tx.recipes[savedRecipe.id].update({ photoUrl: dataUrl }),
        );
      } catch (err) {
        setPhotoError(
          err instanceof Error ? err.message : "Foto opslaan mislukt.",
        );
      } finally {
        setPhotoSaving(false);
      }
    },
    [savedRecipe],
  );

  if (authLoading || !user || recipesLoading) {
    return <PageSpinner surface="white" />;
  }

  if (!savedRecipe) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--white)] px-4">
        <p className="text-center text-base text-[var(--text-secondary)]">
          Dit recept bestaat niet (meer).
        </p>
        <Link href="/recepten">
          <MiniButton variant="primary">
            Terug naar recepten
          </MiniButton>
        </Link>
      </div>
    );
  }

  const navTitle =
    savedRecipe.name.length > 28
      ? `${savedRecipe.name.slice(0, 28)}…`
      : savedRecipe.name;
  const recipeSteps = (savedRecipe.steps ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\d+[.)]\s*/, ""))
    .filter((s) => s.length > 0);

  return (
    <div className="relative min-h-dvh w-full bg-[var(--white)]">
      <div className="fixed top-0 left-0 right-0 z-10 w-full bg-[var(--white)] pt-[env(safe-area-inset-top,0px)]">
        <header className="mx-auto flex h-16 max-w-[956px] items-center gap-4 px-4">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.replace("/recepten");
              }
            }}
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <BackArrowIcon />
          </button>
          <p className="min-w-0 flex-1 text-center text-base font-medium leading-24 tracking-normal text-[var(--text-primary)] truncate">
            {navTitle}
          </p>
          <button
            type="button"
            aria-label="Recept delen"
            onClick={() => setShareSlideOpen(true)}
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <ShareIcon />
          </button>
          <button
            type="button"
            aria-label="Meer opties (beschikbaar binnenkort)"
            disabled
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
          >
            <MoreDotsIcon />
          </button>
        </header>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleRecipePhotoChange}
      />

      <main
        className={cn(
          "relative z-0 mx-auto w-full max-w-[956px] px-4 pb-[calc(120px+env(safe-area-inset-bottom,0px))]",
          "pt-[calc(64px+16px+env(safe-area-inset-top,0px))]",
        )}
      >
        <div className="relative z-[1] flex flex-col gap-6">
          <div className="relative z-[1] flex min-h-9 items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h1 className="min-w-0 text-section-title font-bold leading-24 tracking-normal text-[var(--text-primary)]">
                {savedRecipe.name}
              </h1>
              <button
                type="button"
                aria-label={detailPhotoEditMode ? "Stop bewerken" : "Bewerken"}
                onClick={toggleDetailPhotoEditMode}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            {detailPhotoEditMode ? (
              <button
                type="button"
                onClick={toggleDetailPhotoEditMode}
                className="h-9 shrink-0 rounded-pill bg-[var(--blue-500)] px-4 text-sm font-medium leading-20 text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                Gereed
              </button>
            ) : null}
          </div>

          <div className="relative z-[1] flex flex-col items-center gap-3">
            {/* Zonder foto: 124×124 placeholder. Met foto: 256×256. Bewerkmodus: 10% opacity + overlay (Figma 863:5339). */}
            <div
              className={cn(
                "relative shrink-0 overflow-hidden rounded-full",
                savedRecipe.photoUrl ? "size-[256px]" : "size-[124px]",
              )}
            >
              {savedRecipe.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB
                <img
                  src={savedRecipe.photoUrl}
                  alt=""
                  width={256}
                  height={256}
                  className={cn(
                    "size-[256px] object-cover transition-opacity duration-150",
                    detailPhotoEditMode ? "opacity-10" : "opacity-100",
                  )}
                />
              ) : (
                <Image
                  src="/images/ui/recipe_plate.png"
                  alt=""
                  width={124}
                  height={124}
                  className={cn(
                    "size-[124px] object-cover transition-opacity duration-150",
                    detailPhotoEditMode ? "opacity-10" : "opacity-25",
                  )}
                />
              )}
              {detailPhotoEditMode ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <MiniButton
                    type="button"
                    variant="secondary"
                    disabled={photoSaving}
                    onClick={openPhotoSourceSlide}
                    className="pointer-events-auto"
                  >
                    {photoSaving
                      ? "Bezig…"
                      : savedRecipe.photoUrl
                        ? "Foto wijzigen"
                        : "Foto toevoegen"}
                  </MiniButton>
                </div>
              ) : null}
            </div>
            {photoError ? (
              <p className="text-center text-xs text-[var(--error-600)]">
                {photoError}
              </p>
            ) : null}
            {!detailPhotoEditMode && !savedRecipe.photoUrl ? (
              <MiniButton
                type="button"
                variant="secondary"
                disabled={photoSaving}
                onClick={openPhotoSourceSlide}
              >
                {photoSaving ? "Bezig…" : "Foto toevoegen"}
              </MiniButton>
            ) : null}
          </div>

          <div className="relative z-[1] w-full">
          <TabGroup
            value={detailTab}
            onValueChange={(v) => {
              if (v === "ingredienten" || v === "recept" || v === "lijstje") {
                setDetailTab(v);
              }
            }}
            aria-label="Receptonderdelen"
          >
            <TabElement value="ingredienten">Ingrediënten</TabElement>
            <TabElement value="recept">Recept</TabElement>
            <TabElement value="lijstje">Lijstje</TabElement>
          </TabGroup>
          </div>

          {detailTab === "ingredienten" ? (
            <div className="relative z-[1] flex w-full flex-col gap-4 py-2">
              {/* Pill tab: Groot / Klein / Lijst */}
              <div
                role="tablist"
                aria-label="Weergave ingrediënten"
                className="relative flex w-full overflow-hidden rounded-pill border border-[var(--gray-100)] bg-[var(--gray-25)]"
              >
                {/* Sliding white indicator */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-pill bg-[var(--white)] transition-transform duration-200 ease-out"
                  style={{ transform: `translateX(${["groot", "klein", "lijst"].indexOf(ingredientView) * 100}%)` }}
                />
                {(["groot", "klein", "lijst"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    role="tab"
                    aria-selected={ingredientView === view}
                    onClick={() => handleIngredientViewChange(view)}
                    className={cn(
                      "relative z-10 flex flex-1 items-center justify-center rounded-pill px-4 py-[10px] text-base font-semibold leading-24 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                      ingredientView === view
                        ? "text-[var(--blue-500)]"
                        : "text-[var(--gray-300)]",
                    )}
                  >
                    {view === "groot" ? "Groot" : view === "klein" ? "Klein" : "Lijst"}
                  </button>
                ))}
              </div>

              {/* Groot: 4 kolommen */}
              {ingredientView === "groot" && (
                savedRecipe.ingredients.length === 0 ? (
                  <p className="py-4 text-sm text-[var(--text-tertiary)]">
                    Nog geen ingrediënten. Tik op + om er een toe te voegen.
                  </p>
                ) : (
                  <IngredientGrid
                    ingredients={savedRecipe.ingredients}
                    gridClass="grid-cols-3"
                    lgGridClass="lg:grid-cols-4"
                    getPhotoUrl={getPhotoUrl}
                    textSize="text-[13px]"
                    lgTextSize="lg:text-[15px]"
                    leadingClass="leading-5 lg:leading-4"
                  />
                )
              )}

              {/* Klein: 6 kolommen */}
              {ingredientView === "klein" && (
                savedRecipe.ingredients.length === 0 ? (
                  <p className="py-4 text-sm text-[var(--text-tertiary)]">
                    Nog geen ingrediënten. Tik op + om er een toe te voegen.
                  </p>
                ) : (
                  <IngredientGrid
                    ingredients={savedRecipe.ingredients}
                    gridClass="grid-cols-4"
                    lgGridClass="lg:grid-cols-6"
                    getPhotoUrl={getPhotoUrl}
                    textSize="text-[10px]"
                    lgTextSize="lg:text-[15px]"
                  />
                )
              )}

              {/* Lijst: bestaande verticale lijst */}
              {ingredientView === "lijst" && (
                savedRecipe.ingredients.length === 0 ? (
                  <p className="py-4 text-sm text-[var(--text-tertiary)]">
                    Nog geen ingrediënten. Tik op + om er een toe te voegen of gebruik
                    Wijzigen voor het volledige recept.
                  </p>
                ) : (
                  <ul className="flex w-full flex-col">
                    {savedRecipe.ingredients.map((ing) => (
                      <li
                        key={ing.id}
                        className="flex flex-col gap-3 border-b border-[var(--border-subtle)] py-3 text-base font-medium leading-24 text-[var(--text-primary)] last:border-b-0"
                      >
                        <div className="flex items-center gap-6">
                          <span className="min-w-0 flex-1">{ing.name}</span>
                          <span className="shrink-0 whitespace-nowrap text-right">{ing.quantity}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ) : null}

          {detailTab === "recept" ? (
            <div className="relative z-[1] flex flex-col gap-6">
              {recipeSteps.length > 0 ? (
                <ol className="flex flex-col gap-4">
                  {recipeSteps.map((step, index) => (
                    <React.Fragment key={`${index}-${step}`}>
                      <li className="flex items-start gap-6">
                        <span className="shrink-0 text-2xl font-bold leading-24 tracking-normal text-[var(--text-primary)]">
                          {index + 1}
                        </span>
                        <p className="min-w-0 flex-1 text-base font-normal leading-24 tracking-normal text-[var(--text-secondary)]">
                          {step}
                        </p>
                      </li>
                      {index < recipeSteps.length - 1 && (
                        <div className="h-px w-full bg-[var(--border-subtle)]" />
                      )}
                    </React.Fragment>
                  ))}
                </ol>
              ) : null}
              {savedRecipe.link.trim() ? (
                <MiniButton variant="secondary" asChild className="self-center">
                  <a
                    href={savedRecipe.link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Link recept
                  </a>
                </MiniButton>
              ) : (
                <MiniButton
                  type="button"
                  variant="secondary"
                  className="self-center"
                  onClick={openEditor}
                >
                  Link recept
                </MiniButton>
              )}
            </div>
          ) : null}

          {detailTab === "lijstje" ? (
            <div className="relative z-[1] flex flex-col gap-6">
              {savedRecipe.ingredients.length === 0 ? (
                <>
                  <p className="text-center text-base leading-24 text-[var(--text-tertiary)]">
                    Nog geen ingrediënten. Gebruik Wijzigen om ze toe te voegen,
                    of ga naar een lijstje om dit recept toe te passen.
                  </p>
                  <Link href="/" className="self-center no-underline">
                    <MiniButton variant="primary" type="button">
                      Ga naar lijstjes
                    </MiniButton>
                  </Link>
                </>
              ) : (
                <>
                  <RecipeIngredientSortableList
                    ingredients={savedRecipe.ingredients}
                    onDragEndReorder={handleLijstjeIngredientReorder}
                    onDelete={handleLijstjeIngredientDelete}
                    onEdit={handleLijstjeIngredientEdit}
                  />
                  <Link href="/" className="self-center no-underline">
                    <MiniButton variant="secondary" type="button">
                      Ga naar lijstjes
                    </MiniButton>
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>
      </main>

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-20",
          APP_FAB_BOTTOM_NO_NAV_CLASS,
        )}
      >
        <div className={cn(APP_FAB_INNER_PX4_CLASS, "pointer-events-none")}>
          <FloatingActionButton
            aria-label="Ingrediënt toevoegen"
            className="pointer-events-auto shadow-[var(--shadow-drop)]"
            onClick={openFabAddIngredient}
          />
        </div>
      </div>

      <RecipeShareSlideIn
        open={shareSlideOpen}
        onClose={() => setShareSlideOpen(false)}
        recipe={savedRecipe}
        existingShareToken={
          recipeData?.recipes?.find((r) => r.id === recipeId)?.shareToken ?? null
        }
      />

      <RecipeEditorSlideIn
        open={recipeEditorOpen}
        onClose={closeEditor}
        recipeToEdit={savedRecipe}
        recipeData={recipeData}
      />

      <RecipeIngredientFormSlideIn
        open={ingredientSlideOpen}
        onClose={closeIngredientSlide}
        initial={editingIngredient}
        onSubmit={editingIngredientId ? handleEditIngredient : handleAddIngredientFromFab}
        titleId="recept-detail-ingredient-form"
        containerClassName="z-[50]"
        slideClassName="h-[calc(100dvh-48px)]"
      />

      <PhotoSourceSlideIn
        open={photoSourceSlideOpen}
        onClose={closePhotoSourceSlide}
        title={photoSourceSlideTitle}
        onPickFromDevice={handlePickPhotoFromDevice}
        onGenerateWithAi={openAiFoodImageSlide}
      />

      <FoodImageGeneratorSlideIn
        key={aiFoodImageSlideKey}
        open={aiFoodImageSlideOpen}
        onClose={closeAiFoodImageSlide}
        onBack={handleAiFoodImageBack}
        ownerId={user.id}
        initialDishName={savedRecipe.name}
        onGenerationComplete={handleAiFoodImageApplied}
      />
    </div>
  );
}

// ─── Ingredient grid (Groot / Klein) ─────────────────────────────────────────
// gridClass / lgGridClass must be full Tailwind class strings (no dynamic
// interpolation) so Tailwind picks them up at build time.

function IngredientGrid({
  ingredients,
  gridClass,
  lgGridClass,
  getPhotoUrl,
  textSize,
  lgTextSize,
  leadingClass = "leading-4",
}: {
  ingredients: RecipeIngredient[];
  /** CSS grid-cols class for mobile, e.g. "grid-cols-3" */
  gridClass: string;
  /** CSS grid-cols class for lg breakpoint, e.g. "lg:grid-cols-2" */
  lgGridClass: string;
  getPhotoUrl: (name: string, quantity?: string) => string | null;
  textSize: string;
  lgTextSize: string;
  /** Regelhoogte naam + hoeveelheid (default leading-4); bij grotere mobiele tekst o.a. leading-5 lg:leading-4 */
  leadingClass?: string;
}) {
  return (
    <div className={cn("grid w-full gap-x-4 gap-y-6", gridClass, lgGridClass)}>
      {ingredients.map((ing) => {
        const photoUrl = getPhotoUrl(ing.name, ing.quantity);
        return (
          <div key={ing.id} className="flex flex-col items-center gap-2 min-w-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-[var(--white)]">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 160px, 100px"
                  className="object-contain"
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="w-full text-center">
              <p
                className={cn(
                  textSize,
                  lgTextSize,
                  "font-medium text-[var(--text-primary)] break-words",
                  leadingClass,
                )}
              >
                {ing.name}
              </p>
              <p
                className={cn(
                  textSize,
                  lgTextSize,
                  "font-normal text-[var(--text-secondary)]",
                  leadingClass,
                )}
              >
                {ing.quantity}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
