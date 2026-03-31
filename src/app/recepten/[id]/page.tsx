"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { EditButton } from "@/components/ui/edit_button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { MiniButton } from "@/components/ui/mini_button";
import { TabGroup } from "@/components/ui/tab_group";
import { TabElement } from "@/components/ui/tab_element";
import { RecipeEditorSlideIn } from "@/app/recepten/recipe_editor_slide_in";
import type { RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";
import { RecipeIngredientSortableList } from "@/app/recepten/recipe_ingredient_sortable_list";
import { RecipeIngredientFormSlideIn } from "@/components/recipe_ingredient_form_slide_in";
import type { RecipeIngredientFormDraft } from "@/components/recipe_ingredient_form_slide_in";
import { PhotoSourceSlideIn } from "@/components/photo_source_slide_in";
import { FoodImageGeneratorSlideIn } from "@/components/food_image_generator_slide_in";
import type { FoodImageGenerationResult } from "@/components/food-image-generator";
import { fileToAvatarDataUrl } from "@/lib/profile_crypto";
import { APP_FAB_INNER_PX4_CLASS } from "@/lib/app-layout";
import { cn } from "@/lib/utils";

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

function PersonAddIcon({ className }: { className?: string }) {
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
        d="M19.4 17.5C19.4 17.7205 19.221 17.9 19 17.9H17.9V19C17.9 19.2205 17.721 19.4 17.5 19.4C17.279 19.4 17.1 19.221 17.1 19V17.9H16C15.7795 17.9 15.6 17.721 15.6 17.5C15.6 17.279 15.779 17.1 16 17.1H17.1V16C17.1 15.7795 17.279 15.6 17.5 15.6C17.721 15.6 17.9 15.779 17.9 16V17.1H19C19.2205 17.1 19.4 17.2795 19.4 17.5ZM21.9 17.5C21.9 19.9265 19.9265 21.9 17.5 21.9C15.0735 21.9 13.1 19.9265 13.1 17.5C13.1 15.0735 15.0735 13.1 17.5 13.1C19.9265 13.1 21.9 15.0735 21.9 17.5ZM21.1 17.5C21.1 15.515 19.485 13.9 17.5 13.9C15.515 13.9 13.9 15.515 13.9 17.5C13.9 19.485 15.515 21.1 17.5 21.1C19.485 21.1 21.1 19.485 21.1 17.5ZM8.01199 10.878C7.10749 9.9775 6.60599 8.7785 6.59999 7.502V6.58C6.68349 5.334 7.21999 4.204 8.11199 3.37C9.00399 2.536 10.168 2.0765 11.3895 2.0765C12.611 2.0765 13.775 2.5355 14.667 3.37C15.56 4.2045 16.0965 5.335 16.178 6.553L16.179 7.47C16.1625 8.746 15.6595 9.942 14.763 10.843C13.8655 11.7435 12.6715 12.252 11.4015 12.275C11.3995 12.275 11.397 12.275 11.3945 12.275C10.118 12.275 8.91649 11.779 8.01199 10.878ZM7.39999 7.5C7.40499 8.562 7.82299 9.561 8.57649 10.3115C9.32949 11.061 10.329 11.4745 11.3915 11.4755C12.4515 11.4555 13.4475 11.0305 14.1965 10.279C14.9455 9.5265 15.3655 8.527 15.3795 7.4655V6.5805C15.312 5.592 14.865 4.6505 14.121 3.955C13.377 3.2595 12.407 2.877 11.3895 2.877C10.372 2.877 9.40149 3.26 8.65849 3.955C7.91499 4.65 7.46749 5.5915 7.39899 6.6075L7.39999 7.5ZM3.52399 16.773C3.86699 16.3175 4.35649 15.9785 4.90349 15.819C6.96549 15.209 9.09949 14.9 11.2495 14.9C11.283 14.9 11.325 14.911 11.35 14.9C11.57 14.9 11.749 14.7225 11.75 14.502C11.751 14.281 11.573 14.101 11.352 14.1C9.08849 14.0655 6.84449 14.41 4.67799 15.051C3.96799 15.2585 3.33099 15.699 2.88499 16.2915C2.43999 16.884 2.19299 17.6175 2.19049 18.3595V21.5C2.19049 21.7205 2.36949 21.9 2.59049 21.9H11.35C11.571 21.9 11.75 21.721 11.75 21.5C11.75 21.279 11.571 21.1 11.35 21.1H2.98999V18.361C2.99199 17.792 3.18199 17.228 3.52399 16.773Z"
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
  const { data: recipeData, isLoading: recipesLoading } = db.useQuery({
    recipes: { ingredients: {} },
  });

  const [detailTab, setDetailTab] = React.useState<DetailTab>("ingredienten");
  const [recipeEditorOpen, setRecipeEditorOpen] = React.useState(false);
  /** Figma 863:5339 — na tik op Wijzigen: knop Gereed, foto 10%, overlay «Foto wijzigen». */
  const [detailPhotoEditMode, setDetailPhotoEditMode] =
    React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = React.useState(false);
  const [ingredientSlideOpen, setIngredientSlideOpen] = React.useState(false);
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

  const handleLijstjeIngredientEdit = React.useCallback(() => {
    openEditor();
  }, [openEditor]);

  const openFabAddIngredient = React.useCallback(() => {
    setDetailPhotoEditMode(false);
    setIngredientSlideOpen(true);
  }, []);

  const closeIngredientSlide = React.useCallback(() => {
    setIngredientSlideOpen(false);
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
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--white)]">
        <p className="text-base text-text-secondary">Laden…</p>
      </div>
    );
  }

  if (!savedRecipe) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--white)] px-4">
        <p className="text-center text-base text-[var(--text-secondary)]">
          Dit recept bestaat niet (meer).
        </p>
        <MiniButton variant="primary" onClick={() => router.push("/recepten")}>
          Terug naar recepten
        </MiniButton>
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
            onClick={() => router.push("/recepten")}
            aria-label="Terug naar mijn recepten"
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <BackArrowIcon />
          </button>
          <p className="min-w-0 flex-1 text-center text-base font-medium leading-24 tracking-normal text-[var(--text-primary)] truncate">
            {navTitle}
          </p>
          <button
            type="button"
            aria-label="Delen (beschikbaar binnenkort)"
            disabled
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
          >
            <PersonAddIcon />
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
          <div className="relative z-[1] flex items-start justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-section-title font-bold leading-24 tracking-normal text-[var(--text-primary)]">
              {savedRecipe.name}
            </h1>
            <EditButton
              type="button"
              variant={detailPhotoEditMode ? "active" : "inactive"}
              onClick={toggleDetailPhotoEditMode}
              className="shrink-0"
            />
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
                // eslint-disable-next-line @next/next/no-img-element -- statische placeholder (Figma)
                <img
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
            <ul className="relative z-[1] flex flex-col">
              {savedRecipe.ingredients.length === 0 ? (
                <li className="py-4 text-sm text-[var(--text-tertiary)]">
                  Nog geen ingrediënten. Tik op + om er een toe te voegen of gebruik
                  Wijzigen voor het volledige recept.
                </li>
              ) : (
                savedRecipe.ingredients.map((ing) => (
                  <li
                    key={ing.id}
                    className={cn(
                      "flex flex-col gap-3 border-b border-[var(--border-subtle)] py-3 text-base font-medium leading-24 text-[var(--text-primary)] last:border-b-0",
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <span className="min-w-0 flex-1">{ing.name}</span>
                      <span className="shrink-0 whitespace-nowrap text-right">
                        {ing.quantity}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
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
                  <MiniButton
                    variant="primary"
                    type="button"
                    className="self-center"
                    onClick={() => router.push("/")}
                  >
                    Ga naar lijstjes
                  </MiniButton>
                </>
              ) : (
                <>
                  <RecipeIngredientSortableList
                    ingredients={savedRecipe.ingredients}
                    onDragEndReorder={handleLijstjeIngredientReorder}
                    onDelete={handleLijstjeIngredientDelete}
                    onEdit={handleLijstjeIngredientEdit}
                  />
                  <MiniButton
                    variant="secondary"
                    type="button"
                    className="self-center"
                    onClick={() => router.push("/")}
                  >
                    Ga naar lijstjes
                  </MiniButton>
                </>
              )}
            </div>
          ) : null}
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-20">
        <div className={cn(APP_FAB_INNER_PX4_CLASS, "pointer-events-none")}>
          <FloatingActionButton
            aria-label="Ingrediënt toevoegen"
            className="pointer-events-auto shadow-[var(--shadow-drop)]"
            onClick={openFabAddIngredient}
          />
        </div>
      </div>

      <RecipeEditorSlideIn
        open={recipeEditorOpen}
        onClose={closeEditor}
        recipeToEdit={savedRecipe}
        recipeData={recipeData}
      />

      <RecipeIngredientFormSlideIn
        open={ingredientSlideOpen}
        onClose={closeIngredientSlide}
        initial={null}
        onSubmit={handleAddIngredientFromFab}
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
