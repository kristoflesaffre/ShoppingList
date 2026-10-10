"use client";

import * as React from "react";
import Link from "next/link";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { cn } from "@/lib/utils";

export type DashboardMeal = {
  title: string;
  subtitle: string;
  href: string;
  photoUrl: string | null;
  fromStock: boolean;
  items: Array<{ name: string; photoUrl?: string | null }>;
};

type GoogleEvent = {
  id: string;
  title: string;
  location: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
};

type GoogleEmail = {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

type GoogleDashboardState = {
  configured: boolean;
  connected: boolean;
  events: GoogleEvent[];
  emails: GoogleEmail[];
};

function DashboardMaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
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

function MealVisual({ meal, large = false }: { meal: DashboardMeal; large?: boolean }) {
  const getPhotoUrl = useItemPhotoUrl(320);
  const itemPhotos = meal.items
    .map((item) => item.photoUrl ?? getPhotoUrl(item.name))
    .filter((photo): photo is string => Boolean(photo))
    .slice(0, 3);
  const sizeClass = large ? "size-[clamp(180px,21vw,260px)]" : "size-24";

  if (meal.photoUrl) {
    return (
      <span className={cn("relative block shrink-0", sizeClass)}>
        <span className="block size-full overflow-hidden rounded-full bg-[var(--gray-25)] shadow-[0_18px_42px_-24px_rgba(16,17,48,0.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- bestaande receptfoto uit de appdata */}
          <img src={meal.photoUrl} alt="" className="size-full scale-[1.04] object-cover" decoding="async" />
        </span>
        {meal.fromStock ? (
          <span className="absolute right-1 top-1 flex size-9 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-card">
            <DashboardMaskIcon src="/icons/freeze.svg" className="size-5" />
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={cn("relative flex shrink-0 items-center justify-center rounded-full bg-[var(--white)]", sizeClass)}>
      {itemPhotos.length > 0 ? (
        <span className="relative block size-full">
          {itemPhotos.map((photo, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto uit de bestaande catalogus
            <img
              key={`${photo}-${index}`}
              src={photo}
              alt=""
              className={cn(
                "absolute left-1/2 top-1/2 size-[48%] rounded-full object-contain",
                index === 0 && "-translate-x-[72%] -translate-y-[76%]",
                index === 1 && "-translate-x-[25%] -translate-y-[74%]",
                index === 2 && "-translate-x-1/2 -translate-y-[20%]",
              )}
            />
          ))}
        </span>
      ) : (
        <DashboardMaskIcon src="/icons/calendar.svg" className="size-10 text-[var(--blue-300)]" />
      )}
    </span>
  );
}

function TodayMealCard({ meal }: { meal: DashboardMeal | null }) {
  return (
    <section aria-labelledby="today-meal-title" className="min-w-0">
      <p className="mb-2 text-sm font-medium leading-5 text-[var(--text-secondary)]">Vandaag eten we</p>
      {meal ? (
        <Link
          href={meal.href}
          className="group flex min-h-[330px] items-center justify-between gap-8 overflow-hidden rounded-lg bg-[var(--white)] p-8 no-underline shadow-card transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <h2
              id="today-meal-title"
              className="max-w-[14ch] text-[clamp(30px,4vw,48px)] font-bold leading-[1.08] text-[var(--text-primary)]"
            >
              {meal.title}
            </h2>
            <span className="mt-3 text-base leading-6 text-[var(--text-secondary)]">{meal.subtitle}</span>
            <span className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-pill bg-[var(--blue-25)] px-4 text-sm font-semibold text-action-primary">
              Bekijk gerecht
              <DashboardMaskIcon src="/icons/chevron.svg" className="size-4 -rotate-90" />
            </span>
          </span>
          <MealVisual meal={meal} large />
        </Link>
      ) : (
        <Link
          href="/kalender"
          className="flex min-h-[330px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--gray-200)] bg-[var(--white)] px-8 text-center no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          <span className="flex size-20 items-center justify-center rounded-full bg-[var(--blue-25)] text-[var(--blue-500)]">
            <DashboardMaskIcon src="/icons/calendar.svg" className="size-8" />
          </span>
          <h2 id="today-meal-title" className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">
            Nog niets gepland
          </h2>
          <span className="mt-2 max-w-sm text-sm leading-5 text-[var(--text-secondary)]">
            Kies wat jullie vandaag eten in de kalender.
          </span>
          <span className="mt-6 rounded-pill bg-[var(--blue-500)] px-5 py-3 text-sm font-semibold text-[var(--white)]">
            Maaltijd plannen
          </span>
        </Link>
      )}
    </section>
  );
}

function eventDayLabel(value: string | null, todayIso: string, tomorrowIso: string) {
  if (!value) return "Vandaag";
  const iso = value.slice(0, 10);
  if (iso === tomorrowIso) return "Morgen";
  if (iso === todayIso) return "Vandaag";
  return new Intl.DateTimeFormat("nl-BE", { weekday: "long" }).format(new Date(value));
}

function eventTime(event: GoogleEvent) {
  if (event.allDay) return "Hele dag";
  if (!event.start) return "";
  return new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(event.start),
  );
}

function GoogleTodayPanel({ todayIso, tomorrowIso }: { todayIso: string; tomorrowIso: string }) {
  const [state, setState] = React.useState<GoogleDashboardState | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch("/api/google/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Google dashboard request failed");
        return (await response.json()) as GoogleDashboardState;
      })
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="today-agenda-title" className="flex min-w-0 flex-col rounded-lg bg-[var(--white)] p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium leading-5 text-[var(--text-secondary)]">Vandaag & morgen</p>
          <h2 id="today-agenda-title" className="mt-1 text-2xl font-semibold leading-8 text-[var(--text-primary)]">
            Agenda
          </h2>
        </div>
        <span className="flex size-11 items-center justify-center rounded-full bg-[var(--blue-25)] text-[var(--blue-500)]">
          <DashboardMaskIcon src="/icons/calendar.svg" className="size-5" />
        </span>
      </div>

      {!state && !failed ? (
        <div className="mt-6 flex flex-col gap-3" aria-label="Agenda laden">
          <span className="h-14 animate-pulse rounded-md bg-[var(--gray-25)]" />
          <span className="h-14 animate-pulse rounded-md bg-[var(--gray-25)]" />
        </div>
      ) : failed ? (
        <p className="mt-8 text-sm leading-5 text-[var(--text-secondary)]">De Google-agenda kon niet worden geladen.</p>
      ) : !state?.configured ? (
        <div className="mt-8">
          <p className="text-base font-semibold text-[var(--text-primary)]">Google-koppeling nog niet ingesteld</p>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
            Zodra de OAuth-configuratie beschikbaar is, verschijnen agenda en Gmail hier.
          </p>
        </div>
      ) : !state.connected ? (
        <div className="mt-8">
          <p className="text-base font-semibold text-[var(--text-primary)]">Verbind je dagplanning</p>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
            Lees afspraken en belangrijke ongelezen e-mails rechtstreeks uit Google.
          </p>
          <Link
            href="/api/google/connect"
            className="mt-5 inline-flex min-h-11 items-center rounded-pill bg-[var(--blue-500)] px-5 text-sm font-semibold text-[var(--white)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
          >
            Google koppelen
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col">
            {state.events.length > 0 ? (
              state.events.map((event, index) => {
                const label = eventDayLabel(event.start, todayIso, tomorrowIso);
                const previousLabel = index > 0 ? eventDayLabel(state.events[index - 1].start, todayIso, tomorrowIso) : null;
                return (
                  <React.Fragment key={event.id || `${event.title}-${index}`}>
                    {label !== previousLabel ? (
                      <p className={cn("text-xs font-semibold uppercase leading-5 text-[var(--text-secondary)]", index > 0 && "mt-5")}>
                        {label}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-[var(--border-subtle)] py-3 last:border-b-0">
                      <span className="text-sm font-medium leading-5 text-action-primary">{eventTime(event)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold leading-5 text-[var(--text-primary)]">{event.title}</span>
                        {event.location ? (
                          <span className="mt-0.5 block truncate text-xs leading-5 text-[var(--text-secondary)]">{event.location}</span>
                        ) : null}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm leading-5 text-[var(--text-secondary)]">Geen afspraken vandaag of morgen.</p>
            )}
          </div>

          {state.emails.length > 0 ? (
            <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Belangrijke mail</h3>
                <span className="text-xs font-medium text-[var(--text-secondary)]">{state.emails.length} ongelezen</span>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {state.emails.slice(0, 3).map((email) => (
                  <div key={email.id} className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-5 text-[var(--text-primary)]">{email.subject}</p>
                    <p className="truncate text-xs leading-5 text-[var(--text-secondary)]">{email.from}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function TomorrowMeal({ meal }: { meal: DashboardMeal | null }) {
  return (
    <section aria-labelledby="tomorrow-meal-title" className="min-w-0">
      <p className="mb-2 text-sm font-medium leading-5 text-[var(--text-secondary)]">Morgen</p>
      <Link
        href={meal?.href ?? "/kalender"}
        className="flex min-h-[132px] items-center gap-5 rounded-lg bg-[var(--white)] p-5 no-underline shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
      >
        {meal ? <MealVisual meal={meal} /> : null}
        <span className="min-w-0 flex-1">
          <h2 id="tomorrow-meal-title" className="line-clamp-2 text-xl font-semibold leading-7 text-[var(--text-primary)]">
            {meal?.title ?? "Nog niets gepland"}
          </h2>
          <span className="mt-1 block text-sm leading-5 text-[var(--text-secondary)]">
            {meal?.subtitle ?? "Plan morgen in de kalender"}
          </span>
        </span>
        <DashboardMaskIcon src="/icons/chevron.svg" className="size-4 -rotate-90 text-[var(--gray-300)]" />
      </Link>
    </section>
  );
}

export function HomeTodayDashboard({
  todayIso,
  tomorrowIso,
  todayMeal,
  tomorrowMeal,
  shoppingCount,
}: {
  todayIso: string;
  tomorrowIso: string;
  todayMeal: DashboardMeal | null;
  tomorrowMeal: DashboardMeal | null;
  shoppingCount: number;
}) {
  return (
    <div className="flex flex-col gap-8 pt-8">
      <div className="grid min-w-0 grid-cols-1 gap-6 min-[1050px]:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)] min-[1050px]:items-stretch">
        <TodayMealCard meal={todayMeal} />
        <GoogleTodayPanel todayIso={todayIso} tomorrowIso={tomorrowIso} />
      </div>

      <div className="grid grid-cols-1 gap-6 min-[720px]:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <TomorrowMeal meal={tomorrowMeal} />
        <nav aria-label="Huishouden" className="flex min-h-[132px] items-center gap-2 rounded-lg bg-[var(--white)] p-3 shadow-card">
          <Link
            href="/lijstjes-beheren/lijstjes"
            className="flex min-h-[92px] min-w-0 flex-1 flex-col justify-center rounded-md px-4 no-underline [@media(hover:hover)]:hover:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <DashboardMaskIcon src="/icons/list.svg" className="size-5 text-[var(--blue-500)]" />
            <span className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Lijstjes</span>
            <span className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">Open overzicht</span>
          </Link>
          <span className="h-16 w-px bg-[var(--border-subtle)]" aria-hidden />
          <Link
            href="/te-kopen"
            className="flex min-h-[92px] min-w-0 flex-1 flex-col justify-center rounded-md px-4 no-underline [@media(hover:hover)]:hover:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <DashboardMaskIcon src="/icons/shopping_bag.svg" className="size-5 text-[var(--blue-500)]" />
            <span className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Te kopen</span>
            <span className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
              {shoppingCount === 0 ? "Niets open" : `${shoppingCount} ${shoppingCount === 1 ? "item" : "items"}`}
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
