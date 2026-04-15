"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { ToggleButton } from "@/components/ui/toggle_button";
import { PillTab } from "@/components/ui/pill_tab";
import { InputField } from "@/components/ui/input_field";
import { ItemNameAutocomplete } from "@/components/ui/item_name_autocomplete";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search_bar";
import { RecipeTile } from "@/components/ui/recipe_tile";
import { MiniButton } from "@/components/ui/mini_button";
import { cn } from "@/lib/utils";
import { resolveItemCategoryFromName } from "@/lib/item-ingredient-category";
import { parseRecipeIngredientQuantity } from "@/lib/recipe_ingredient_quantity";
import type { RecipeIngredient, SavedRecipe } from "@/lib/recipe_library";
import type { RecipeIngredientFormDraft } from "@/components/recipe_ingredient_form_slide_in";

const RecipeIngredientSortableList = dynamic(
  () => import("@/app/recepten/recipe_ingredient_sortable_list").then((m) => m.RecipeIngredientSortableList),
  { ssr: false },
);
const RecipeIngredientFormSlideIn = dynamic(
  () => import("@/components/recipe_ingredient_form_slide_in").then((m) => m.RecipeIngredientFormSlideIn),
  { ssr: false },
);

export type ListItem = {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  section: string;
  /** Supermarkt-categorie; ontbreekt → afgeleid uit naam. */
  itemCategory?: string;
  claimedByInstantUserId?: string;
  claimedByDisplayName?: string;
  recipeGroupId?: string;
  recipeName?: string;
  recipeLink?: string;
};

type Ingredient = RecipeIngredient;

const DAY_OPTIONS = [
  { label: "Geen", value: "Geen" },
  { label: "Ma", value: "Maandag" },
  { label: "Di", value: "Dinsdag" },
  { label: "Wo", value: "Woensdag" },
  { label: "Do", value: "Donderdag" },
  { label: "Vr", value: "Vrijdag" },
  { label: "Za", value: "Zaterdag" },
  { label: "Zo", value: "Zondag" },
] as const;

const SLIDE_TRANSITION = "transform 350ms cubic-bezier(0.16, 1, 0.3, 1)";

function PlusCircleIcon({ className }: { className?: string }) {
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
        d="M15.079 11.9997C15.079 12.2867 14.847 12.5197 14.559 12.5197H12.519V14.5607C12.519 14.8477 12.286 15.0807 11.999 15.0807C11.712 15.0807 11.479 14.8487 11.479 14.5607V12.5197H9.43997C9.15297 12.5197 8.91997 12.2867 8.91997 11.9997C8.91997 11.7127 9.15297 11.4797 9.43997 11.4797H11.48V9.43973C11.48 9.15273 11.713 8.91973 12 8.91973C12.287 8.91973 12.52 9.15273 12.52 9.43973V11.4797H14.56C14.847 11.4797 15.079 11.7127 15.079 11.9997ZM21.529 11.9997C21.529 17.2547 17.255 21.5287 12 21.5287C6.74497 21.5287 2.46997 17.2547 2.46997 11.9997C2.46997 6.74473 6.74497 2.46973 12 2.46973C17.255 2.46973 21.529 6.74473 21.529 11.9997ZM20.49 11.9997C20.49 7.31873 16.681 3.50973 12 3.50973C7.31897 3.50973 3.50997 7.31873 3.50997 11.9997C3.50997 16.6817 7.31897 20.4897 12 20.4897C16.681 20.4897 20.49 16.6817 20.49 11.9997Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChefHatIcon({ className }: { className?: string }) {
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
        d="M5.34143 11.5837L5.70893 11.7136V19.4895C5.70893 20.2672 6.33937 20.8976 7.11706 20.8976H16.8829C17.6606 20.8976 18.2911 20.2672 18.2911 19.4895V11.7136L18.6586 11.5837C19.9895 11.1133 20.8976 9.85088 20.8976 8.41597C20.8976 6.56102 19.3939 5.05729 17.539 5.05729C17.0447 5.05729 16.5665 5.16379 16.1286 5.36671L15.6218 5.60161L15.3937 5.09162C14.857 3.89141 13.6635 3.10236 12.3258 3.10236C10.8882 3.10236 9.6239 4.01399 9.15561 5.34857L8.91989 6.02031L8.32859 5.62389C7.78034 5.25634 7.13623 5.05729 6.46104 5.05729C4.60609 5.05729 3.10236 6.56102 3.10236 8.41597C3.10236 9.85088 4.01051 11.1133 5.34143 11.5837ZM4.60657 12.4745C3.04098 11.7591 2 10.1865 2 8.41597C2 5.9522 3.99727 3.95493 6.46104 3.95493C7.13357 3.95493 7.78465 4.10438 8.37573 4.38565C9.13338 2.94401 10.6397 2 12.3258 2C13.9218 2 15.3634 2.84594 16.1566 4.17339C16.5985 4.02947 17.0638 3.95493 17.539 3.95493C20.0027 3.95493 22 5.9522 22 8.41597C22 10.1865 20.959 11.7591 19.3934 12.4745V19.4895C19.3934 20.876 18.2694 22 16.8829 22H7.11706C5.73055 22 4.60657 20.876 4.60657 19.4895V12.4745Z"
        fill="currentColor"
      />
      <path
        d="M4.93225 19.0676V17.9653H19.0675V19.0676H4.93225Z"
        fill="currentColor"
      />
      <path
        d="M8.19061 13.3034C8.19061 12.999 8.43738 12.7522 8.74179 12.7522C9.0462 12.7522 9.29297 12.999 9.29297 13.3034V15.2583C9.29297 15.5627 9.0462 15.8095 8.74179 15.8095C8.43738 15.8095 8.19061 15.5627 8.19061 15.2583V13.3034Z"
        fill="currentColor"
      />
      <path
        d="M11.449 13.9549C11.449 13.6505 11.6958 13.4037 12.0002 13.4037C12.3046 13.4037 12.5514 13.6505 12.5514 13.9549V15.9098C12.5514 16.2142 12.3046 16.461 12.0002 16.461C11.6958 16.461 11.449 16.2142 11.449 15.9098V13.9549Z"
        fill="currentColor"
      />
      <path
        d="M14.7072 13.3034C14.7072 12.999 14.9539 12.7522 15.2583 12.7522C15.5627 12.7522 15.8095 12.999 15.8095 13.3034V15.2583C15.8095 15.5627 15.5627 15.8095 15.2583 15.8095C14.9539 15.8095 14.7072 15.5627 14.7072 15.2583V13.3034Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FishIcon({ className }: { className?: string }) {
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
        d="M20.9625 3.3075C20.923 3.1795 20.8225 3.0795 20.6935 3.0415C20.4895 2.9805 15.7 1.5995 11.938 3.486C10.215 2.839 7.7255 2.899 6.327 4.297C6.231 4.393 6.1905 4.531 6.219 4.6635C6.2475 4.7965 6.341 4.9055 6.468 4.954C7.3465 5.2875 8.0995 5.897 8.6095 6.6825C6.3705 10.3575 6.9235 14.579 7.189 15.9565L2.831 16.4375C2.678 16.454 2.5485 16.557 2.4975 16.7025C2.4465 16.8475 2.4835 17.0085 2.592 17.1175L6.857 21.3825C6.9335 21.4595 7.0355 21.5 7.14 21.5C7.1845 21.5 7.229 21.4925 7.2725 21.4775C7.4175 21.4265 7.5205 21.2975 7.5375 21.1445L8.023 16.7955C8.582 16.9045 9.6135 17.0625 10.8855 17.0625C13.301 17.0625 16.584 16.491 19.1485 13.927C22.989 10.0815 21.047 3.5825 20.9625 3.3075ZM6.8345 20.229L3.7465 17.141L7.222 16.7575L6.8345 20.229ZM18.5825 13.3625C14.837 17.107 9.223 16.2205 8.0105 15.975C7.7955 14.918 7.095 10.511 9.4165 6.902C9.4975 6.7765 9.5015 6.616 9.427 6.486C8.9395 5.639 8.221 4.946 7.366 4.4865C8.536 3.7425 10.3095 3.7475 11.618 4.229C12.0615 6.586 12.8895 8.281 14.2865 9.6775C15.654 11.1005 17.3715 12.071 19.2785 12.518C19.072 12.8105 18.848 13.0965 18.5825 13.3625ZM19.7225 11.795C17.861 11.4135 16.1845 10.4975 14.858 9.117C13.59 7.8495 12.8335 6.303 12.418 4.1505C15.4565 2.699 19.318 3.518 20.2555 3.753C20.502 4.705 21.371 8.69 19.7225 11.795ZM17.415 5.615C17.415 6.1555 16.9755 6.595 16.435 6.595C15.8945 6.595 15.455 6.1555 15.455 5.615C15.455 5.0745 15.8945 4.635 16.435 4.635C16.9755 4.635 17.415 5.0745 17.415 5.615Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NewItemModal({
  open,
  onClose,
  onAdd,
  editingItem,
  onSave,
  initialSection,
  initialItemCategory,
  storedRecipes,
  onSaveRecipeToLibrary,
  onApplyRecipeToList,
  isMasterList = false,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    quantity: string;
    section: string;
    itemCategory?: string;
  }) => void;
  editingItem?: ListItem | null;
  onSave?: (item: ListItem) => void;
  initialSection?: string | null;
  /** Bij groepering “per categorie”: vooringestelde winkel-categorie voor het nieuwe item. */
  initialItemCategory?: string | null;
  storedRecipes: SavedRecipe[];
  onSaveRecipeToLibrary: (recipe: SavedRecipe) => void;
  onApplyRecipeToList: (items: ListItem[]) => void;
  isMasterList?: boolean;
}) {
  const isEditMode = editingItem != null;
  const [selectedDay, setSelectedDay] = React.useState("Geen");
  const [activeTab, setActiveTab] = React.useState<"first" | "second">("first");
  const [itemName, setItemName] = React.useState("");
  const [stepperValue, setStepperValue] = React.useState(1);
  const [quantityDesc, setQuantityDesc] = React.useState("stuk");
  const [recipeSearch, setRecipeSearch] = React.useState("");
  const [showRecipeForm, setShowRecipeForm] = React.useState(false);
  const [editingLibraryRecipeId, setEditingLibraryRecipeId] = React.useState<
    string | null
  >(null);

  const [recipeName, setRecipeName] = React.useState("");
  const [recipeLink, setRecipeLink] = React.useState("");
  const [recipePersons, setRecipePersons] = React.useState(2);
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);

  const [ingredientSlideOpen, setIngredientSlideOpen] = React.useState(false);
  const [editingIngredientId, setEditingIngredientId] = React.useState<
    string | null
  >(null);

  const canAdd = itemName.trim().length > 0;
  const canSaveRecipe = recipeName.trim().length > 0;
  const masterItemFormOnly = isMasterList && !showRecipeForm;

  const filteredRecipes = React.useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    if (!q) return storedRecipes;
    return storedRecipes.filter((r) =>
      r.name.toLowerCase().includes(q),
    );
  }, [storedRecipes, recipeSearch]);

  React.useEffect(() => {
    if (!open) {
      setSelectedDay("Geen");
      setActiveTab("first");
      setItemName("");
      setStepperValue(1);
      setQuantityDesc("stuk");
      setRecipeSearch("");
      setShowRecipeForm(false);
      setEditingLibraryRecipeId(null);
      setRecipeName("");
      setRecipeLink("");
      setRecipePersons(2);
      setIngredients([]);
      setIngredientSlideOpen(false);
      setEditingIngredientId(null);
    } else if (editingItem) {
      setItemName(editingItem.name);
      const { stepperValue: sv, quantityDesc: qd } =
        parseRecipeIngredientQuantity(editingItem.quantity);
      setStepperValue(sv);
      setQuantityDesc(qd);
      setSelectedDay(
        editingItem.section === "Algemeen" ? "Geen" : editingItem.section
      );
      setActiveTab("first");
    } else if (initialSection) {
      setSelectedDay(
        initialSection === "Algemeen" ? "Geen" : initialSection
      );
      setActiveTab("first");
    } else if (initialItemCategory) {
      setSelectedDay("Geen");
      setActiveTab("first");
    }
  }, [open, editingItem, initialSection, initialItemCategory]);

  const handleAdd = () => {
    if (!canAdd && !isEditMode) return;
    const section = selectedDay === "Geen" ? "Algemeen" : selectedDay;
    const qty = `${stepperValue} ${quantityDesc}`;
    const itemCategory =
      initialItemCategory && initialItemCategory.trim().length > 0
        ? initialItemCategory.trim()
        : resolveItemCategoryFromName(itemName.trim());
    if (isEditMode && editingItem && onSave) {
      onSave({
        ...editingItem,
        name: itemName.trim(),
        quantity: qty,
        section,
        itemCategory: resolveItemCategoryFromName(itemName.trim()),
      });
    } else {
      onAdd({
        name: itemName.trim(),
        quantity: qty,
        section,
        itemCategory,
      });
    }
    onClose();
  };

  const closeRecipeFormPanel = React.useCallback(() => {
    setShowRecipeForm(false);
    setEditingLibraryRecipeId(null);
    setRecipeName("");
    setRecipeLink("");
    setRecipePersons(2);
    setIngredients([]);
    setIngredientSlideOpen(false);
    setEditingIngredientId(null);
  }, []);

  const openNewRecipeForm = React.useCallback(() => {
    setEditingLibraryRecipeId(null);
    setRecipeName("");
    setRecipeLink("");
    setRecipePersons(2);
    setIngredients([]);
    setShowRecipeForm(true);
  }, []);

  const openRecipeForEdit = React.useCallback((recipe: SavedRecipe) => {
    setEditingLibraryRecipeId(recipe.id);
    setRecipeName(recipe.name);
    setRecipeLink(recipe.link);
    setRecipePersons(recipe.persons);
    setIngredients(recipe.ingredients.map((i) => ({ ...i })));
    setShowRecipeForm(true);
  }, []);

  const handleSaveRecipe = () => {
    if (!canSaveRecipe) return;
    onSaveRecipeToLibrary({
      id: editingLibraryRecipeId ?? `recipe-${Date.now()}`,
      name: recipeName.trim(),
      link: recipeLink.trim(),
      persons: recipePersons,
      ingredients: ingredients.map((i) => ({ ...i })),
    });
    closeRecipeFormPanel();
  };

  const handleSelectRecipe = React.useCallback(
    (recipe: SavedRecipe) => {
      const section = selectedDay === "Geen" ? "Algemeen" : selectedDay;
      const ts = Date.now();
      const recipeGroupId = `recipe-${recipe.id}-${ts}`;
      const link = recipe.link.trim();
      const newItems: ListItem[] = recipe.ingredients.map((ing, i) => ({
        id: `from-recipe-${recipe.id}-${ts}-${i}`,
        name: ing.name,
        quantity: ing.quantity,
        checked: false,
        section,
        itemCategory: resolveItemCategoryFromName(ing.name),
        recipeGroupId,
        recipeName: recipe.name.trim(),
        recipeLink: link.length > 0 ? link : undefined,
      }));
      onApplyRecipeToList(newItems);
    },
    [selectedDay, onApplyRecipeToList],
  );

  const handleDeleteIngredient = React.useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const closeIngredientForm = React.useCallback(() => {
    setIngredientSlideOpen(false);
    setEditingIngredientId(null);
  }, []);

  const openIngredientFormAdd = React.useCallback(() => {
    setEditingIngredientId(null);
    setIngredientSlideOpen(true);
  }, []);

  const openIngredientFormEdit = React.useCallback(
    (id: string) => {
      const ing = ingredients.find((i) => i.id === id);
      if (!ing) return;
      setEditingIngredientId(id);
      setIngredientSlideOpen(true);
    },
    [ingredients],
  );

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
            id: `ing-${Date.now()}`,
            name: draft.name,
            quantity: draft.quantity,
          },
        ]);
      }
    },
    [],
  );

  const ingredientSlideInitial = editingIngredientId
    ? ingredients.find((i) => i.id === editingIngredientId) ?? null
    : null;

  const modalTitle = showRecipeForm
    ? editingLibraryRecipeId
      ? "Recept wijzigen"
      : "Recept toevoegen"
    : isEditMode
      ? "Wijzig item(s)"
      : "Item(s) toevoegen";

  const itemFooter =
    isEditMode || activeTab === "first" || masterItemFormOnly ? (
      <Button
        variant="primary"
        disabled={!isEditMode && !canAdd}
        onClick={handleAdd}
      >
        {isEditMode ? "Bewaren" : "Toevoegen"}
      </Button>
    ) : undefined;

  const recipeFooter = (
    <Button
      variant="primary"
      disabled={!canSaveRecipe}
      onClick={handleSaveRecipe}
    >
      Bewaren
    </Button>
  );

  return (
    <>
    <SlideInModal
      open={open}
      onClose={onClose}
      title={modalTitle}
      onBack={showRecipeForm ? closeRecipeFormPanel : undefined}
      footer={showRecipeForm ? recipeFooter : itemFooter}
      disableEscapeClose={ingredientSlideOpen}
      bodyFullWidth={!masterItemFormOnly}
      className={!masterItemFormOnly ? "h-[calc(100dvh-48px)]" : undefined}
    >
      <div className="overflow-hidden">
        <div
          className="relative flex w-full"
          style={{
            transform: showRecipeForm ? "translateX(-100%)" : "translateX(0)",
            transition: SLIDE_TRANSITION,
          }}
        >
          {/* Panel 1: Item form */}
          <div className="relative z-[1] w-full shrink-0">
            <div className="mx-auto w-full max-w-[768px] px-4">
              <div
                className={cn(
                  "flex flex-col",
                  masterItemFormOnly ? "gap-4" : "gap-6",
                )}
              >
              {!isMasterList ? (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                      Dag
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {DAY_OPTIONS.map((day) => (
                        <ToggleButton
                          key={day.value}
                          variant={
                            selectedDay === day.value ? "active" : "inactive"
                          }
                          className="w-full"
                          onClick={() => {
                            setSelectedDay(day.value);
                            if (day.value === "Geen") setActiveTab("first");
                          }}
                        >
                          {day.label}
                        </ToggleButton>
                      ))}
                    </div>
                  </div>

                  {!isEditMode && (
                    <PillTab
                      value={activeTab}
                      onValueChange={setActiveTab}
                      labelFirst="item"
                      labelSecond="recept"
                    />
                  )}
                </>
              ) : null}

              {(isEditMode || activeTab === "first" || isMasterList) && (
                <div
                  className={cn(
                    "flex flex-col",
                    masterItemFormOnly ? "gap-4" : "gap-6",
                  )}
                >
                  <ItemNameAutocomplete
                    label="Naam item"
                    placeholder="Naam item"
                    value={itemName}
                    onChange={setItemName}
                  />
                  <div className="flex flex-col gap-2">
                    <Stepper
                      label="Hoeveelheid"
                      value={stepperValue}
                      onValueChange={setStepperValue}
                      min={1}
                    />
                    <InputField
                      value={quantityDesc}
                      className="text-center"
                      onFocus={(e) => {
                        const input = e.target;
                        requestAnimationFrame(() => input.select());
                      }}
                      onChange={(e) => setQuantityDesc(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {!isMasterList && !isEditMode && activeTab === "second" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-[12px]">
                      <ChefHatIcon className="size-6 shrink-0 text-[var(--text-primary)]" />
                      <h3 className="min-w-0 text-section-title font-bold leading-24 tracking-normal text-[var(--text-primary)]">
                        Jouw recepten
                      </h3>
                    </div>
                    {storedRecipes.length > 0 && (
                      <button
                        type="button"
                        aria-label="Recept toevoegen"
                        onClick={openNewRecipeForm}
                        className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      >
                        <PlusCircleIcon />
                      </button>
                    )}
                  </div>
                  {storedRecipes.length > 0 ? (
                    <SearchBar
                      placeholder="Zoek recept"
                      value={recipeSearch}
                      onValueChange={setRecipeSearch}
                    />
                  ) : null}
                  {storedRecipes.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                        Je hebt nog geen recepten toegevoegd
                      </p>
                      <MiniButton
                        variant="primary"
                        onClick={openNewRecipeForm}
                      >
                        Voeg recept toe
                      </MiniButton>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredRecipes.length === 0 ? (
                        <p className="py-4 text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                          Geen recepten gevonden
                        </p>
                      ) : (
                        filteredRecipes.map((r) => {
                          const n = r.ingredients.length;
                          const itemCount =
                            n === 1 ? "1 item" : `${n} items`;
                          return (
                            <RecipeTile
                              key={r.id}
                              recipeName={r.name}
                              itemCount={itemCount}
                              photoUrl={r.photoUrl ?? undefined}
                              onEdit={() => openRecipeForEdit(r)}
                              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                              role="button"
                              tabIndex={0}
                              onClick={() => handleSelectRecipe(r)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleSelectRecipe(r);
                                }
                              }}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Panel 2 */}
          <div
            className={cn(
              "w-full shrink-0",
              !showRecipeForm &&
                "pointer-events-none absolute left-full top-0 z-0 w-full min-w-0",
            )}
          >
            <div className="mx-auto w-full max-w-[768px] px-4">
              <div className="flex flex-col">
              <div className="flex flex-col gap-6">
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
              </div>

              <div className="mt-[48px] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-[12px]">
                    <FishIcon className="size-6 shrink-0 text-[var(--text-primary)]" />
                    <h3 className="min-w-0 text-section-title font-bold leading-24 tracking-normal text-[var(--text-primary)]">
                      Ingrediënten
                    </h3>
                  </div>
                  {ingredients.length > 0 && (
                    <button
                      type="button"
                      aria-label="Ingrediënt toevoegen"
                      onClick={openIngredientFormAdd}
                      className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <PlusCircleIcon />
                    </button>
                  )}
                </div>

                {ingredients.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                      Je hebt nog geen ingrediënten toegevoegd
                    </p>
                    <MiniButton
                      variant="primary"
                      onClick={openIngredientFormAdd}
                    >
                      Voeg ingrediënt toe
                    </MiniButton>
                  </div>
                ) : (
                  <RecipeIngredientSortableList
                    ingredients={ingredients}
                    onDragEndReorder={(reordered) => setIngredients(reordered)}
                    onDelete={handleDeleteIngredient}
                    onEdit={openIngredientFormEdit}
                  />
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideInModal>

    <RecipeIngredientFormSlideIn
      open={ingredientSlideOpen}
      onClose={closeIngredientForm}
      initial={ingredientSlideInitial}
      onSubmit={handleIngredientFormSubmit}
      titleId="ingredient-form-slide-title"
      containerClassName="z-[60]"
      slideClassName={!masterItemFormOnly ? "h-[calc(100dvh-48px)]" : undefined}
    />
    </>
  );
}
