"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { AppBottomNav } from "@/components/app_bottom_nav";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import {
  buildCalendarEntries,
  addDays,
  toIsoDate,
  dayEntryHasContent,
  type DayEntry,
  type CalendarMeal,
} from "@/lib/calendar-utils";

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
}: {
  date: Date;
  entry: DayEntry | undefined;
  isToday: boolean;
}) {
  const { weekday, dateStr } = formatDayHeader(date);
  const hasContent = dayEntryHasContent(entry);

  return (
    <div className="flex flex-col gap-2">
      {/* Dagheader */}
      <div className="flex items-center gap-2">
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
      </div>

      {/* Kaart met recepten + losse ingrediënten */}
      {hasContent ? (
        <div className="rounded-md bg-[var(--white)] px-4 shadow-[var(--shadow-drop)]">
          {entry!.meals.map((meal, i) => (
            <React.Fragment key={meal.recipeGroupId}>
              {i > 0 && (
                <div
                  className="h-px bg-[var(--gray-100)]"
                  aria-hidden
                />
              )}
              <RecipeMealRow meal={meal} />
            </React.Fragment>
          ))}
          {entry!.looseIngredients.length > 0 && (
            <div
              className={cn(
                entry!.meals.length > 0 &&
                  "border-t border-[var(--gray-100)]",
              )}
            >
              <LooseIngredientsBlock
                ingredients={entry!.looseIngredients}
              />
            </div>
          )}
        </div>
      ) : (
        /* Lege dag: subtiele stippellijn */
        <div
          className="h-px w-full border-t border-dashed border-[var(--gray-100)]"
          aria-hidden
        />
      )}
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

  const { isLoading: dataLoading, data } = db.useQuery(
    ownerId
      ? {
          lists: { $: { where: { ownerId } }, items: {} },
          recipes: {},
          profiles: { $: { where: { instantUserId: ownerId } } },
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

  if (authLoading || !user || dataLoading) return <PageSpinner />;

  const profileData = ((data?.profiles ?? []) as Record<string, unknown>[])[0];
  const profileAvatarUrl =
    typeof profileData?.avatarUrl === "string" ? profileData.avatarUrl : null;
  const profileFirstName =
    typeof profileData?.firstName === "string" ? profileData.firstName : null;

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

          {/* Dagkaarten */}
          <div className="flex flex-col gap-5">
            {displayDays.map((day) => {
              const iso = toIsoDate(day);
              return (
                <DayCard
                  key={iso}
                  date={day}
                  entry={calendarMap.get(iso)}
                  isToday={iso === todayKey}
                />
              );
            })}
          </div>
        </div>
      </div>

      <AppBottomNav
        active="kalender"
        profileAvatarUrl={profileAvatarUrl}
        profileFirstName={profileFirstName}
      />
    </div>
  );
}
