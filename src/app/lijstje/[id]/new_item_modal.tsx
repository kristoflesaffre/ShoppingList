"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { ToggleButton } from "@/components/ui/toggle_button";
import { InputField } from "@/components/ui/input_field";
import { ItemNameAutocomplete, useIsSmallScreen } from "@/components/ui/item_name_autocomplete";
import { ItemNameSearchSlideIn } from "@/components/ui/item_name_search_slide_in";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search_bar";
import { RecipeTile } from "@/components/ui/recipe_tile";
import { MiniButton } from "@/components/ui/mini_button";
import { PlusCircleMaskIcon } from "@/components/ui/plus_circle_mask_icon";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { resolveItemCategoryFromName } from "@/lib/item-ingredient-category";
import { parseRecipeIngredientQuantity } from "@/lib/recipe_ingredient_quantity";
import {
  DEFAULT_TRIP_PERSON_TAB,
  TRIP_PERSON_TABS,
  normalizeTripPerson,
  type TripPersonTab,
} from "@/lib/trip-person";
import type { RecipeIngredient, SavedRecipe, RecipeCategory } from "@/lib/recipe_library";
import { RECIPE_CATEGORIES } from "@/lib/recipe_library";
import type { RecipeIngredientFormDraft } from "@/components/recipe_ingredient_form_slide_in";
import {
  resolveVacationCategoryFromName,
  VACATION_CATEGORIES,
} from "@/lib/vacation-categories";
import { isVacationSlugAllowedForEmail, getVacationDefaultSlugsForPerson } from "@/lib/vacation-default-items";
import { useItemPhotoUrl, useVacationItemSlugs } from "@/lib/item-photos";
import { MASTER_STORE_OPTIONS } from "@/lib/master-stores";
import { addDays, dutchDayToOffset, getMondayOfWeek, parseDutchDate } from "@/lib/calendar-utils";

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
  /** Sorteervolgorde binnen de lijst (InstantDB). */
  order?: number;
  /** Supermarkt-categorie; ontbreekt → afgeleid uit naam. */
  itemCategory?: string;
  claimedByInstantUserId?: string;
  claimedByDisplayName?: string;
  recipeGroupId?: string;
  recipeName?: string;
  recipeLink?: string;
  /** Toegevoegd vanuit diepvriesvoorraad — niet-klikbaar, doorgestreept weergegeven. */
  fromStock?: boolean;
  /** Foto-URL van het diepvriesitem (recipePhotoUrl), voor weergave in de lijst. */
  stockPhotoUrl?: string;
  /** Absolute datum "YYYY-MM-DD" waarop dit item gepland staat (alleen voor dagnaam-secties). */
  itemDate?: string;
  /** Landal/vakantie: wie het item betreft. */
  tripPerson?: TripPersonTab;
};

type Ingredient = RecipeIngredient;
type AddSourceFilter = "all" | "items" | "recipes" | "stock";
type BatchEntry =
  | {
      id: string;
      kind: "item";
      item: ListItem;
    }
  | {
      id: string;
      kind: "recipe";
      recipeName: string;
      photoUrl?: string;
      items: ListItem[];
    };

const BASE_SOURCE_FILTERS: ReadonlyArray<{
  value: AddSourceFilter;
  label: string;
}> = [
  { value: "all", label: "Alles" },
  { value: "items", label: "Producten" },
  { value: "recipes", label: "Recepten" },
];

const STOCK_SOURCE_FILTER = {
  value: "stock" as const,
  label: "Voorraad",
};

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

/** «2 stuk» → «2 stuks» en omgekeerd; andere eenheden blijven ongewijzigd. */
function quantityWithCount(quantity: string, count: number): string {
  const { quantityDesc } = parseRecipeIngredientQuantity(quantity);
  const unit =
    quantityDesc === "stuk" || quantityDesc === "stuks" ? (count === 1 ? "stuk" : "stuks") : quantityDesc;
  return `${count} ${unit}`.trim();
}

const DAY_SHORT: Record<string, string> = {
  Maandag: "MA",
  Dinsdag: "DI",
  Woensdag: "WO",
  Donderdag: "DO",
  Vrijdag: "VR",
  Zaterdag: "ZA",
  Zondag: "ZO",
};

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  );
}

/** − / aantal / + na selectie (zelfde patroon als «toevoegen uit favorieten»); bij 1 een vuilbakje. */
function BatchCountStepper({
  name,
  count,
  onChange,
}: {
  name: string;
  count: number;
  onChange: (next: number) => void;
}) {
  const btn =
    "flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--white)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)]";
  return (
    <span className="inline-flex h-[34px] shrink-0 items-center gap-0.5 rounded-pill bg-[var(--blue-500)] px-[3px]">
      <button
        type="button"
        onClick={() => onChange(count - 1)}
        aria-label={count === 1 ? `${name} verwijderen uit selectie` : `Minder ${name}`}
        className={cn(btn, count === 1 ? "text-[var(--error-400)]" : "text-[var(--blue-500)]")}
      >
        {count === 1 ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
            <path d="M6 12h12" />
          </svg>
        )}
      </button>
      <span className="min-w-[22px] text-center text-sm font-bold tabular-nums text-white" aria-live="polite">
        {count}
      </span>
      <button type="button" onClick={() => onChange(count + 1)} aria-label={`Meer ${name}`} className={cn(btn, "text-[var(--blue-500)]")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </span>
  );
}

function createBatchId(prefix: "item" | "recipe"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSideDishRecipe(recipe: SavedRecipe): boolean {
  return recipe.category === "bijgerecht";
}

/** Bijgerechten blijven in de add-sheet zodat je erna nog items (bv. vlees) kunt kiezen. */
function shouldQueueRecipeInBatch(
  recipe: SavedRecipe,
  batchMode: boolean,
  hasBatchEntries: boolean,
): boolean {
  if (!batchMode) return false;
  return hasBatchEntries || isSideDishRecipe(recipe);
}

function BatchTrashIcon() {
  return (
    <span
      aria-hidden
      className="inline-block size-6 bg-current"
      style={{
        WebkitMaskImage: 'url("/icons/recycle_bin.svg")',
        maskImage: 'url("/icons/recycle_bin.svg")',
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
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
  isVacationList = false,
  initialTripPerson,
  groupingMode = "day",
  listDateStr = "",
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    quantity: string;
    section: string;
    itemCategory?: string;
    fromStock?: boolean;
    stockPhotoUrl?: string;
    tripPerson?: TripPersonTab;
  }) => void;
  editingItem?: ListItem | null;
  onSave?: (item: ListItem) => void;
  initialSection?: string | null;
  /** Bij groepering "per categorie": vooringestelde winkel-categorie voor het nieuwe item. */
  initialItemCategory?: string | null;
  storedRecipes: SavedRecipe[];
  onSaveRecipeToLibrary: (recipe: SavedRecipe) => void;
  onApplyRecipeToList: (items: ListItem[]) => void;
  isMasterList?: boolean;
  /** Landal/Vakantie-lijstje: verbergt dag + recept, toont vakantiecategorie-dropdown. */
  isVacationList?: boolean;
  /** Vooringestelde "Wie"-waarde op basis van de actieve persoonstab. */
  initialTripPerson?: TripPersonTab;
  /** Groeperingsmodus van het lijstje: bepaalt of dag- of winkel-selector getoond wordt. */
  groupingMode?: "day" | "category";
  /** Datum van het lijstje (dd-mm-jjjj): voor de datum op de dagkaartjes. */
  listDateStr?: string;
}) {
  const isEditMode = editingItem != null;
  const isSmall = useIsSmallScreen();
  const [nameSearchOpen, setNameSearchOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState("Geen");
  const [vacationCategory, setVacationCategory] = React.useState<string>("Andere");
  const [tripPerson, setTripPerson] =
    React.useState<TripPersonTab>(DEFAULT_TRIP_PERSON_TAB);
  const [sourceFilter, setSourceFilter] =
    React.useState<AddSourceFilter>("all");
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);
  const [freezerSearch, setFreezerSearch] = React.useState("");
  const [itemSearchQuery, setItemSearchQuery] = React.useState("");
  const [itemName, setItemName] = React.useState("");
  const [stepperValue, setStepperValue] = React.useState(1);
  const [quantityDesc, setQuantityDesc] = React.useState("stuk");
  const [batchEntries, setBatchEntries] = React.useState<BatchEntry[]>([]);
  const [editingBatchEntryId, setEditingBatchEntryId] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<RecipeCategory | null>(null);
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
  // ItemNameSearchSlideIn calls onClose after onSelect — guard with ref to avoid closing the main modal.
  const nameSearchSelectedRef = React.useRef(false);
  const canSaveRecipe = recipeName.trim().length > 0;
  const masterItemFormOnly = isMasterList && !showRecipeForm;
  const daySelected = selectedDay !== "Geen";
  const batchMode =
    !isEditMode &&
    !isMasterList &&
    !isVacationList &&
    groupingMode !== "category";
  const getItemPhotoUrl = useItemPhotoUrl(160);

  /** Datum per dag (zelfde logica als de dagkaarten op het lijstje). */
  const dayDates = React.useMemo(() => {
    const out = new Map<string, number>();
    const listDate = parseDutchDate(listDateStr);
    if (!listDate) return out;
    for (const day of DAY_OPTIONS) {
      const offset = dutchDayToOffset(day.value);
      if (offset === null) continue;
      let date = addDays(getMondayOfWeek(listDate), offset);
      if (date < listDate) date = addDays(date, 7);
      out.set(day.value, date.getDate());
    }
    return out;
  }, [listDateStr]);

  // Diepvriesvoorraad — only query when a day is selected and we're not in edit/master mode
  const { data: freezerData } = db.useQuery(
    open && daySelected && !isEditMode && !isMasterList
      ? { freezerItems: {} }
      : null,
  );
  const { user: authUser } = db.useAuth();
  const allVacationSlugs = useVacationItemSlugs();
  const vacationSearchSlugs = React.useMemo((): string[] | undefined => {
    if (!isVacationList) return undefined;
    const email = authUser?.email ?? undefined;
    if (tripPerson === "Samen") {
      return allVacationSlugs.filter((slug) => isVacationSlugAllowedForEmail(slug, email));
    }
    return getVacationDefaultSlugsForPerson(tripPerson, email) ?? undefined;
  }, [isVacationList, tripPerson, allVacationSlugs, authUser?.email]);

  const allFreezerItems = React.useMemo(() => {
    if (!freezerData?.freezerItems) return [];
    const userId = authUser?.id;
    return (freezerData.freezerItems as Array<{
      id: string;
      type?: string;
      name?: string;
      quantityPerPackage?: number;
      unit?: string;
      packages?: number;
      ownerId?: string;
      recipePhotoUrl?: string;
      recipePersons?: number;
      order?: number;
    }>)
      .filter((it) => it.name && (!it.ownerId || it.ownerId === userId))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [freezerData, authUser?.id]);

  const filteredFreezerItems = React.useMemo(() => {
    const q = freezerSearch.trim().toLowerCase();
    if (!q) return allFreezerItems;
    return allFreezerItems.filter((it) =>
      (it.name ?? "").toLowerCase().includes(q),
    );
  }, [allFreezerItems, freezerSearch]);

  const filteredRecipes = React.useMemo(() => {
    let result = storedRecipes;
    const q = itemSearchQuery.trim().toLowerCase();
    if (q) result = result.filter((r) => r.name.toLowerCase().includes(q));
    if (!q && activeCategory) {
      result = result.filter((r) => r.category === activeCategory);
    }
    return result;
  }, [storedRecipes, itemSearchQuery, activeCategory]);

  const usedCategoryIds = React.useMemo(
    () => new Set(storedRecipes.map((r) => r.category).filter(Boolean)),
    [storedRecipes],
  );
  const visibleCategories = RECIPE_CATEGORIES.filter((c) => usedCategoryIds.has(c.id));

  React.useEffect(() => {
    if (!open) {
      setSelectedDay("Geen");
      setVacationCategory("Andere");
      setTripPerson(DEFAULT_TRIP_PERSON_TAB);
      setSelectedStore(null);
      setSourceFilter("all");
      setItemSearchQuery("");
      setItemName("");
      setStepperValue(1);
      setQuantityDesc("stuk");
      setBatchEntries([]);
      setEditingBatchEntryId(null);
      setFreezerSearch("");
      setActiveCategory(null);
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
      setSourceFilter("items");
      if (isVacationList && editingItem.itemCategory) {
        setVacationCategory(
          (VACATION_CATEGORIES as readonly string[]).includes(editingItem.itemCategory)
            ? editingItem.itemCategory
            : "Andere",
        );
      }
      if (isVacationList) {
        setTripPerson(normalizeTripPerson(editingItem.tripPerson));
      }
    } else if (initialSection) {
      setSelectedDay(
        initialSection === "Algemeen" ? "Geen" : initialSection
      );
      setSourceFilter("all");
      if (isVacationList) {
        if (initialItemCategory) {
          setVacationCategory(
            (VACATION_CATEGORIES as readonly string[]).includes(initialItemCategory)
              ? initialItemCategory
              : "Andere",
          );
        }
        if (initialTripPerson) {
          setTripPerson(initialTripPerson);
        }
      }
    } else if (initialItemCategory) {
      setSelectedDay("Geen");
      setSourceFilter("all");
      if (isVacationList) {
        setVacationCategory(
          (VACATION_CATEGORIES as readonly string[]).includes(initialItemCategory)
            ? initialItemCategory
            : "Andere",
        );
        if (initialTripPerson) {
          setTripPerson(initialTripPerson);
        }
      }
    } else if (open && isVacationList && initialTripPerson) {
      setTripPerson(initialTripPerson);
    }
  }, [open, editingItem, initialSection, initialItemCategory, isVacationList, initialTripPerson]);

  React.useEffect(() => {
    if (open) setActiveCategory(null);
  }, [open]);

  React.useEffect(() => {
    if (!open || !isVacationList || isEditMode || initialItemCategory != null) return;
    const trimmed = itemName.trim();
    if (!trimmed) return;
    setVacationCategory(resolveVacationCategoryFromName(trimmed));
  }, [open, isVacationList, isEditMode, itemName, initialItemCategory]);

  React.useEffect(() => {
    if (open && isVacationList && !isEditMode && isSmall) {
      setNameSearchOpen(true);
    } else if (!open) {
      setNameSearchOpen(false);
    }
  }, [open, isVacationList, isEditMode, isSmall]);

  const handleAdd = () => {
    if (!canAdd && !isEditMode) return;
    const section = selectedStore
      ? selectedStore
      : selectedDay === "Geen" ? "Algemeen" : selectedDay;
    const qty = `${stepperValue} ${quantityDesc}`;
    const itemCategory = isVacationList
      ? vacationCategory
      : initialItemCategory && initialItemCategory.trim().length > 0
        ? initialItemCategory.trim()
        : resolveItemCategoryFromName(itemName.trim());
    const isPreDeparture = isVacationList && vacationCategory === "Te regelen";
    const vacationSection = isPreDeparture ? "Voor vertrek" : "Algemeen";
    if (isEditMode && editingItem && onSave) {
      onSave({
        ...editingItem,
        name: itemName.trim(),
        quantity: qty,
        section: isVacationList ? vacationSection : section,
        itemCategory: isVacationList ? vacationCategory : resolveItemCategoryFromName(itemName.trim()),
        ...(isVacationList && !isPreDeparture ? { tripPerson: normalizeTripPerson(tripPerson) } : {}),
      });
    } else {
      onAdd({
        name: itemName.trim(),
        quantity: qty,
        section: isVacationList ? vacationSection : section,
        itemCategory,
        ...(isVacationList && !isPreDeparture ? { tripPerson: normalizeTripPerson(tripPerson) } : {}),
      });
    }
    onClose();
  };

  const resetActiveBatchItem = React.useCallback(() => {
    setItemSearchQuery("");
    setItemName("");
    setStepperValue(1);
    setQuantityDesc("stuk");
    setEditingBatchEntryId(null);
  }, []);

  /** Bouwt het item dat momenteel in de batch-editor staat (of null als er geen is). */
  const buildActiveBatchEntry = React.useCallback((): BatchEntry | null => {
    const name = itemName.trim();
    if (!batchMode || !name) return null;

    const section = selectedDay === "Geen" ? "Algemeen" : selectedDay;
    const entryId = editingBatchEntryId ?? createBatchId("item");
    return {
      id: entryId,
      kind: "item",
      item: {
        id: `draft-${entryId}`,
        name,
        quantity: `${stepperValue} ${quantityDesc}`.trim(),
        checked: false,
        section,
        itemCategory: resolveItemCategoryFromName(name),
      },
    };
  }, [batchMode, editingBatchEntryId, itemName, quantityDesc, selectedDay, stepperValue]);

  const mergeBatchEntry = React.useCallback(
    (previous: BatchEntry[], nextEntry: BatchEntry): BatchEntry[] =>
      editingBatchEntryId
        ? previous.map((entry) =>
            entry.id === editingBatchEntryId ? nextEntry : entry,
          )
        : [...previous, nextEntry],
    [editingBatchEntryId],
  );

  const handleCompleteBatchItem = React.useCallback(() => {
    const nextEntry = buildActiveBatchEntry();
    if (!nextEntry) return;
    setBatchEntries((previous) => mergeBatchEntry(previous, nextEntry));
    resetActiveBatchItem();
  }, [buildActiveBatchEntry, mergeBatchEntry, resetActiveBatchItem]);

  const handleEditBatchItem = React.useCallback((entry: BatchEntry) => {
    if (entry.kind !== "item") return;
    const parsedQuantity = parseRecipeIngredientQuantity(entry.item.quantity);
    setSourceFilter("items");
    setItemSearchQuery("");
    setItemName(entry.item.name);
    setStepperValue(parsedQuantity.stepperValue);
    setQuantityDesc(parsedQuantity.quantityDesc);
    setSelectedDay(
      entry.item.section === "Algemeen" ? "Geen" : entry.item.section,
    );
    setEditingBatchEntryId(entry.id);
  }, []);

  const handleDeleteBatchEntry = React.useCallback(
    (entryId: string) => {
      setBatchEntries((previous) =>
        previous.filter((entry) => entry.id !== entryId),
      );
      if (editingBatchEntryId === entryId) resetActiveBatchItem();
    },
    [editingBatchEntryId, resetActiveBatchItem],
  );

  /** Gekozen in de zoeklijst: meteen in de selectie (1 stuk), of +1 als het er al in staat. */
  const addBatchItem = React.useCallback(
    (rawName: string) => {
      const name = rawName.trim();
      if (!name) return;
      setBatchEntries((previous) => {
        const existing = previous.find(
          (entry) => entry.kind === "item" && entry.item.name.trim().toLowerCase() === name.toLowerCase(),
        );
        if (existing && existing.kind === "item") {
          const count = parseRecipeIngredientQuantity(existing.item.quantity).stepperValue + 1;
          return previous.map((entry) =>
            entry.id === existing.id && entry.kind === "item"
              ? { ...entry, item: { ...entry.item, quantity: quantityWithCount(entry.item.quantity, count) } }
              : entry,
          );
        }
        const entryId = createBatchId("item");
        return [
          ...previous,
          {
            id: entryId,
            kind: "item",
            item: {
              id: `draft-${entryId}`,
              name,
              quantity: "1 stuk",
              checked: false,
              section: selectedDay === "Geen" ? "Algemeen" : selectedDay,
              itemCategory: resolveItemCategoryFromName(name),
            },
          },
        ];
      });
    },
    [selectedDay],
  );

  const setBatchItemCount = React.useCallback((entryId: string, count: number) => {
    setBatchEntries((previous) =>
      count <= 0
        ? previous.filter((entry) => entry.id !== entryId)
        : previous.map((entry) =>
            entry.id === entryId && entry.kind === "item"
              ? { ...entry, item: { ...entry.item, quantity: quantityWithCount(entry.item.quantity, count) } }
              : entry,
          ),
    );
  }, []);

  /** Item dat nog in de editor staat telt mee bij de footer-CTA, zodat "Klaar" optioneel is. */
  const hasPendingBatchItem = batchMode && itemName.trim().length > 0;
  const effectiveBatchCount =
    batchEntries.length + (hasPendingBatchItem && !editingBatchEntryId ? 1 : 0);

  const handleSubmitBatch = React.useCallback(() => {
    const pending = buildActiveBatchEntry();
    const entries = pending ? mergeBatchEntry(batchEntries, pending) : batchEntries;
    if (entries.length === 0) return;
    const section = selectedDay === "Geen" ? "Algemeen" : selectedDay;
    const itemsToAdd = entries
      .flatMap((entry) => (entry.kind === "item" ? [entry.item] : entry.items))
      .map((item) => ({ ...item, section }));
    onApplyRecipeToList(itemsToAdd);
  }, [batchEntries, buildActiveBatchEntry, mergeBatchEntry, onApplyRecipeToList, selectedDay]);

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

  // Auto-pluralize "stuk" ↔ "stuks" based on quantity
  React.useEffect(() => {
    setQuantityDesc((prev) => {
      if (prev === "stuk" && stepperValue >= 2) return "stuks";
      if (prev === "stuks" && stepperValue === 1) return "stuk";
      return prev;
    });
  }, [stepperValue]);

  const openNewRecipeForm = React.useCallback(() => {
    setEditingLibraryRecipeId(null);
    setRecipeName("");
    setRecipeLink("");
    setRecipePersons(2);
    setIngredients([]);
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

  const enqueueRecipeInBatch = React.useCallback(
    (recipe: SavedRecipe, items: ListItem[]) => {
      const entryId = createBatchId("recipe");
      setBatchEntries((previous) => [
        ...previous,
        {
          id: entryId,
          kind: "recipe",
          recipeName: recipe.name.trim(),
          photoUrl: recipe.photoUrl ?? undefined,
          items,
        },
      ]);
      resetActiveBatchItem();
      if (isSideDishRecipe(recipe)) {
        setSourceFilter("items");
      }
    },
    [resetActiveBatchItem],
  );

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
      if (shouldQueueRecipeInBatch(recipe, batchMode, batchEntries.length > 0)) {
        enqueueRecipeInBatch(recipe, newItems);
        return;
      }
      onApplyRecipeToList(newItems);
    },
    [
      batchEntries.length,
      batchMode,
      enqueueRecipeInBatch,
      onApplyRecipeToList,
      selectedDay,
    ],
  );

  const handleSelectRecipeFromFreezer = React.useCallback(
    (recipe: SavedRecipe) => {
      const section = selectedDay === "Geen" ? "Algemeen" : selectedDay;
      const ts = Date.now();
      const recipeGroupId = `recipe-${recipe.id}-${ts}`;
      const persons = recipe.persons > 0 ? recipe.persons : 1;
      const quantity = persons === 1 ? "1 persoon" : `${persons} personen`;
      const freezerItem: ListItem = {
        id: `from-freezer-recipe-${recipe.id}-${ts}`,
        name: recipe.name.trim(),
        quantity,
        checked: false,
        section,
        itemCategory: resolveItemCategoryFromName(recipe.name),
        recipeGroupId,
        recipeName: recipe.name.trim(),
        recipeLink: recipe.link.trim().length > 0 ? recipe.link.trim() : undefined,
        fromStock: true,
        stockPhotoUrl: recipe.photoUrl ?? undefined,
      };
      if (shouldQueueRecipeInBatch(recipe, batchMode, batchEntries.length > 0)) {
        enqueueRecipeInBatch(recipe, [freezerItem]);
        return;
      }
      onApplyRecipeToList([freezerItem]);
    },
    [
      batchEntries.length,
      batchMode,
      enqueueRecipeInBatch,
      onApplyRecipeToList,
      selectedDay,
    ],
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

  const handleSourceFilterChange = React.useCallback(
    (nextFilter: AddSourceFilter) => {
      if (nextFilter === sourceFilter) return;
      if (nextFilter !== "recipes" && sourceFilter === "recipes" && !batchMode) {
        if (!editingBatchEntryId) setItemName(itemSearchQuery);
      }
      setSourceFilter(nextFilter);
    },
    [batchMode, editingBatchEntryId, itemSearchQuery, sourceFilter],
  );

  const modalTitle = showRecipeForm
    ? editingLibraryRecipeId
      ? "Recept wijzigen"
      : "Recept toevoegen"
    : isEditMode
      ? "Item wijzigen"
      : "Items toevoegen";

  const batchContainsRecipe = batchEntries.some(
    (entry) => entry.kind === "recipe",
  );
  const batchDaySuffix = selectedDay !== "Geen" ? ` op ${selectedDay.toLowerCase()}` : "";
  const batchFooterLabel = batchContainsRecipe
    ? `${effectiveBatchCount} ${effectiveBatchCount === 1 ? "selectie" : "selecties"} toevoegen${batchDaySuffix}`
    : `${effectiveBatchCount} ${effectiveBatchCount === 1 ? "item" : "items"} toevoegen${batchDaySuffix}`;

  const itemFooter = batchMode ? (
    <Button
      variant="primary"
      disabled={effectiveBatchCount === 0}
      onClick={handleSubmitBatch}
    >
      {effectiveBatchCount > 0 ? (
        <span className="inline-flex items-center gap-2">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[rgba(255,255,255,0.22)] px-1.5 text-[13px] tabular-nums">
            {effectiveBatchCount}
          </span>
          {batchFooterLabel}
        </span>
      ) : (
        "Items toevoegen"
      )}
    </Button>
  ) : isEditMode ||
    sourceFilter === "all" ||
    sourceFilter === "items" ||
    masterItemFormOnly ? (
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

  /* Canvas «Items toevoegen 1b»: segmentknop Alles / Producten / Recepten (+ Voorraad bij een dag). */
  const sourceFilterControls =
    !isMasterList &&
    !isVacationList &&
    !isEditMode &&
    groupingMode !== "category" ? (
      <div className="flex rounded-[13px] bg-[var(--gray-50)] p-[3px]" role="group" aria-label="Filter op type">
        {[
          ...BASE_SOURCE_FILTERS,
          ...(daySelected ? [STOCK_SOURCE_FILTER] : []),
        ].map((filter) => {
          const isActive = sourceFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleSourceFilterChange(filter.value)}
              className={cn(
                "flex h-8 min-w-0 flex-1 items-center justify-center rounded-[10px] text-[13.5px] font-semibold transition-[background-color,color,box-shadow] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                isActive
                  ? "bg-[var(--white)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(16,17,48,0.12)]"
                  : "text-[var(--text-secondary)]",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    ) : null;

  const activeBatchItemPhotoUrl = itemName.trim()
    ? getItemPhotoUrl(itemName.trim(), 160)
    : null;
  const activeBatchEditor = batchMode && itemName.trim() ? (
    <section
      key={editingBatchEntryId ?? itemName.trim()}
      className="flex flex-col gap-4 rounded-md bg-[var(--blue-25)] p-4 motion-safe:animate-fade-slide-in"
      aria-label={
        editingBatchEntryId ? `${itemName} wijzigen` : `${itemName} afwerken`
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        {activeBatchItemPhotoUrl ? (
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--white)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokale productfoto met dynamisch gematchte URL */}
            <img
              src={activeBatchItemPhotoUrl}
              alt=""
              width={48}
              height={48}
              className="size-12 object-contain"
              aria-hidden
            />
          </div>
        ) : null}
        <p className="min-w-0 flex-1 truncate text-base font-semibold leading-24 text-[var(--text-primary)]">
          {itemName.trim()}
        </p>
        {/* Secundair: de footer-CTA neemt dit item al mee, "Klaar" is de weg naar een volgend item. */}
        <MiniButton
          variant="secondary"
          className="min-h-11"
          onClick={handleCompleteBatchItem}
        >
          {editingBatchEntryId ? "Bewaren" : "Klaar"}
        </MiniButton>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-normal leading-20 text-[var(--text-primary)]">
          Hoeveelheid
        </span>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(104px,0.45fr)] gap-3">
          <Stepper
            value={stepperValue}
            onValueChange={setStepperValue}
            min={1}
            className="!min-w-0"
          />
          <InputField
            value={quantityDesc}
            aria-label="Eenheid"
            placeholder="Eenheid"
            onFocus={(event) => {
              const input = event.target;
              requestAnimationFrame(() => input.select());
            }}
            onChange={(event) => setQuantityDesc(event.target.value)}
          />
        </div>
      </div>
    </section>
  ) : null;

  /* Canvas «Items toevoegen 1b · gekozen»: selectie met − / + per item; recepten met vuilbakje. */
  const batchQueueControls = batchMode && batchEntries.length > 0 ? (
    <section className="flex flex-col gap-2" aria-labelledby="batch-selection-title">
      <div className="flex items-center justify-between">
        <h3 id="batch-selection-title" className="text-xs font-bold tracking-[0.05em] text-[var(--text-tertiary)]">
          GEKOZEN · {batchEntries.length}
        </h3>
        <button
          type="button"
          onClick={() => setBatchEntries([])}
          className="rounded-sm text-[13px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          Alles wissen
        </button>
      </div>
      <ul className="rounded-[18px] bg-[var(--white)] px-2.5 pb-1 pt-0.5 shadow-[0_0_0_1px_var(--border-subtle)]">
        {batchEntries.map((entry, index) => {
          const isItem = entry.kind === "item";
          const title = isItem ? entry.item.name : entry.recipeName;
          const photo = isItem
            ? entry.item.stockPhotoUrl ?? getItemPhotoUrl(entry.item.name, 160)
            : entry.photoUrl || "/images/ui/recept_320.webp";
          const count = isItem ? parseRecipeIngredientQuantity(entry.item.quantity).stepperValue : 0;
          return (
            <li
              key={entry.id}
              className={cn(
                "flex items-center gap-3 px-1 py-[9px] motion-safe:animate-fade-slide-in",
                index > 0 && "border-t border-[var(--border-subtle)]",
              )}
            >
              {isItem ? (
                <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--blue-25)]" aria-hidden>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- lokale itemfoto
                    <img src={photo} alt="" width={34} height={34} className="size-[34px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" decoding="async" />
                  ) : (
                    <span className="text-base font-bold text-[var(--blue-500)]">{title.trim().charAt(0).toUpperCase()}</span>
                  )}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- receptfoto kan een externe/data-URL zijn
                <img src={photo ?? ""} alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-full object-cover" aria-hidden decoding="async" />
              )}
              <span className="flex min-w-0 flex-1 flex-col leading-[18px]">
                <span className="truncate text-[15px] font-semibold text-[var(--text-primary)] first-letter:uppercase">{title}</span>
                <span className={cn("truncate text-[12.5px]", isItem ? "font-semibold text-[var(--blue-500)]" : "text-[var(--text-tertiary)]")}>
                  {isItem
                    ? entry.item.quantity
                    : `Recept · ${entry.items.length} ${entry.items.length === 1 ? "ingrediënt" : "ingrediënten"}`}
                </span>
              </span>
              {isItem ? (
                <BatchCountStepper name={title} count={count} onChange={(next) => setBatchItemCount(entry.id, next)} />
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeleteBatchEntry(entry.id)}
                  aria-label={`${title} verwijderen uit selectie`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--gray-25)] hover:text-[var(--error-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <BatchTrashIcon />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  ) : null;

  /* Canvas «Items toevoegen 1b · leeg». */
  const batchEmptyHint =
    batchMode && batchEntries.length === 0 ? (
      <div className="flex flex-col items-center px-6 pt-8 text-center">
        <span className="flex h-[84px] w-[132px] items-center justify-center rounded-pill bg-[var(--blue-25)]" aria-hidden>
          {["Appels", "Brood", "Eieren"].map((name, i) => {
            const src = getItemPhotoUrl(name, 160);
            return (
              <span
                key={name}
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-full bg-[var(--white)] shadow-[0_0_0_3px_var(--blue-25),0_6px_14px_-8px_rgba(16,17,48,0.25)]",
                  i > 0 && "-ml-3",
                )}
                style={{ zIndex: 3 - i }}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- lokale itemfoto
                  <img src={src} alt="" width={32} height={32} className="size-8 object-contain" />
                ) : null}
              </span>
            );
          })}
        </span>
        <p className="mt-4 text-base font-bold text-[var(--text-primary)]">Kies meerdere items</p>
        <p className="mt-1 max-w-[32ch] text-sm leading-5 text-[var(--text-secondary)] [text-wrap:balance]">
          Zoek producten of recepten en voeg ze in één keer toe aan de gekozen dag.
        </p>
      </div>
    ) : null;

  return (
    <>
    <ItemNameSearchSlideIn
      open={nameSearchOpen}
      onClose={() => {
        if (nameSearchSelectedRef.current) {
          nameSearchSelectedRef.current = false;
          return;
        }
        setNameSearchOpen(false);
        onClose();
      }}
      initialValue={itemName}
      onSelect={(name) => {
        nameSearchSelectedRef.current = true;
        setItemName(name);
        setNameSearchOpen(false);
      }}
      title="Item toevoegen"
      defaultSlugs={vacationSearchSlugs}
    />
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
      <div className="overflow-hidden pb-2">
        <div
          className="relative flex w-full"
          style={{
            transform: showRecipeForm ? "translateX(-100%)" : "translateX(0)",
            transition: SLIDE_TRANSITION,
          }}
        >
          {/* Panel 1: Item form */}
          <div className="relative z-[1] w-full shrink-0">
            <div
              className={cn(
                "mx-auto w-full max-w-[768px]",
                !masterItemFormOnly && "px-4",
              )}
            >
              <div
                className={cn(
                  "flex flex-col",
                  masterItemFormOnly ? "gap-4" : "gap-6",
                )}
              >
              {!isMasterList && !isVacationList ? (
                <>
                  {groupingMode === "category" ? (
                    /* Figma 1480:13565 — winkel-selector voor "per categorie" modus */
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                          Winkel
                        </span>
                      </div>
                      <div className="-mx-4 overflow-x-auto px-4">
                        <div className="flex gap-3 pb-1" style={{ width: "max-content" }}>
                          {MASTER_STORE_OPTIONS.map((store) => (
                            <button
                              key={store.slug}
                              type="button"
                              onClick={() =>
                                setSelectedStore((prev) =>
                                  prev === store.label ? null : store.label,
                                )
                              }
                              className={cn(
                                "flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-[var(--radius-md)] border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                                selectedStore === store.label
                                  ? "border-[var(--border-focus)] bg-[var(--blue-25)]"
                                  : "border-[var(--border-default)] bg-[var(--white)]",
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={store.logoSrc}
                                alt=""
                                width={48}
                                height={48}
                                className="size-12 object-contain"
                              />
                              <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-sm font-medium leading-20 text-[var(--text-primary)]">
                                {store.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Canvas «Items toevoegen 1b»: dagkaartjes met datum. */
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold tracking-[0.05em] text-[var(--text-tertiary)]">VOOR WELKE DAG?</span>
                      <div className="grid grid-cols-[1.2fr_repeat(7,minmax(0,1fr))] gap-1.5" role="group" aria-label="Dag">
                        {DAY_OPTIONS.map((day) => {
                          const active = selectedDay === day.value;
                          const date = dayDates.get(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              aria-pressed={active}
                              aria-label={day.value === "Geen" ? "Geen dag" : `${day.value}${date ? ` ${date}` : ""}`}
                              onClick={() => {
                                setSelectedDay(day.value);
                                if (day.value === "Geen") {
                                  setSourceFilter((prev) => (prev === "stock" ? "all" : prev));
                                }
                              }}
                              className={cn(
                                "flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] transition-[background-color,color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                                active
                                  ? "bg-[var(--blue-500)] text-white shadow-[0_6px_14px_-6px_rgba(79,85,241,0.6)]"
                                  : "bg-[var(--gray-25)] text-[var(--text-primary)]",
                              )}
                            >
                              {day.value === "Geen" ? (
                                <>
                                  <span className={active ? "text-white" : "text-[var(--text-secondary)]"}>
                                    <CalendarIcon />
                                  </span>
                                  <span className={cn("text-[11px] font-bold", active ? "text-white" : "text-[var(--text-secondary)]")}>Geen</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] font-bold opacity-75">{DAY_SHORT[day.value]}</span>
                                  <span className="text-[17px] font-bold leading-5 tabular-nums">{date ?? day.label}</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </>
              ) : null}

              {(isEditMode ||
                sourceFilter === "all" ||
                sourceFilter === "items" ||
                isMasterList) &&
                sourceFilter !== "stock" && (
                <div
                  className={cn(
                    "flex flex-col",
                    masterItemFormOnly ? "gap-4" : "gap-6",
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <ItemNameAutocomplete
                      ariaLabel={batchMode ? (sourceFilter === "all" ? "Zoek een product of recept" : "Zoek een product") : sourceFilter === "all" ? "Naam item of recept" : "Naam item"}
                      placeholder={batchMode ? (sourceFilter === "all" ? "Zoek een product of recept" : "Zoek een product") : sourceFilter === "all" ? "Naam item of recept" : "Naam item"}
                      value={batchMode ? itemSearchQuery : itemName}
                      onChange={(value) => {
                        if (batchMode) setItemSearchQuery(value);
                        else setItemName(value);
                      }}
                      onSelectItem={(name) => {
                        if (batchMode) {
                          addBatchItem(name);
                          setItemSearchQuery("");
                        } else {
                          setItemName(name);
                        }
                      }}
                      autoFocus={!nameSearchOpen}
                      recipes={sourceFilter === "all" ? storedRecipes : undefined}
                      onSelectRecipe={handleSelectRecipe}
                      onSelectRecipeFromFreezer={handleSelectRecipeFromFreezer}
                      slideInTitle={sourceFilter === "all" ? "Item of recept toevoegen" : "Item toevoegen"}
                    />
                    {sourceFilterControls}
                  </div>
                  {activeBatchEditor}
                  {batchQueueControls}
                  {batchEmptyHint}
                  {isVacationList && (
                    <>
                      {(isEditMode || initialItemCategory !== "Te regelen") && (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                          Categorie
                        </label>
                        <div className="relative">
                          <select
                            value={vacationCategory}
                            onChange={(e) => setVacationCategory(e.target.value)}
                            className="h-12 w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--white)] px-4 pr-10 text-base leading-6 text-[var(--text-primary)] transition-colors focus:outline-none focus:border-[var(--border-focus)]"
                          >
                            {VACATION_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <span
                            aria-hidden
                            className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 bg-[var(--text-secondary)]"
                            style={{
                              WebkitMaskImage: "url(/icons/chevron.svg)",
                              maskImage: "url(/icons/chevron.svg)",
                              WebkitMaskSize: "contain",
                              maskSize: "contain",
                              WebkitMaskRepeat: "no-repeat",
                              maskRepeat: "no-repeat",
                              WebkitMaskPosition: "center",
                              maskPosition: "center",
                            }}
                          />
                        </div>
                      </div>
                      )}
                      {(isEditMode || initialItemCategory !== "Te regelen") && (
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="new-item-trip-person"
                          className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]"
                        >
                          Wie
                        </label>
                        <div className="relative">
                          <select
                            id="new-item-trip-person"
                            value={tripPerson}
                            onChange={(e) =>
                              setTripPerson(
                                normalizeTripPerson(e.target.value),
                              )
                            }
                            className="h-12 w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--white)] px-4 pr-10 text-base leading-6 text-[var(--text-primary)] transition-colors focus:outline-none focus:border-[var(--border-focus)]"
                          >
                            {TRIP_PERSON_TABS.map((tab) => (
                              <option key={tab} value={tab}>
                                {tab}
                              </option>
                            ))}
                          </select>
                          <span
                            aria-hidden
                            className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 bg-[var(--text-secondary)]"
                            style={{
                              WebkitMaskImage: "url(/icons/chevron.svg)",
                              maskImage: "url(/icons/chevron.svg)",
                              WebkitMaskSize: "contain",
                              maskSize: "contain",
                              WebkitMaskRepeat: "no-repeat",
                              maskRepeat: "no-repeat",
                              WebkitMaskPosition: "center",
                              maskPosition: "center",
                            }}
                          />
                        </div>
                      </div>
                      )}
                    </>
                  )}
                  {!isVacationList && !batchMode && (
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
                  )}
                </div>
              )}

              {!isMasterList && !isEditMode && sourceFilter === "stock" && (
                <div className="flex flex-col gap-4">
                  {allFreezerItems.length === 0 ? (
                    <>
                    {sourceFilterControls}
                    {batchQueueControls}
                    <div className="mt-10 flex flex-col items-center gap-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/ui/empty_state_diepvries.png"
                        alt=""
                        width={96}
                        height={96}
                        className="size-24 object-contain"
                      />
                      <p className="text-center text-base font-medium leading-6 text-[var(--text-tertiary)]">
                        Je hebt geen items in je diepvriesvoorraad
                      </p>
                    </div>
                    </>
                  ) : (
                  <>
                  <SearchBar
                    placeholder="Zoek gerecht of product"
                    value={freezerSearch}
                    onValueChange={setFreezerSearch}
                  />
                  {sourceFilterControls}
                  {batchQueueControls}
                  {filteredFreezerItems.length === 0 ? (
                    <p className="py-4 text-center text-base font-medium leading-6 text-[var(--text-tertiary)]">
                      Geen items gevonden
                    </p>
                  ) : (
                    <div className="-mx-4 flex flex-col gap-4 px-4 pb-2">
                      {filteredFreezerItems.map((it) => {
                        const isGerecht = it.type === "gerecht";
                        const personsCount = it.recipePersons ?? it.quantityPerPackage ?? 1;
                        const subtitle = isGerecht
                          ? personsCount === 1
                            ? "1 persoon"
                            : `${personsCount} personen`
                          : `${it.quantityPerPackage ?? 1} ${it.unit ?? "stuk"}`;
                        return (
                          <button
                            key={it.id}
                            type="button"
                            className="relative flex w-full items-center gap-3 rounded-lg bg-[var(--white)] py-3 pl-4 pr-3 shadow-card text-left transition-colors active:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                            onClick={() => {
                              const stockItem = {
                                name: it.name ?? "",
                                quantity: subtitle,
                                section: selectedDay,
                                fromStock: true,
                                stockPhotoUrl: it.recipePhotoUrl || undefined,
                              };
                              if (batchMode) {
                                const entryId = createBatchId("item");
                                setBatchEntries((previous) => [
                                  ...previous,
                                  {
                                    id: entryId,
                                    kind: "item",
                                    item: {
                                      id: `draft-${entryId}`,
                                      ...stockItem,
                                      checked: false,
                                      itemCategory: resolveItemCategoryFromName(
                                        stockItem.name,
                                      ),
                                    },
                                  },
                                ]);
                                return;
                              }
                              onAdd(stockItem);
                              onClose();
                            }}
                          >
                            {/* Package count */}
                            <span className="shrink-0 w-6 text-center text-[32px] font-semibold leading-6 text-[var(--blue-900,#101130)]">
                              {it.packages ?? 1}
                            </span>

                            {/* Photo with freeze badge */}
                            <div className="relative shrink-0 size-12">
                              <div
                                className={cn(
                                  "size-12 overflow-hidden bg-[var(--gray-50)]",
                                  isGerecht ? "rounded-full" : "rounded-md",
                                )}
                              >
                                {it.recipePhotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={it.recipePhotoUrl}
                                    alt=""
                                    className="size-full object-cover"
                                    decoding="async"
                                    loading="lazy"
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src="/images/ui/empty_state_diepvries.png"
                                    alt=""
                                    className="size-full object-contain p-1 opacity-60"
                                  />
                                )}
                              </div>
                              {/* Freeze snowflake badge — top-right of photo */}
                              <div className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-white">
                                <span
                                  className="inline-block size-4 shrink-0 bg-[var(--blue-500)]"
                                  style={{
                                    WebkitMaskImage: "url(/icons/freeze.svg)",
                                    maskImage: "url(/icons/freeze.svg)",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                  }}
                                  aria-hidden
                                />
                              </div>
                            </div>

                            {/* Name + subtitle */}
                            <div className="min-w-0 flex-1 flex flex-col">
                              <p className="truncate text-base font-medium leading-6 tracking-normal text-[var(--text-primary)]">
                                {it.name}
                              </p>
                              <p className="truncate text-sm leading-5 tracking-normal text-[var(--gray-400,#8c929d)]">
                                {subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </>
                  )}
                </div>
              )}

              {!isMasterList && !isEditMode && sourceFilter === "recipes" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    {storedRecipes.length > 0 ? (
                      <ItemNameAutocomplete
                        ariaLabel={batchMode ? "Zoek een recept" : "Naam recept"}
                        placeholder={batchMode ? "Zoek een recept" : "Naam recept"}
                          value={itemSearchQuery}
                        onChange={(value) => {
                          setItemSearchQuery(value);
                          if (value.trim()) setActiveCategory(null);
                        }}
                        recipes={storedRecipes}
                        suggestionScope="recipes"
                        onSelectRecipe={handleSelectRecipe}
                        onSelectRecipeFromFreezer={handleSelectRecipeFromFreezer}
                        slideInTitle="Recept zoeken"
                      />
                    ) : null}
                    {sourceFilterControls}
                  </div>
                  {batchQueueControls}
                  {batchEntries.length === 0 &&
                  storedRecipes.length > 0 &&
                  visibleCategories.length > 0 ? (
                    <div className="-mx-4 min-w-0 overflow-x-auto px-4" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
                      <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                        <button
                          type="button"
                          onClick={() => setActiveCategory(null)}
                          className={cn(
                            "shrink-0 rounded-pill px-3 py-1.5 text-[13px] leading-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                            activeCategory === null
                              ? "bg-[var(--action-primary)] font-medium text-[var(--action-primary-foreground)]"
                              : "bg-[var(--gray-50)] font-normal text-[var(--text-tertiary)]",
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
                                  ? "bg-[var(--action-primary)] font-medium text-[var(--action-primary-foreground)]"
                                  : "bg-[var(--gray-50)] font-normal text-[var(--text-tertiary)]",
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
                  {batchEntries.length > 0 ? null : storedRecipes.length === 0 ? (
                    <div className="flex flex-col items-center gap-6 py-8">
                      {/* Zelfde illustratie als /recepten lege staat (Figma 1199:11239). */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/ui/recept_320.webp"
                        alt=""
                        width={96}
                        height={96}
                        className="size-24 shrink-0 object-cover"
                        decoding="async"
                      />
                      <p className="max-w-[358px] text-center text-base font-medium leading-6 tracking-normal text-[var(--text-tertiary)]">
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
                            n === 1 ? "1 ingrediënt" : `${n} ingrediënten`;
                          return (
                            <RecipeTile
                              key={r.id}
                              recipeName={r.name}
                              itemCount={itemCount}
                              photoUrl={r.photoUrl ?? undefined}
                              onAddFromFreezer={() => handleSelectRecipeFromFreezer(r)}
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
                      <PlusCircleMaskIcon />
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
