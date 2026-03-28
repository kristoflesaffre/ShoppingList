"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { AppBottomNav } from "@/components/app_bottom_nav";
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

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15.079 11.9997C15.079 12.2867 14.847 12.5197 14.559 12.5197H12.519V14.5607C12.519 14.8477 12.286 15.0807 11.999 15.0807C11.712 15.0807 11.479 14.8487 11.479 14.5607V12.5197H9.43997C9.15297 12.5197 8.91997 12.2867 8.91997 11.9997C8.91997 11.7127 9.15297 11.4797 9.43997 11.4797H11.48V9.43973C11.48 9.15273 11.713 8.91973 12 8.91973C12.287 8.91973 12.52 9.15273 12.52 9.43973V11.4797H14.56C14.847 11.4797 15.079 11.7127 15.079 11.9997ZM21.529 11.9997C21.529 17.2547 17.255 21.5287 12 21.5287C6.74497 21.5287 2.46997 17.2547 2.46997 11.9997C2.46997 6.74473 6.74497 2.46973 12 2.46973C17.255 2.46973 21.529 6.74473 21.529 11.9997ZM20.49 11.9997C20.49 7.31873 16.681 3.50973 12 3.50973C7.31897 3.50973 3.50997 7.31873 3.50997 11.9997C3.50997 16.6817 7.31897 20.4897 12 20.4897C16.681 20.4897 20.49 16.6817 20.49 11.9997Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MaskNavIcon({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
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

function ChefHatPageIcon({ className }: { className?: string }) {
  return <MaskNavIcon src="/icons/chef_hat.svg" className={className} />;
}

type DraftRow = { key: string; name: string; quantity: string };

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

  const [recipeSearch, setRecipeSearch] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRecipeId, setEditingRecipeId] = React.useState<string | null>(
    null,
  );
  const [recipeName, setRecipeName] = React.useState("");
  const [recipeLink, setRecipeLink] = React.useState("");
  const [recipePersons, setRecipePersons] = React.useState(2);
  const [draftRows, setDraftRows] = React.useState<DraftRow[]>([]);

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

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-[16px]">
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          <div className="mb-6 flex items-center gap-4">
            <h1 className="flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Jouw recepten
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ChefHatPageIcon className="size-6 shrink-0 text-[var(--text-primary)]" />
              <p className="min-w-0 text-base font-medium leading-24 text-text-secondary">
                Bibliotheek
              </p>
            </div>
            {savedRecipes.length > 0 ? (
              <button
                type="button"
                aria-label="Recept toevoegen"
                onClick={openNew}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <PlusCircleIcon />
              </button>
            ) : null}
          </div>

          {savedRecipes.length > 0 ? (
            <div className="mt-4">
              <SearchBar
                placeholder="Zoek recept"
                value={recipeSearch}
                onValueChange={setRecipeSearch}
              />
            </div>
          ) : null}

          {savedRecipes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
              <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                Je hebt nog geen recepten toegevoegd
              </p>
              <MiniButton variant="primary" onClick={openNew}>
                Voeg recept toe
              </MiniButton>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <p className="py-8 text-center text-base font-medium leading-24 text-[var(--text-tertiary)]">
              Geen recepten gevonden
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {filteredRecipes.map((r) => {
                const n = r.ingredients.length;
                const itemCount = n === 1 ? "1 item" : `${n} items`;
                return (
                  <RecipeTile
                    key={r.id}
                    recipeName={r.name}
                    itemCount={itemCount}
                    onEdit={() => openEdit(r)}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEdit(r);
                      }
                    }}
                  />
                );
              })}
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
