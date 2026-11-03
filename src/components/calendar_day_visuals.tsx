"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { dayEntryHasContent, dishRole, isSoupName, selectCalendarPreviewItems, type CalendarMeal, type DayEntry } from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { eatingOutPhotoFor } from "@/lib/agenda_photos";

/**
 * Gedeelde bouwstenen voor kalenderdagen (startpagina en kalenderpagina): samenvatting van een dag,
 * rond receptbord, wit bord met losse producten en de sneeuwvlokbadge.
 */

/**
 * Bijgerecht op het bord: een ander gerecht (`dish`, met receptfoto) of een los item van die dag (`item`,
 * bv. naanbrood). Zonder eigen foto (`photo: null`) zoekt het bordje de productfoto op naam.
 */
export type CalendarSideDish = { name: string; photo: string | null; kind: "dish" | "item" };

/** Wat een klein bordje toont: een gerechtfoto, of een product dat op naam wordt opgezocht. */
export type SidePlatePhoto = string | { name: string };

export const sidePlatePhoto = (d: CalendarSideDish): SidePlatePhoto => d.photo ?? { name: d.name };

/**
 * Secundaire gerechten op het bord (tot drie): eerst de andere gerechten van die dag — de tweede
 * soep, of vlees en dan groenten bij een aardappelgerecht —, daarna de losse items (naanbrood, schnitzel…).
 */
function calendarSideDishes(meals: CalendarMeal[], loose: DayEntry["looseIngredients"]): CalendarSideDish[] {
  const [main, ...rest] = meals;
  if (!main || main.takeout) return [];
  const sides = rest.flatMap((m) =>
    // Zonder gerechtfoto (bv. een diepvriesschnitzel) zoekt het bordje de productfoto op naam.
    !m.takeout
      ? [{ name: m.recipeName, photo: m.photoUrl ?? null, role: dishRole(m.recipeName), soup: isSoupName(m.recipeName), forNoe: m.forNoe === true }]
      : [],
  );
  const rank = (d: (typeof sides)[number]) =>
    isSoupName(main.recipeName) ? (d.soup ? 0 : 1) : dishRole(main.recipeName) === "potato" ? (d.role === "meat" ? 0 : d.role === "vegetable" ? 1 : 2) : 0;
  const dishes = sides
    .map((d, i) => ({ d, i }))
    .sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i)
    .map(({ d }) => ({ side: { name: d.name, photo: d.photo, kind: "dish" } as CalendarSideDish, forNoe: d.forNoe }));
  const items = loose.map((i) => ({
    side: { name: i.name.replace(/\s*\(diepvries\)$/, "").trim(), photo: i.photoUrl ?? null, kind: "item" } as CalendarSideDish,
    forNoe: i.forNoe === true,
  }));
  // «Voor Noë» krijgt altijd een plaats; de rest vult aan tot drie.
  const all = [...dishes, ...items];
  const noe = all.filter((s) => s.forNoe).slice(0, 3);
  const others = all.filter((s) => !s.forNoe).slice(0, 3 - noe.length);
  return all.filter((s) => noe.includes(s) || others.includes(s)).map((s) => s.side);
}

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
      photo: meal.photoUrl ?? eatingOutPhotoFor(meal.recipeName),
      sides: calendarSideDishes(entry.meals, entry.looseIngredients),
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
  /** «restaurant», «gaan eten»…: de restaurantfoto als volledig bord in plaats van een leeg bord. */
  const eatingOut = items.map((i) => eatingOutPhotoFor(i.name)).find(Boolean) ?? null;
  return {
    title: items.length > 2 ? `${names.slice(0, 2).join(", ")} +${items.length - 2}` : names.join(", "),
    sub: items.length === 1 ? "1 item" : `${items.length} items`,
    photo: eatingOut as string | null,
    sides: [] as CalendarSideDish[],
    /** Losse items: bord met tot drie productfoto's (zoals op de kalenderpagina). */
    loose: eatingOut ? null : previewItems,
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

/**
 * Secundaire gerechten als kleinere cirkels die over de rand van het bord vallen: één rechtsonder,
 * twee of drie rond die hoek. De ouder is even groot als het bord (`size`) en `relative`.
 */
export function CalendarSidePlates({
  photos,
  size,
  angles,
}: {
  /** Gerechtfoto's, of `{ name }` voor een los item: dat bordje toont de productfoto (zonder foto: de beginletter). */
  photos: SidePlatePhoto[];
  size: number;
  /** Graden op de rand van het bord (0 = rechts, 90 = onder). */
  angles?: number[];
}) {
  const getItemPhoto = useItemPhotoUrl(160);
  const shown = photos
    .map((p) => (typeof p === "string" ? { src: p, product: false, name: "" } : { src: getItemPhoto(p.name) ?? null, product: true, name: p.name }))
    .slice(0, 3);
  const placed = angles ?? (shown.length > 2 ? [-5, 45, 95] : shown.length > 1 ? [15, 75] : [45]);
  const diameter = Math.round(size * (shown.length > 2 ? 0.32 : shown.length > 1 ? 0.36 : 0.44));
  return (
    <>
      {shown.map(({ src, product, name }, i) => {
        const angle = ((placed[i] ?? placed[0]) * Math.PI) / 180;
        const center = (axis: number) => size / 2 + size * 0.42 * axis - diameter / 2;
        return (
          <span
            key={`${src ?? name}-${i}`}
            className={cn(
              "absolute flex items-center justify-center overflow-hidden rounded-full border-2 border-[var(--white)] shadow-[0_2px_6px_rgba(16,17,48,0.2)]",
              src ? "bg-[var(--white)]" : "bg-[var(--blue-50)]",
            )}
            style={{ width: diameter, height: diameter, left: center(Math.cos(angle)), top: center(Math.sin(angle)) }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element -- data-URL of externe receptfoto
              <img
                src={src}
                alt=""
                decoding="async"
                loading="lazy"
                // Productfoto (uitgeknipt) past in het witte bordje; een gerechtfoto vult het.
                className={product ? "size-full object-contain p-[14%]" : "size-full scale-[1.08] object-cover"}
              />
            ) : (
              // Geen foto gevonden: de beginletter, zoals het monogram in het productveld.
              <span aria-hidden className="font-bold text-[var(--blue-500)]" style={{ fontSize: Math.round(diameter * 0.42) }}>
                {name.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}

export function CalendarDayPlate({
  src,
  size,
  freeze,
  shadow = false,
  sidePhotos = [],
}: {
  src: string | null;
  size: number;
  freeze: boolean;
  shadow?: boolean;
  /** Secundaire gerechten en losse items: kleinere cirkels die rechtsonder over het bord vallen. */
  sidePhotos?: SidePlatePhoto[];
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
      <CalendarSidePlates photos={sidePhotos} size={size} />
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
