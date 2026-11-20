"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import {
  calendarDayExtras,
  calendarDaySummary,
  CalendarDayPlate,
  CalendarLoosePlate,
  CalendarSidePlates,
  sidePlatePhoto,
  useLoosePhotos,
  type SidePlatePhoto,
} from "@/components/calendar_day_visuals";
import {
  buildCalendarEntries,
  toIsoDate,
  type DayEntry,
} from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { mixWithWhite, RECIPE_TINT_FALLBACK, useIsDarkTheme, useRecipeTint, type Rgb } from "@/lib/recipe-tint";
import { recipeHeroClickHandler } from "@/lib/recipe_hero_transition";
import { msUntilNextDay } from "@/lib/agenda_cache";
import { KalenderAgenda, agendaBand } from "@/components/kalender_agenda";
import { displayQuantity } from "@/lib/recipe_ingredient_quantity";
import { useAlwaysOn } from "@/lib/use_always_on";
import { useFitToScreen } from "@/lib/use_fit_to_screen";
import { useCalendarLists } from "@/hooks/use_calendar_lists";

/**
 * Kalender (canvas «KC»): de agenda met linksboven het eten van vandaag en in «Komende afspraken» de eettegel van
 * vandaag. De aparte weergave «Eten» (en de schakelaar «Eten | Agenda») is weg: de agenda toont het eten zelf.
 */

/** Breedte van de pagina; `useFitToScreen` houdt die aan als de pagina op een lager tabletscherm verkleint. */
const PAGE_MAX_WIDTH = 1040;
/** Hoeveel groter dan ontworpen de pagina op een groot tabletscherm mag worden. */
const TABLET_MAX_ZOOM = 1.4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Vandaag als «JJJJ-MM-DD»; springt mee om middernacht, want op een tablet blijft de kalender dagen open staan.
 * Controle: precies na middernacht, elke minuut, en zodra het toestel wakker wordt (de timers staan 's nachts soms stil).
 */
function useTodayKey(): string {
  const [key, setKey] = React.useState(() => toIsoDate(new Date()));
  React.useEffect(() => {
    const update = () => setKey(toIsoDate(new Date()));
    let midnight = 0;
    const scheduleMidnight = () => {
      midnight = window.setTimeout(() => {
        update();
        scheduleMidnight();
      }, msUntilNextDay());
    };
    scheduleMidnight();
    const minute = window.setInterval(update, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    return () => {
      window.clearTimeout(midnight);
      window.clearInterval(minute);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", update);
      window.removeEventListener("pageshow", update);
    };
  }, []);
  return key;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Kort, voor een tegel: «A», «A en B», «A, B +2». */
function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" en ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

/** Voluit, bij het grote gerecht: «A», «A en B», «A, B en C». */
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
}

/** Kleuren voor de band en de dagkaarten; donker thema = zachte tint over het donkere vlak. */
function tintColors(rgb: Rgb | null, dark: boolean, strong: number, soft: number) {
  const base = rgb ?? RECIPE_TINT_FALLBACK;
  const [r, g, b] = base;
  if (dark) return { top: `rgba(${r}, ${g}, ${b}, ${strong * 0.7})`, bottom: `rgba(${r}, ${g}, ${b}, ${soft * 0.7})` };
  const k = rgb ? 1 : 0.35;
  return { top: mixWithWhite(base, strong * k), bottom: mixWithWhite(base, soft * k) };
}

/** Schaduw van het bord naar rechtsonder, in de kleur van het gerecht. */
function plateShadow(rgb: Rgb | null, size: number): React.CSSProperties {
  const [r, g, b] = rgb ?? [90, 60, 20];
  const s = size / 100;
  return {
    filter: `drop-shadow(${5 * s}px ${7 * s}px ${9 * s}px rgba(${r}, ${g}, ${b}, 0.38)) drop-shadow(${1.5 * s}px ${2 * s}px ${2 * s}px rgba(40, 25, 10, 0.18))`,
  };
}

// ---------------------------------------------------------------------------
// Onderdelen
// ---------------------------------------------------------------------------

function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-4 shrink-0", className)}>
      <path d={direction === "left" ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

function FreezeMask({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
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
  );
}

/** Label onder een gerecht: diepvries- of afhaalpil, anders gewone tekst. */
function DaySubLabel({ kind, text }: { kind: "stock" | "takeout" | "plain"; text: string }) {
  if (kind === "stock") {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-pill bg-[#e7f0fe] px-[7px] text-[11px] font-bold text-[#2f6fd8] [[data-theme=dark]_&]:bg-[#1d3646] [[data-theme=dark]_&]:text-[#8cc8ec]">
        <FreezeMask className="size-3" />
        Diepvries
      </span>
    );
  }
  if (kind === "takeout") {
    return (
      <span className="inline-flex h-5 items-center rounded-pill bg-[#fff2d9] px-[7px] text-[11px] font-bold text-[#a5670b] [[data-theme=dark]_&]:bg-[#3d2f14] [[data-theme=dark]_&]:text-[#f0c36a]">
        Afhalen
      </span>
    );
  }
  return <span className="block max-w-full truncate text-[13px] leading-[18px] text-[var(--text-secondary)] first-letter:uppercase">{text}</span>;
}

/**
 * Rond bord: altijd rond uitgesneden (diepvriesfoto's zijn soms nog vierkant met witte rand),
 * iets ingezoomd zodat het bord de cirkel vult; schaduw op de buitenste laag.
 */
function RoundPlate({ src, className, style, hero = false }: { src: string; className?: string; style?: React.CSSProperties; hero?: boolean }) {
  return (
    <span className={cn("block shrink-0", className)} style={style}>
      <span data-hero-plate={hero ? "" : undefined} className="block size-full overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto (data-URL of extern) */}
        <img src={src} alt="" decoding="async" loading="lazy" className="size-full scale-[1.08] object-cover" />
      </span>
    </span>
  );
}

/** Losse items naast een gerecht: één product gewoon als foto, meerdere op een wit bord. */
function SideLoose({ photos, size, style }: { photos: (string | null)[]; size: number; style?: React.CSSProperties }) {
  const real = photos.filter((p): p is string => Boolean(p));
  if (real.length === 0) return null;
  if (real.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto
    return <img src={real[0]} alt="" decoding="async" className="object-contain" style={{ width: size, height: size, ...style }} />;
  }
  return (
    <span style={style}>
      <CalendarLoosePlate photos={real} size={size} />
    </span>
  );
}

type DayVisual = {
  summary: NonNullable<ReturnType<typeof calendarDaySummary>>;
  /** Foto van het hoofdgerecht (null bij losse items of recept zonder foto). */
  photo: string | null;
  /** Bijgerechten: één cirkel, of twee rond het bord (vlees en groenten bij aardappelen). */
  sidePhotos: SidePlatePhoto[];
  /** Losse items naast een gerecht: klein wit bord. */
  sideLoose: DayEntry["looseIngredients"] | null;
  kind: "stock" | "takeout" | "plain";
};

function dayVisual(isoDate: string, entry: DayEntry | null): DayVisual | null {
  const summary = calendarDaySummary(isoDate, entry);
  if (!summary || !entry) return null;
  const first = entry.meals[0] ?? null;
  const second = entry.meals[1] ?? null;
  // Eén gerecht met losse items: die blijven samen op één klein wit bord; naast andere gerechten elk een eigen bordje.
  const looseOnOwnPlate = Boolean(first && !summary.sides.some((d) => d.kind === "dish") && entry.looseIngredients.length > 0);
  const sides = looseOnOwnPlate ? [] : summary.sides;
  return {
    summary,
    photo: summary.photo,
    sidePhotos: sides.length > 0 ? sides.map(sidePlatePhoto) : second?.photoUrl ? [second.photoUrl] : [],
    sideLoose: looseOnOwnPlate && !second ? entry.looseIngredients : null,
    kind: summary.fromStock && first ? "stock" : first?.takeout ? "takeout" : "plain",
  };
}

/** Bovenaan: de gekozen dag (standaard vandaag) groot, met de achtergrond in de kleur van het gerecht. */
function FocusDay({
  isoDate,
  date,
  entry,
  isToday,
  tint,
  compact = false,
}: {
  isoDate: string;
  date: Date;
  entry: DayEntry | null;
  isToday: boolean;
  tint: Rgb | null;
  /** Agenda: kleiner bord op computer, zodat de to-do's ernaast passen. */
  compact?: boolean;
}) {
  const visual = dayVisual(isoDate, entry);
  const loosePhotos = useLoosePhotos(visual?.summary.loose ?? visual?.sideLoose);
  const getItemPhoto = useItemPhotoUrl(160);
  const dateLabel = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  const meals = entry?.meals ?? [];
  const first = meals[0] ?? null;

  // Onder het gerecht: geen aantal ingrediënten, wel wat er die dag nog bij komt, bij naam.
  const extras = calendarDayExtras(entry);
  const subParts = first ? (first.fromStock ? ["Uit de diepvries"] : first.takeout ? ["Afhalen"] : []) : visual ? [visual.summary.sub] : [];
  if (extras.length > 0) subParts.push(`met ${listNames(extras)}`);

  const looseItems = !first ? (entry?.looseIngredients ?? []) : [];
  const title = first ? first.recipeName : visual ? capitalize(visual.summary.title) : "Nog niets gepland";

  const plate = (size: number) =>
    !visual ? (
      <span
        className="relative flex shrink-0 items-center justify-center rounded-full border-[1.6px] border-dashed border-[var(--blue-200)] bg-[var(--blue-25)]"
        style={{ width: size * 0.72, height: size * 0.72 }}
      >
        <Image src="/images/ui/kalender_320.webp" alt="" width={160} height={160} className="size-1/2 object-contain opacity-80" />
      </span>
    ) : visual.summary.loose ? (
      <span style={plateShadow(tint, size)}>
        <CalendarLoosePlate photos={loosePhotos} size={size * 0.9} />
      </span>
    ) : visual.photo ? (
      <RoundPlate src={visual.photo} hero style={{ width: size, height: size, ...plateShadow(tint, size) }} />
    ) : (
      <CalendarDayPlate src={null} size={size * 0.8} freeze={visual.kind === "stock"} />
    );

  const side = (size: number) =>
    visual?.sidePhotos.length === 1 && typeof visual.sidePhotos[0] === "string" ? (
      <RoundPlate src={visual.sidePhotos[0]} style={{ width: size, height: size, ...plateShadow(tint, size) }} />
    ) : visual?.sideLoose ? (
      <SideLoose photos={loosePhotos} size={size} style={plateShadow(tint, size)} />
    ) : null;

  const recipeId = first?.recipeId ?? null;
  const showAll = Boolean(entry) && (meals.length > 1 || (first ? entry!.looseIngredients.length > 0 : entry!.looseIngredients.length > 1));
  const plateBlock = (size: number, sideSize: number, sideClass: string) => {
    const inner = (
      <span className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {plate(size)}
        {visual && (visual.sidePhotos.length > 1 || typeof visual.sidePhotos[0] === "object") ? (
          <CalendarSidePlates photos={visual.sidePhotos} size={size} />
        ) : side(sideSize) ? (
          <span className={cn("absolute", sideClass)}>{side(sideSize)}</span>
        ) : null}
      </span>
    );
    return recipeId ? (
      <Link
        href={`/recepten/${recipeId}`}
        onClick={recipeHeroClickHandler(recipeId, visual?.photo)}
        aria-label={`${title} openen`}
        className="block rounded-full transition-transform duration-base ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-4"
      >
        {inner}
      </Link>
    ) : (
      inner
    );
  };

  return (
    <section
      aria-label={`${date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}${isToday ? ", vandaag" : ""}`}
      className={cn("flex flex-col items-center gap-2 text-center lg:flex-row lg:items-center lg:text-left", compact ? "lg:gap-8 lg:pl-2" : "lg:gap-12 lg:pl-6")}
    >
      <span className="lg:hidden">{compact ? plateBlock(220, 76, "-bottom-1 right-0") : plateBlock(250, 86, "-bottom-1 right-1")}</span>
      <span className="hidden lg:block">{compact ? plateBlock(260, 88, "-bottom-1 -right-4") : plateBlock(330, 110, "-bottom-1 -right-5")}</span>
      {/* Mobiel: plaats voor een titel van twee regels, zodat de rij eronder bij «Eten» en «Agenda» even hoog staat. */}
      <div className="flex min-w-0 flex-col items-center max-lg:min-h-[146px] lg:flex-1 lg:items-start">
        {isToday ? (
          <span className="mb-2 inline-flex h-6 items-center rounded-pill bg-[var(--white)] px-2.5 text-[11.5px] font-extrabold tracking-[0.04em] text-[var(--blue-500)] shadow-[0_2px_8px_-3px_rgba(16,17,48,0.25)]">
            {compact ? "VANDAAG ETEN WE" : "VANDAAG"}
          </span>
        ) : null}
        <span className="text-[13px] font-bold tracking-[0.02em] text-[var(--text-secondary)] lg:text-sm">{dateLabel}</span>
        <h2 className={cn("mt-1.5 text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary lg:mt-2 lg:max-w-[460px] lg:leading-[1.04] lg:tracking-[-0.03em]", compact ? "lg:text-[40px]" : "lg:text-[46px]")}>
          {title}
        </h2>
        {subParts.length > 0 ? (
          <p className="mt-1.5 line-clamp-2 max-w-[420px] text-sm font-semibold text-[var(--text-secondary)] first-letter:uppercase lg:mt-2.5 lg:max-w-[460px] lg:text-[15px]">{subParts.join(" · ")}</p>
        ) : null}
        {looseItems.length > 0 ? (
          <ul className="m-0 mt-3 flex max-w-[420px] list-none flex-wrap justify-center gap-1.5 p-0 lg:justify-start">
            {looseItems.map((ing, i) => {
              const photo = ing.photoUrl ?? getItemPhoto(ing.name) ?? null;
              return (
                <li key={`${ing.name}-${i}`} className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-[var(--white)]/80 pl-1 pr-2.5 text-[13px] text-text-primary">
                  <span className="flex size-6 items-center justify-center">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto
                      <img src={photo} alt="" className="size-5 object-contain" />
                    ) : null}
                  </span>
                  {capitalize(ing.name)}
                  {ing.quantity ? <span className="text-[var(--text-tertiary)]">{displayQuantity(ing.quantity)}</span> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {/* Meer dan één recept, of iets erbij: eerst «Alles van vandaag» (canvas «KO» A); anders meteen het recept. */}
        {showAll ? (
          <Link href={`/kalender/alles?datum=${isoDate}`} className="mt-4 inline-flex h-11 items-center rounded-pill bg-[#16181a] px-[22px] text-[15px] font-bold text-white no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 lg:mt-5 lg:h-12 lg:px-[26px] [[data-theme=dark]_&]:bg-fixed-white [[data-theme=dark]_&]:text-[#16181a] gap-1">
            Bekijk alles
            <ChevronIcon direction="right" />
          </Link>
        ) : recipeId ? (
          <Link
            href={`/recepten/${recipeId}`}
            className="mt-4 inline-flex h-11 items-center rounded-pill bg-[#16181a] px-[22px] text-[15px] font-bold text-white no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 lg:mt-5 lg:h-12 lg:px-[26px] [[data-theme=dark]_&]:bg-fixed-white [[data-theme=dark]_&]:text-[#16181a]"
          >
            Bekijk recept
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** Dagkaart in de rij: dag en datum linksboven, bord rechts uit de kaart, gerecht onderaan. */
function DayCard({
  isoDate,
  date,
  entry,
  past,
  selected,
  onSelect,
}: {
  isoDate: string;
  date: Date;
  entry: DayEntry | null;
  past: boolean;
  /** De dag die bovenaan groot staat: blauwe selectierand. */
  selected: boolean;
  /** Agenda: tik kiest het eten (linksboven) i.p.v. naar het recept te gaan. */
  onSelect?: () => void;
}) {
  const visual = dayVisual(isoDate, entry);
  const loosePhotos = useLoosePhotos(visual?.summary.loose ?? visual?.sideLoose);
  const rgb = useRecipeTint(visual?.photo ?? loosePhotos.find(Boolean) ?? null);
  const dark = useIsDarkTheme();
  const colors = tintColors(rgb, dark, 0.36, 0.12);
  const weekday = date.toLocaleDateString("nl-NL", { weekday: "long" }).toUpperCase();
  const full = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  const head = (
    <span className="absolute left-3.5 top-3.5 z-[1] flex flex-col">
      <span className={cn("text-[11px] font-extrabold tracking-[0.05em]", visual ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]")}>{weekday}</span>
      <span className={cn("text-[26px] font-extrabold leading-none tabular-nums", visual ? "text-text-primary" : "text-[var(--text-tertiary)]")}>{date.getDate()}</span>
    </span>
  );

  const cardClass = cn(
    "relative block h-[190px] w-[150px] flex-none snap-start overflow-hidden rounded-[26px] lg:h-[230px] lg:w-[220px]",
    past && "opacity-55",
    selected && "shadow-[0_0_0_2px_var(--blue-500),0_0_0_5px_var(--blue-50)]",
  );

  const pressable =
    "text-left transition-[transform,opacity] duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

  if (!visual) {
    if (onSelect) {
      return (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`${full}: niets gepland`}
          aria-pressed={selected}
          className={cn(cardClass, pressable, "bg-[var(--white)]/60", !selected && "shadow-[inset_0_0_0_1px_var(--border-subtle)]")}
        >
          {head}
          <span className="absolute inset-x-3.5 bottom-3.5 text-[13px] leading-[18px] text-[var(--text-tertiary)]">Nog niets gepland</span>
        </button>
      );
    }
    return (
      <div
        aria-label={`${full}: niets gepland`}
        aria-current={selected ? "date" : undefined}
        className={cn(cardClass, "bg-[var(--white)]/60", !selected && "shadow-[inset_0_0_0_1px_var(--border-subtle)]")}
      >
        {head}
        <span className="absolute inset-x-3.5 bottom-3.5 text-[13px] leading-[18px] text-[var(--text-tertiary)]">Nog niets gepland</span>
      </div>
    );
  }

  const { summary } = visual;
  // Onder de naam: wat er die dag nog bij komt («met groene asperges, hamburger»), geen aantal ingrediënten.
  // Een dag met enkel losse items houdt zijn aantal, want daar is de titel al de opsomming.
  const extras = calendarDayExtras(entry);
  const subText = entry?.meals[0] ? (extras.length > 0 ? `met ${joinNames(extras)}` : null) : summary.sub;
  const href = summary.recipeId ? `/recepten/${summary.recipeId}` : `/kalender?date=${isoDate}`;
  const plateSize = "size-[120px] lg:size-[176px]";
  const body = (
    <>
      {head}
      <span className="absolute -right-6 top-6 lg:-right-9 lg:top-7" style={plateShadow(rgb, 120)}>
        {summary.loose ? (
          <span className={cn("block", plateSize)}>
            <span className="lg:hidden"><CalendarLoosePlate photos={loosePhotos} size={112} /></span>
            <span className="hidden lg:block"><CalendarLoosePlate photos={loosePhotos} size={164} /></span>
          </span>
        ) : visual.photo ? (
          <RoundPlate src={visual.photo} hero className={plateSize} />
        ) : (
          <span className={cn("flex items-center justify-center", plateSize)}>
            <CalendarDayPlate src={null} size={96} freeze={visual.kind === "stock"} />
          </span>
        )}
      </span>
      {visual.sidePhotos.length > 1 || typeof visual.sidePhotos[0] === "object" ? (
        <>
          {/* Het bord loopt rechts uit de kaart: drie gelijke bordjes in een boog op de zichtbare linkerrand,
              half over de rand van het bord. Ze schuiven 20% over elkaar: 23° op een baan van 0,48 geeft
              2 × 0,48 × sin(11,5°) ≈ 0,19 = 80% van de diameter (0,24). */}
          <span className="absolute -right-6 top-6 size-[120px] lg:hidden">
            <CalendarSidePlates photos={visual.sidePhotos} size={120} angles={[162, 185, 208]} ratio={0.24} orbit={0.48} />
          </span>
          <span className="absolute -right-9 top-7 hidden size-[176px] lg:block">
            <CalendarSidePlates photos={visual.sidePhotos} size={176} angles={[162, 185, 208]} ratio={0.24} orbit={0.48} />
          </span>
        </>
      ) : typeof visual.sidePhotos[0] === "string" ? (
        <RoundPlate
          src={visual.sidePhotos[0]}
          className="absolute right-[72px] top-[80px] size-[46px] lg:right-[104px] lg:top-[96px] lg:size-[66px]"
          style={plateShadow(rgb, 46)}
        />
      ) : visual.sideLoose ? (
        <span className="absolute right-[76px] top-[84px] lg:right-[108px] lg:top-[100px]">
          <SideLoose photos={loosePhotos} size={44} style={plateShadow(rgb, 44)} />
        </span>
      ) : null}
      {/* «Diepvries» / «Afhalen» als label rechtsboven, zodat de naam onderaan alleen staat.
          Gsm: de kaart is te smal naast de dagnaam, dus daar enkel het sneeuwvlokje (afhalen blijft onder de naam). */}
      {visual.kind !== "plain" ? (
        <span className="absolute right-3 top-3.5 z-[2] hidden rounded-pill shadow-[0_1px_3px_rgba(16,17,48,0.12)] lg:flex">
          <DaySubLabel kind={visual.kind} text={summary.sub} />
        </span>
      ) : null}
      {visual.kind === "stock" ? (
        <span
          aria-label="Diepvries"
          className="absolute right-2.5 top-2.5 z-[2] flex size-6 items-center justify-center rounded-full bg-[#e7f0fe] text-[#2f6fd8] shadow-[0_1px_3px_rgba(16,17,48,0.12)] lg:hidden [[data-theme=dark]_&]:bg-[#1d3646] [[data-theme=dark]_&]:text-[#8cc8ec]"
        >
          <FreezeMask className="size-3.5" />
        </span>
      ) : null}
      <span className="absolute inset-x-3.5 bottom-3.5 z-[1] flex flex-col items-start gap-1.5">
        <span className="block w-full truncate text-[13.5px] font-bold leading-[18px] text-text-primary first-letter:uppercase lg:text-[15px]">{summary.title}</span>
        {visual.kind === "takeout" ? (
          <span className="lg:hidden">
            <DaySubLabel kind={visual.kind} text={summary.sub} />
          </span>
        ) : null}
        {/* Gsm: naast de afhaalpil is er geen plaats meer voor een regel. */}
        {subText ? (
          <span className={cn("block max-w-full", visual.kind === "takeout" && "max-lg:hidden")}>
            <DaySubLabel kind="plain" text={subText} />
          </span>
        ) : null}
      </span>
    </>
  );
  const cardStyle = { backgroundImage: `linear-gradient(180deg, ${colors.top} 0%, ${colors.bottom} 100%)` };
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} aria-label={`${full}: ${summary.title}`} aria-pressed={selected} style={cardStyle} className={cn(cardClass, pressable)}>
        {body}
      </button>
    );
  }
  return (
    <Link
      href={href}
      scroll={!summary.recipeId ? false : undefined}
      onClick={summary.recipeId ? recipeHeroClickHandler(summary.recipeId, visual.photo) : undefined}
      aria-label={`${full}: ${summary.title}`}
      aria-current={selected ? "date" : undefined}
      style={cardStyle}
      className={cn(cardClass, pressable, "no-underline [@media(hover:hover)]:hover:opacity-100")}
    >
      {body}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export default function KalenderPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const ownerId = user?.id;
  const dark = useIsDarkTheme();

  const todayKey = useTodayKey();
  const [agendaTint, setAgendaTint] = React.useState<Rgb | null>(null);

  // Tablet aan de muur: een aanraakscherm (of ?aod=1 / ?tablet=1 om te testen).
  const [tabletDevice, setTabletDevice] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const params = new URLSearchParams(window.location.search);
    const forced = params.has("aod") || params.has("tablet");
    const update = () => setTabletDevice(forced || mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // Always-on: na 2 minuten zonder aanraking dezelfde pagina, donker en gedimd (thema en dimmen via `data-aod`).
  const alwaysOn = useAlwaysOn(tabletDevice);

  const { isLoading: dataLoading, data, loaders } = useCalendarLists(ownerId);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const calendarMap = React.useMemo(() => {
    if (!data) return new Map<string, DayEntry>();
    return buildCalendarEntries(data.lists, data.recipes);
  }, [data]);

  // Agenda: altijd het eten van vandaag (los van ?date=).
  const todayDate = startOfDay(new Date());
  const todayEntry = calendarMap.get(todayKey) ?? null;
  const todaySummary = calendarDaySummary(todayKey, todayEntry);
  const todayLoosePhotos = useLoosePhotos(todaySummary?.loose);
  const todayRgb = useRecipeTint(todaySummary?.photo ?? todayLoosePhotos.find(Boolean) ?? null);

  const band = agendaBand(agendaTint, dark) ?? tintColors(todaySummary ? todayRgb : null, dark, 0.42, 0.2);

  // Tablet: de hele pagina past in één scherm (lager scherm = kleiner), zodat de rij tegels nooit wegvalt.
  // Groter scherm (iPad Air 13"): de pagina groeit mee tot ze de hoogte vult.
  const { frameRef, contentRef } = useFitToScreen(tabletDevice, PAGE_MAX_WIDTH, TABLET_MAX_ZOOM, true);

  if (authLoading || !user || dataLoading) {
    return (
      <>
        {loaders}
        <PageSpinner />
      </>
    );
  }

  return (
    // `data-tablet`: de rij tegels loopt van rand tot rand en de kop van de rij (titel, pijlen) valt weg; vegen volstaat.
    // Container, zodat de rij de paginabreedte kent (`cqw`), ook als de pagina verkleind is.
    <div ref={frameRef} data-tablet={tabletDevice ? "" : undefined} className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[var(--bg-app)] [container-type:inline-size]">
      {loaders}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] lg:h-[620px]"
        style={{ backgroundImage: `linear-gradient(180deg, ${band.top} 0%, ${band.bottom} 55%, var(--bg-app) 100%)` }}
      />
      {/* Past de pagina niet in het scherm van de tablet, dan verkleint ze (`data-fit`) en valt de ondermarge voor de tabbalk weg. */}
      <div
        className="relative mx-auto flex w-full flex-1 flex-col px-4 pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] motion-safe:animate-fade-up lg:px-6 lg:pt-[calc(40px+env(safe-area-inset-top,0px))] [[data-fit]_&]:pb-0"
        style={{ maxWidth: PAGE_MAX_WIDTH }}
      >
        {/* Always-on: dezelfde pagina in het donkere thema op zwart, alles wat gedimd (foto's, tegels, post-its). */}
        <div ref={contentRef} className="flex flex-col transition-[filter] duration-500 [[data-aod]_&]:[filter:brightness(0.74)_saturate(0.9)]">
        {/* Kop: ronde terugknop; titel in het midden op mobiel, links ernaast op desktop. */}
        {/* Boven de foto van de agenda-hero (die loopt tot achter de kop). */}
        <header className="relative z-[2] flex h-16 items-center gap-3 lg:h-auto lg:gap-3.5">
          <Link href="/" aria-label="Terug naar de startpagina" className={headerRoundButtonClass}>
            <ChevronIcon direction="left" className="size-5" />
          </Link>
          <h1 className="min-w-0 flex-1 text-left text-[22px] font-extrabold text-text-primary">Kalender</h1>
        </header>

        {/* `key` = de dag: elke nieuwe dag begint de agenda vers (gegevens, gekozen tegel, rij terug op vandaag). */}
        <KalenderAgenda
            key={todayKey}
            onTint={setAgendaTint}
            idle={alwaysOn}
            food={{
              hero: <FocusDay key={`agenda-${todayKey}`} isoDate={todayKey} date={todayDate} entry={todayEntry} isToday tint={todaySummary ? todayRgb : null} compact />,
              tile: ({ selected, onSelect }) => (
                <DayCard isoDate={todayKey} date={todayDate} entry={todayEntry} past={false} selected={selected} onSelect={onSelect} />
              ),
              thumb: todaySummary?.photo ?? null,
            }}
          />
        </div>
      </div>
    </div>
  );
}
