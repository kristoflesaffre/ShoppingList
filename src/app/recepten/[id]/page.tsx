"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { DoneButton } from "@/components/ui/title_edit_button";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { MiniButton } from "@/components/ui/mini_button";
import dynamic from "next/dynamic";
import type { RecipeCategory, RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";
import { RecipeIngredientSortableList } from "@/app/recepten/recipe_ingredient_sortable_list";
import type { RecipeIngredientFormDraft } from "@/components/recipe_ingredient_form_slide_in";
import type { FoodImageGenerationResult } from "@/components/food-image-generator";

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
import { matchStepIngredients } from "@/lib/recipe-step-ingredients";
import { RecipeStepsEditor, TrashGlyph } from "@/app/recepten/recipe_steps_editor";
import { RECIPE_CATEGORIES } from "@/lib/recipe_library";
import { recipeTintColors, scaleQuantity, useIsDarkTheme, useRecipeTint } from "@/lib/recipe-tint";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { clearRecipeHeroTransition, peekRecipeHeroTransition } from "@/lib/recipe_hero_transition";

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

/** Bord vliegt licht doorschietend naar zijn plek (zelfde gevoel als de klantenkaart-vlucht). */
const HERO_FLIGHT_MS = 560;
const HERO_FLIGHT_EASE = "cubic-bezier(0.22, 1.12, 0.36, 1)";

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
  /*
   * Koken (canvas «Recept · 2A»): stappen afvinken (bewaard op dit toestel) en één stap kiezen om de
   * ingrediënten erop te filteren. Ingrediënten van afgewerkte stappen zakken naar «Gebruikt».
   */
  const [doneSteps, setDoneSteps] = React.useState<Set<number>>(() => new Set());
  const [selectedStep, setSelectedStep] = React.useState<number | null>(null);
  const doneStorageKey = recipeId ? `recipe-steps-done:${recipeId}` : "";
  React.useEffect(() => {
    if (!doneStorageKey) return;
    try {
      const raw = window.localStorage.getItem(doneStorageKey);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      setDoneSteps(new Set(Array.isArray(list) ? list.filter((n): n is number => typeof n === "number") : []));
    } catch {
      setDoneSteps(new Set());
    }
  }, [doneStorageKey]);
  const toggleStepDone = React.useCallback(
    (index: number, stepCount: number) => {
      setDoneSteps((prev) => {
        const next = new Set(prev);
        const nowDone = !next.has(index);
        if (nowDone) next.add(index);
        else next.delete(index);
        try {
          window.localStorage.setItem(doneStorageKey, JSON.stringify(Array.from(next)));
        } catch {
          /* geen opslag: enkel deze sessie */
        }
        // Gekozen stap klaar → meteen door naar de volgende open stap.
        if (nowDone) {
          setSelectedStep((sel) => {
            if (sel !== index) return sel;
            for (let i = index + 1; i < stepCount; i += 1) if (!next.has(i)) return i;
            return null;
          });
        }
        return next;
      });
    },
    [doneStorageKey],
  );
  const getPhotoUrl = useIngredientPhotoUrl();
  const [shareSlideOpen, setShareSlideOpen] = React.useState(false);
  /** Canvas «Recept bewerken · 1 · inline»: alles bewerkbaar op de pagina zelf; «Gereed» sluit af. */
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
      category: (r.category as RecipeCategory | undefined) ?? null,
      ingredients: [...(r.ingredients ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
        })),
    };
  }, [recipeData, recipeId]);

  /* Gedeelde-elementovergang: bord komt aangevlogen van de startpagina / het overzicht. */
  const [hero] = React.useState(() => peekRecipeHeroTransition(recipeId));
  const heroPlateRef = React.useRef<HTMLDivElement>(null);
  const heroFlyerRef = React.useRef<HTMLDivElement>(null);
  const [heroTarget, setHeroTarget] = React.useState<DOMRect | null>(null);
  const [heroLanded, setHeroLanded] = React.useState(() => hero == null);

  React.useLayoutEffect(() => {
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHeroLanded(true);
      clearRecipeHeroTransition();
      return;
    }
    // Eén frame wachten: de router zet de scrollpositie pas na het mounten terug naar boven.
    const raf = requestAnimationFrame(() => {
      const el = heroPlateRef.current;
      if (!el) {
        setHeroLanded(true);
        clearRecipeHeroTransition();
        return;
      }
      setHeroTarget(el.getBoundingClientRect());
    });
    return () => cancelAnimationFrame(raf);
    // Alleen bij binnenkomen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useLayoutEffect(() => {
    const el = heroFlyerRef.current;
    if (!hero || !heroTarget || !el) return;
    const from = hero.rect;
    const dx = from.left + from.width / 2 - (heroTarget.left + heroTarget.width / 2);
    const dy = from.top + from.height / 2 - (heroTarget.top + heroTarget.height / 2);
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / heroTarget.width})`, boxShadow: "0 0 0 rgba(120,80,20,0)" },
        { transform: "translate(0, 0) scale(1)", boxShadow: "0 18px 40px -18px rgba(120,80,20,0.35)" },
      ],
      { duration: HERO_FLIGHT_MS, easing: HERO_FLIGHT_EASE, fill: "forwards" },
    );
    anim.onfinish = () => {
      setHeroLanded(true);
      setHeroTarget(null);
      clearRecipeHeroTransition();
    };
    return () => {
      anim.onfinish = null;
      anim.cancel();
    };
  }, [hero, heroTarget]);

  const heroFlyer =
    hero && heroTarget
      ? createPortal(
          <div
            ref={heroFlyerRef}
            aria-hidden
            className="pointer-events-none fixed z-[60] overflow-hidden rounded-full bg-[var(--white)] will-change-transform"
            style={{ left: heroTarget.left, top: heroTarget.top, width: heroTarget.width, height: heroTarget.height }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB */}
            <img src={hero.src} alt="" className="size-full scale-[1.08] object-cover" />
          </div>,
          document.body,
        )
      : null;
  /** Na de vlucht komen titel, chips en inhoud gestaggerd binnen. */
  const heroEnter = (delayMs: number) =>
    hero ? { className: "motion-safe:animate-fade-up", style: { animationDelay: `${delayMs}ms` } } : { className: "", style: undefined };

  const tint = recipeTintColors(useRecipeTint(savedRecipe?.photoUrl ?? hero?.src), useIsDarkTheme());

  const toggleDetailPhotoEditMode = React.useCallback(() => {
    setDetailPhotoEditMode((v) => !v);
    setSelectedStep(null);
  }, []);

  const saveRecipeFields = React.useCallback(
    (fields: { name?: string; link?: string; persons?: number; steps?: string; category?: RecipeCategory | null }): Promise<void> => {
      if (!recipeId) return Promise.resolve();
      const { category, ...rest } = fields;
      const patch: Record<string, unknown> = { ...rest };
      if (category !== undefined) patch.category = category ?? null;
      return db.transact(db.tx.recipes[recipeId].update(patch)).then(
        () => undefined,
        () => undefined,
      );
    },
    [recipeId],
  );

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
    if (hero) {
      /* Zelfde opbouw als de pagina: het bord staat al op zijn plek terwijl het recept laadt. */
      return (
        <div className="relative min-h-dvh w-full bg-[var(--bg-app)]">
          {/* Eerste kind, net als in de geladen pagina: zo blijft de vlucht doorlopen als de data binnenkomt. */}
          {heroFlyer}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[460px] lg:h-[520px]"
            style={{ backgroundImage: `linear-gradient(180deg, ${tint.top} 0%, ${tint.mid} 55%, var(--bg-app) 100%)` }}
          />
          <main className="relative mx-auto w-full max-w-[1180px] px-4 pt-[calc(64px+env(safe-area-inset-top,0px))] lg:px-[150px] lg:pt-[48px]">
            <section className="flex flex-col items-center">
              <div
                ref={heroPlateRef}
                className="size-[200px] shrink-0 overflow-hidden rounded-full bg-[var(--white)] shadow-[0_18px_40px_-18px_rgba(120,80,20,0.35)] lg:size-[190px]"
                style={heroLanded ? undefined : { opacity: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB */}
                <img src={hero.src} alt="" width={200} height={200} className="size-full scale-[1.08] object-cover" />
              </div>
            </section>
          </main>
        </div>
      );
    }
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
  const stepIngredientIds = matchStepIngredients(recipeSteps, savedRecipe.ingredients);
  const activeStep = selectedStep != null && selectedStep < recipeSteps.length ? selectedStep : null;
  const nowNeededIds = new Set(activeStep != null ? stepIngredientIds[activeStep] : []);
  const usedIds = new Set<string>();
  doneSteps.forEach((i) => stepIngredientIds[i]?.forEach((id) => usedIds.add(id)));
  // Een ingrediënt dat de gekozen stap nog nodig heeft, telt niet als gebruikt.
  nowNeededIds.forEach((id) => usedIds.delete(id));
  const nowNeeded = savedRecipe.ingredients.filter((ing) => nowNeededIds.has(ing.id));
  const stillNeeded = savedRecipe.ingredients.filter((ing) => !nowNeededIds.has(ing.id) && !usedIds.has(ing.id));
  const usedIngredients = savedRecipe.ingredients.filter((ing) => usedIds.has(ing.id));
  const ingredientById = new Map(savedRecipe.ingredients.map((ing) => [ing.id, ing]));
  const doneCount = recipeSteps.reduce((n, _s, i) => n + (doneSteps.has(i) ? 1 : 0), 0);
  const recipeLink = savedRecipe.link.trim();
  const ingredientCount = savedRecipe.ingredients.length;
  const basePersons = savedRecipe.persons > 0 ? savedRecipe.persons : 0;
  const shownPersons = persons ?? basePersons;
  const factor = basePersons > 0 ? shownPersons / basePersons : 1;

  return (
    <div className="relative min-h-dvh w-full bg-[var(--bg-app)]">
      {heroFlyer}
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
          {detailPhotoEditMode ? (
            <div className="hidden items-center gap-2.5 lg:flex">
              <RecipeCategorySelect value={savedRecipe.category ?? null} onChange={(category) => saveRecipeFields({ category })} />
              <DoneButton onClick={toggleDetailPhotoEditMode} className="!h-10 px-4 text-[15px] shadow-[0_8px_18px_-8px_rgba(79,85,241,0.7)]" />
            </div>
          ) : (
            <>
              <button
                type="button"
                aria-label="Recept delen"
                onClick={() => setShareSlideOpen(true)}
                className={roundHeaderBtn}
              >
                <ShareIcon />
              </button>
              <RecipeMoreMenu onEdit={toggleDetailPhotoEditMode} onDelete={() => setDeleteConfirmOpen(true)} />
            </>
          )}
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
          "relative mx-auto w-full max-w-[1180px] px-4 pt-[calc(64px+env(safe-area-inset-top,0px))] lg:px-[150px] lg:pb-[calc(48px+env(safe-area-inset-bottom,0px))] lg:pt-[48px]",
          // Ruimte voor de «Nodig voor stap»-balk op mobiel.
          selectedStep != null || detailPhotoEditMode ? "pb-[calc(130px+env(safe-area-inset-bottom,0px))]" : "pb-[calc(48px+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {/* Kop: rond bord, titel met potlood, chips */}
        <section className="flex flex-col items-center">
          <div className="relative">
            <div
              ref={heroPlateRef}
              className={cn(
                "shrink-0 overflow-hidden rounded-full bg-[var(--white)] shadow-[0_18px_40px_-18px_rgba(120,80,20,0.35)]",
                savedRecipe.photoUrl ? "size-[200px] lg:size-[190px]" : "size-[124px]",
              )}
              style={heroLanded ? undefined : { opacity: 0 }}
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
                  )}
                />
              )}
            </div>
            {!detailPhotoEditMode ? (
              <button
                type="button"
                aria-label="Recept bewerken"
                onClick={toggleDetailPhotoEditMode}
                className={cn(
                  plateActionBtn,
                  "size-11",
                  !savedRecipe.photoUrl && "!-bottom-1 !-right-2 !size-10",
                  heroEnter(300).className,
                )}
                style={heroEnter(300).style}
              >
                <PencilIcon />
              </button>
            ) : null}
            {detailPhotoEditMode ? (
              <button
                type="button"
                disabled={photoSaving}
                onClick={openPhotoSourceSlide}
                aria-label={savedRecipe.photoUrl ? "Foto wijzigen" : "Foto toevoegen"}
                // Mobiel identiek aan de potloodknop (zelfde plek, maat en schaduw); desktop een pil met «Foto».
                className={cn(plateActionBtn, "size-11 gap-1.5 text-sm font-bold disabled:opacity-60 lg:w-auto lg:px-4", !savedRecipe.photoUrl && "!-bottom-1 !-right-2 !size-10")}
              >
                <CameraGlyph />
                <span className="hidden lg:inline">{photoSaving ? "Bezig…" : "Foto"}</span>
              </button>
            ) : null}
          </div>
          {photoError ? <p className="mt-2 text-center text-xs text-[var(--error-600)]">{photoError}</p> : null}
          {!savedRecipe.photoUrl ? (
            <MiniButton type="button" variant="secondary" disabled={photoSaving} onClick={openPhotoSourceSlide} className="mt-3">
              {photoSaving ? "Bezig…" : "Foto toevoegen"}
            </MiniButton>
          ) : null}

          <div className={cn("mt-4 flex w-full max-w-full justify-center px-2", heroEnter(300).className)} style={heroEnter(300).style}>
            {detailPhotoEditMode ? (
              <RecipeTitleEditor key={savedRecipe.id} name={savedRecipe.name} onSave={(name) => saveRecipeFields({ name })} />
            ) : (
              <h1 className={recipeTitleClass}>{savedRecipe.name}</h1>
            )}
          </div>
        </section>

        {/* Ingrediënten en bereiding: onder elkaar (mobiel), naast elkaar (desktop) */}
        <div className={cn("mt-[22px] flex flex-col gap-3.5 lg:mt-10 lg:flex-row lg:items-start lg:gap-[22px]", heroEnter(460).className)} style={heroEnter(460).style}>
          <section
            aria-label="Ingrediënten"
            className="rounded-[22px] bg-[var(--white)] px-4 pb-2 pt-[18px] shadow-[0_10px_30px_-18px_rgba(16,17,48,0.18)] lg:w-[350px] lg:shrink-0 lg:px-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold leading-7 text-text-primary">Ingrediënten</h2>
              {detailPhotoEditMode ? (
                // Bewerkstand: zelfde stepper, maar hij past het recept zelf aan.
                <PersonsStepper
                  value={basePersons > 0 ? basePersons : 2}
                  onChange={(n) => {
                    setPersons(null);
                    void saveRecipeFields({ persons: n });
                  }}
                />
              ) : basePersons > 0 ? (
                <PersonsStepper value={shownPersons} onChange={setPersons} />
              ) : null}
            </div>

            {ingredientCount === 0 ? (
              <p className="py-5 text-center text-sm leading-5 text-[var(--text-tertiary)]">Nog geen ingrediënten.</p>
            ) : detailPhotoEditMode ? (
              <div className="mt-1.5">
                <RecipeIngredientSortableList
                  variant="edit"
                  ingredients={savedRecipe.ingredients}
                  onDragEndReorder={handleLijstjeIngredientReorder}
                  onDelete={handleLijstjeIngredientDelete}
                  onEdit={handleLijstjeIngredientEdit}
                />
              </div>
            ) : (
              <div className="mt-1.5">
                {activeStep != null ? (
                  <>
                    <IngredientGroupLabel tone="blue">Nu nodig · stap {activeStep + 1}</IngredientGroupLabel>
                    {nowNeeded.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {nowNeeded.map((ing) => (
                          <IngredientRow key={ing.id} name={ing.name} quantity={scaleQuantity(ing.quantity, factor)} photo={getPhotoUrl(ing.name, ing.quantity)} state="now" />
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-[14px] bg-[var(--blue-25)] px-3 py-2.5 text-sm text-[var(--text-secondary)]">Voor deze stap heb je geen extra ingrediënten nodig.</p>
                    )}
                  </>
                ) : null}
                {stillNeeded.length > 0 ? (
                  <>
                    {activeStep != null || usedIngredients.length > 0 ? <IngredientGroupLabel tone="gray">Nog nodig</IngredientGroupLabel> : null}
                    <ul>
                      {stillNeeded.map((ing, i) => (
                        <IngredientRow key={ing.id} name={ing.name} quantity={scaleQuantity(ing.quantity, factor)} photo={getPhotoUrl(ing.name, ing.quantity)} state="rest" divider={i > 0} />
                      ))}
                    </ul>
                  </>
                ) : null}
                {usedIngredients.length > 0 ? (
                  <>
                    <IngredientGroupLabel tone="gray">Gebruikt · {usedIngredients.length}</IngredientGroupLabel>
                    <ul>
                      {usedIngredients.map((ing, i) => (
                        <IngredientRow key={ing.id} name={ing.name} quantity={scaleQuantity(ing.quantity, factor)} photo={getPhotoUrl(ing.name, ing.quantity)} state="used" divider={i > 0} />
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
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
              {detailPhotoEditMode ? (
                <RecipeLinkEditor key={savedRecipe.id} link={savedRecipe.link} onSave={(link) => saveRecipeFields({ link })} />
              ) : doneCount > 0 ? (
                <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3 text-[13px] font-bold text-[var(--blue-500)]">
                  <CheckGlyph />
                  {doneCount} van {recipeSteps.length} klaar
                </span>
              ) : recipeLink ? (
                <a
                  href={recipeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 text-sm font-semibold text-[var(--blue-500)] no-underline"
                >
                  <LinkGlyph />
                  Origineel recept
                </a>
              ) : null}
            </div>
            {detailPhotoEditMode ? (
              <RecipeStepsEditor
                key={savedRecipe.id}
                steps={recipeSteps}
                onSave={(next) => saveRecipeFields({ steps: next.join("\n") })}
              />
            ) : recipeSteps.length > 0 ? (
              <>
              <ol className="flex flex-col">
                {recipeSteps.map((step, index) => (
                  <RecipeStepItem
                    key={`${index}-${step}`}
                    index={index}
                    text={step}
                    last={index === recipeSteps.length - 1}
                    done={doneSteps.has(index)}
                    selected={activeStep === index}
                    onSelect={() => setSelectedStep((cur) => (cur === index ? null : index))}
                    onToggleDone={() => toggleStepDone(index, recipeSteps.length)}
                    ingredients={(stepIngredientIds[index] ?? []).flatMap((id) => {
                      const ing = ingredientById.get(id);
                      return ing ? [{ id, name: ing.name, quantity: scaleQuantity(ing.quantity, factor), photo: getPhotoUrl(ing.name, ing.quantity) }] : [];
                    })}
                  />
                ))}
              </ol>
              {recipeLink && doneCount > 0 ? (
                <div className="mt-2 flex justify-center">
                  <a href={recipeLink} target="_blank" rel="noopener noreferrer" className={ghostBtn}>
                    <LinkGlyph />
                    Origineel recept
                  </a>
                </div>
              ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-3 text-center">
                <p className="text-sm leading-5 text-[var(--text-tertiary)]">Nog geen bereiding toegevoegd.</p>
                <button type="button" onClick={toggleDetailPhotoEditMode} className={ghostBtn}>
                  <PencilIcon small />
                  Bereiding toevoegen
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Mobiel: «Gereed» zwevend onderaan (zelfde patroon als items kiezen voor een nieuw lijstje). */}
      {detailPhotoEditMode ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 lg:hidden">
          <div aria-hidden className="h-[120px] bg-gradient-to-b from-transparent to-[var(--bg-app)] to-45%" />
          <div className="pointer-events-auto absolute inset-x-4 bottom-[calc(26px+env(safe-area-inset-bottom,0px))] flex items-center gap-3 rounded-pill bg-[var(--white)] py-[7px] pl-[7px] pr-[7px] shadow-[0_10px_30px_-10px_rgba(16,17,48,0.35),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up">
            <div className="min-w-0 flex-1">
              <RecipeCategorySelect value={savedRecipe.category ?? null} onChange={(category) => saveRecipeFields({ category })} compact />
            </div>
            <DoneButton onClick={toggleDetailPhotoEditMode} className="h-[42px] px-5 text-[15px] shadow-[0_6px_16px_-6px_rgba(79,85,241,0.6)]" />
          </div>
        </div>
      ) : null}

      {/* Mobiel: wat je nu nodig hebt voor de gekozen stap (de lijst staat hoger op de pagina). */}
      {activeStep != null && nowNeeded.length > 0 && !detailPhotoEditMode ? (
        <div className="fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom,0px))] z-20 rounded-[22px] bg-[#101130] px-3.5 py-3 text-white shadow-[0_18px_40px_-16px_rgba(16,17,48,0.6)] lg:hidden">
          <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.04em] text-[rgba(255,255,255,0.7)]">
            <span>Nodig voor stap {activeStep + 1}</span>
            <button type="button" onClick={() => setSelectedStep(null)} className="text-[13px] normal-case tracking-normal text-white underline-offset-2 [@media(hover:hover)]:hover:underline">
              Alles tonen
            </button>
          </div>
          <ul className="mt-2 flex gap-3.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nowNeeded.map((ing) => {
              const photo = getPhotoUrl(ing.name, ing.quantity);
              return (
                <li key={ing.id} className="flex shrink-0 items-center gap-2">
                  <span className="flex size-[30px] items-center justify-center overflow-hidden rounded-full bg-[#fff]">
                    {photo ? <Image src={photo} alt="" width={26} height={26} className="size-[26px] object-contain" aria-hidden /> : <span className="text-xs font-bold text-[var(--blue-500)]">{ing.name.charAt(0).toUpperCase()}</span>}
                  </span>
                  <span className="leading-4">
                    <span className="block text-[13px] font-bold">{ing.name}</span>
                    <span className="text-xs text-[rgba(255,255,255,0.7)]">{scaleQuantity(ing.quantity, factor)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <RecipeShareSlideIn
        open={shareSlideOpen}
        onClose={() => setShareSlideOpen(false)}
        recipe={savedRecipe}
        existingShareToken={
          recipeData?.recipes?.find((r) => r.id === recipeId)?.shareToken ?? null
        }
      />

      <RecipeIngredientFormSlideIn
        open={ingredientSlideOpen}
        onClose={closeIngredientSlide}
        initial={editingIngredient}
        onSubmit={editingIngredientId ? handleEditIngredient : handleAddIngredientFromFab}
        titleId="recept-detail-ingredient-form"
        containerClassName="z-[50]"
      />

      <PhotoSourceSlideIn
        open={photoSourceSlideOpen}
        onClose={closePhotoSourceSlide}
        title={photoSourceSlideTitle}
        currentPhotoSrc={savedRecipe?.photoUrl ?? null}
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

/** Ronde actieknop rechtsonder op het fotobord (potlood en, in de bewerkstand, foto). */
const plateActionBtn =
  "absolute bottom-1.5 right-0 inline-flex items-center justify-center rounded-pill bg-[var(--white)] text-[var(--blue-500)] shadow-[0_6px_16px_-6px_rgba(16,17,48,0.3),0_0_0_1px_rgba(16,17,48,0.04)] transition-[background-color,color,box-shadow,transform] duration-base ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:scale-[1.06] [@media(hover:hover)]:hover:bg-[var(--blue-500)] [@media(hover:hover)]:hover:text-white [@media(hover:hover)]:hover:shadow-[0_10px_22px_-8px_rgba(79,85,241,0.65)]";
const roundHeaderBtn =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
const ghostBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3.5 text-sm font-semibold text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

function PencilIcon({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={small ? "size-4" : "size-5"}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
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

function IngredientGroupLabel({ tone, children }: { tone: "blue" | "gray"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "mb-1.5 mt-3.5 text-xs font-extrabold uppercase tracking-[0.05em]",
        tone === "blue" ? "text-[var(--blue-500)]" : "text-[var(--text-tertiary)]",
      )}
    >
      {children}
    </p>
  );
}

function IngredientRow({
  name,
  quantity,
  photo,
  state,
  divider = false,
}: {
  name: string;
  quantity: string;
  photo: string | null;
  state: "now" | "rest" | "used";
  divider?: boolean;
}) {
  const used = state === "used";
  return (
    <li
      className={cn(
        "flex items-center gap-3",
        state === "now" ? "rounded-[14px] bg-[var(--blue-25)] px-2.5 py-2" : "py-2.5",
        divider && state !== "now" && "border-t border-[var(--border-subtle)]",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gray-25)]">
        {photo ? (
          <Image src={photo} alt="" width={38} height={38} className={cn("size-[38px] object-contain", used && "opacity-55 grayscale")} aria-hidden />
        ) : null}
      </span>
      <span className={cn("min-w-0 flex-1 text-[15px] font-medium leading-5", used ? "text-[var(--text-tertiary)] line-through" : "text-text-primary")}>
        {name}
      </span>
      <span className={cn("whitespace-nowrap text-sm leading-5", used ? "text-[var(--text-tertiary)]" : "text-[var(--text-secondary)]")}>{quantity}</span>
      {used ? (
        <span aria-label="Gebruikt" className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--gray-300)] text-white">
          <CheckGlyph />
        </span>
      ) : null}
    </li>
  );
}

type StepIngredient = { id: string; name: string; quantity: string; photo: string | null };

/** Canvas «Recept · 2A»: tijdlijn met stapkaarten; tik = kiezen (filtert de ingrediënten), rondje = klaar. */
function RecipeStepItem({
  index,
  text,
  last,
  done,
  selected,
  onSelect,
  onToggleDone,
  ingredients,
}: {
  index: number;
  text: string;
  last: boolean;
  done: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleDone: () => void;
  ingredients: StepIngredient[];
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center pt-3.5" aria-hidden>
        <span
          className={cn(
            "flex size-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-base",
            selected
              ? "bg-[var(--blue-500)] text-white"
              : done
                ? "bg-[var(--gray-50)] text-[var(--gray-300)]"
                : "bg-[var(--blue-50)] text-[var(--blue-500)]",
          )}
        >
          {done && !selected ? <CheckGlyph /> : index + 1}
        </span>
        {!last ? <span className={cn("my-1 w-0.5 flex-1 rounded-full", done ? "bg-[var(--gray-100)]" : "bg-[var(--border-subtle)]")} /> : null}
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Stap ${index + 1}${selected ? ", gekozen" : ""}${done ? ", klaar" : ""}`}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "mb-3 min-w-0 flex-1 cursor-pointer rounded-[20px] py-3.5 pl-4 pr-3 text-left transition-[box-shadow,background-color] duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          selected
            ? "bg-[var(--white)] shadow-[0_0_0_2px_var(--blue-500),0_10px_24px_-12px_rgba(79,85,241,0.45)]"
            : done
              ? "bg-[var(--gray-25)] shadow-[0_0_0_1px_var(--border-subtle)]"
              : "bg-[var(--white)] shadow-[0_0_0_1px_var(--border-subtle),0_2px_6px_-2px_rgba(16,17,48,0.10)] [@media(hover:hover)]:hover:shadow-[0_0_0_1px_var(--blue-200),0_6px_14px_-6px_rgba(16,17,48,0.16)]",
        )}
      >
        <div className="flex items-start gap-3">
          <p className={cn("min-w-0 flex-1 text-[15px] leading-[23px] lg:text-base lg:leading-6", done ? "text-[var(--text-tertiary)]" : "text-text-primary")}>
            {text}
          </p>
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Stap ${index + 1} niet meer klaar` : `Stap ${index + 1} klaar`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone();
            }}
            // Zichtbaar rondje van 26px (zoals de andere vinkjes in de app), onzichtbaar tikvlak van 44px.
            className="group -my-[9px] -mr-[9px] flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-[26px] items-center justify-center rounded-full transition-[background-color,box-shadow,transform] duration-fast group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-[var(--border-focus)]",
                // Klaar: uitgewassen grijs (niet het actieve blauw), zodat het duidelijk «afgevinkt» leest.
                done
                  ? "bg-[var(--gray-300)] text-white"
                  : "bg-[var(--white)] text-transparent shadow-[inset_0_0_0_1.5px_var(--gray-200)] [@media(hover:hover)]:group-hover:shadow-[inset_0_0_0_1.5px_var(--blue-300)]",
              )}
            >
              <CheckGlyph />
            </span>
          </button>
        </div>
        {ingredients.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {ingredients.map((ing) => (
              <li
                key={ing.id}
                className={cn(
                  "inline-flex h-[30px] items-center gap-1.5 rounded-pill pl-[3px] pr-2.5 text-[13px] font-semibold text-text-primary",
                  selected ? "bg-[var(--blue-25)]" : "bg-[var(--gray-25)]",
                  done && "opacity-60",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--white)]">
                  {ing.photo ? (
                    <Image src={ing.photo} alt="" width={22} height={22} className={cn("size-[22px] object-contain", done && "grayscale")} aria-hidden />
                  ) : (
                    <span className="text-[11px] font-bold text-[var(--blue-500)]">{ing.name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                {ing.name}
                <span className="font-medium text-[var(--text-secondary)]">{ing.quantity}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}


const recipeTitleClass =
  "min-w-0 text-center text-[28px] font-bold leading-[34px] tracking-[-0.015em] text-text-primary lg:text-[36px] lg:leading-[44px]";

/**
 * Titel in de bewerkstand: zelfde letter en regelhoogte als de gewone titel; het blauwe kader wordt
 * er buiten getekend, zodat niets verspringt tussen gewone en bewerkstand.
 */
function RecipeTitleEditor({ name, onSave }: { name: string; onSave: (name: string) => Promise<unknown> }) {
  const [draft, setDraft] = React.useState(name);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = React.useState<number | null>(null);
  // Desktop: kader zo breed als de naam (+ ruimte voor het potlood); mobiel: volle breedte.
  React.useLayoutEffect(() => {
    if (measureRef.current) setTextWidth(Math.ceil(measureRef.current.getBoundingClientRect().width));
  }, [draft]);
  // Groeit mee zoals de gewone titel (lange namen lopen over twee regels). Ook bij een andere
  // breedte opnieuw meten: de regelhoogte verschilt tussen mobiel (34px) en desktop (44px).
  const fitHeight = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  React.useLayoutEffect(fitHeight, [draft, textWidth, fitHeight]);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      fitHeight();
    });
    ro.observe(el);
    const onResize = () => {
      if (measureRef.current) setTextWidth(Math.ceil(measureRef.current.getBoundingClientRect().width));
      fitHeight();
    };
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [fitHeight]);
  const commit = () => {
    const v = draft.trim();
    if (!v) {
      setDraft(name);
      return;
    }
    if (v !== name) void onSave(v);
  };
  return (
    <label
      className="relative block w-full max-w-[640px] lg:w-[var(--title-w)]"
      style={{ "--title-w": textWidth != null ? `${textWidth + 76}px` : "100%" } as React.CSSProperties}
    >
      <span className="sr-only">Naam van het recept</span>
      <span ref={measureRef} aria-hidden className={cn(recipeTitleClass, "pointer-events-none invisible absolute left-0 top-0 whitespace-pre")}>
        {draft || " "}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-1 -inset-y-1.5 rounded-[14px] bg-[rgba(255,255,255,0.6)] shadow-[inset_0_0_0_1.5px_var(--blue-500)] lg:-inset-y-2"
      />
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, " "))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={cn(recipeTitleClass, "relative block w-full resize-none overflow-hidden bg-transparent px-7 outline-none lg:px-9")}
      />
      <span aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--blue-500)] lg:right-2.5">
        <PencilIcon small />
      </span>
    </label>
  );
}

/** Link naar het originele recept, op de plek van «Origineel recept»: knop met klein invulvenster. */
function RecipeLinkEditor({ link, onSave }: { link: string; onSave: (link: string) => Promise<unknown> }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(link);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const hasLink = link.trim().length > 0;

  React.useEffect(() => {
    if (!open) return;
    setDraft(link);
    requestAnimationFrame(() => inputRef.current?.select());
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, link]);

  const save = (value: string) => {
    void onSave(value.trim());
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3 text-[13px] font-semibold text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <LinkGlyph />
        {hasLink ? "Link wijzigen" : "Link toevoegen"}
      </button>
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(draft);
          }}
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(340px,calc(100vw-48px))] rounded-[18px] bg-[var(--white)] p-3 shadow-[0_18px_40px_-14px_rgba(16,17,48,0.35),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up"
        >
          <label className="block text-xs font-bold text-[var(--text-secondary)]" htmlFor="recipe-link-input">
            Link naar het originele recept
          </label>
          <input
            id="recipe-link-input"
            ref={inputRef}
            type="url"
            inputMode="url"
            value={draft}
            placeholder="https://…"
            onChange={(e) => setDraft(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[12px] bg-[var(--gray-25)] px-3 text-sm text-text-primary outline-none transition-shadow focus:bg-[var(--white)] focus:shadow-[0_0_0_1.5px_var(--blue-500)]"
          />
          <div className="mt-2.5 flex items-center gap-2">
            {hasLink ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-[var(--blue-500)] no-underline [@media(hover:hover)]:hover:underline"
              >
                Openen
              </a>
            ) : null}
            {hasLink ? (
              <button type="button" onClick={() => save("")} className="text-[13px] font-semibold text-[var(--error-400)] [@media(hover:hover)]:hover:underline">
                Verwijderen
              </button>
            ) : null}
            <span className="flex-1" />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-pill bg-[var(--blue-500)] px-4 text-sm font-semibold text-white transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              Bewaar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Kleine dropdown voor het type gerecht (native select onder een pil met kleurbolletje). */
function RecipeCategorySelect({
  value,
  onChange,
  compact = false,
}: {
  value: RecipeCategory | null;
  onChange: (value: RecipeCategory | null) => Promise<unknown>;
  compact?: boolean;
}) {
  const [current, setCurrent] = React.useState<RecipeCategory | null>(value);
  React.useEffect(() => setCurrent(value), [value]);
  const meta = RECIPE_CATEGORIES.find((c) => c.id === current) ?? null;
  return (
    <label
      className={cn(
        "relative inline-flex max-w-full items-center gap-2 rounded-pill bg-[var(--white)] pl-3 pr-2.5 text-sm font-semibold text-text-primary shadow-[inset_0_0_0_1px_var(--border-subtle)] focus-within:shadow-[inset_0_0_0_1.5px_var(--blue-500)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]",
        // Even hoog als «Gereed» ernaast: 40px in de kop, 42px in de mobiele balk.
        compact ? "h-[42px] bg-[var(--gray-25)] shadow-none" : "h-10",
      )}
    >
      <span className="sr-only">Type gerecht</span>
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta?.dot ?? "var(--gray-300)" }} />
      <span className={cn("truncate", !meta && "text-[var(--text-secondary)]")}>{meta?.label ?? "Type gerecht"}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 shrink-0 text-[var(--text-secondary)]">
        <path d="M6 9l6 6 6-6" />
      </svg>
      <select
        value={current ?? ""}
        onChange={(e) => {
          const next = (e.target.value || null) as RecipeCategory | null;
          setCurrent(next);
          void onChange(next);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="">Geen type</option>
        {RECIPE_CATEGORIES.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** «…» rechtsboven: bewerken en (rood, onderaan) het recept verwijderen. */
function RecipeMoreMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item =
    "flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]";
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Meer opties"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={roundHeaderBtn}
      >
        <MoreDotsIcon />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[220px] rounded-[18px] bg-[var(--white)] p-1.5 shadow-[0_18px_40px_-14px_rgba(16,17,48,0.35),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className={cn(item, "text-text-primary [@media(hover:hover)]:hover:bg-[var(--gray-25)]")}
          >
            <span className="text-[var(--blue-500)]">
              <PencilIcon small />
            </span>
            Recept bewerken
          </button>
          <div aria-hidden className="mx-3 my-1 h-px bg-[var(--border-subtle)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className={cn(item, "text-[var(--error-400)] [@media(hover:hover)]:hover:bg-[var(--error-25)]")}
          >
            <TrashGlyph />
            Recept verwijderen
          </button>
        </div>
      ) : null}
    </div>
  );
}
