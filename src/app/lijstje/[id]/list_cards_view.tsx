"use client";

import * as React from "react";
import type { ListItem } from "./new_item_modal";
import type { SavedRecipe } from "@/lib/recipe_library";
import type { ItemPhotoLookupOptions } from "@/lib/item-photos";
import { addDays, dutchDayToOffset, getMondayOfWeek, parseDutchDate } from "@/lib/calendar-utils";
import { categoryHeadingDisplay, groupMeatSubtypes } from "@/lib/item-ingredient-category";
import { mixWithWhite, pickDistinctTint, useTintMap, type Rgb } from "@/lib/recipe-tint";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { IngredientPlate } from "@/components/ingredient_plate";
import { SortableContext, rectSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StoreBadge, StoreLogos, useStoreLongPress } from "./store_mark";
import { storeFilterLabel, type StoreFilter } from "@/lib/item-store";
import {
  isTakeoutMealName,
  TAKEOUT_MEAL_CATEGORY,
  TAKEOUT_MEAL_PHOTO_URL,
} from "@/lib/takeout-meal";

/** Weergave van de items in een kaart: rijen, twee kolommen of vierkante tegels (canvas «Lijstje 6b» + «Lijstje 2»). */
export type ListCardLayout = "one" | "two" | "tiles";

type Section = { title: string; displayTitle?: string; items: ListItem[] };
type GetPhotoUrl = (name: string, size?: number, options?: ItemPhotoLookupOptions) => string | null;

const LAVENDER: Rgb = [79, 85, 241];

/* ─── Datum van een dag-sectie (zelfde logica als dayTitleWithDate) ─── */
function sectionDate(section: Section, listDateStr: string): Date | null {
  const iso = section.items.find((i) => i.itemDate)?.itemDate;
  if (iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const offset = dutchDayToOffset(section.title);
  if (offset === null) return null;
  const listDate = parseDutchDate(listDateStr);
  if (!listDate) return null;
  let date = addDays(getMondayOfWeek(listDate), offset);
  if (date < listDate) date = addDays(date, 7);
  return date;
}

function dayLabel(section: Section, listDateStr: string): string {
  const date = sectionDate(section, listDateStr);
  if (!date) return section.displayTitle ?? section.title;
  return `${section.title} ${date.getDate()} ${date.toLocaleDateString("nl-NL", { month: "long" })}`;
}

function recipeIdFromGroup(groupId?: string): string | null {
  const m = groupId?.match(/^recipe-(.+)-\d+$/);
  return m ? m[1] : null;
}

type Recipe = { groupId: string; name: string; link?: string; photo: string | null; items: ListItem[] };

/** Splitst een dag in recepten, diepvriesgerechten en losse items. */
function splitDay(items: ListItem[], savedRecipes: SavedRecipe[]) {
  const recipes: Recipe[] = [];
  const stockDishes: ListItem[] = [];
  const takeoutDishes: ListItem[] = [];
  const loose: ListItem[] = [];
  for (const item of items) {
    if (isTakeoutMealName(item.name)) {
      takeoutDishes.push(item);
    } else if (item.fromStock) {
      stockDishes.push(item);
    } else if (item.recipeGroupId && item.recipeName) {
      let r = recipes.find((x) => x.groupId === item.recipeGroupId);
      if (!r) {
        const rid = recipeIdFromGroup(item.recipeGroupId);
        const saved =
          (rid ? savedRecipes.find((s) => s.id === rid) : undefined) ??
          savedRecipes.find((s) => s.name.trim().toLowerCase() === item.recipeName!.trim().toLowerCase());
        r = { groupId: item.recipeGroupId, name: item.recipeName, link: item.recipeLink, photo: saved?.photoUrl ?? null, items: [] };
        recipes.push(r);
      }
      r.items.push(item);
    } else {
      loose.push(item);
    }
  }
  return { recipes, stockDishes, takeoutDishes, loose };
}

/* ─── Categoriekleuren (canvas «Lijstje 6») ─── */
const CATEGORY_COLORS: Array<[RegExp, Rgb]> = [
  [/groente|fruit/i, [63, 174, 92]],
  [/vlees|charcut|vis/i, [229, 72, 77]],
  [/zuivel|kaas|eieren/i, [240, 163, 59]],
  [/brood|bakker/i, [197, 138, 75]],
  [/droog|bak|pasta|rijst/i, [185, 139, 62]],
  [/conserv|saus|olie|kruid/i, [139, 108, 240]],
  [/drank|water|frisdrank/i, [47, 143, 224]],
  [/snack|chips|snoep|koek/i, [224, 120, 47]],
  [/diepvries/i, [63, 181, 214]],
  [/afhaal/i, [232, 181, 67]],
  [/baby|kind/i, [224, 90, 160]],
  [/verzorg|huishoud|schoonmaak|drogist/i, [43, 179, 163]],
];
export function categoryColor(title: string): Rgb {
  return CATEGORY_COLORS.find(([re]) => re.test(title))?.[1] ?? LAVENDER;
}

/* ─── Kleine bouwstenen ─── */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function RoundCheck({ done, size = 22 }: { done: boolean; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-colors",
        done ? "bg-[var(--blue-500)] text-white" : "text-transparent shadow-[inset_0_0_0_1.6px_var(--gray-200)]",
      )}
      style={{ width: size, height: size }}
    >
      <CheckIcon className="size-[60%]" />
    </span>
  );
}

function ItemPhoto({ item, getPhotoUrl, size, boxed = true }: { item: ListItem; getPhotoUrl?: GetPhotoUrl; size: number; boxed?: boolean }) {
  const src = item.stockPhotoUrl ?? getPhotoUrl?.(item.name, size >= 56 ? 160 : 80) ?? null;
  return (
    <span
      className={cn("relative flex shrink-0 items-center justify-center", boxed && "rounded-[10px] bg-[var(--gray-25)]")}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto of data-URL
        <img
          src={src}
          alt=""
          className={cn("object-contain transition-[opacity,filter]", item.checked && "opacity-40 grayscale-[40%]")}
          style={{ width: Math.round(size * 0.82), height: Math.round(size * 0.82) }}
        />
      ) : null}
      <StoreBadge store={item.store} size={size >= 56 ? 18 : 14} />
    </span>
  );
}

function ItemName({ item, className }: { item: ListItem; className?: string }) {
  return (
    <span
      className={cn(
        "block truncate font-semibold",
        item.checked ? "text-[var(--gray-300)] line-through" : "text-[var(--text-primary)]",
        className,
      )}
    >
      {item.name}
    </span>
  );
}

type ItemProps = { item: ListItem; getPhotoUrl?: GetPhotoUrl; onToggle: () => void };

function itemLabel(item: ListItem) {
  return `${item.name}${item.quantity ? `, ${item.quantity}` : ""}${item.checked ? ", gehaald" : ""}`;
}

/** 1 kolom: rij met foto, naam/hoeveelheid en rond vinkje rechts. */
function ItemRow({ item, getPhotoUrl, onToggle }: ItemProps) {
  const { className: pressCls, ...press } = useStoreLongPress(item);
  return (
    <button
      {...press}
      type="button"
      role="checkbox"
      aria-checked={item.checked}
      aria-label={itemLabel(item)}
      onClick={onToggle}
      className={cn(pressCls, "flex w-full items-center gap-3 border-t border-[var(--border-subtle)] px-1 py-2.5 text-left first:border-t-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]")}
    >
      <ItemPhoto item={item} getPhotoUrl={getPhotoUrl} size={42} />
      <span className="min-w-0 flex-1 leading-[19px]">
        <ItemName item={item} className="text-[15px] font-medium" />
        <span className={cn("block truncate text-[13px]", item.checked ? "text-[var(--gray-200)]" : "text-[var(--text-tertiary)]")}>{item.quantity}</span>
      </span>
      <RoundCheck done={item.checked} size={24} />
    </button>
  );
}

/** 2 kolommen: compacte kaart met foto, naam, hoeveelheid en rond vinkje. */
function ItemChip({ item, getPhotoUrl, onToggle }: ItemProps) {
  const { className: pressCls, ...press } = useStoreLongPress(item);
  return (
    <button
      {...press}
      type="button"
      role="checkbox"
      aria-checked={item.checked}
      aria-label={itemLabel(item)}
      onClick={onToggle}
      className={cn(
        pressCls,
        "flex min-w-0 items-center gap-2 rounded-[12px] p-[7px] text-left transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        item.checked ? "bg-[var(--gray-25)]" : "bg-[var(--white)] shadow-[inset_0_0_0_1px_var(--border-subtle)]",
      )}
    >
      <ItemPhoto item={item} getPhotoUrl={getPhotoUrl} size={34} boxed={false} />
      <span className="min-w-0 flex-1 leading-[15px]">
        <ItemName item={item} className="text-[13px]" />
        <span className="block truncate text-[11px] text-[var(--text-tertiary)]">{item.quantity}</span>
      </span>
      <RoundCheck done={item.checked} size={20} />
    </button>
  );
}

/** Tegels (canvas «Lijstje 2»): vierkante tegel met grote foto, vinkje als badge. */
function ItemTile({ item, getPhotoUrl, onToggle }: ItemProps) {
  const { className: pressCls, ...press } = useStoreLongPress(item);
  return (
    <button
      {...press}
      type="button"
      role="checkbox"
      aria-checked={item.checked}
      aria-label={itemLabel(item)}
      onClick={onToggle}
      className={cn(
        pressCls,
        "relative flex aspect-[1/1.12] min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        item.checked ? "bg-[var(--gray-25)]" : "bg-[var(--white)] shadow-[inset_0_0_0_1px_var(--border-subtle)]",
      )}
    >
      <span className="absolute right-[7px] top-[7px]">
        <RoundCheck done={item.checked} size={22} />
      </span>
      <ItemPhoto item={item} getPhotoUrl={getPhotoUrl} size={58} boxed={false} />
      <span className="w-full px-1 text-center leading-[15px]">
        <ItemName item={item} className="text-xs" />
        <span className="block truncate text-[11px] text-[var(--text-tertiary)]">{item.quantity}</span>
      </span>
    </button>
  );
}

/** Afhaalgerecht: statische maaltijdweergave zonder boodschappencheckbox. */
function TakeoutMealItem({ item, layout }: { item: ListItem; layout: ListCardLayout }) {
  if (layout === "tiles") {
    return (
      <div className="relative flex aspect-[1/1.12] min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] bg-[var(--white)] px-2 py-2 shadow-[inset_0_0_0_1px_var(--border-subtle)]">
        <span className="absolute right-[7px] top-[7px]"><CompleteIndicator /></span>
        <Plate src={TAKEOUT_MEAL_PHOTO_URL} size={58} />
        <span className="w-full text-center leading-[15px]">
          <span className="block truncate text-xs font-semibold text-text-primary">{item.name}</span>
          <span className="block text-[11px] text-[#8a6518]">Afhalen</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex min-w-0 items-center gap-3 text-left",
      layout === "one"
        ? "border-t border-[var(--border-subtle)] px-1 py-2.5 first:border-t-0"
        : "rounded-[12px] bg-[var(--white)] p-[7px] shadow-[inset_0_0_0_1px_var(--border-subtle)]",
    )}>
      <Plate src={TAKEOUT_MEAL_PHOTO_URL} size={layout === "one" ? 42 : 34} />
      <span className="min-w-0 flex-1 leading-[18px]">
        <span className="block truncate text-[15px] font-medium text-text-primary">{item.name}</span>
        <span className="block text-[12px] font-medium text-[#8a6518]">Afhalen</span>
      </span>
      <CompleteIndicator />
    </div>
  );
}

function ItemsLayout({
  items,
  layout,
  getPhotoUrl,
  onCheckedChange,
  wide,
}: {
  items: ListItem[];
  layout: ListCardLayout;
  getPhotoUrl?: GetPhotoUrl;
  onCheckedChange: (id: string, checked: boolean) => void;
  /** Bredere kaart (desktop): meer tegels per rij. */
  wide?: boolean;
}) {
  if (items.length === 0) return null;
  if (layout === "one") {
    return (
      <div className="px-2.5 pb-1.5 pt-1">
        {items.map((it) => isTakeoutMealName(it.name) ? (
          <TakeoutMealItem key={it.id} item={it} layout={layout} />
        ) : (
          <ItemRow key={it.id} item={it} getPhotoUrl={getPhotoUrl} onToggle={() => onCheckedChange(it.id, !it.checked)} />
        ))}
      </div>
    );
  }
  if (layout === "tiles") {
    return (
      <div className={cn("grid gap-1.5 p-2.5", wide ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-3")}>
        {items.map((it) => isTakeoutMealName(it.name) ? (
          <TakeoutMealItem key={it.id} item={it} layout={layout} />
        ) : (
          <ItemTile key={it.id} item={it} getPhotoUrl={getPhotoUrl} onToggle={() => onCheckedChange(it.id, !it.checked)} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5 p-2.5">
      {items.map((it) => isTakeoutMealName(it.name) ? (
        <TakeoutMealItem key={it.id} item={it} layout={layout} />
      ) : (
        <ItemChip key={it.id} item={it} getPhotoUrl={getPhotoUrl} onToggle={() => onCheckedChange(it.id, !it.checked)} />
      ))}
    </div>
  );
}

/* ─── Bewerkmodus (canvas «Lijstje · bewerkmodus in kaarten») ─── */
export type ListCardsEditHandlers = {
  onEdit: (item: ListItem) => void;
  onDelete: (id: string) => void;
  onDeleteSection: (sectionTitle: string) => void;
  onDeleteRecipeGroup: (groupId: string) => void;
  /** Per categorie: categorieën verslepen. `collapsed` = alles ingeklapt zodra je de greep vastneemt. */
  categoryReorder?: { collapsed: boolean; onArm: () => void };
};

/** Sleep-id's van categoriekaarten (los van de item-id's in dezelfde DndContext). */
export const CATEGORY_DRAG_PREFIX = "cat:";

/** Dichtstbijzijnde scrollcontainer (op het lijstje scrollt een paneel, niet altijd het venster). */
function scrollParentOf(el: HTMLElement): { scrollBy: (x: number, y: number) => void } {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
}

/**
 * Versleepbare categoriekaart (bewerkstand). Greep vastnemen klapt eerst alle kaarten in; de pagina
 * schuift mee zodat deze kaart onder je vinger blijft. Daarna pas start het slepen.
 */
function SortableCategoryShell({
  title,
  collapsed,
  onArm,
  onResidual,
  children,
}: {
  title: string;
  collapsed: boolean;
  onArm: () => void;
  /** Wat scrollen niet kon opvangen (lijst korter dan het scherm): verschuiving van de hele lijst. */
  onResidual: (px: number) => void;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `${CATEGORY_DRAG_PREFIX}${title}` });
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const anchorTop = React.useRef<number | null>(null);
  React.useLayoutEffect(() => {
    if (!collapsed || anchorTop.current == null || !nodeRef.current) return;
    const anchor = anchorTop.current;
    anchorTop.current = null;
    const diff = nodeRef.current.getBoundingClientRect().top - anchor;
    if (Math.abs(diff) > 1) scrollParentOf(nodeRef.current).scrollBy(0, diff);
    const residual = nodeRef.current.getBoundingClientRect().top - anchor;
    if (Math.abs(residual) > 1) onResidual(residual);
  }, [collapsed, onResidual]);
  const handle = (
    <button
      type="button"
      aria-label={`Verplaats ${categoryHeadingDisplay(title)}`}
      className={cn(
        "-ml-1 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-[8px] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        isDragging ? "text-[var(--blue-500)]" : "text-[var(--gray-300)] [@media(hover:hover)]:hover:text-[var(--blue-500)]",
      )}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        anchorTop.current = nodeRef.current?.getBoundingClientRect().top ?? null;
        onArm();
        listeners?.onPointerDown?.(e);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <GripIcon />
    </button>
  );
  return (
    <div
      ref={(el) => {
        nodeRef.current = el;
        setNodeRef(el);
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("break-inside-avoid", isDragging && "relative z-20 [&>section]:shadow-[0_18px_36px_-12px_rgba(16,17,48,0.35),0_0_0_2px_var(--blue-200)]")}
    >
      {children(handle)}
    </div>
  );
}

function TrashButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <RoundIconButton
      tone="danger"
      size={28}
      aria-label={label}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {RoundIcons.trash}
    </RoundIconButton>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[18px]">
      {[6, 12, 18].map((y) => (
        <React.Fragment key={y}>
          <circle cx="9" cy={y} r="1.4" />
          <circle cx="15" cy={y} r="1.4" />
        </React.Fragment>
      ))}
    </svg>
  );
}

/** Rij in bewerkmodus: greep om te slepen, tik op de rij om te wijzigen, vuilbakje om te verwijderen. */
function EditRow({ item, getPhotoUrl, edit, first }: { item: ListItem; getPhotoUrl?: GetPhotoUrl; edit: ListCardsEditHandlers; first: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-2.5 bg-[var(--white)] py-2 pr-1",
        !first && "border-t border-[var(--border-subtle)]",
        isDragging && "z-10 rounded-[12px] shadow-[0_10px_24px_-10px_rgba(16,17,48,0.35)]",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${item.name} verplaatsen`}
        className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-[var(--gray-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <button
        type="button"
        onClick={() => edit.onEdit(item)}
        aria-label={`${item.name} wijzigen`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <ItemPhoto item={{ ...item, checked: false }} getPhotoUrl={getPhotoUrl} size={42} />
        <span className="min-w-0 flex-1 leading-[19px]">
          <span className="block truncate text-[15px] font-medium text-[var(--text-primary)]">{item.name}</span>
          <span className="block truncate text-[13px] text-[var(--text-tertiary)]">{item.quantity}</span>
        </span>
      </button>
      <TrashButton label={`${item.name} verwijderen`} onClick={() => edit.onDelete(item.id)} />
    </div>
  );
}

function EditRows({ items, getPhotoUrl, edit, indent = false }: { items: ListItem[]; getPhotoUrl?: GetPhotoUrl; edit: ListCardsEditHandlers; indent?: boolean }) {
  const rows = items.map((it, k) => <EditRow key={it.id} item={it} getPhotoUrl={getPhotoUrl} edit={edit} first={k === 0} />);
  // Ingrediënten van een recept springen in onder de receptkop.
  return indent ? <div className="pl-6">{rows}</div> : <>{rows}</>;
}

export const RECIPE_BLOCK_PREFIX = "recipe-block:";

function RecipeHead({
  recipe,
  edit,
  grip,
}: {
  recipe: Recipe;
  edit: ListCardsEditHandlers;
  grip?: React.ReactNode;
}) {
  return (
    <div className="mb-0.5 mt-1.5 flex items-center gap-2.5 rounded-[12px] bg-[var(--blue-25)] py-2 pl-2.5 pr-1">
      {grip}
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)]" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M7 18h10v2H7zM6 14a4 4 0 0 1 1.2-7.8A5 5 0 0 1 16.8 6.2 4 4 0 0 1 18 14v4H6z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 leading-[17px]">
        <span className="block truncate text-sm font-bold text-text-primary">{recipe.name}</span>
        <span className="block truncate text-xs text-[var(--text-secondary)]">
          Recept · {recipe.items.length} {recipe.items.length === 1 ? "ingrediënt" : "ingrediënten"}
        </span>
      </span>
      <TrashButton label={`Recept ${recipe.name} verwijderen`} onClick={() => edit.onDeleteRecipeGroup(recipe.groupId)} />
    </div>
  );
}

/** Recept als geheel versleepbaar (Algemeen): greep in de receptkop, ingrediënten blijven binnen het recept. */
function SortableRecipeBlock({ recipe, getPhotoUrl, edit }: { recipe: Recipe; getPhotoUrl?: GetPhotoUrl; edit: ListCardsEditHandlers }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `${RECIPE_BLOCK_PREFIX}${recipe.groupId}`,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative bg-[var(--white)]",
        isDragging && "z-10 rounded-[14px] shadow-[0_14px_30px_-12px_rgba(16,17,48,0.4)]",
      )}
    >
      <RecipeHead
        recipe={recipe}
        edit={edit}
        grip={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Recept ${recipe.name} verplaatsen`}
            className="-ml-1 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-[var(--blue-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] active:cursor-grabbing"
          >
            <GripIcon />
          </button>
        }
      />
      <SortableContext items={recipe.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <EditRows items={recipe.items} getPhotoUrl={getPhotoUrl} edit={edit} indent />
      </SortableContext>
    </div>
  );
}

/**
 * Inhoud van een kaart in bewerkmodus. Een receptkop (met vuilbakje) verschijnt enkel als er naast
 * het recept nog iets anders in de kaart zit; anders zegt de kaartkop het al.
 * `recipesMovable` (Algemeen): recepten en losse items in de echte volgorde, recepten als geheel versleepbaar.
 */
function EditCardBody({
  items,
  savedRecipes,
  getPhotoUrl,
  edit,
  recipesMovable = false,
}: {
  items: ListItem[];
  savedRecipes: SavedRecipe[];
  getPhotoUrl?: GetPhotoUrl;
  edit: ListCardsEditHandlers;
  recipesMovable?: boolean;
}) {
  const split = splitDay(items, savedRecipes);
  const others = [...split.loose, ...split.stockDishes, ...split.takeoutDishes];
  const showRecipeHeads = split.recipes.length > 1 || (split.recipes.length === 1 && others.length > 0);
  if (!showRecipeHeads) {
    return (
      <div className="px-3 pb-1.5 pt-0.5">
        <EditRows items={[...split.recipes.flatMap((r) => r.items), ...others]} getPhotoUrl={getPhotoUrl} edit={edit} />
      </div>
    );
  }
  if (recipesMovable) {
    // Volgorde zoals op het lijstje: een recept staat op de plek van zijn eerste ingrediënt.
    const units: Array<{ kind: "recipe"; recipe: Recipe } | { kind: "item"; item: ListItem }> = [];
    const seen = new Set<string>();
    for (const item of items) {
      const recipe = split.recipes.find((r) => r.items.includes(item));
      if (recipe) {
        if (!seen.has(recipe.groupId)) {
          seen.add(recipe.groupId);
          units.push({ kind: "recipe", recipe });
        }
      } else {
        units.push({ kind: "item", item });
      }
    }
    return (
      <div className="px-3 pb-1.5 pt-1">
        <SortableContext
          items={units.map((u) => (u.kind === "recipe" ? `${RECIPE_BLOCK_PREFIX}${u.recipe.groupId}` : u.item.id))}
          strategy={verticalListSortingStrategy}
        >
          {units.map((u, k) =>
            u.kind === "recipe" ? (
              <SortableRecipeBlock key={u.recipe.groupId} recipe={u.recipe} getPhotoUrl={getPhotoUrl} edit={edit} />
            ) : (
              <EditRow key={u.item.id} item={u.item} getPhotoUrl={getPhotoUrl} edit={edit} first={k === 0 || units[k - 1].kind === "recipe"} />
            ),
          )}
        </SortableContext>
      </div>
    );
  }
  return (
    <div className="px-3 pb-1.5 pt-1">
      {split.recipes.map((r) => (
        <div key={r.groupId}>
          <RecipeHead recipe={r} edit={edit} />
          <EditRows items={r.items} getPhotoUrl={getPhotoUrl} edit={edit} indent />
        </div>
      ))}
      {others.length > 0 ? (
        <>
          <p className="mt-2.5 text-[11.5px] font-bold tracking-[0.05em] text-[var(--text-tertiary)]">LOSSE ITEMS</p>
          <EditRows items={others} getPhotoUrl={getPhotoUrl} edit={edit} />
        </>
      ) : null}
    </div>
  );
}

/** Eén boom tegelijk in bewerkmodus (mobiel óf desktop), zodat sleep-id's uniek blijven. */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const read = () => setDesktop(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return desktop;
}

/**
 * Inhoud van «Algemeen» in de gewone weergave: recepten blijven herkenbaar met een eigen kopje
 * (foto of koksmuts, naam, teller) en hun ingrediënten eronder; losse items in de volgorde van het lijstje.
 */
function GeneralBody({
  items,
  savedRecipes,
  layout,
  getPhotoUrl,
  uncheckedFirst,
  onCheckedChange,
  wide,
}: {
  items: ListItem[];
  savedRecipes: SavedRecipe[];
  layout: ListCardLayout;
  getPhotoUrl?: GetPhotoUrl;
  uncheckedFirst: boolean;
  onCheckedChange: (id: string, checked: boolean) => void;
  wide?: boolean;
}) {
  const split = splitDay(items, savedRecipes);
  if (split.recipes.length === 0) {
    return <ItemsLayout items={sortItems(items, uncheckedFirst)} layout={layout} getPhotoUrl={getPhotoUrl} onCheckedChange={onCheckedChange} wide={wide} />;
  }
  // Blokken in lijstvolgorde: een recept op de plek van zijn eerste ingrediënt, losse items gegroepeerd per reeks.
  const blocks: Array<{ kind: "recipe"; recipe: Recipe } | { kind: "loose"; items: ListItem[] }> = [];
  const seen = new Set<string>();
  for (const item of items) {
    const recipe = split.recipes.find((r) => r.items.includes(item));
    if (recipe) {
      if (!seen.has(recipe.groupId)) {
        seen.add(recipe.groupId);
        blocks.push({ kind: "recipe", recipe });
      }
    } else {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "loose") last.items.push(item);
      else blocks.push({ kind: "loose", items: [item] });
    }
  }
  return (
    <div className="pb-1">
      {blocks.map((b, k) =>
        b.kind === "recipe" ? (
          <div key={b.recipe.groupId}>
            <div className={cn("mx-2.5 flex items-center gap-2.5 rounded-[12px] bg-[var(--blue-25)] px-2.5 py-2", k === 0 ? "mt-2.5" : "mt-1.5")}>
              {b.recipe.photo ? (
                <Plate src={b.recipe.photo} size={30} />
              ) : (
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)]" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M7 18h10v2H7zM6 14a4 4 0 0 1 1.2-7.8A5 5 0 0 1 16.8 6.2 4 4 0 0 1 18 14v4H6z" />
                  </svg>
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">{b.recipe.name}</span>
              <Counter items={b.recipe.items} />
            </div>
            {/* Ingrediënten springen in onder het receptkopje. */}
            <div className="pl-6">
              <ItemsLayout items={sortItems(b.recipe.items, uncheckedFirst)} layout={layout} getPhotoUrl={getPhotoUrl} onCheckedChange={onCheckedChange} wide={wide} />
            </div>
          </div>
        ) : (
          <ItemsLayout key={`loose-${k}`} items={sortItems(b.items, uncheckedFirst)} layout={layout} getPhotoUrl={getPhotoUrl} onCheckedChange={onCheckedChange} wide={wide} />
        ),
      )}
    </div>
  );
}

function headerGradient(rgb: Rgb) {
  return `linear-gradient(110deg, ${mixWithWhite(rgb, 0.32)} 0%, ${mixWithWhite(rgb, 0.13)} 70%, ${mixWithWhite(rgb, 0.06)} 100%)`;
}

function Plate({ src, size, freeze }: { src: string | null; size: number; freeze?: boolean }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="block size-full overflow-hidden rounded-full bg-[var(--gray-25)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL of externe receptfoto
          <img src={src} alt="" className="size-full scale-[1.08] object-cover" />
        ) : null}
      </span>
      {freeze ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.15)]">
          <span
            aria-hidden
            className="inline-block size-[11px] bg-[var(--blue-500)]"
            style={{ WebkitMaskImage: "url(/icons/freeze.svg)", maskImage: "url(/icons/freeze.svg)", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}
          />
        </span>
      ) : null}
    </span>
  );
}

function Counter({ items }: { items: ListItem[] }) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.checked).length;
  if (done === items.length) {
    return (
      <span
        role="img"
        aria-label="Gedaan"
        className="inline-flex size-6 shrink-0 items-center justify-center text-[#2f8a4a]"
      >
        <CheckIcon className="size-4" />
      </span>
    );
  }
  return <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--text-secondary)]">{done}/{items.length}</span>;
}

/**
 * Kleurbolletje voor de categorienaam met een voortgangsring eromheen (vervaagde kleur als spoor,
 * volle kleur voor wat al gekocht is). Alles gekocht → gevuld rondje met wit vinkje.
 * Vaste breedte: de titel verspringt niet.
 */
function SectionDot({ color, done, progress }: { color: string; done: boolean; progress?: { done: number; total: number } }) {
  const total = progress?.total ?? 0;
  const fraction = total > 0 ? Math.min(1, (progress?.done ?? 0) / total) : 0;
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const label = done ? "Alles gekocht" : total > 0 ? `${progress?.done ?? 0} van ${total} gekocht` : undefined;
  return (
    <span className="relative flex size-[22px] shrink-0 items-center justify-center" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {!done && total > 0 ? (
        <svg viewBox="0 0 22 22" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2.5" style={{ stroke: `color-mix(in srgb, ${color} 22%, transparent)` }} />
          <circle
            cx="11"
            cy="11"
            r={r}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            className="transition-[stroke-dashoffset] duration-slow ease-out-strong"
            style={{ stroke: color, opacity: fraction > 0 ? 1 : 0 }}
          />
        </svg>
      ) : null}
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full text-white transition-[width,height,box-shadow] duration-base ease-out-strong",
          done ? "size-5" : "size-2.5",
        )}
        style={{ backgroundColor: color, boxShadow: done ? `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent)` : undefined }}
      >
        {done ? <CheckIcon className="size-3 motion-safe:animate-fade-up" /> : null}
      </span>
    </span>
  );
}

function CompleteIndicator() {
  return (
    <span
      role="img"
      aria-label="Afgerond"
      className="inline-flex size-6 shrink-0 items-center justify-center text-[#2f8a4a]"
    >
      <CheckIcon className="size-4" />
    </span>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <RoundIconButton
      tone="onColor"
      size={28}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {RoundIcons.plus}
    </RoundIconButton>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-4 shrink-0 text-[var(--text-secondary)] transition-transform", open && "rotate-180")}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Kaart met kleurkop; volledig afgevinkte kaarten starten ingeklapt («Gedaan»). */
function Card({
  header,
  gradient,
  items,
  children,
  collapsible,
  headerClassName,
  reserveChevronSpace = false,
  forceCollapsed = false,
}: {
  header: React.ReactNode;
  gradient: string;
  items: ListItem[];
  children: React.ReactNode;
  collapsible: boolean;
  headerClassName?: string;
  reserveChevronSpace?: boolean;
  /** Categorieën verslepen: enkel de kop tonen. */
  forceCollapsed?: boolean;
}) {
  const allDone = items.length > 0 && items.every((i) => i.checked);
  const [open, setOpen] = React.useState(!allDone);
  const prevAllDone = React.useRef(allDone);
  React.useEffect(() => {
    // Net alles afgevinkt: rustig dichtklappen; weer iets open: opnieuw tonen.
    if (allDone !== prevAllDone.current) setOpen(!allDone);
    prevAllDone.current = allDone;
  }, [allDone]);
  const canCollapse = collapsible && items.length > 0;
  return (
    <section className="break-inside-avoid overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
      <div
        role={canCollapse ? "button" : undefined}
        tabIndex={canCollapse ? 0 : undefined}
        aria-expanded={canCollapse ? open : undefined}
        onClick={canCollapse ? () => setOpen((v) => !v) : undefined}
        onKeyDown={
          canCollapse
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen((v) => !v);
                }
              }
            : undefined
        }
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-3",
          headerClassName,
          canCollapse && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
        )}
        style={{ backgroundImage: gradient }}
      >
        {header}
        {canCollapse ? (
          <Chevron open={open} />
        ) : reserveChevronSpace ? (
          <span aria-hidden className="size-4 shrink-0" />
        ) : null}
      </div>
      {!forceCollapsed && (!canCollapse || open) ? children : null}
    </section>
  );
}

function sortItems(items: ListItem[], uncheckedFirst: boolean) {
  return uncheckedFirst ? [...items].sort((a, b) => Number(a.checked) - Number(b.checked)) : items;
}

export interface ListCardsViewProps {
  sections: Section[];
  groupingMode: "day" | "category";
  layout: ListCardLayout;
  dayLead?: React.ReactNode;
  listDateStr: string;
  savedRecipes: SavedRecipe[];
  getPhotoUrl?: GetPhotoUrl;
  uncheckedFirst: boolean;
  onCheckedChange: (id: string, checked: boolean) => void;
  onAddToSection: (sectionTitle: string) => void;
  /** Bewerkmodus: rijen met greep + vuilbakje; moet binnen een DndContext/SortableContext staan. */
  edit?: ListCardsEditHandlers;
}

/**
 * Lijstje als kaarten (canvas «Lijstje 6b» per dag en «Lijstje 6» per categorie).
 * Per dag: «Algemeen» in lavendel, receptdagen in de kleur van het gerecht (bord in de kop),
 * dagen met losse items in een eigen kleur die verschilt van de andere dagen.
 * Desktop: Algemeen links, de dagen chronologisch rechts; per categorie in drie kolommen.
 */
export function ListCardsView(props: ListCardsViewProps) {
  return props.groupingMode === "day" ? <DayCards {...props} /> : <CategoryCards {...props} />;
}

function DayCards({ sections, layout, dayLead, listDateStr, savedRecipes, getPhotoUrl, uncheckedFirst, onCheckedChange, onAddToSection, edit }: ListCardsViewProps) {
  const isDesktop = useIsDesktop();
  const days = React.useMemo(
    () =>
      sections
        .filter((s) => s.items.length > 0)
        .map((s) => ({ section: s, isGeneral: s.title === "Algemeen", date: sectionDate(s, listDateStr), split: splitDay(s.items, savedRecipes) })),
    [sections, listDateStr, savedRecipes],
  );

  // Alle foto's waaruit dagkleuren gemeten worden: receptfoto's, diepvriesfoto's en tot 4 productfoto's per losse dag.
  const photoFor = React.useCallback((item: ListItem) => item.stockPhotoUrl ?? getPhotoUrl?.(item.name, 160) ?? null, [getPhotoUrl]);
  const srcs = React.useMemo(() => {
    const out = new Set<string>();
    for (const d of days) {
      if (d.isGeneral) continue;
      for (const r of d.split.recipes) if (r.photo) out.add(r.photo);
      for (const s of d.split.stockDishes) if (s.stockPhotoUrl) out.add(s.stockPhotoUrl);
      if (d.split.takeoutDishes.length > 0) out.add(TAKEOUT_MEAL_PHOTO_URL);
      for (const it of d.split.loose.slice(0, 4)) {
        const p = photoFor(it);
        if (p) out.add(p);
      }
    }
    return Array.from(out);
  }, [days, photoFor]);
  const tints = useTintMap(srcs);

  // Kleur per dag: recept/diepvries eerst (vaste kleur), daarna losse dagen met een onderscheidende kleur.
  const dayColor = React.useMemo(() => {
    const map = new Map<string, Rgb>();
    const used: Rgb[] = [];
    for (const d of days) {
      if (d.isGeneral) continue;
      if (d.split.recipes.length === 0 && d.split.takeoutDishes.length > 0) {
        const takeoutColor: Rgb = [232, 181, 67];
        map.set(d.section.title, takeoutColor);
        used.push(takeoutColor);
        continue;
      }
      const src = d.split.recipes.find((r) => r.photo)?.photo ?? d.split.stockDishes.find((s) => s.stockPhotoUrl)?.stockPhotoUrl;
      const rgb = src ? tints.get(src) : undefined;
      if (rgb) {
        map.set(d.section.title, rgb);
        used.push(rgb);
      }
    }
    for (const d of days) {
      if (d.isGeneral || map.has(d.section.title)) continue;
      const candidates = d.split.loose
        .slice(0, 4)
        .map((it) => photoFor(it))
        .map((p) => (p ? tints.get(p) : null))
        .filter((c): c is Rgb => Boolean(c));
      const pick = pickDistinctTint(candidates, used);
      map.set(d.section.title, pick);
      used.push(pick);
    }
    return map;
  }, [days, tints, photoFor]);

  const renderDay = (d: (typeof days)[number], wide: boolean) => {
    const { section, split } = d;
    if (d.isGeneral && edit) {
      return (
        <Card
          key={section.title}
          gradient="linear-gradient(90deg, var(--blue-50), var(--blue-25))"
          items={section.items}
          collapsible={false}
          header={
            <>
              <SectionDot color="var(--blue-500)" done={false} />
              <h3 className="text-[15px] font-bold text-text-primary">Algemeen</h3>
              <span className="text-xs text-[var(--text-tertiary)]">· altijd nodig</span>
              <span className="flex-1" />
              <TrashButton label="Algemeen leegmaken" onClick={() => edit.onDeleteSection(section.title)} className="mr-0.5" />
            </>
          }
        >
          <EditCardBody items={section.items} savedRecipes={savedRecipes} getPhotoUrl={getPhotoUrl} edit={edit} recipesMovable />
        </Card>
      );
    }
    if (d.isGeneral) {
      return (
        <Card
          key={section.title}
          gradient="linear-gradient(90deg, var(--blue-50), var(--blue-25))"
          items={section.items}
          collapsible
          header={
            <>
              <SectionDot
                color="var(--blue-500)"
                done={section.items.length > 0 && section.items.every((i) => i.checked)}
                progress={{ done: section.items.filter((i) => i.checked).length, total: section.items.length }}
              />
              <h3 className="text-[15px] font-bold text-text-primary">Algemeen</h3>
              <span className="text-xs text-[var(--text-tertiary)]">· altijd nodig</span>
              <span className="flex-1" />
              <AddButton label="Item toevoegen aan Algemeen" onClick={() => onAddToSection(section.title)} />
            </>
          }
        >
          <GeneralBody
            items={section.items}
            savedRecipes={savedRecipes}
            layout={layout}
            getPhotoUrl={getPhotoUrl}
            uncheckedFirst={uncheckedFirst}
            onCheckedChange={onCheckedChange}
            wide={wide}
          />
        </Card>
      );
    }
    const label = dayLabel(section, listDateStr);
    const color = dayColor.get(section.title) ?? LAVENDER;
    const mainRecipe = split.recipes[0] ?? null;
    const takeout = !mainRecipe ? split.takeoutDishes[0] ?? null : null;
    const stock = !mainRecipe && !takeout ? split.stockDishes[0] ?? null : null;
    const restItems = [
      ...(mainRecipe ? mainRecipe.items : []),
      ...split.recipes.slice(1).flatMap((r) => r.items),
      ...split.loose,
      ...split.stockDishes.filter((s) => s !== stock),
    ];
    const countable = section.items.filter(
      (item) => item !== stock && !isTakeoutMealName(item.name),
    );
    /* Elke dag: datumtegel + dag als titel; het gerecht (recept of diepvries) als sublabel.
       Desktop: ook de gerechtfoto, en bij dagen zonder gerecht de items als sublabel. */
    const dishName = mainRecipe?.name ?? takeout?.name ?? stock?.name ?? null;
    const dishPhoto = mainRecipe?.photo ?? (takeout ? TAKEOUT_MEAL_PHOTO_URL : null) ?? stock?.stockPhotoUrl ?? null;
    const extraRecipes = mainRecipe ? split.recipes.length - 1 : 0;
    const looseNames = !dishName && wide ? section.items.map((i) => i.name).join(", ") : null;
    const header = (
      <>
        {/* Desktop: gerechtfoto, of een wit bord met tot drie producten (zoals op de receptenpagina) i.p.v. de datumtegel. */}
        {!wide ? (
          <DateChip date={d.date} />
        ) : dishName ? (
          <Plate src={dishPhoto} size={46} freeze={Boolean(stock)} />
        ) : (
          <IngredientPlate
            photos={section.items
              .map((i) => i.stockPhotoUrl ?? getPhotoUrl?.(i.name, 160) ?? null)
              .filter((src): src is string => Boolean(src))
              .slice(0, 3)}
            size={46}
            className="!bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.10)]"
          />
        )}
        <span className="min-w-0 flex-1 leading-[19px]">
          <span className="block truncate text-[15px] font-bold text-text-primary first-letter:uppercase">{label}</span>
          {dishName ? (
            <span className="block truncate text-[13px] text-[var(--text-secondary)]">
              {dishName}
              {extraRecipes > 0 ? ` + ${extraRecipes} recept${extraRecipes > 1 ? "en" : ""}` : ""}
            </span>
          ) : looseNames ? (
            <span className="block truncate text-[13px] text-[var(--text-secondary)]">{looseNames}</span>
          ) : null}
        </span>
        {edit ? (
          <TrashButton label={`${label} verwijderen`} onClick={() => edit.onDeleteSection(section.title)} className="mr-0.5" />
        ) : (
          <>
            {takeout && countable.length === 0 ? (
              <CompleteIndicator />
            ) : (
              <Counter items={countable} />
            )}
            <AddButton label={`Item toevoegen aan ${label}`} onClick={() => onAddToSection(section.title)} />
          </>
        )}
      </>
    );
    if (edit) {
      return (
        <Card key={section.title} gradient={headerGradient(color)} items={section.items} collapsible={false} header={header} headerClassName="min-h-[74px]">
          <EditCardBody items={section.items} savedRecipes={savedRecipes} getPhotoUrl={getPhotoUrl} edit={edit} />
        </Card>
      );
    }
    return (
      <Card
        key={section.title}
        gradient={headerGradient(color)}
        items={countable}
        collapsible
        header={header}
        headerClassName="min-h-[74px]"
        reserveChevronSpace
      >
        <ItemsLayout items={sortItems(restItems, uncheckedFirst)} layout={layout} getPhotoUrl={getPhotoUrl} onCheckedChange={onCheckedChange} wide={wide} />
      </Card>
    );
  };

  const general = days.filter((d) => d.isGeneral);
  const dayCards = days.filter((d) => !d.isGeneral);
  const chronological = [...dayCards].sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

  if (edit) {
    return isDesktop ? (
      <div className="grid grid-cols-2 items-start gap-5">
        <div className="flex flex-col gap-3.5">
          <span className="text-xs font-bold tracking-[0.06em] text-[var(--text-tertiary)]">ALTIJD NODIG</span>
          {general.map((d) => renderDay(d, true))}
        </div>
        <div className="flex flex-col gap-3.5">
          <span className="text-xs font-bold tracking-[0.06em] text-[var(--text-tertiary)]">GERECHTEN PER DAG</span>
          {chronological.map((d) => renderDay(d, true))}
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-3">{days.map((d) => renderDay(d, false))}</div>
    );
  }

  return (
    <>
      {/* Mobiel: één kolom in de gewone volgorde. */}
      <div className="flex flex-col gap-3 lg:hidden">
        {dayLead}
        {days.map((d) => renderDay(d, false))}
      </div>
      {/* Desktop: links «Altijd nodig», rechts de gerechten per dag chronologisch. */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-3.5">
          {dayLead}
          <span className="text-xs font-bold tracking-[0.06em] text-[var(--text-tertiary)]">ALTIJD NODIG</span>
          {general.map((d) => renderDay(d, true))}
        </div>
        <div className="flex flex-col gap-3.5">
          <span className="text-xs font-bold tracking-[0.06em] text-[var(--text-tertiary)]">GERECHTEN PER DAG</span>
          {chronological.map((d) => renderDay(d, true))}
        </div>
      </div>
    </>
  );
}

function DateChip({ date }: { date: Date | null }) {
  if (!date) return null;
  const abbr = date.toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", "").slice(0, 2).toUpperCase();
  return (
    <span className="flex h-10 w-[38px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.85)] leading-[14px]">
      <span className="text-[9px] font-bold tracking-[0.05em] text-[var(--blue-500)]">{abbr}</span>
      <span className="text-base font-bold text-text-primary">{date.getDate()}</span>
    </span>
  );
}

function CategoryCards({ sections, layout, savedRecipes, getPhotoUrl, uncheckedFirst, onCheckedChange, onAddToSection, edit }: ListCardsViewProps) {
  const isDesktop = useIsDesktop();
  // Tijdens het verslepen: lijst verschuiven zodat de vastgenomen kaart onder de vinger blijft.
  const [reorderShift, setReorderShift] = React.useState(0);
  const addReorderShift = React.useCallback((px: number) => setReorderShift((v) => v - px), []);
  const reorderCollapsed = edit?.categoryReorder?.collapsed ?? false;
  React.useEffect(() => {
    if (!reorderCollapsed) setReorderShift(0);
  }, [reorderCollapsed]);
  // Afhaalgerechten koop je niet in de winkel: per categorie geen kaart daarvoor (per dag blijven ze staan).
  const cards = sections.filter(
    (s) =>
      s.items.length > 0 &&
      categoryHeadingDisplay(s.displayTitle ?? s.title) !== TAKEOUT_MEAL_CATEGORY &&
      !s.items.every((item) => isTakeoutMealName(item.name)),
  );
  const render = (s: Section, wide: boolean) => {
    const title = categoryHeadingDisplay(s.displayTitle ?? s.title);
    const takeoutItems = s.items.filter((item) => isTakeoutMealName(item.name));
    const countableItems = s.items.filter((item) => !isTakeoutMealName(item.name));
    const isTakeoutCategory = title === TAKEOUT_MEAL_CATEGORY;
    const rgb = isTakeoutCategory ? ([232, 181, 67] satisfies Rgb) : categoryColor(title);
    if (edit) {
      const reorder = edit.categoryReorder;
      const card = (handle: React.ReactNode) => (
        <Card
          gradient={`linear-gradient(90deg, rgba(${rgb.join(",")},0.16), rgba(${rgb.join(",")},0.05))`}
          items={s.items}
          collapsible={false}
          forceCollapsed={reorder?.collapsed}
          header={
            <>
              {handle}
              <SectionDot color={`rgb(${rgb.join(",")})`} done={false} />
              <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{title}</h3>
              {reorder?.collapsed ? (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--text-tertiary)]">{s.items.length}</span>
              ) : (
                <TrashButton label={`${title} verwijderen`} onClick={() => edit.onDeleteSection(s.title)} className="mr-0.5" />
              )}
            </>
          }
        >
          <EditCardBody items={s.items} savedRecipes={savedRecipes} getPhotoUrl={getPhotoUrl} edit={edit} />
        </Card>
      );
      return reorder ? (
        <SortableCategoryShell key={s.title} title={s.title} collapsed={reorder.collapsed} onArm={reorder.onArm} onResidual={addReorderShift}>
          {card}
        </SortableCategoryShell>
      ) : (
        <React.Fragment key={s.title}>{card(null)}</React.Fragment>
      );
    }
    return (
      <Card
        key={s.title}
        gradient={`linear-gradient(90deg, rgba(${rgb.join(",")},0.16), rgba(${rgb.join(",")},0.05))`}
        items={countableItems}
        collapsible={countableItems.length > 0}
        header={
          <>
            <SectionDot
              color={`rgb(${rgb.join(",")})`}
              done={countableItems.length === 0 ? takeoutItems.length > 0 : countableItems.every((i) => i.checked)}
              progress={{ done: countableItems.filter((i) => i.checked).length, total: countableItems.length }}
            />
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{title}</h3>
            <AddButton label={`Item toevoegen aan ${title}`} onClick={() => onAddToSection(s.title)} />
          </>
        }
      >
        <ItemsLayout items={sortItems(groupMeatSubtypes(s.title, s.items, (i) => i.name), uncheckedFirst)} layout={layout} getPhotoUrl={getPhotoUrl} onCheckedChange={onCheckedChange} wide={wide} />
      </Card>
    );
  };
  if (edit) {
    const body = isDesktop ? (
      <div className="columns-3 gap-4 [&>*]:mb-4">{cards.map((s) => render(s, false))}</div>
    ) : (
      <div className="flex flex-col gap-3">{cards.map((s) => render(s, false))}</div>
    );
    if (!edit.categoryReorder) return body;
    return (
      <>
        {edit.categoryReorder.collapsed ? (
          <p className="-mb-1 text-[13px] font-semibold text-[var(--text-secondary)]">Sleep naar de plek waar je ze in de winkel tegenkomt</p>
        ) : null}
        <SortableContext items={cards.map((s) => `${CATEGORY_DRAG_PREFIX}${s.title}`)} strategy={rectSortingStrategy}>
          <div style={reorderCollapsed && reorderShift !== 0 ? { transform: `translateY(${reorderShift}px)` } : undefined}>{body}</div>
        </SortableContext>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-3 lg:hidden">{cards.map((s) => render(s, false))}</div>
      {/* Desktop: drie kolommen (canvas «Lijstje 6 · desktop»). */}
      <div className="hidden gap-4 lg:block lg:columns-3 [&>*]:mb-4">{cards.map((s) => render(s, false))}</div>
    </>
  );
}

/* ─── Weergave-toggle: 1 kolom · 2 kolommen · tegels ─── */
function LayoutIcon({ kind }: { kind: ListCardLayout }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-[18px]">
      {kind === "one" ? (
        <>
          <rect x="2.5" y="3" width="15" height="3.6" rx="1.8" />
          <rect x="2.5" y="8.2" width="15" height="3.6" rx="1.8" />
          <rect x="2.5" y="13.4" width="15" height="3.6" rx="1.8" />
        </>
      ) : kind === "two" ? (
        <>
          {[3, 8.2, 13.4].map((y) => (
            <React.Fragment key={y}>
              <rect x="2.5" y={y} width="6.6" height="3.6" rx="1.8" />
              <rect x="10.9" y={y} width="6.6" height="3.6" rx="1.8" />
            </React.Fragment>
          ))}
        </>
      ) : (
        <>
          <rect x="2.5" y="2.5" width="6.6" height="6.6" rx="2" />
          <rect x="10.9" y="2.5" width="6.6" height="6.6" rx="2" />
          <rect x="2.5" y="10.9" width="6.6" height="6.6" rx="2" />
          <rect x="10.9" y="10.9" width="6.6" height="6.6" rx="2" />
        </>
      )}
    </svg>
  );
}

const LAYOUT_OPTIONS: Array<{ value: ListCardLayout; label: string }> = [
  { value: "one", label: "1 kolom" },
  { value: "two", label: "2 kolommen" },
  { value: "tiles", label: "Tegels" },
];

export function ListLayoutToggle({ value, onChange }: { value: ListCardLayout; onChange: (v: ListCardLayout) => void }) {
  return (
    <SegmentedControl
      ariaLabel="Weergave"
      size="icon"
      fill={false}
      value={value}
      onChange={onChange}
      options={LAYOUT_OPTIONS.map((o) => ({ value: o.value, ariaLabel: o.label, label: <LayoutIcon kind={o.value} /> }))}
    />
  );
}

export function ListGroupingToggle({
  value,
  onChange,
}: {
  value: "day" | "category";
  onChange: (value: "day" | "category") => void;
}) {
  return (
    <SegmentedControl
      ariaLabel="Groepering lijst"
      fill={false}
      value={value}
      onChange={onChange}
      options={[
        { value: "day", label: <span className="min-w-[80px] text-center">Per dag</span> },
        { value: "category", label: <span className="min-w-[80px] text-center">Per categorie</span> },
      ]}
    />
  );
}

const CHIP_CLASS =
  "inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-pill bg-[var(--white)] text-[13px] font-semibold text-text-primary transition-[box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

/** «Per dag ▾»-chip met een klein menu (canvas «Open eerst · O1», mobiel). */
export function ListGroupingMenuChip({
  value,
  onChange,
}: {
  value: "day" | "category";
  onChange: (value: "day" | "category") => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
  const options = [
    { value: "day" as const, label: "Per dag" },
    { value: "category" as const, label: "Per categorie" },
  ];
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Groepering: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(CHIP_CLASS, "gap-1 pl-[13px] pr-2.5 shadow-[inset_0_0_0_1px_var(--gray-100)]")}
      >
        {current.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div role="menu" className="absolute left-0 top-[40px] z-30 w-[190px] rounded-[14px] bg-[var(--white)] p-1.5 shadow-[0_14px_34px_-10px_rgba(16,17,48,0.32)] motion-safe:animate-fade-up">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-[9px] px-2.5 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
                  on ? "bg-[var(--bg-app)] font-semibold text-text-primary" : "text-text-primary [@media(hover:hover)]:hover:bg-[var(--gray-25)]",
                )}
              >
                {o.label}
                {on ? <CheckIcon className="size-3.5 text-[var(--blue-500)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** «Open eerst» met rond schuifje: niet-afgevinkte items bovenaan (canvas «Open eerst · O1»). */
export function OpenFirstChip({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label="Niet afgevinkte items eerst"
      onClick={() => onChange(!value)}
      className={cn(
        CHIP_CLASS,
        "gap-2 pl-[13px] pr-2",
        value ? "shadow-[inset_0_0_0_1px_var(--blue-200)]" : "shadow-[inset_0_0_0_1px_var(--gray-100)]",
      )}
    >
      Open eerst
      <span
        aria-hidden
        className={cn("relative inline-block h-[18px] w-[30px] shrink-0 rounded-full transition-colors", value ? "bg-[var(--blue-500)]" : "bg-[var(--gray-200)]")}
      >
        <span
          className={cn(
            "absolute top-[2px] size-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(16,17,48,0.25)] transition-[left] duration-fast ease-out-strong",
            value ? "left-[14px]" : "left-[2px]",
          )}
        />
      </span>
    </button>
  );
}

/** Canvas «Concept D»: winkelknop tussen «Per dag» en «Open eerst» op een Lidl / Delhaize-lijstje. */
export function StoreFilterChip({
  value,
  onChange,
  counts,
  showLabelWhenAll = false,
}: {
  value: StoreFilter;
  onChange: (value: StoreFilter) => void;
  /** Aantal zichtbare items per keuze (voor in het menu). */
  counts?: Record<StoreFilter, number>;
  /** Favorieten: «Alle winkels» uitgeschreven (daar staat de knop alleen). */
  showLabelWhenAll?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
  const options: { value: StoreFilter; icon: React.ReactNode }[] = [
    { value: "all", icon: <StoreLogos store="both" size={20} /> },
    { value: "lidl", icon: <StoreLogos store="lidl" size={22} ring={false} /> },
    { value: "delhaize", icon: <StoreLogos store="delhaize" size={22} ring={false} /> },
  ];
  const active = value !== "all";
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Winkel: ${storeFilterLabel(value)}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          CHIP_CLASS,
          "gap-1.5 pl-2 pr-2.5",
          active
            ? "bg-[var(--text-primary)] text-[var(--white)] shadow-none"
            : "shadow-[inset_0_0_0_1px_var(--gray-100)]",
        )}
      >
        {/* Vaste iconbreedte: de knop blijft even breed, wat je ook kiest (geen winkelnaam ernaast). */}
        <span className="flex h-6 w-7 shrink-0 items-center justify-center">
          {active ? <span className="flex rounded-full bg-[var(--white)]">{current.icon}</span> : current.icon}
        </span>
        {showLabelWhenAll && !active ? storeFilterLabel(value) : null}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div role="menu" className="absolute left-0 top-[40px] z-30 w-[220px] rounded-[14px] bg-[var(--white)] p-1.5 shadow-[0_14px_34px_-10px_rgba(16,17,48,0.32)] motion-safe:animate-fade-up">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Wat wil je zien?</p>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
                  on ? "bg-[var(--bg-app)] font-semibold text-text-primary" : "text-text-primary [@media(hover:hover)]:hover:bg-[var(--gray-25)]",
                )}
              >
                <span className="flex w-7 justify-center">{o.icon}</span>
                <span className="flex-1">{storeFilterLabel(o.value)}</span>
                {counts ? <span className="text-xs font-semibold tabular-nums text-[var(--text-tertiary)]">{counts[o.value]}</span> : null}
                {on ? <CheckIcon className="size-3.5 text-[var(--blue-500)]" /> : <span className="w-3.5" />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
