"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CalendarDayPlate, CalendarLoosePlate } from "@/components/calendar_day_visuals";
import { selectCalendarPreviewItems } from "@/lib/calendar-utils";
import { isTakeoutMealName } from "@/lib/takeout-meal";
import type { SavedRecipe } from "@/lib/recipe_library";
import type { ListItem } from "./new_item_modal";

/**
 * Canvas «Items toevoegen · voorstel»: weekstrook bovenaan het toevoegblad. Elke dag toont wat er
 * al gepland staat (zelfde borden als de kalender); «Geen dag» = altijd nodig, met een waaiertje
 * basics op het lavendel→roze verloop van de favorietenbanner.
 */

export type DayStripOption = { value: string; short: string; date?: number };

type DayPlate =
  | { kind: "dish"; src: string | null; freeze: boolean }
  | { kind: "loose"; photos: string[] }
  | { kind: "empty" };

const GEEN_FAN = ["/images/items/kaas_blok_160.webp", "/images/items/brood_160.webp", "/images/ingredients/appels_1_160.webp"];

function recipeIdFromGroup(groupId: string): string | null {
  const m = groupId.match(/^recipe-(.+)-\d+$/);
  return m ? m[1] : null;
}

/** Wat er op een dag al staat: een gerecht (receptfoto), losse producten (bord met 3 foto's) of niets. */
export function useDayPlates(
  items: readonly ListItem[] | undefined,
  savedRecipes: readonly SavedRecipe[],
  getPhoto: (name: string) => string | null | undefined,
  /** Datum (YYYY-MM-DD) per dagnaam in de strook: items met een andere datum (bv. vorige week) tellen niet mee. */
  isoBySection?: Map<string, string>,
): Map<string, DayPlate> {
  return React.useMemo(() => {
    const out = new Map<string, DayPlate>();
    if (!items) return out;
    const bySection = new Map<string, ListItem[]>();
    for (const item of items) {
      const iso = isoBySection?.get(item.section);
      if (iso && item.itemDate && item.itemDate !== iso) continue;
      const list = bySection.get(item.section) ?? [];
      list.push(item);
      bySection.set(item.section, list);
    }
    bySection.forEach((dayItems, section) => {
      const dish = dayItems.find((i) => i.recipeGroupId && i.recipeName && !isTakeoutMealName(i.name));
      if (dish) {
        const rid = recipeIdFromGroup(dish.recipeGroupId!);
        const saved =
          (rid ? savedRecipes.find((r) => r.id === rid) : undefined) ??
          savedRecipes.find((r) => r.name.trim().toLowerCase() === dish.recipeName!.trim().toLowerCase());
        out.set(section, {
          kind: "dish",
          src: saved?.photoUrl ?? dish.stockPhotoUrl ?? null,
          freeze: dayItems.some((i) => i.recipeGroupId === dish.recipeGroupId && i.fromStock === true),
        });
        return;
      }
      const withPhotos = dayItems
        .map((i) => ({ name: i.name, photo: i.stockPhotoUrl ?? getPhoto(i.name) ?? null }))
        .filter((i): i is { name: string; photo: string } => Boolean(i.photo));
      out.set(
        section,
        withPhotos.length > 0 ? { kind: "loose", photos: selectCalendarPreviewItems(withPhotos).map((i) => i.photo) } : { kind: "empty" },
      );
    });
    return out;
  }, [items, savedRecipes, getPhoto, isoBySection]);
}

function EmptyPlate({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-full border-[1.6px] border-dashed border-[var(--blue-200)] bg-[var(--blue-25)]"
      style={{ width: size, height: size }}
    />
  );
}

function GeenFan({ compact }: { compact: boolean }) {
  const chip = compact ? 26 : 31;
  const step = compact ? 16 : 21;
  return (
    <span aria-hidden className="relative block" style={{ width: chip + step * 2, height: chip + 4 }}>
      {GEEN_FAN.map((src, i) => (
        <span
          key={src}
          className="absolute top-0.5 flex items-center justify-center rounded-full bg-[var(--white)] shadow-[0_3px_8px_-3px_rgba(16,17,48,0.3)]"
          style={{
            width: chip,
            height: chip,
            left: i * step,
            zIndex: i === 1 ? 2 : 1,
            transform: i === 0 ? "rotate(-12deg)" : i === 2 ? "rotate(10deg)" : "translateY(-4px)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale productfoto */}
          <img
            src={src}
            alt=""
            className="object-contain"
            style={{ width: chip * (i === 2 ? 0.9 : 0.7), height: chip * (i === 2 ? 0.9 : 0.7) }}
          />
        </span>
      ))}
    </span>
  );
}

export function AddItemsDayStrip({
  days,
  value,
  onChange,
  plates,
  compact,
}: {
  /** «Geen» + de zeven dagen, in de volgorde van het lijstje. */
  days: readonly DayStripOption[];
  value: string;
  onChange: (value: string) => void;
  plates: Map<string, DayPlate>;
  /** Mobiel: smallere tegels (68px) in een veegrij. */
  compact: boolean;
}) {
  const plateSize = compact ? 46 : 52;
  return (
    <div className={cn(compact ? "-mx-4 -my-1.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "")}>
      <div
        className={cn("gap-2", compact ? "flex w-max" : "grid grid-cols-8")}
        role="radiogroup"
        aria-label="Voor welke dag?"
      >
        {days.map((day) => {
          const active = value === day.value;
          const geen = day.value === "Geen";
          const plate = plates.get(day.value) ?? { kind: "empty" as const };
          return (
            <button
              key={day.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={geen ? "Geen dag, altijd nodig" : `${day.value}${day.date ? ` ${day.date}` : ""}`}
              onClick={() => onChange(day.value)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-[16px] transition-[box-shadow,background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                compact ? "h-[118px] w-[68px]" : "h-[124px] min-w-0",
                geen
                  ? "justify-center gap-1.5 bg-[linear-gradient(150deg,#edeefe,#fde7ef)] px-1 [[data-theme=dark]_&]:bg-[linear-gradient(150deg,var(--blue-50),var(--gray-50))]"
                  : "justify-start gap-1 pt-2.5",
                !geen && (active ? "bg-[var(--white)]" : "bg-[var(--gray-25)]"),
                active && "shadow-[0_0_0_2px_var(--blue-500),0_10px_22px_-12px_rgba(79,85,241,0.6)]",
              )}
            >
              {geen ? (
                <>
                  <GeenFan compact={compact} />
                  <span className={cn("text-[12.5px] font-extrabold leading-[15px]", active ? "text-[var(--blue-500)]" : "text-[var(--text-primary)]")}>
                    Geen dag
                  </span>
                  <span className="text-[10.5px] font-semibold leading-3 text-[var(--text-secondary)]">altijd nodig</span>
                </>
              ) : (
                <>
                  <span className={cn("text-[10.5px] font-extrabold tracking-[0.04em]", active ? "text-[var(--blue-500)]" : "text-[var(--text-tertiary)]")}>
                    {day.short}
                  </span>
                  <span className={cn("text-lg font-extrabold leading-5 tabular-nums", active ? "text-[var(--blue-500)]" : "text-[var(--text-primary)]")}>
                    {day.date ?? ""}
                  </span>
                  <span className="mt-1 flex">
                    {plate.kind === "dish" ? (
                      <CalendarDayPlate src={plate.src} size={plateSize - 4} freeze={plate.freeze} />
                    ) : plate.kind === "loose" ? (
                      <CalendarLoosePlate photos={plate.photos} size={plateSize} />
                    ) : (
                      <EmptyPlate size={plateSize - 8} />
                    )}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
