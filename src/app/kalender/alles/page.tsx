"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { calendarDayExtras, calendarDaySummary, CalendarLoosePlate, useLoosePhotos } from "@/components/calendar_day_visuals";
import { buildCalendarEntries, toIsoDate, type CalendarMeal, type DayEntry } from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { mixWithWhite, useIsDarkTheme, useRecipeTint } from "@/lib/recipe-tint";
import { recipeHeroClickHandler } from "@/lib/recipe_hero_transition";
import { displayQuantity } from "@/lib/recipe_ingredient_quantity";
import { useFitToScreen } from "@/lib/use_fit_to_screen";

/**
 * Kalender › «Alles van vandaag» (canvas «KO» A): achter «Bekijk alles» op de kalender. Het gerecht groot links met
 * «Bekijk recept», rechts alles wat die dag op tafel komt als tegels met een grote foto en de hoeveelheid: per recept
 * zijn ingrediënten («Voor de witloofsla»), daarna wat erbij komt («Erbij»). Elk recept heeft zijn eigen «Bekijk recept».
 * `?datum=JJJJ-MM-DD`, standaard vandaag. Op een tablet past de pagina in één scherm en gaat ze na 3 minuten zonder
 * aanraking terug naar de kalender.
 */

const PAGE_MAX_WIDTH = 1040;
const BACK_TO_CALENDAR_MS = 3 * 60_000;

type Tile = { key: string; name: string; quantity: string | null; photo: string | null; note?: string | null };
type Group = { key: string; title: string; recipeId: string | null; persons?: string | null; tiles: Tile[] };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const baseName = (name: string) => name.replace(/\s*\(diepvries\)$/, "").trim();

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
}

/** Ingrediënten per recept, daarna «Erbij»: de andere gerechten zonder ingrediënten (diepvries, afhalen) en de losse items. */
function dayGroups(entry: DayEntry, photoFor: (name: string) => string | null): Group[] {
  const groups: Group[] = [];
  const extra: Tile[] = [];
  const mealTile = (m: CalendarMeal, i: number): Tile => ({
    key: `meal-${i}`,
    name: m.recipeName,
    quantity: null,
    photo: m.photoUrl ?? photoFor(m.recipeName),
    note: m.fromStock ? "Uit de diepvries" : m.takeout ? "Afhalen" : null,
  });
  entry.meals.forEach((m, i) => {
    const items = m.ingredients ?? [];
    if (items.length > 0) {
      groups.push({
        key: m.recipeGroupId,
        title: `Voor de ${m.recipeName.toLowerCase()}`,
        recipeId: m.recipeId,
        tiles: items.map((x, j) => ({ key: `${m.recipeGroupId}-${j}`, name: capitalize(x.name), quantity: x.quantity || null, photo: photoFor(x.name) })),
      });
    } else if (i > 0) {
      extra.push(mealTile(m, i));
    }
  });
  entry.looseIngredients.forEach((x, i) => {
    extra.push({ key: `loose-${i}`, name: capitalize(baseName(x.name)), quantity: x.quantity || null, photo: x.photoUrl ?? photoFor(baseName(x.name)), note: x.fromStock ? "Uit de diepvries" : null });
  });
  // Enkel losse items (geen gerecht): dan is alles «Op het menu», niet «Erbij».
  if (extra.length > 0) groups.push({ key: "extra", title: entry.meals.length > 0 ? "Erbij" : "Op het menu", recipeId: null, tiles: extra });
  return groups;
}

function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-4 shrink-0", className)}>
      <path d={direction === "left" ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

/** Tegel: grote productfoto op een zacht grijs vlak, naam vet, hoeveelheid eronder (canvas «KO» A). */
function ItemTile({ tile }: { tile: Tile }) {
  return (
    <li className="flex min-w-0 flex-col rounded-[20px] bg-[var(--white)] p-2.5 pb-3.5 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
      <span className="flex h-[110px] items-center justify-center rounded-[12px] bg-[var(--gray-25)] lg:h-[150px]">
        {tile.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- productfoto (lokaal) of gerechtfoto (extern)
          <img src={tile.photo} alt="" decoding="async" className="size-[86px] object-contain drop-shadow-[0_8px_10px_rgba(16,17,48,0.16)] lg:size-[118px]" />
        ) : (
          // Geen foto: de beginletter, zoals het monogram in het productveld.
          <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-[var(--blue-50)] text-[28px] font-bold text-[var(--blue-500)]">
            {tile.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <b className="mx-1 mt-2.5 line-clamp-2 text-[15px] font-extrabold leading-[19px] text-text-primary lg:text-base">{tile.name}</b>
      {tile.quantity || tile.note ? (
        <span className="mx-1 mt-0.5 text-[13px] text-[var(--text-secondary)] lg:text-[13.5px]">
          {[tile.quantity ? displayQuantity(tile.quantity) : null, tile.note].filter(Boolean).join(" · ")}
        </span>
      ) : null}
    </li>
  );
}

const RECIPE_BUTTON =
  "inline-flex h-11 items-center rounded-pill bg-[#16181a] px-[22px] text-[15px] font-bold text-white no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 lg:h-12 lg:px-[26px] [[data-theme=dark]_&]:bg-fixed-white [[data-theme=dark]_&]:text-[#16181a]";

export default function KalenderAllesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = db.useAuth();
  const ownerId = user?.id;
  const dark = useIsDarkTheme();
  const getItemPhoto = useItemPhotoUrl(240);

  const todayIso = toIsoDate(new Date());
  const paramIso = searchParams.get("datum");
  const iso = paramIso && /^\d{4}-\d{2}-\d{2}$/.test(paramIso) ? paramIso : todayIso;
  const [yy, mm, dd] = iso.split("-").map(Number);
  const date = new Date(yy, mm - 1, dd);
  const isToday = iso === todayIso;

  const { isLoading: dataLoading, data } = db.useQuery(
    ownerId ? { lists: { $: { where: { ownerId } }, items: {} }, recipes: { $: { fields: ["name", "photoUrl"] } } } : null,
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const entry = React.useMemo(() => {
    if (!data) return null;
    const map = buildCalendarEntries(
      (data.lists ?? []) as Parameters<typeof buildCalendarEntries>[0],
      (data.recipes ?? []) as Parameters<typeof buildCalendarEntries>[1],
    );
    return map.get(iso) ?? null;
  }, [data, iso]);

  const summary = calendarDaySummary(iso, entry);
  const loosePhotos = useLoosePhotos(summary?.loose);
  const rgb = useRecipeTint(summary?.photo ?? loosePhotos.find(Boolean) ?? null);
  const first = entry?.meals[0] ?? null;

  // Tablet aan de muur: in één scherm, en na een tijd zonder aanraking terug naar de kalender.
  const [tablet, setTablet] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const forced = new URLSearchParams(window.location.search).has("tablet");
    const update = () => setTablet(forced || mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const { frameRef, contentRef } = useFitToScreen(tablet, PAGE_MAX_WIDTH);
  React.useEffect(() => {
    if (!tablet) return;
    const back = () => router.replace("/kalender");
    let timer = window.setTimeout(back, BACK_TO_CALENDAR_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(back, BACK_TO_CALENDAR_MS);
    };
    window.addEventListener("pointerdown", reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
    };
  }, [tablet, router]);

  if (authLoading || !user || dataLoading) return <PageSpinner />;

  const groups = entry ? dayGroups(entry, (name) => getItemPhoto(name)) : [];
  const extras = calendarDayExtras(entry);
  const title = first ? first.recipeName : summary ? capitalize(summary.title) : "Nog niets gepland";
  const sub = first
    ? [first.fromStock ? "Uit de diepvries" : first.takeout ? "Afhalen" : null, extras.length > 0 ? `met ${listNames(extras)}` : null].filter(Boolean).join(" · ")
    : (summary?.sub ?? "");
  const dateLabel = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  const band = rgb
    ? dark
      ? { top: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.29)`, bottom: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.14)` }
      : { top: mixWithWhite(rgb, 0.42), bottom: mixWithWhite(rgb, 0.2) }
    : null;
  const shadowRgb = rgb ?? [90, 60, 20];
  const plateShadow = { filter: `drop-shadow(6px 9px 12px rgba(${shadowRgb.join(", ")}, 0.38)) drop-shadow(2px 3px 3px rgba(40, 25, 10, 0.18))` };

  const plate = (size: number) =>
    summary?.loose ? (
      <span className="block" style={plateShadow}>
        <CalendarLoosePlate photos={loosePhotos} size={size * 0.9} />
      </span>
    ) : summary?.photo ? (
      <span className="block shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size, ...plateShadow }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto (data-URL of extern) */}
        <img src={summary.photo} alt="" className="size-full scale-[1.08] object-cover" />
      </span>
    ) : (
      <span aria-hidden className="block shrink-0 rounded-full border-[1.6px] border-dashed border-[var(--blue-200)] bg-[var(--blue-25)]" style={{ width: size * 0.8, height: size * 0.8 }} />
    );

  return (
    // Geen tabbalk op deze pagina: op een tablet volstaat een kleine ondermarge (anders scrolt ze net).
    <div ref={frameRef} data-tablet={tablet ? "" : undefined} className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[var(--bg-app)]">
      {band ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[600px] lg:h-[620px]"
          style={{ backgroundImage: `linear-gradient(180deg, ${band.top} 0%, ${band.bottom} 55%, var(--bg-app) 100%)` }}
        />
      ) : null}
      <div
        className="relative mx-auto flex w-full flex-1 flex-col px-4 pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] motion-safe:animate-fade-up lg:px-6 lg:pt-[calc(40px+env(safe-area-inset-top,0px))] [[data-fit]_&]:pb-0 lg:[[data-tablet]_&]:pb-10"
        style={{ maxWidth: PAGE_MAX_WIDTH }}
      >
        <div ref={contentRef} className="flex flex-col">
          <header className="relative z-[2] flex h-16 items-center gap-3 lg:h-auto lg:gap-3.5">
            <Link href="/kalender" aria-label="Terug naar de kalender" className={headerRoundButtonClass}>
              <ChevronIcon direction="left" className="size-5" />
            </Link>
            <h1 className="min-w-0 flex-1 text-left text-[22px] font-extrabold text-text-primary">Kalender</h1>
          </header>

          <div className="mt-2 flex flex-col gap-6 lg:mt-6 lg:flex-row lg:items-start lg:gap-14">
            {/* Links: het gerecht met «Bekijk recept» (gsm: bovenaan, gecentreerd). */}
            <section aria-label={title} className="flex flex-col items-center gap-4 text-center lg:w-[330px] lg:flex-none lg:items-start lg:text-left">
              <span className="lg:hidden">{plate(190)}</span>
              <span className="hidden lg:block">{plate(300)}</span>
              <div className="flex flex-col items-center lg:items-start">
                <span className="mb-2 inline-flex h-6 items-center rounded-pill bg-[var(--white)] px-2.5 text-[11.5px] font-extrabold tracking-[0.04em] text-[var(--blue-500)] shadow-[0_2px_8px_-3px_rgba(16,17,48,0.25)]">
                  {isToday ? "VANDAAG ETEN WE" : "OP HET MENU"}
                </span>
                <span className="text-[13px] font-bold tracking-[0.02em] text-[var(--text-secondary)] lg:text-sm">{dateLabel}</span>
                <h2 className="mt-1.5 text-[30px] font-extrabold leading-[1.06] tracking-[-0.03em] text-text-primary lg:text-[40px] lg:leading-[1.04]">{title}</h2>
                {sub ? <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)] first-letter:uppercase lg:text-[15px]">{sub}</p> : null}
              </div>
              {first?.recipeId ? (
                <Link href={`/recepten/${first.recipeId}`} onClick={recipeHeroClickHandler(first.recipeId, summary?.photo ?? null)} className={RECIPE_BUTTON}>
                  Bekijk recept
                </Link>
              ) : null}
            </section>

            {/* Rechts: per recept zijn ingrediënten, dan «Erbij». */}
            <div className="flex min-w-0 flex-1 flex-col gap-6 lg:pt-1.5">
              {groups.length === 0 ? (
                <p className="text-[15px] text-[var(--text-secondary)]">Voor deze dag staat er niets op je lijstjes.</p>
              ) : (
                groups.map((g) => (
                  <section key={g.key} aria-label={g.title}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{g.title}</h3>
                      {/* Een tweede recept: zijn eigen «Bekijk recept» bij de groep. */}
                      {g.recipeId && g.recipeId !== first?.recipeId ? (
                        <Link
                          href={`/recepten/${g.recipeId}`}
                          className="inline-flex items-center gap-0.5 rounded-pill text-[13px] font-bold text-action-primary no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        >
                          Bekijk recept
                          <ChevronIcon direction="right" className="size-3.5" />
                        </Link>
                      ) : null}
                    </div>
                    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:gap-4">
                      {g.tiles.map((t) => (
                        <ItemTile key={t.key} tile={t} />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
