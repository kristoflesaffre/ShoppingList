"use client";

import * as React from "react";
import type { ListItem } from "./new_item_modal";
import type { SavedRecipe } from "@/lib/recipe_library";
import type { ItemPhotoLookupOptions } from "@/lib/item-photos";
import { addDays, dutchDayToOffset, getMondayOfWeek, parseDutchDate } from "@/lib/calendar-utils";
import { categoryHeadingDisplay } from "@/lib/item-ingredient-category";
import { mixWithWhite, pickDistinctTint, useTintMap, type Rgb } from "@/lib/recipe-tint";
import { cn } from "@/lib/utils";

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
  const loose: ListItem[] = [];
  for (const item of items) {
    if (item.fromStock) {
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
  return { recipes, stockDishes, loose };
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
      className={cn("flex shrink-0 items-center justify-center", boxed && "rounded-[10px] bg-[var(--gray-25)]")}
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
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.checked}
      aria-label={itemLabel(item)}
      onClick={onToggle}
      className="flex w-full items-center gap-3 border-t border-[var(--border-subtle)] px-1 py-2.5 text-left first:border-t-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
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
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.checked}
      aria-label={itemLabel(item)}
      onClick={onToggle}
      className={cn(
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
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.checked}
      aria-label={itemLabel(item)}
      onClick={onToggle}
      className={cn(
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
        {items.map((it) => (
          <ItemRow key={it.id} item={it} getPhotoUrl={getPhotoUrl} onToggle={() => onCheckedChange(it.id, !it.checked)} />
        ))}
      </div>
    );
  }
  if (layout === "tiles") {
    return (
      <div className={cn("grid gap-1.5 p-2.5", wide ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-3")}>
        {items.map((it) => (
          <ItemTile key={it.id} item={it} getPhotoUrl={getPhotoUrl} onToggle={() => onCheckedChange(it.id, !it.checked)} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5 p-2.5">
      {items.map((it) => (
        <ItemChip key={it.id} item={it} getPhotoUrl={getPhotoUrl} onToggle={() => onCheckedChange(it.id, !it.checked)} />
      ))}
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
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-pill bg-[rgba(255,255,255,0.8)] px-2.5 text-xs font-bold text-[#2f8a4a]">
        <CheckIcon className="size-3" />
        Gedaan
      </span>
    );
  }
  return <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--text-secondary)]">{done}/{items.length}</span>;
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.75)] text-[var(--blue-500)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
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
}: {
  header: React.ReactNode;
  gradient: string;
  items: ListItem[];
  children: React.ReactNode;
  collapsible: boolean;
  headerClassName?: string;
  reserveChevronSpace?: boolean;
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
      {!canCollapse || open ? children : null}
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

function DayCards({ sections, layout, dayLead, listDateStr, savedRecipes, getPhotoUrl, uncheckedFirst, onCheckedChange, onAddToSection }: ListCardsViewProps) {
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
    if (d.isGeneral) {
      return (
        <Card
          key={section.title}
          gradient="linear-gradient(90deg, var(--blue-50), var(--blue-25))"
          items={section.items}
          collapsible
          header={
            <>
              <span className="size-2.5 shrink-0 rounded-full bg-[var(--blue-500)]" aria-hidden />
              <h3 className="text-[15px] font-bold text-text-primary">Algemeen</h3>
              <span className="text-xs text-[var(--text-tertiary)]">· altijd nodig</span>
              <span className="flex-1" />
              <Counter items={section.items} />
              <AddButton label="Item toevoegen aan Algemeen" onClick={() => onAddToSection(section.title)} />
            </>
          }
        >
          <ItemsLayout items={sortItems(section.items, uncheckedFirst)} layout={layout} getPhotoUrl={getPhotoUrl} onCheckedChange={onCheckedChange} wide={wide} />
        </Card>
      );
    }
    const label = dayLabel(section, listDateStr);
    const color = dayColor.get(section.title) ?? LAVENDER;
    const mainRecipe = split.recipes[0] ?? null;
    const stock = !mainRecipe ? split.stockDishes[0] ?? null : null;
    const restItems = [
      ...(mainRecipe ? mainRecipe.items : []),
      ...split.recipes.slice(1).flatMap((r) => r.items),
      ...split.loose,
      ...split.stockDishes.filter((s) => s !== stock),
    ];
    const countable = section.items.filter((i) => i !== stock);
    const header =
      mainRecipe || stock ? (
        <>
          <Plate src={mainRecipe?.photo ?? stock?.stockPhotoUrl ?? null} size={46} freeze={!mainRecipe} />
          <span className="min-w-0 flex-1 leading-[18px]">
            <span className="block text-xs font-bold text-[var(--text-secondary)] first-letter:uppercase">{label}</span>
            <span className="block truncate text-[15px] font-bold text-text-primary">{mainRecipe?.name ?? stock?.name}</span>
            <span className="block truncate text-xs text-[var(--text-secondary)]">
              {mainRecipe
                ? `${mainRecipe.items.length} ingrediënten${split.recipes.length > 1 ? ` · + ${split.recipes.length - 1} recept` : ""}`
                : `Uit de diepvries${stock?.quantity ? ` · ${stock.quantity}` : ""}`}
            </span>
          </span>
          <Counter items={countable} />
          <AddButton label={`Item toevoegen aan ${label}`} onClick={() => onAddToSection(section.title)} />
        </>
      ) : (
        <>
          <DateChip date={d.date} />
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary first-letter:uppercase">{label}</h3>
          <Counter items={countable} />
          <AddButton label={`Item toevoegen aan ${label}`} onClick={() => onAddToSection(section.title)} />
        </>
      );
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

function CategoryCards({ sections, layout, getPhotoUrl, uncheckedFirst, onCheckedChange, onAddToSection }: ListCardsViewProps) {
  const cards = sections.filter((s) => s.items.length > 0);
  const render = (s: Section, wide: boolean) => {
    const title = categoryHeadingDisplay(s.displayTitle ?? s.title);
    const rgb = categoryColor(title);
    return (
      <Card
        key={s.title}
        gradient={`linear-gradient(90deg, rgba(${rgb.join(",")},0.16), rgba(${rgb.join(",")},0.05))`}
        items={s.items}
        collapsible
        header={
          <>
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `rgb(${rgb.join(",")})` }} aria-hidden />
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{title}</h3>
            <Counter items={s.items} />
            <AddButton label={`Item toevoegen aan ${title}`} onClick={() => onAddToSection(s.title)} />
          </>
        }
      >
        <ItemsLayout items={sortItems(s.items, uncheckedFirst)} layout={layout} getPhotoUrl={getPhotoUrl} onCheckedChange={onCheckedChange} wide={wide} />
      </Card>
    );
  };
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
    <div role="group" aria-label="Weergave" className="flex shrink-0 gap-0.5 rounded-[13px] bg-[var(--blue-50)] p-[3px]">
      {LAYOUT_OPTIONS.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-label={o.label}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-8 w-9 items-center justify-center rounded-[10px] transition-[background-color,color,box-shadow] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              on ? "bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.12)]" : "text-[var(--gray-300)] [@media(hover:hover)]:hover:text-[var(--blue-400)]",
            )}
          >
            <LayoutIcon kind={o.value} />
          </button>
        );
      })}
    </div>
  );
}

export function ListGroupingToggle({
  value,
  onChange,
}: {
  value: "day" | "category";
  onChange: (value: "day" | "category") => void;
}) {
  const options = [
    { value: "day" as const, label: "Per dag" },
    { value: "category" as const, label: "Per categorie" },
  ];

  return (
    <div role="tablist" aria-label="Groepering lijst" className="flex shrink-0 gap-0.5 rounded-[13px] bg-[var(--blue-50)] p-[3px]">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 min-w-[104px] items-center justify-center rounded-[10px] px-3 text-[13px] transition-[background-color,color,box-shadow] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              selected
                ? "bg-[var(--white)] font-semibold text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.12)]"
                : "font-normal text-[var(--text-secondary)] [@media(hover:hover)]:hover:text-[var(--blue-400)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const CHIP_CLASS =
  "inline-flex h-[34px] shrink-0 items-center rounded-pill bg-[var(--white)] text-[13px] font-semibold text-text-primary transition-[box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

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
