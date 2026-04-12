"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import {
  buildCalendarEntries,
  addDays,
  toIsoDate,
  dayEntryHasContent,
  getMondayOfWeek,
  type DayEntry,
  type CalendarMeal,
} from "@/lib/calendar-utils";

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

function formatDayHeader(date: Date): { weekday: string; dateStr: string } {
  const weekday = date.toLocaleDateString("nl-NL", { weekday: "long" });
  const dateStr = date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
  });
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    dateStr,
  };
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
  if (!dayEntryHasContent(entry)) return "Geen planning";
  const m = entry!.meals.length;
  const l = entry!.looseIngredients.length;
  const bits: string[] = [];
  if (m > 0) bits.push(`${m} ${m === 1 ? "recept" : "recepten"}`);
  if (l > 0) bits.push("losse ingrediënten");
  return bits.join(" · ");
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
        "shrink-0 text-[var(--gray-500)] transition-transform duration-200",
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

function ChefHatPlaceholder() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-[var(--blue-300)]"
    >
      <path
        d="M12 3C9.24 3 7 5.24 7 8C7 9.56 7.7 10.96 8.8 11.9V15H15.2V11.9C16.3 10.96 17 9.56 17 8C17 5.24 14.76 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M8.8 15H15.2V17C15.2 17.55 14.75 18 14.2 18H9.8C9.25 18 8.8 17.55 8.8 17V15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function RecipeMealRow({ meal }: { meal: CalendarMeal }) {
  const content = (
    <div className="flex items-center gap-3 py-3">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-[var(--blue-25)]">
        {meal.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.photoUrl}
            alt=""
            width={48}
            height={48}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex size-full items-center justify-center">
            <ChefHatPlaceholder />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0">
        <span className="truncate text-base font-medium leading-6 text-text-primary">
          {meal.recipeName}
        </span>
        <span className="text-sm font-normal leading-5 text-[var(--gray-400)]">
          {meal.ingredientCount}{" "}
          {meal.ingredientCount === 1 ? "ingrediënt" : "ingrediënten"}
        </span>
      </div>
    </div>
  );

  if (meal.recipeId) {
    return (
      <Link
        href={`/recepten/${meal.recipeId}`}
        className="block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }
  return <div>{content}</div>;
}

function LooseIngredientsBlock({
  ingredients,
}: {
  ingredients: { name: string; quantity: string }[];
}) {
  if (ingredients.length === 0) return null;
  return (
    <div className="pt-1">
      <div className="flex items-center gap-1.5 pb-2">
        <span className="h-px flex-1 bg-[var(--gray-100)]" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--text-tertiary)]">
          Losse ingrediënten
        </span>
        <span className="h-px flex-1 bg-[var(--gray-100)]" aria-hidden />
      </div>
      <div className="flex flex-col gap-1 pb-1">
        {ingredients.map((ing, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className="text-sm leading-5 text-text-primary">
              {ing.name}
            </span>
            {ing.quantity ? (
              <span className="text-sm leading-5 text-[var(--gray-400)]">
                ({ing.quantity})
              </span>
            ) : null}
          </div>
        ))}
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
}: {
  date: Date;
  entry: DayEntry | undefined;
  isToday: boolean;
  /** Alleen in huidige week: eerdere dagen inklapbaar. */
  collapsible?: boolean;
  bodyOpen?: boolean;
  onToggleBody?: () => void;
}) {
  const { weekday, dateStr } = formatDayHeader(date);
  const hasContent = dayEntryHasContent(entry);
  const expanded = collapsible ? (bodyOpen ?? false) : true;

  const headerRow = (
    <>
      {isToday ? (
        <span className="size-2 shrink-0 rounded-full bg-[var(--blue-500)]" aria-hidden />
      ) : null}
      <span
        className={cn(
          "text-[11px] font-semibold uppercase leading-4 tracking-[0.7px]",
          isToday ? "text-[var(--blue-500)]" : "text-[var(--text-tertiary)]",
        )}
      >
        {weekday}
      </span>
      <span
        className={cn(
          "text-[11px] leading-4",
          isToday
            ? "font-medium text-[var(--blue-400)]"
            : "font-normal text-[var(--text-quaternary,var(--gray-400))]",
        )}
      >
        {dateStr}
      </span>
      {isToday ? (
        <span className="ml-auto rounded-pill bg-[var(--blue-500)] px-2 py-0.5 text-[11px] font-semibold leading-4 text-white">
          Vandaag
        </span>
      ) : null}
    </>
  );

  const body =
    hasContent ? (
      <div className="rounded-md bg-[var(--white)] px-4 shadow-[var(--shadow-drop)]">
        {entry!.meals.map((meal, i) => (
          <React.Fragment key={meal.recipeGroupId}>
            {i > 0 && (
              <div className="h-px bg-[var(--gray-100)]" aria-hidden />
            )}
            <RecipeMealRow meal={meal} />
          </React.Fragment>
        ))}
        {entry!.looseIngredients.length > 0 && (
          <div
            className={cn(
              entry!.meals.length > 0 && "border-t border-[var(--gray-100)]",
            )}
          >
            <LooseIngredientsBlock ingredients={entry!.looseIngredients} />
          </div>
        )}
      </div>
    ) : (
      <div
        className="h-px w-full border-t border-dashed border-[var(--gray-100)]"
        aria-hidden
      />
    );

  if (collapsible && onToggleBody) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onToggleBody}
          aria-expanded={expanded}
          className="flex w-full min-w-0 items-center gap-2 rounded-md py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
        >
          {headerRow}
          <span className="ml-auto">
            <ChevronDownIcon expanded={expanded} />
          </span>
        </button>
        {!expanded ? (
          <p className="pl-0 text-sm leading-5 text-[var(--gray-500)]">
            {dayCollapsedSummary(entry)}
          </p>
        ) : (
          body
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">{headerRow}</div>
      {body}
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

  const topSentinelRef = React.useRef<HTMLDivElement>(null);
  const prependRef = React.useRef<{ scrollHeight: number } | null>(null);
  const todayRowRef = React.useRef<HTMLDivElement | null>(null);
  const hasCenteredTodayRef = React.useRef(false);
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
      past.push(startOfDay(addDays(todayDate, i)));
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
      weekExpanded[mondayIso] ?? mondayIso >= currentWeekMondayIso,
    [weekExpanded, currentWeekMondayIso],
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
    (iso: string, pastInCurrentWeek: boolean) => {
      if (!pastInCurrentWeek) return true;
      return dayBodyOpen[iso] ?? false;
    },
    [dayBodyOpen],
  );

  const toggleDayBody = React.useCallback((iso: string) => {
    setDayBodyOpen((prev) => ({
      ...prev,
      [iso]: !(prev[iso] ?? false),
    }));
  }, []);

  /** Eén keer: vandaag in het midden van het zichtbare gebied (t.o.v. bottom nav). */
  React.useLayoutEffect(() => {
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
  }, [displayDays]);

  if (authLoading || !user || dataLoading) return <PageSpinner />;

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-4">
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-6">
          {/* Paginatitel */}
          <h1 className="text-page-title font-bold leading-8 tracking-normal text-text-primary">
            Kalender
          </h1>

          {/* Bovenste sentinel voor infinite scroll omhoog */}
          <div ref={topSentinelRef} className="h-px" aria-hidden />

          {/* Weken (inklapbaar); binnen huidige week zijn eerdere dagen ingeklapt. */}
          <div className="flex flex-col gap-6">
            {weekGroups.map(({ mondayIso, monday, days }) => {
              const wkOpen = getWeekIsOpen(mondayIso);
              const panelId = `kalender-week-${mondayIso}`;
              const isCurrentWeek = mondayIso === currentWeekMondayIso;
              return (
                <section key={mondayIso} className="flex flex-col gap-4">
                  <button
                    type="button"
                    id={`${panelId}-toggle`}
                    aria-expanded={wkOpen}
                    aria-controls={panelId}
                    onClick={() => toggleWeek(mondayIso)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left",
                      "bg-[var(--gray-100)] text-text-primary",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.6px] text-[var(--text-tertiary)]">
                      Week
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-5">
                      {formatWeekSectionTitle(monday)}
                    </span>
                    <ChevronDownIcon expanded={wkOpen} />
                  </button>
                  {wkOpen ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={`${panelId}-toggle`}
                      className="flex flex-col gap-5 border-l-2 border-[var(--gray-100)] pl-3"
                    >
                      {days.map((day) => {
                        const iso = toIsoDate(day);
                        const isToday = iso === todayKey;
                        const pastInCurrentWeek =
                          isCurrentWeek && iso < todayKey;
                        return (
                          <div
                            key={iso}
                            ref={isToday ? todayRowRef : undefined}
                            className={cn(isToday && "scroll-mt-4")}
                          >
                            <DayCard
                              date={day}
                              entry={calendarMap.get(iso)}
                              isToday={isToday}
                              collapsible={pastInCurrentWeek}
                              bodyOpen={getDayBodyOpen(iso, pastInCurrentWeek)}
                              onToggleBody={
                                pastInCurrentWeek
                                  ? () => toggleDayBody(iso)
                                  : undefined
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
