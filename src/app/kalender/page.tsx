"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { RecipeTile } from "@/components/ui/recipe_tile";
import {
  buildCalendarEntries,
  addDays,
  toIsoDate,
  dayEntryHasContent,
  getMondayOfWeek,
  type DayEntry,

} from "@/lib/calendar-utils";
import { useIngredientPhotoUrl } from "@/lib/ingredient-photos";

/** Ruimte boven/onder inhoud (matcht padding op kalender-container). */
const CAL_SCROLL_TOP_RESERVE_PX = 52;
const CAL_SCROLL_BOTTOM_RESERVE_PX = 195;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Twee-letterige dagafkorting: MA, DI, WO, DO, VR, ZA, ZO */
function shortDayAbbr(date: Date): string {
  return date.toLocaleDateString("nl-NL", { weekday: "short" }).slice(0, 2).toUpperCase();
}

/** ISO-weeknummer (1–53) voor een gegeven datum. */
function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

/** Ma–zo van dezelfde week; kort label voor weekkop. */
function formatWeekSectionTitle(monday: Date): string {
  const sunday = addDays(monday, 6);
  const sameMonth =
    monday.getMonth() === sunday.getMonth() &&
    monday.getFullYear() === sunday.getFullYear();
  if (sameMonth) {
    const month = monday.toLocaleDateString("nl-NL", { month: "long" });
    return `${monday.getDate()}–${sunday.getDate()} ${month}`;
  }
  const a = monday.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
  const b = sunday.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
  return `${a} – ${b}`;
}

function groupDisplayDaysByWeek(sortedDays: Date[]): {
  mondayIso: string;
  monday: Date;
  days: Date[];
}[] {
  const groups: { mondayIso: string; monday: Date; days: Date[] }[] = [];
  let cur: { mondayIso: string; monday: Date; days: Date[] } | null = null;
  for (const d of sortedDays) {
    const monday = startOfDay(getMondayOfWeek(d));
    const iso = toIsoDate(monday);
    if (!cur || cur.mondayIso !== iso) {
      cur = { mondayIso: iso, monday, days: [] };
      groups.push(cur);
    }
    cur.days.push(startOfDay(d));
  }
  return groups;
}

/** Centreert element in het zichtbare midden (niet onder de bottom nav). */
function scrollElementToComfortableCenter(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const elCenterY = rect.top + rect.height / 2;
  const vv = window.visualViewport;
  const vh = vv?.height ?? window.innerHeight;
  const vTop = vv?.offsetTop ?? 0;
  const usableTop = vTop + CAL_SCROLL_TOP_RESERVE_PX;
  const usableBottom = vTop + vh - CAL_SCROLL_BOTTOM_RESERVE_PX;
  const visibleCenterY = (usableTop + usableBottom) / 2;
  const delta = elCenterY - visibleCenterY;
  window.scrollBy({ top: delta, left: 0, behavior: "auto" });
}

function dayCollapsedSummary(entry: DayEntry | undefined): string {
  if (!entry) return "";
  if (entry.meals.length > 0) {
    return entry.meals.map((m) => m.recipeName).join(", ");
  }
  if (entry.looseIngredients.length > 0) {
    return entry.looseIngredients.map((i) => i.name).join(", ");
  }
  return "";
}

function ChevronDownIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cn(
        "shrink-0 text-[var(--blue-500)] transition-transform duration-200",
        expanded && "rotate-180",
      )}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------


function LooseIngredientPhotoGrid({
  ingredients,
}: {
  ingredients: { name: string; quantity: string }[];
}) {
  const getPhotoUrl = useIngredientPhotoUrl();
  if (ingredients.length === 0) return null;
  return (
    <div className="py-3">
      <div className="grid w-full grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-6">
        {ingredients.map((ing, i) => {
          const photoUrl = getPhotoUrl(ing.name, ing.quantity);
          return (
            <div key={i} className="flex min-w-0 flex-col items-center gap-2">
              <div className="relative aspect-square w-full overflow-hidden rounded-sm">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- lokale ingrediënt-webp: Next/Image optimizer faalt op sommige iOS-builds
                  <img
                    src={photoUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain"
                    aria-hidden
                    decoding="async"
                  />
                ) : null}
              </div>
              <div className="w-full text-center">
                <p className="break-words text-[13px] font-medium leading-5 text-[var(--text-primary)]">
                  {ing.name}
                </p>
                <p className="text-[13px] font-normal leading-5 text-[var(--text-secondary)]">
                  {ing.quantity}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayCard({
  date,
  entry,
  isToday,
  collapsible,
  bodyOpen,
  onToggleBody,
  isLast,
}: {
  date: Date;
  entry: DayEntry | undefined;
  isToday: boolean;
  collapsible?: boolean;
  bodyOpen?: boolean;
  onToggleBody?: () => void;
  isLast?: boolean;
}) {
  const abbr = shortDayAbbr(date);
  const hasContent = dayEntryHasContent(entry);
  const expanded = collapsible ? (bodyOpen ?? false) : true;
  const summary = dayCollapsedSummary(entry);

  // Compacte headerrij: afkorting + samenvatting + Vandaag-badge + chevron
  const headerContent = (
    <>
      <span className="w-[35px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-bold leading-5 text-text-primary">
        {abbr}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-normal leading-5 text-[var(--gray-400)]">
        {summary}
      </span>
      {isToday ? (
        <span className="shrink-0 rounded bg-[var(--blue-500)] px-2 py-1 text-[10px] font-medium leading-3 text-white">
          Vandaag
        </span>
      ) : null}
    </>
  );

  const body = hasContent ? (
    <div className="flex flex-col gap-2">
      {entry!.meals.map((meal) => {
        const tile = (
          <RecipeTile
            recipeName={meal.recipeName}
            itemCount={`${meal.ingredientCount} ${meal.ingredientCount === 1 ? "ingrediënt" : "ingrediënten"}`}
            photoUrl={meal.photoUrl}
            state="bare"
          />
        );
        return meal.recipeId ? (
          <Link
            key={meal.recipeGroupId}
            href={`/recepten/${meal.recipeId}`}
            className="block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-md"
          >
            {tile}
          </Link>
        ) : (
          <div key={meal.recipeGroupId}>{tile}</div>
        );
      })}
      {entry!.looseIngredients.length > 0 && (
        <LooseIngredientPhotoGrid ingredients={entry!.looseIngredients} />
      )}
    </div>
  ) : null;

  if (collapsible && onToggleBody) {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onToggleBody}
          aria-expanded={expanded}
          className="flex w-full min-w-0 items-center gap-3 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
        >
          {headerContent}
          <ChevronDownIcon expanded={expanded} />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="-mr-3 overflow-hidden pr-3">
            <div className="pb-3">{body}</div>
          </div>
        </div>
        {!isLast && <div className="h-px bg-[var(--gray-100)]" aria-hidden />}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 pb-3">
        {headerContent}
        {hasContent ? <ChevronDownIcon expanded={true} /> : null}
      </div>
      {body ? <div className="pb-3">{body}</div> : null}
      {!isLast && <div className="h-px bg-[var(--gray-100)]" aria-hidden />}
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

  /** Initieel ~4 weken terug; verder verleden via bovenste sentinel. */
  const [startOffset, setStartOffset] = React.useState(-28);

  const searchParams = useSearchParams();
  const targetDateIso = searchParams.get("date") ?? null;
  const targetWeekMondayIso = React.useMemo(() => {
    if (!targetDateIso) return null;
    const [yy, mm, dd] = targetDateIso.split("-").map((x) => parseInt(x, 10));
    if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
    return toIsoDate(getMondayOfWeek(new Date(yy, mm - 1, dd)));
  }, [targetDateIso]);

  const topSentinelRef = React.useRef<HTMLDivElement>(null);
  const prependRef = React.useRef<{ scrollHeight: number } | null>(null);
  const todayRowRef = React.useRef<HTMLDivElement | null>(null);
  const hasCenteredTodayRef = React.useRef(false);
  const targetDayRef = React.useRef<HTMLDivElement | null>(null);
  const hasCenteredTargetRef = React.useRef(false);
  const [weekExpanded, setWeekExpanded] = React.useState<
    Record<string, boolean>
  >({});
  const [dayBodyOpen, setDayBodyOpen] = React.useState<
    Record<string, boolean>
  >({});

  const { isLoading: dataLoading, data } = db.useQuery(
    ownerId
      ? {
          lists: { $: { where: { ownerId } }, items: {} },
          recipes: {},
        }
      : null,
  );

  // Auth redirect
  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  // Scroll-positie corrigeren na prepend (vóór paint)
  React.useLayoutEffect(() => {
    if (prependRef.current) {
      const newHeight = document.documentElement.scrollHeight;
      window.scrollBy(0, newHeight - prependRef.current.scrollHeight);
      prependRef.current = null;
    }
  });

  // Bovenste sentinel: laad meer verleden
  React.useEffect(() => {
    const el = topSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          prependRef.current = {
            scrollHeight: document.documentElement.scrollHeight,
          };
          setStartOffset((prev) => prev - 7);
        }
      },
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const calendarMap = React.useMemo(() => {
    if (!data) return new Map<string, DayEntry>();
    return buildCalendarEntries(
      (data.lists ?? []) as Parameters<typeof buildCalendarEntries>[0],
      (data.recipes ?? []) as Parameters<typeof buildCalendarEntries>[1],
    );
  }, [data]);

  const todayKey = toIsoDate(startOfDay(new Date()));

  const displayDays = React.useMemo(() => {
    const [yy, mm, dd] = todayKey.split("-").map((x) => parseInt(x, 10));
    const todayDate = startOfDay(new Date(yy, mm - 1, dd));
    const past: Date[] = [];
    for (let i = startOffset; i <= 0; i++) {
      const d = startOfDay(addDays(todayDate, i));
      if (dayEntryHasContent(calendarMap.get(toIsoDate(d)))) {
        past.push(d);
      }
    }
    const future: Date[] = [];
    for (const [iso, entry] of Array.from(calendarMap.entries())) {
      if (iso <= todayKey) continue;
      if (!dayEntryHasContent(entry)) continue;
      future.push(startOfDay(entry.date));
    }
    future.sort((a, b) => a.getTime() - b.getTime());
    return [...past, ...future];
  }, [startOffset, calendarMap, todayKey]);

  const currentWeekMondayIso = React.useMemo(() => {
    const [yy, mm, dd] = todayKey.split("-").map((x) => parseInt(x, 10));
    const todayDate = startOfDay(new Date(yy, mm - 1, dd));
    return toIsoDate(startOfDay(getMondayOfWeek(todayDate)));
  }, [todayKey]);

  const weekGroups = React.useMemo(
    () => groupDisplayDaysByWeek(displayDays),
    [displayDays],
  );

  const getWeekIsOpen = React.useCallback(
    (mondayIso: string) =>
      weekExpanded[mondayIso] ??
      (mondayIso >= currentWeekMondayIso || mondayIso === targetWeekMondayIso),
    [weekExpanded, currentWeekMondayIso, targetWeekMondayIso],
  );

  const toggleWeek = React.useCallback(
    (mondayIso: string) => {
      setWeekExpanded((prev) => {
        const def = mondayIso >= currentWeekMondayIso;
        const cur = prev[mondayIso] ?? def;
        return { ...prev, [mondayIso]: !cur };
      });
    },
    [currentWeekMondayIso],
  );

  const getDayBodyOpen = React.useCallback(
    (iso: string, collapsible: boolean) => {
      if (!collapsible) return true;
      if (iso === targetDateIso) return true;
      return dayBodyOpen[iso] ?? false;
    },
    [dayBodyOpen, targetDateIso],
  );

  const toggleDayBody = React.useCallback((iso: string) => {
    setDayBodyOpen((prev) => ({
      ...prev,
      [iso]: !(prev[iso] ?? false),
    }));
  }, []);

  /** Eén keer: vandaag in het midden van het zichtbare gebied (t.o.v. bottom nav). */
  React.useLayoutEffect(() => {
    // Als er een target-datum is, scrol daarheen i.p.v. naar vandaag.
    if (targetDateIso) return;
    if (hasCenteredTodayRef.current || prependRef.current) return;
    if (!todayRowRef.current) return;
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled || !todayRowRef.current) return;
        scrollElementToComfortableCenter(todayRowRef.current);
        hasCenteredTodayRef.current = true;
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [displayDays, targetDateIso]);

  /** Eén keer: scroll naar de gelinkte dag als ?date= aanwezig is. */
  React.useLayoutEffect(() => {
    if (!targetDateIso) return;
    if (hasCenteredTargetRef.current || prependRef.current) return;
    if (!targetDayRef.current) return;
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled || !targetDayRef.current) return;
        scrollElementToComfortableCenter(targetDayRef.current);
        hasCenteredTargetRef.current = true;
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [displayDays, targetDateIso]);

  if (authLoading || !user || dataLoading) return <PageSpinner />;

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-[16px]">
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full min-w-0 max-w-[956px] flex-1 flex-col gap-6">
          {/* Paginatitel */}
          <h1 className="text-page-title font-bold leading-8 tracking-normal text-text-primary">
            Kalender
          </h1>

          {/* Bovenste sentinel voor infinite scroll omhoog */}
          <div ref={topSentinelRef} className="h-px" aria-hidden />

          {/* Weken (inklapbaar); binnen huidige week zijn eerdere dagen ingeklapt. */}
          <div className="flex flex-col gap-3">
            {weekGroups.map(({ mondayIso, monday, days }) => {
              const wkOpen = getWeekIsOpen(mondayIso);
              const panelId = `kalender-week-${mondayIso}`;
              const isCurrentWeek = mondayIso === currentWeekMondayIso;
              const weekNumber = getISOWeekNumber(monday);
              return (
                <section key={mondayIso}>
                  <div className="flex flex-col rounded-[8px] border border-[var(--gray-100)] bg-[var(--white)] p-3">
                    <button
                      type="button"
                      id={`${panelId}-toggle`}
                      aria-expanded={wkOpen}
                      aria-controls={panelId}
                      onClick={() => toggleWeek(mondayIso)}
                      className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                    >
                      {/* WEEK-badge */}
                      <div className="flex shrink-0 flex-col items-center gap-px rounded-[4px] bg-[var(--blue-25)] px-2 py-1">
                        <span className="text-[8px] font-semibold leading-[8px] text-[var(--blue-500)]">
                          WEEK
                        </span>
                        <span className="text-[18px] font-bold leading-[18px] text-text-primary">
                          {weekNumber}
                        </span>
                      </div>
                      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-medium leading-6 text-text-primary">
                        {formatWeekSectionTitle(monday)}
                      </span>
                      <ChevronDownIcon expanded={wkOpen} />
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={`${panelId}-toggle`}
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-in-out",
                        wkOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="-mr-3 overflow-hidden pr-3">
                        <div className="flex flex-col gap-3 pl-4 pt-3">
                          {/* Separator bovenaan eerste dag */}
                          <div className="h-px bg-[var(--gray-100)]" aria-hidden />
                          {days.map((day, dayIdx) => {
                          const iso = toIsoDate(day);
                          const isToday = iso === todayKey;
                          const isOlderWeek = mondayIso < currentWeekMondayIso;
                          const collapsible =
                            isOlderWeek || (isCurrentWeek && iso < todayKey);
                          const isLast = dayIdx === days.length - 1;
                          const isTarget = iso === targetDateIso;
                          return (
                            <div
                              key={iso}
                              ref={
                                isTarget
                                  ? targetDayRef
                                  : isToday
                                    ? todayRowRef
                                    : undefined
                              }
                              className={cn((isToday || isTarget) && "scroll-mt-4")}
                            >
                              <DayCard
                                date={day}
                                entry={calendarMap.get(iso)}
                                isToday={isToday}
                                collapsible={collapsible}
                                bodyOpen={getDayBodyOpen(iso, collapsible)}
                                onToggleBody={
                                  collapsible
                                    ? () => toggleDayBody(iso)
                                    : undefined
                                }
                                isLast={isLast}
                              />
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
