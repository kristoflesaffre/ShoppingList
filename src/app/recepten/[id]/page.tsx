"use client";

import * as React from "react";
import { DoneButton, TitleEditButton } from "@/components/ui/title_edit_button";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { MiniButton } from "@/components/ui/mini_button";
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
import { uploadUserImageFile } from "@/lib/image-storage";
import { useIngredientPhotoUrl } from "@/lib/ingredient-photos";
import { cn } from "@/lib/utils";
import { recipeTintColors, scaleQuantity, useIsDarkTheme, useRecipeTint } from "@/lib/recipe-tint";
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

  /** Aantal personen in de stepper (null = zoals in het recept). */
  const [persons, setPersons] = React.useState<number | null>(null);
  /** Kopbalk krijgt een achtergrond zodra je scrolt (knoppen zweven anders over de inhoud). */
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  /** Afgevinkte ingrediënten tijdens het koken (enkel lokaal). */
  const [checked, setChecked] = React.useState<Set<string>>(() => new Set());
  const toggleChecked = React.useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
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

  const tint = recipeTintColors(useRecipeTint(savedRecipe?.photoUrl), useIsDarkTheme());

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

  const handleDeleteRecipe = React.useCallback(async () => {
    if (!recipeId || !savedRecipe) return;
    const ingredients = savedRecipe.ingredients ?? [];
    await db.transact(
      [
        ...ingredients.map((ing) => db.tx.recipeIngredients[ing.id].delete()),
        db.tx.recipes[recipeId].delete(),
      ] as Parameters<typeof db.transact>[0],
    );
    setDeleteConfirmOpen(false);
    router.replace("/recepten");
  }, [recipeId, savedRecipe, router]);

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
        if (!user?.id) {
          throw new Error("Je moet ingelogd zijn om een foto op te slaan.");
        }
        const image = await uploadUserImageFile({
          file,
          ownerId: user.id,
          kind: "generated-recipe-photo",
        });
        await db.transact(
          db.tx.recipes[savedRecipe.id].update({ photoUrl: image.url }),
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
    [savedRecipe, user?.id],
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
        if (!user?.id) return;
        const image = await uploadUserImageFile({
          file,
          ownerId: user.id,
          kind: "recipe-photo",
        });
        await db.transact(
          db.tx.recipes[savedRecipe.id].update({ photoUrl: image.url }),
        );
      } catch (err) {
        setPhotoError(
          err instanceof Error ? err.message : "Foto opslaan mislukt.",
        );
      } finally {
        setPhotoSaving(false);
      }
    },
    [savedRecipe, user?.id],
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

  const recipeSteps = (savedRecipe.steps ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\d+[.)]\s*/, ""))
    .filter((s) => s.length > 0);
  const recipeLink = savedRecipe.link.trim();
  const ingredientCount = savedRecipe.ingredients.length;
  const basePersons = savedRecipe.persons > 0 ? savedRecipe.persons : 0;
  const shownPersons = persons ?? basePersons;
  const factor = basePersons > 0 ? shownPersons / basePersons : 1;

  return (
    <div className="relative min-h-dvh w-full bg-[var(--bg-app)]">
      {/* Warme band in de kleur van het gerecht (canvas «Recept detail 2a»), automatisch uit de foto. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] lg:h-[520px]"
        style={{ backgroundImage: `linear-gradient(180deg, ${tint.top} 0%, ${tint.mid} 55%, var(--bg-app) 100%)` }}
      />

      <div
        className={cn(
          "fixed inset-x-0 top-0 z-10 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow,backdrop-filter] duration-200",
          scrolled && "shadow-[0_1px_0_var(--border-subtle)] backdrop-blur-md",
        )}
        style={{ backgroundColor: scrolled ? "color-mix(in srgb, var(--bg-app) 86%, transparent)" : "transparent" }}
      >
        <header className="mx-auto flex h-16 max-w-[1180px] items-center gap-2 px-4 lg:h-[88px] lg:px-[150px]">
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
            className={roundHeaderBtn}
          >
            <BackArrowIcon />
          </button>
          <span className="flex-1" />
          <button
            type="button"
            aria-label="Recept delen"
            onClick={() => setShareSlideOpen(true)}
            className={roundHeaderBtn}
          >
            <ShareIcon />
          </button>
          <button
            type="button"
            aria-label="Meer opties (beschikbaar binnenkort)"
            disabled
            className={cn(roundHeaderBtn, "!text-[var(--gray-300)] disabled:opacity-70")}
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

      <main className="relative mx-auto w-full max-w-[1180px] px-4 pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+env(safe-area-inset-top,0px))] lg:px-[150px] lg:pt-[48px]">
        {/* Kop: rond bord, titel met potlood, chips */}
        <section className="flex flex-col items-center">
          <div className="relative">
            <div
              className={cn(
                "shrink-0 overflow-hidden rounded-full bg-[var(--white)] shadow-[0_18px_40px_-18px_rgba(120,80,20,0.35)]",
                savedRecipe.photoUrl ? "size-[200px] lg:size-[190px]" : "size-[124px]",
              )}
            >
              {savedRecipe.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB
                <img
                  src={savedRecipe.photoUrl}
                  alt=""
                  width={200}
                  height={200}
                  className={cn(
                    /* iets ingezoomd zodat het bord de cirkel vult (zoals in het overzicht) */
                    "size-full scale-[1.08] object-cover transition-opacity duration-150",
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
                    detailPhotoEditMode ? "opacity-10" : "opacity-100",
                  )}
                />
              )}
            </div>
            {detailPhotoEditMode ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <MiniButton
                  type="button"
                  variant="secondary"
                  disabled={photoSaving}
                  onClick={openPhotoSourceSlide}
                  className="w-[124px]"
                >
                  {photoSaving ? "Bezig…" : savedRecipe.photoUrl ? "Foto wijzigen" : "Foto toevoegen"}
                </MiniButton>
                <MiniButton type="button" variant="secondary" onClick={openEditor} className="w-[124px]">
                  Recept wijzigen
                </MiniButton>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-[12px] font-medium leading-4 text-[var(--error-400)] underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  Recept verwijderen
                </button>
              </div>
            ) : null}
          </div>
          {photoError ? <p className="mt-2 text-center text-xs text-[var(--error-600)]">{photoError}</p> : null}
          {!detailPhotoEditMode && !savedRecipe.photoUrl ? (
            <MiniButton type="button" variant="secondary" disabled={photoSaving} onClick={openPhotoSourceSlide} className="mt-3">
              {photoSaving ? "Bezig…" : "Foto toevoegen"}
            </MiniButton>
          ) : null}

          <div className="mt-4 flex max-w-full items-center gap-2 px-2">
            <h1 className="min-w-0 text-center text-[28px] font-bold leading-[34px] tracking-[-0.015em] text-text-primary lg:text-[36px] lg:leading-[44px]">
              {savedRecipe.name}
            </h1>
            {detailPhotoEditMode ? (
              <DoneButton onClick={toggleDetailPhotoEditMode} />
            ) : (
              <TitleEditButton onClick={toggleDetailPhotoEditMode} />
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            <span className={chipClass}>
              <ListGlyph />
              {ingredientCount === 1 ? "1 ingrediënt" : `${ingredientCount} ingrediënten`}
            </span>
            {recipeLink ? (
              <a href={recipeLink} target="_blank" rel="noopener noreferrer" className={cn(chipClass, "!text-[var(--blue-500)] no-underline")}>
                <LinkGlyph />
                Recept
              </a>
            ) : (
              <button type="button" onClick={openEditor} className={cn(chipClass, "!text-[var(--blue-500)]")}>
                <LinkGlyph />
                Link toevoegen
              </button>
            )}
          </div>
        </section>

        {/* Ingrediënten en bereiding: onder elkaar (mobiel), naast elkaar (desktop) */}
        <div className="mt-[22px] flex flex-col gap-3.5 lg:mt-10 lg:flex-row lg:items-start lg:gap-[22px]">
          <section
            aria-label="Ingrediënten"
            className="rounded-[22px] bg-[var(--white)] px-4 pb-2 pt-[18px] shadow-[0_10px_30px_-18px_rgba(16,17,48,0.18)] lg:w-[430px] lg:shrink-0 lg:px-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold leading-7 text-text-primary">Ingrediënten</h2>
              {basePersons > 0 && !detailPhotoEditMode ? (
                <PersonsStepper value={shownPersons} onChange={setPersons} />
              ) : null}
            </div>

            {ingredientCount === 0 ? (
              <p className="py-5 text-center text-sm leading-5 text-[var(--text-tertiary)]">Nog geen ingrediënten.</p>
            ) : detailPhotoEditMode ? (
              <div className="pt-3">
                <RecipeIngredientSortableList
                  ingredients={savedRecipe.ingredients}
                  onDragEndReorder={handleLijstjeIngredientReorder}
                  onDelete={handleLijstjeIngredientDelete}
                  onEdit={handleLijstjeIngredientEdit}
                />
              </div>
            ) : (
              <ul className="mt-1.5">
                {savedRecipe.ingredients.map((ing, i) => {
                  const photo = getPhotoUrl(ing.name, ing.quantity);
                  const done = checked.has(ing.id);
                  return (
                    <li key={ing.id} className={cn(i < ingredientCount - 1 && "border-b border-[var(--border-subtle)]")}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        onClick={() => toggleChecked(ing.id)}
                        className="flex w-full items-center gap-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gray-25)]">
                          {photo ? (
                            <Image src={photo} alt="" width={38} height={38} className="size-[38px] object-contain" aria-hidden />
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-[15px] font-medium leading-5 text-text-primary transition-opacity",
                            done && "opacity-50",
                          )}
                        >
                          {ing.name}
                        </span>
                        <span className={cn("whitespace-nowrap text-sm leading-5 text-[var(--text-secondary)]", done && "opacity-50")}>
                          {scaleQuantity(ing.quantity, factor)}
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-[26px] shrink-0 items-center justify-center rounded-full transition-colors",
                            done
                              ? "bg-[var(--blue-500)] text-white"
                              : "text-transparent shadow-[inset_0_0_0_1.5px_var(--gray-200)]",
                          )}
                        >
                          <CheckGlyph />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-center pb-2.5 pt-1.5">
              <button type="button" onClick={openFabAddIngredient} className={ghostBtn}>
                <PlusGlyph />
                Ingrediënt toevoegen
              </button>
            </div>
          </section>

          <section aria-label="Bereiding" className="flex-1 rounded-[22px] bg-[var(--white)] px-4 pb-5 pt-[18px] lg:px-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold leading-7 text-text-primary">Bereiding</h2>
              {recipeLink ? (
                <a
                  href={recipeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--blue-500)] no-underline"
                >
                  <LinkGlyph />
                  Origineel recept
                </a>
              ) : null}
            </div>
            {recipeSteps.length > 0 ? (
              <ol className="flex flex-col gap-[18px]">
                {recipeSteps.map((step, index) => (
                  <li key={`${index}-${step}`} className="flex items-start gap-3.5">
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-sm font-bold text-[var(--blue-500)]">
                      {index + 1}
                    </span>
                    <p className="mt-1 min-w-0 flex-1 text-[15px] leading-[23px] text-[var(--text-secondary)]">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center gap-3 py-3 text-center">
                <p className="text-sm leading-5 text-[var(--text-tertiary)]">Nog geen bereiding toegevoegd.</p>
                <button type="button" onClick={openEditor} className={ghostBtn}>
                  <PencilIcon small />
                  Bereiding toevoegen
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

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

      {/* Bevestiging verwijderen */}
      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteConfirmOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold leading-6 text-[var(--text-primary)]">
              Ben je zeker?
            </h2>
            <p className="mt-2 text-sm font-normal leading-5 text-[var(--text-secondary)]">
              Het recept &ldquo;{savedRecipe.name}&rdquo; wordt permanent verwijderd. Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void handleDeleteRecipe()}
                className="w-full rounded-pill bg-[var(--error-400)] py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                Verwijderen
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="w-full rounded-pill border border-[var(--gray-200)] py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const roundHeaderBtn =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
const chipClass =
  "inline-flex h-8 items-center gap-1.5 rounded-pill bg-[var(--white)] px-3 text-[13px] font-medium text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
const ghostBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3.5 text-sm font-semibold text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

function PencilIcon({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={small ? "size-4" : "size-5"}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
    </svg>
  );
}
function ListGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className="size-4 text-[var(--gray-400)]">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}
function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="size-[18px]">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** «– 4 personen +»: herschaalt de hoeveelheden (enkel weergave, het recept blijft ongewijzigd). */
function PersonsStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn =
    "flex size-7 items-center justify-center rounded-full bg-[var(--bg-app)] transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
  return (
    <div className="inline-flex h-9 shrink-0 items-center gap-1 rounded-pill bg-[var(--white)] px-1 shadow-[inset_0_0_0_1px_var(--border-subtle)]">
      <button type="button" aria-label="Minder personen" disabled={value <= 1} onClick={() => onChange(value - 1)} className={cn(btn, "text-[var(--text-secondary)]")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="size-4">
          <path d="M6 12h12" />
        </svg>
      </button>
      <span className="min-w-[78px] text-center text-sm font-semibold tabular-nums text-text-primary" aria-live="polite">
        {value} {value === 1 ? "persoon" : "personen"}
      </span>
      <button type="button" aria-label="Meer personen" disabled={value >= 24} onClick={() => onChange(value + 1)} className={cn(btn, "text-[var(--blue-500)]")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="size-4">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
