"use client";

import * as React from "react";
import { IngredientPlate } from "@/components/ingredient_plate";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import {
  buildCalendarEntries,
  addDays,
  toIsoDate,
  dayEntryHasContent,
  type CalendarMeal,
  type DayEntry,
} from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";

/** Aantal dagen vóór en na de middelste dag (canvas «Kalender 2»: vandaag in het midden). */
const DAYS_AROUND = 3;

const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoToDate(iso: string): Date | null {
  const [yy, mm, dd] = iso.split("-").map((x) => parseInt(x, 10));
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  return startOfDay(new Date(yy, mm - 1, dd));
}

/** Twee-letterige dagafkorting: MA, DI, WO, DO, VR, ZA, ZO */
function shortDayAbbr(date: Date): string {
  return date.toLocaleDateString("nl-NL", { weekday: "short" }).slice(0, 2).toUpperCase();
}

/** «28 sep – 4 okt», of «7 – 13 okt» binnen dezelfde maand. */
function formatRange(first: Date, last: Date): string {
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
  }
  return `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
}

function ingredientCountLabel(n: number): string {
  return n === 1 ? "1 ingrediënt" : `${n} ingrediënten`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChevronIcon({ direction, className }: { direction: "left" | "right" | "down"; className?: string }) {
  const d =
    direction === "left" ? "M10 3.5 5.5 8 10 12.5" : direction === "right" ? "M6 3.5 10.5 8 6 12.5" : "M3.5 6 8 10.5 12.5 6";
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-4 shrink-0", className)}>
      <path d={d} />
    </svg>
  );
}

function FreezerPill() {
  return (
    <span className="inline-flex h-5 items-center gap-1 self-start rounded-pill bg-[#e8f4fb] pl-1.5 pr-[7px] text-[11px] font-semibold text-[#2b7bb0] [[data-theme=dark]_&]:bg-[#1d3646] [[data-theme=dark]_&]:text-[#8cc8ec]">
      <span
        aria-hidden
        className="inline-block size-3 shrink-0 bg-current"
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
      />
      Diepvries
    </span>
  );
}

/** Ronde gerechtfoto: cirkelvormige crop, geen schaduw (zelfde als op Recepten). */
function MealPlate({ photoUrl }: { photoUrl: string | null }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-25)]">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL of lokale webp
        <img src={photoUrl} alt="" loading="lazy" decoding="async" className="size-[108%] max-w-none object-cover" />
      ) : (
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path d="M26 6H6C4.9 6 4 6.9 4 8v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 18H6V8h20v16zm-9-3l-4-5-3 4-2-2.5L5 21h22l-5-6-5 6z" fill="var(--blue-200,#b0b4f8)" />
        </svg>
      )}
    </span>
  );
}

function MealRow({ meal }: { meal: CalendarMeal }) {
  const content = (
    <span className="flex min-w-0 items-center gap-3">
      <MealPlate photoUrl={meal.photoUrl} />
      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="truncate text-[15px] font-semibold leading-5 text-text-primary">{meal.recipeName}</span>
        {meal.fromStock ? (
          <FreezerPill />
        ) : (
          <span className="text-xs leading-4 text-[var(--gray-400)]">{ingredientCountLabel(meal.ingredientCount)}</span>
        )}
      </span>
    </span>
  );
  return meal.recipeId ? (
    <Link
      href={`/recepten/${meal.recipeId}`}
      className="block rounded-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  ) : (
    content
  );
}

/** Dag met losse ingrediënten (geen recept): ingeklapt met «A, b +N», tik om alles te zien. */
function LooseIngredientsRow({
  ingredients,
  open,
  onToggle,
}: {
  ingredients: DayEntry["looseIngredients"];
  open: boolean;
  onToggle: () => void;
}) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const withPhotos = ingredients.map((ing) => ({ ...ing, photo: ing.photoUrl ?? getPhotoUrl(ing.name) ?? null }));
  const shown = withPhotos.slice(0, 2).map((ing, i) => (i === 0 ? capitalize(ing.name) : ing.name.toLowerCase()));
  const rest = withPhotos.length - shown.length;
  const panelId = React.useId();

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-w-0 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <IngredientPlate photos={withPhotos.map((i) => i.photo)} />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-[15px] font-semibold leading-5 text-text-primary">
            {shown.join(", ")}
            {rest > 0 ? <span className="text-[var(--blue-400)]"> +{rest}</span> : null}
          </span>
          <span className="text-xs leading-4 text-[var(--gray-400)]">{ingredientCountLabel(ingredients.length)} · geen recept</span>
        </span>
        <ChevronIcon
          direction="down"
          className={cn("text-[var(--blue-300)] motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-out-strong", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul id={panelId} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {withPhotos.map((ing, i) => (
            <li
              key={`${ing.name}-${i}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-[var(--gray-25)] pl-1 pr-2.5 text-[13px] text-text-primary"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-[var(--white)]">
                {ing.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- lokale ingrediënt-webp
                  <img src={ing.photo} alt="" className="size-5 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
                ) : null}
              </span>
              {capitalize(ing.name)}
              {ing.quantity ? <span className="text-[var(--gray-400)]">{ing.quantity}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DayRow({
  date,
  entry,
  isToday,
  looseOpen,
  onToggleLoose,
  rowRef,
}: {
  date: Date;
  entry: DayEntry | undefined;
  isToday: boolean;
  looseOpen: boolean;
  onToggleLoose: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
}) {
  const hasContent = dayEntryHasContent(entry);
  const label = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div
      ref={rowRef}
      aria-label={`${label}${isToday ? ", vandaag" : ""}`}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[16px] bg-[var(--white)] py-2.5 pl-2.5 pr-3.5 md:gap-3.5 md:rounded-[18px] md:py-3.5 md:pl-3.5 md:pr-5",
        isToday ? "shadow-[0_0_0_1.5px_var(--blue-500),0_0_0_4px_var(--blue-50)]" : "shadow-card",
      )}
    >
      <div className="flex w-10 shrink-0 flex-col items-center md:w-12" aria-hidden>
        <span className={cn("text-[11px] font-semibold leading-4", isToday ? "text-[var(--blue-500)]" : "text-[var(--text-secondary)]")}>
          {shortDayAbbr(date)}
        </span>
        <span className={cn("text-xl font-bold leading-6 tabular-nums", isToday ? "text-[var(--blue-500)]" : "text-text-primary")}>
          {date.getDate()}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {hasContent ? (
          <>
            {entry!.meals.map((meal) => (
              <MealRow key={meal.recipeGroupId} meal={meal} />
            ))}
            {entry!.looseIngredients.length > 0 ? (
              <LooseIngredientsRow ingredients={entry!.looseIngredients} open={looseOpen} onToggle={onToggleLoose} />
            ) : null}
          </>
        ) : (
          <span className="text-[13px] leading-[18px] text-[var(--text-tertiary)]">Nog niets gepland</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KalenderPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const ownerId = user?.id;
  const searchParams = useSearchParams();
  const targetDateIso = searchParams.get("date") ?? null;

  const todayKey = toIsoDate(startOfDay(new Date()));
  /** Middelste dag van de reeks: standaard vandaag, of de gelinkte ?date=. */
  const [centerIso, setCenterIso] = React.useState(() =>
    targetDateIso && isoToDate(targetDateIso) ? targetDateIso : todayKey,
  );
  const [looseOpen, setLooseOpen] = React.useState<Record<string, boolean>>({});

  const { isLoading: dataLoading, data } = db.useQuery(
    ownerId
      ? {
          lists: { $: { where: { ownerId } }, items: {} },
          recipes: {},
        }
      : null,
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const calendarMap = React.useMemo(() => {
    if (!data) return new Map<string, DayEntry>();
    return buildCalendarEntries(
      (data.lists ?? []) as Parameters<typeof buildCalendarEntries>[0],
      (data.recipes ?? []) as Parameters<typeof buildCalendarEntries>[1],
    );
  }, [data]);

  const calendarIsEmpty = React.useMemo(
    () => !Array.from(calendarMap.values()).some((entry) => dayEntryHasContent(entry)),
    [calendarMap],
  );

  const days = React.useMemo(() => {
    const center = isoToDate(centerIso) ?? startOfDay(new Date());
    return Array.from({ length: DAYS_AROUND * 2 + 1 }, (_, i) => startOfDay(addDays(center, i - DAYS_AROUND)));
  }, [centerIso]);

  const shiftWeek = (dir: -1 | 1) => {
    const center = isoToDate(centerIso) ?? startOfDay(new Date());
    setCenterIso(toIsoDate(addDays(center, dir * 7)));
  };

  if (authLoading || !user || dataLoading) return <PageSpinner />;

  const showsToday = days.some((d) => toIsoDate(d) === todayKey);
  const roundBtn =
    "flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_0_0_1px_var(--border-subtle),0_1px_3px_rgba(16,17,48,0.08)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-4">
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full min-w-0 max-w-[720px] flex-1 flex-col gap-2.5 motion-safe:animate-fade-up md:gap-3">
          <h1 className="text-page-title font-bold leading-8 tracking-normal text-text-primary">Kalender</h1>

          {calendarIsEmpty ? (
            <section className="flex min-h-[min(520px,calc(100dvh-12rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] flex-1 flex-col items-center justify-center">
              <div className="flex w-full max-w-[358px] flex-col items-center text-center">
                <div className="relative size-24 shrink-0 overflow-hidden">
                  <Image src="/images/ui/kalender_320.webp" alt="" width={320} height={320} className="size-full object-contain" priority />
                </div>
                <p className="mt-6 w-full text-base font-medium leading-6 tracking-normal text-[var(--gray-500)]">
                  Voeg items toe in je boodschappenlijstje op een weekdag en ze verschijnen hier in je kalender.
                </p>
              </div>
            </section>
          ) : (
            <>
              {/* Navigatie: vandaag in het midden, 3 dagen terug en 3 vooruit; pijlen schuiven een week. */}
              <div className="mb-2 mt-1.5 flex items-center justify-between gap-2.5">
                <button type="button" aria-label="Vorige week" onClick={() => shiftWeek(-1)} className={roundBtn}>
                  <ChevronIcon direction="left" />
                </button>
                <div className="flex min-w-0 flex-col items-center">
                  <span className="text-[17px] font-semibold leading-[22px] tracking-tight text-text-primary" aria-live="polite">
                    {formatRange(days[0], days[days.length - 1])}
                  </span>
                  {!showsToday ? (
                    <button
                      type="button"
                      onClick={() => setCenterIso(todayKey)}
                      className="rounded-pill px-2 text-[13px] font-medium leading-[18px] text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      Naar vandaag
                    </button>
                  ) : null}
                </div>
                <button type="button" aria-label="Volgende week" onClick={() => shiftWeek(1)} className={roundBtn}>
                  <ChevronIcon direction="right" />
                </button>
              </div>

              {days.map((day) => {
                const iso = toIsoDate(day);
                const isToday = iso === todayKey;
                return (
                  <DayRow
                    key={iso}
                    date={day}
                    entry={calendarMap.get(iso)}
                    isToday={isToday}
                    looseOpen={looseOpen[iso] ?? false}
                    onToggleLoose={() => setLooseOpen((prev) => ({ ...prev, [iso]: !(prev[iso] ?? false) }))}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
