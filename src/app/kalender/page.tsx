"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import {
  calendarDaySummary,
  CalendarDayPlate,
  CalendarLoosePlate,
  useLoosePhotos,
} from "@/components/calendar_day_visuals";
import {
  buildCalendarEntries,
  addDays,
  toIsoDate,
  dayEntryHasContent,
  type DayEntry,
} from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { mixWithWhite, RECIPE_TINT_FALLBACK, useIsDarkTheme, useRecipeTint, type Rgb } from "@/lib/recipe-tint";
import { recipeHeroClickHandler } from "@/lib/recipe_hero_transition";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { KalenderAgenda, KalenderAgendaPrefetch, agendaBand } from "@/components/kalender_agenda";

type Weergave = "eten" | "agenda";
const WEERGAVE_KEY = "kalender-weergave";

/**
 * Kalender (canvas «Kalender · C · Podium»): de bovenkant kleurt mee met het gerecht van de gekozen dag
 * (standaard vandaag), groot bord in het midden; daaronder «Overzicht»: die dag (blauwe rand) en de drie
 * volgende dagen als gekleurde kaarten in een rij waarin je naar links terug in de tijd schuift.
 */

/** Hoeveel dagen je in de rij terug kunt schuiven. */
const PAST_DAYS = 28;
const NEXT_DAYS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoToDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [yy, mm, dd] = iso.split("-").map((x) => parseInt(x, 10));
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  return startOfDay(new Date(yy, mm - 1, dd));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ingredientCountLabel(n: number): string {
  return n === 1 ? "1 ingrediënt" : `${n} ingrediënten`;
}

/** «A», «A en B», «A, B +2». */
function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" en ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
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
  return <span className="text-[13px] leading-[18px] text-[var(--text-secondary)]">{text}</span>;
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
  /** Bijgerecht: foto van het tweede gerecht. */
  sidePhoto: string | null;
  /** Losse items naast een gerecht: klein wit bord. */
  sideLoose: DayEntry["looseIngredients"] | null;
  kind: "stock" | "takeout" | "plain";
};

function dayVisual(isoDate: string, entry: DayEntry | null): DayVisual | null {
  const summary = calendarDaySummary(isoDate, entry);
  if (!summary || !entry) return null;
  const first = entry.meals[0] ?? null;
  const second = entry.meals[1] ?? null;
  return {
    summary,
    photo: first?.photoUrl ?? null,
    sidePhoto: second?.photoUrl ?? null,
    sideLoose: first && !second && entry.looseIngredients.length > 0 ? entry.looseIngredients : null,
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
}: {
  isoDate: string;
  date: Date;
  entry: DayEntry | null;
  isToday: boolean;
  tint: Rgb | null;
}) {
  const visual = dayVisual(isoDate, entry);
  const loosePhotos = useLoosePhotos(visual?.summary.loose ?? visual?.sideLoose);
  const getItemPhoto = useItemPhotoUrl(160);
  const dateLabel = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  const meals = entry?.meals ?? [];
  const first = meals[0] ?? null;

  const companions = [
    ...meals.slice(1).map((m) => m.recipeName),
    ...(first ? (entry?.looseIngredients ?? []).map((i) => i.name.toLowerCase()) : []),
  ];
  const subParts = first
    ? [first.fromStock ? "Uit de diepvries" : first.takeout ? "Afhalen" : ingredientCountLabel(first.ingredientCount)]
    : visual
      ? [visual.summary.sub]
      : [];
  if (companions.length > 0) subParts.push(`met ${joinNames(companions)}`);

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
    visual?.sidePhoto ? (
      <RoundPlate src={visual.sidePhoto} style={{ width: size, height: size, ...plateShadow(tint, size) }} />
    ) : visual?.sideLoose ? (
      <SideLoose photos={loosePhotos} size={size} style={plateShadow(tint, size)} />
    ) : null;

  const recipeId = first?.recipeId ?? null;
  const plateBlock = (size: number, sideSize: number, sideClass: string) => {
    const inner = (
      <span className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {plate(size)}
        {side(sideSize) ? <span className={cn("absolute", sideClass)}>{side(sideSize)}</span> : null}
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
      className="flex flex-col items-center gap-2 text-center lg:flex-row lg:items-center lg:gap-12 lg:pl-6 lg:text-left"
    >
      <span className="lg:hidden">{plateBlock(250, 86, "-bottom-1 right-1")}</span>
      <span className="hidden lg:block">{plateBlock(330, 110, "-bottom-1 -right-5")}</span>
      {/* Mobiel: plaats voor een titel van twee regels, zodat de rij eronder bij «Eten» en «Agenda» even hoog staat. */}
      <div className="flex min-w-0 flex-col items-center max-lg:min-h-[146px] lg:flex-1 lg:items-start">
        {isToday ? (
          <span className="mb-2 inline-flex h-6 items-center rounded-pill bg-[var(--white)] px-2.5 text-[11.5px] font-extrabold tracking-[0.04em] text-[var(--blue-500)] shadow-[0_2px_8px_-3px_rgba(16,17,48,0.25)]">
            VANDAAG
          </span>
        ) : null}
        <span className="text-[13px] font-bold tracking-[0.02em] text-[var(--text-secondary)] lg:text-sm">{dateLabel}</span>
        <h2 className="mt-1.5 text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary lg:mt-2 lg:max-w-[460px] lg:text-[46px] lg:leading-[1.04] lg:tracking-[-0.03em]">
          {title}
        </h2>
        {subParts.length > 0 ? (
          <p className="mt-1.5 text-sm font-semibold text-[var(--text-secondary)] first-letter:uppercase lg:mt-2.5 lg:text-[15px]">{subParts.join(" · ")}</p>
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
                  {ing.quantity ? <span className="text-[var(--text-tertiary)]">{ing.quantity}</span> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {recipeId ? (
          <Link
            href={`/recepten/${recipeId}`}
            className="mt-4 inline-flex h-11 items-center rounded-pill bg-[#16181a] px-[22px] text-[15px] font-bold text-white no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 lg:mt-5 lg:h-12 lg:px-[26px] [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-[#16181a]"
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
}: {
  isoDate: string;
  date: Date;
  entry: DayEntry | null;
  past: boolean;
  /** De dag die bovenaan groot staat: blauwe selectierand. */
  selected: boolean;
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

  if (!visual) {
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
  const href = summary.recipeId ? `/recepten/${summary.recipeId}` : `/kalender?date=${isoDate}`;
  const plateSize = "size-[120px] lg:size-[176px]";
  return (
    <Link
      href={href}
      scroll={!summary.recipeId ? false : undefined}
      onClick={summary.recipeId ? recipeHeroClickHandler(summary.recipeId, visual.photo) : undefined}
      aria-label={`${full}: ${summary.title}`}
      aria-current={selected ? "date" : undefined}
      style={{ backgroundImage: `linear-gradient(180deg, ${colors.top} 0%, ${colors.bottom} 100%)` }}
      className={cn(
        cardClass,
        "no-underline transition-[transform,opacity] duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
      )}
    >
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
      {visual.sidePhoto ? (
        <RoundPlate
          src={visual.sidePhoto}
          className="absolute right-[72px] top-[80px] size-[46px] lg:right-[104px] lg:top-[96px] lg:size-[66px]"
          style={plateShadow(rgb, 46)}
        />
      ) : visual.sideLoose ? (
        <span className="absolute right-[76px] top-[84px] lg:right-[108px] lg:top-[100px]">
          <SideLoose photos={loosePhotos} size={44} style={plateShadow(rgb, 44)} />
        </span>
      ) : null}
      <span className="absolute inset-x-3.5 bottom-3.5 z-[1] flex flex-col items-start gap-1.5">
        <span className="block w-full truncate text-[13.5px] font-bold leading-[18px] text-text-primary first-letter:uppercase lg:text-[15px]">{summary.title}</span>
        <DaySubLabel kind={visual.kind} text={summary.sub} />
      </span>
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
  const searchParams = useSearchParams();
  const dark = useIsDarkTheme();

  const todayKey = toIsoDate(startOfDay(new Date()));
  /** Gekozen dag bovenaan: ?date= of vandaag. */
  const focusDate = isoToDate(searchParams.get("date")) ?? startOfDay(new Date());
  const focusIso = toIsoDate(focusDate);
  const isToday = focusIso === todayKey;

  /** Schakelaar «Eten | Agenda»: ?weergave=agenda of de laatst gekozen weergave op dit toestel. */
  const [weergave, setWeergave] = React.useState<Weergave>(() => {
    const fromUrl = searchParams.get("weergave");
    if (fromUrl === "agenda" || fromUrl === "eten") return fromUrl;
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(WEERGAVE_KEY) === "agenda" ? "agenda" : "eten";
    } catch {
      return "eten";
    }
  });
  const changeWeergave = (w: Weergave) => {
    setWeergave(w);
    try {
      window.localStorage.setItem(WEERGAVE_KEY, w);
    } catch {
      /* niet bewaren */
    }
  };
  const [agendaTint, setAgendaTint] = React.useState<Rgb | null>(null);

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

  /** Rij «Overzicht»: eerdere dagen (links, terug te schuiven), de gekozen dag en de drie dagen erna. */
  const laneDays = React.useMemo(() => {
    const out: { iso: string; date: Date; past: boolean; selected: boolean }[] = [];
    for (let i = -PAST_DAYS; i <= NEXT_DAYS; i++) {
      const d = startOfDay(addDays(focusDate, i));
      out.push({ iso: toIsoDate(d), date: d, past: i < 0, selected: i === 0 });
    }
    return out;
    // focusIso dekt focusDate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIso]);

  const focusEntry = calendarMap.get(focusIso) ?? null;
  const focusSummary = calendarDaySummary(focusIso, focusEntry);
  const focusLoosePhotos = useLoosePhotos(focusSummary?.loose);
  const focusRgb = useRecipeTint(focusSummary?.photo ?? focusLoosePhotos.find(Boolean) ?? null);
  const band =
    weergave === "agenda"
      ? (agendaBand(agendaTint, dark) ?? tintColors(null, dark, 0.42, 0.2))
      : tintColors(focusSummary ? focusRgb : null, dark, 0.42, 0.2);

  // Bij laden (en bij een andere gekozen dag): de gekozen dag links, de dag ervoor piept nog binnen.
  const laneRef = React.useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = React.useState({ back: true, forward: false });
  const updateArrows = React.useCallback(() => {
    const el = laneRef.current;
    if (!el) return;
    setCanScroll({ back: el.scrollLeft > 4, forward: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  React.useLayoutEffect(() => {
    const el = laneRef.current;
    if (!el) return;
    const next = el.querySelector<HTMLElement>(`[data-lane-day="${focusIso}"]`);
    if (!next) return;
    // Zelfde plaats als het snappunt: scroll-padding laat een derde van de vorige dag zien (zoals «Agenda»).
    const peek = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    el.scrollLeft = Math.max(0, next.offsetLeft - el.offsetLeft - peek);
    updateArrows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIso, dataLoading, calendarIsEmpty, weergave, updateArrows]);

  const scrollLane = (dir: -1 | 1) => {
    const el = laneRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (authLoading || !user || dataLoading) return <PageSpinner />;

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[var(--bg-app)]">
      {weergave === "agenda" || !calendarIsEmpty ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[600px] lg:h-[620px]"
          style={{ backgroundImage: `linear-gradient(180deg, ${band.top} 0%, ${band.bottom} 55%, var(--bg-app) 100%)` }}
        />
      ) : null}
      <div className="relative mx-auto flex w-full max-w-[1040px] flex-1 flex-col px-4 pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] motion-safe:animate-fade-up lg:px-6 lg:pt-[calc(40px+env(safe-area-inset-top,0px))]">
        {/* Kop: ronde terugknop; titel in het midden op mobiel, links ernaast op desktop. */}
        <header className="flex h-16 items-center gap-3 lg:h-auto lg:gap-3.5">
          <Link href="/" aria-label="Terug naar de startpagina" className={headerRoundButtonClass}>
            <ChevronIcon direction="left" className="size-5" />
          </Link>
          <h1 className="min-w-0 flex-1 text-left text-[22px] font-extrabold text-text-primary">Kalender</h1>
          <SegmentedControl
            ariaLabel="Kalenderweergave"
            fill={false}
            value={weergave}
            onChange={changeWeergave}
            options={[
              { value: "eten", label: "Eten" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
        </header>

        {weergave === "eten" ? <KalenderAgendaPrefetch /> : null}
        {weergave === "agenda" ? (
          <KalenderAgenda onTint={setAgendaTint} />
        ) : calendarIsEmpty ? (
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
            <div className="mt-2 lg:mt-4">
              <FocusDay key={focusIso} isoDate={focusIso} date={focusDate} entry={focusEntry} isToday={isToday} tint={focusSummary ? focusRgb : null} />
              {!isToday ? (
                <div className="mt-3 flex justify-center lg:justify-start lg:pl-[402px]">
                  <Link
                    href="/kalender"
                    scroll={false}
                    className="rounded-pill px-2 text-sm font-semibold text-action-primary no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    Naar vandaag
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="mb-1.5 mt-8 flex items-center justify-between lg:mt-10">
              <h2 className="text-[19px] font-bold tracking-[-0.01em] text-text-primary">Overzicht</h2>
              <span className="flex items-center gap-2 max-lg:hidden">
                <button type="button" aria-label="Eerdere dagen" disabled={!canScroll.back} onClick={() => scrollLane(-1)} className={cn(headerRoundButtonClass, "disabled:opacity-40")}>
                  <ChevronIcon direction="left" />
                </button>
                <button type="button" aria-label="Latere dagen" disabled={!canScroll.forward} onClick={() => scrollLane(1)} className={cn(headerRoundButtonClass, "disabled:opacity-40")}>
                  <ChevronIcon direction="right" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => scrollLane(-1)}
                className="inline-flex items-center gap-0.5 rounded-pill text-[13px] font-semibold text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] lg:hidden"
              >
                <ChevronIcon direction="left" />
                Eerder
              </button>
            </div>
            <div
              ref={laneRef}
              onScroll={updateArrows}
              className="-mx-4 flex snap-x snap-mandatory scroll-pl-[78px] scroll-pr-4 gap-3 overflow-x-auto px-4 pb-3 pt-1.5 [scrollbar-width:none] lg:-mx-1 lg:scroll-pl-[93px] lg:scroll-pr-1 lg:gap-4 lg:px-1 [&::-webkit-scrollbar]:hidden"
            >
              {laneDays.map((d) => (
                <div key={d.iso} data-lane-day={d.iso} className="flex-none">
                  <DayCard isoDate={d.iso} date={d.date} entry={calendarMap.get(d.iso) ?? null} past={d.past} selected={d.selected} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
