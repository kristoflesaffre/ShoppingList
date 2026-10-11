"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { dayEntryHasContent, selectCalendarPreviewItems, type DayEntry } from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";

/**
 * Gedeelde bouwstenen voor kalenderdagen (startpagina en kalenderpagina): samenvatting van een dag,
 * rond receptbord, wit bord met losse producten en de sneeuwvlokbadge.
 */

/** Samenvatting van een kalenderdag (gerecht of losse items). */
export function calendarDaySummary(isoDate: string, entry: DayEntry | null) {
  if (!entry || !dayEntryHasContent(entry)) return null;
  const meal = entry.meals[0] ?? null;
  if (meal) {
    const extra = entry.meals.length - 1;
    return {
      title: meal.recipeName,
      sub: meal.fromStock
        ? "Uit de diepvries"
        : meal.takeout
          ? "Afhalen"
        : extra > 0
          ? `+ ${extra} ${extra === 1 ? "gerecht" : "gerechten"}`
          : meal.ingredientCount === 1
            ? "1 ingrediënt"
            : `${meal.ingredientCount} ingrediënten`,
      photo: meal.photoUrl,
      loose: null as DayEntry["looseIngredients"] | null,
      fromStock: meal.fromStock === true,
      href: meal.recipeId ? `/recepten/${meal.recipeId}` : `/kalender?date=${isoDate}`,
      recipeId: meal.recipeId ?? null,
    };
  }
  const items = entry.looseIngredients;
  const previewItems = selectCalendarPreviewItems(items);
  const first = items.find((i) => i.photoUrl) ?? items[0];
  const names = previewItems.map((i) => i.name);
  return {
    title: items.length > 2 ? `${names.slice(0, 2).join(", ")} +${items.length - 2}` : names.join(", "),
    sub: items.length === 1 ? "1 item" : `${items.length} items`,
    photo: null as string | null,
    /** Losse items: bord met tot drie productfoto's (zoals op de kalenderpagina). */
    loose: previewItems,
    fromStock: first?.fromStock === true,
    href: `/kalender?date=${isoDate}`,
    recipeId: null as string | null,
  };
}

export function CalendarFreezeBadge({ size = 20 }: { size?: number }) {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.15)]"
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="inline-block bg-[var(--blue-500)]"
        style={{
          width: Math.round(size * 0.6),
          height: Math.round(size * 0.6),
          WebkitMaskImage: "url(/icons/freeze.svg)",
          maskImage: "url(/icons/freeze.svg)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </span>
  );
}

export function CalendarDayPlate({
  src,
  size,
  freeze,
  shadow = false,
}: {
  src: string | null;
  size: number;
  freeze: boolean;
  shadow?: boolean;
}) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span
        data-hero-plate
        className={cn(
          "block size-full overflow-hidden rounded-full",
          !src && "bg-[var(--gray-25)]",
          shadow && "shadow-[0_10px_24px_-12px_rgba(16,17,48,0.35)]",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL of externe receptfoto
          <img
            src={src}
            alt=""
            decoding="async"
            loading="lazy"
            className="size-full scale-[1.08] object-cover"
          />
        ) : null}
      </span>
      {freeze ? <CalendarFreezeBadge size={Math.max(18, Math.round(size / 4))} /> : null}
    </span>
  );
}

/** Foto's voor losse items: eigen (diepvries)foto of de productfoto bij de naam. */
export function useLoosePhotos(loose: DayEntry["looseIngredients"] | null | undefined): (string | null)[] {
  const getItemPhoto = useItemPhotoUrl(160);
  const withPhotos = (loose ?? []).map((item) => ({
    ...item,
    photo: item.photoUrl ?? getItemPhoto(item.name) ?? null,
  }));
  return selectCalendarPreviewItems(withPhotos.filter((item) => item.photo)).map(
    (item) => item.photo,
  );
}

const TRIO_SLOTS = [
  { x: -20, y: -12, r: -10, s: 0.4, z: 1 },
  { x: 21, y: -9, r: 9, s: 0.4, z: 2 },
  { x: 0, y: 17, r: -3, s: 0.44, z: 3 },
] as const;

/** Drie ingrediëntfoto's gestapeld op een bord of in de lege-dagcirkel. */
export function CalendarDayTrio({ photos, size, faded = false }: { photos: (string | null)[]; size: number; faded?: boolean }) {
  return (
    <>
      {photos
        .filter((src): src is string => Boolean(src))
        .slice(0, 3)
        .map((src, i) => {
          const slot = TRIO_SLOTS[i];
          const px = Math.round(size * slot.s);
          const k = size / 100;
          return (
            // eslint-disable-next-line @next/next/no-img-element -- lokale ingrediënt-webp
            <img
              key={src + i}
              src={src}
              alt=""
              decoding="async"
              loading="lazy"
              className={cn(
                "absolute left-1/2 top-1/2 object-contain drop-shadow-[0_3px_4px_rgba(16,17,48,0.16)]",
                faded && "opacity-50",
              )}
              style={{
                width: px,
                height: px,
                zIndex: slot.z,
                transform: `translate(-50%, -50%) translate(${slot.x * k}px, ${slot.y * k}px) rotate(${slot.r}deg)`,
              }}
            />
          );
        })}
    </>
  );
}

/** Gekozen losse items: echt wit bord met de producten erop. */
export function CalendarLoosePlate({ photos, size }: { photos: (string | null)[]; size: number }) {
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale bordafbeelding */}
      <img
        src="/images/ui/bord_wit_240.webp"
        alt=""
        decoding="async"
        className="absolute inset-0 size-full drop-shadow-[0_6px_10px_rgba(16,17,48,0.16)]"
      />
      <CalendarDayTrio photos={photos} size={size} />
    </span>
  );
}


export type CalendarDaySummary = NonNullable<ReturnType<typeof calendarDaySummary>>;
