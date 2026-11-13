"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { startGoogleConnect, useGoogleAuthToken } from "@/lib/google-client";
import { fetchAgenda, localDayIso, useCachedAgenda } from "@/lib/agenda_cache";
import { useAgendaFuture } from "@/lib/use_agenda_future";
import { mixWithWhite, useIsDarkTheme, type Rgb } from "@/lib/recipe-tint";
import { agendaPhotoFor } from "@/lib/agenda_photos";
import { agendaDisplayTitle, dedupeBirthdays } from "@/lib/agenda_birthdays";
import { dropAllDayDuplicates, mergeAllDayDuplicates } from "@/lib/agenda_duplicates";
import { RouteButton } from "@/components/home_agenda_section";
import { KalenderTodoBoard } from "@/components/home_todo_section";

/**
 * Kalender › Agenda (canvas «KC · eten linksboven, afspraak tikken»): linksboven enkel het eten van vandaag
 * (zelfde bord als «Eten»), rechts ernaast de to-do's van vandaag als post-its; daaronder «Komende afspraken»,
 * één tegel per afspraak in de kleur van zijn agenda, met het eten van vandaag als tegel op de plaats van
 * vandaag. Tik op een tegel = die afspraak (of de hele-dagafspraken van die dag) linksboven; de eetegel of
 * «Eten van vandaag» zet het eten terug, en na 3 minuten zonder aanraking gebeurt dat vanzelf.
 */

type ApiEvent = {
  id: string;
  title: string;
  location: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  accountId?: string;
  calendarName?: string;
};
type ApiState = { configured: boolean; connected: boolean; events: ApiEvent[] };

export type WeekEvent = ApiEvent & {
  startAt: Date;
  endAt: Date;
  dayIso: string;
  color: Rgb;
};

/** Kleur per agenda (Gezin, Werk, …), in volgorde van verschijnen. */
const CALENDAR_COLORS: Rgb[] = [
  [224, 140, 47],
  [79, 85, 241],
  [229, 97, 138],
  [47, 163, 107],
  [139, 108, 240],
  [40, 150, 170],
];

const DAYS_AHEAD = 7;
const DAYS_BEFORE = 3;

function dayIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hhmm(d: Date): string {
  return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
}
const rgb = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const deep = (c: Rgb, f = 0.62) => `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)})`;
/** Lichte tint van de agendakleur (f = 0 wit, 1 de kleur zelf): tekst op een donker vlak. */
const pale = (c: Rgb, f: number) => `rgb(${c.map((v) => Math.round(255 - (255 - v) * f)).join(",")})`;
/**
 * Tekst in een donkere tint van de agendakleur is op een donker vlak (donker thema, always-on) onleesbaar:
 * daar neemt ze de lichte tint uit `--on-dark`. Gebruik samen met `onDark(c)` in `style`.
 */
const ON_DARK_TEXT = "[[data-theme=dark]_&]:!text-[color:var(--on-dark)]";
const onDark = (c: Rgb, f = 0.55) => ({ ["--on-dark" as string]: pale(c, f) });

/** Hele-dag-afspraken: «2026-10-14» lokaal om middernacht (niet UTC). */
function parseStart(e: ApiEvent): Date | null {
  if (!e.start) return null;
  if (e.allDay) {
    const [y, m, d] = e.start.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(e.start);
  return Number.isFinite(d.getTime()) ? d : null;
}
function parseEnd(e: ApiEvent, start: Date): Date {
  if (e.allDay) {
    if (!e.end) return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const [y, m, d] = e.end.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = e.end ? new Date(e.end) : start;
  return Number.isFinite(d.getTime()) ? d : start;
}

function weekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timeMax = new Date(today);
  timeMax.setDate(timeMax.getDate() + DAYS_AHEAD);
  // Ook de vorige dagen, zodat er links van de volgende afspraak iets te zien is.
  const timeMin = new Date(today);
  timeMin.setDate(timeMin.getDate() - DAYS_BEFORE);
  return { key: `week:${localDayIso(today)}`, timeMin, timeMax };
}

/** Laadt de agendaweek alvast op de achtergrond (bv. terwijl «Eten» open staat). */
export function usePrefetchAgendaWeek() {
  const token = useGoogleAuthToken();
  React.useEffect(() => {
    if (!token) return;
    const r = weekRange();
    void fetchAgenda(r.key, r.timeMin, r.timeMax, token);
  }, [token]);
}

/** Onzichtbaar op «Eten»: haalt de agenda en de kalenderillustratie alvast op, zodat «Agenda» meteen klaarstaat. */
export function KalenderAgendaPrefetch() {
  usePrefetchAgendaWeek();
  return <Image src="/images/ui/kalender_320.webp" alt="" width={320} height={320} priority aria-hidden className="pointer-events-none absolute size-px opacity-0" />;
}

/** Afspraken van een paar dagen terug tot 7 dagen verder; gecachet, ververst bij focus en elke 5 minuten. */
export function useAgendaWeek() {
  const { token, state, failed, now } = useCachedAgenda<ApiState>(weekRange);

  const future = useAgendaFuture(state?.events ?? [], weekRange().timeMax, token);
  const events = React.useMemo((): WeekEvent[] => {
    const names: string[] = [];
    const out: WeekEvent[] = [];
    for (const e of future.events) {
      const startAt = parseStart(e);
      if (!startAt) continue;
      const key = e.calendarName ?? e.accountId ?? "";
      if (!names.includes(key)) names.push(key);
      out.push({ ...e, startAt, endAt: parseEnd(e, startAt), dayIso: dayIso(startAt), color: CALENDAR_COLORS[names.indexOf(key) % CALENDAR_COLORS.length] });
    }
    // Staat een hele-dag-afspraak die dag ook met een uur in de agenda («Fruitschildag»), dan enkel die met uur.
    const kept = out.filter((e) => !e.allDay || dropAllDayDuplicates([e], out.filter((t) => !t.allDay && t.dayIso === e.dayIso)).length > 0);
    return kept.sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || Number(b.allDay) - Number(a.allDay));
  }, [future.events]);

  return { token, state, failed, events, now, future, connect: () => void startGoogleConnect(token) };
}

function dayLabel(d: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "VANDAAG";
  if (diff === 1) return "MORGEN";
  if (diff === -1) return "GISTEREN";
  return d.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", ...(Math.abs(diff) >= 7 ? { month: "short" as const, ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}) } : {}) }).replace(".", "").toUpperCase();
}

/** «over 2u10», «over 25 min», «morgen», «woensdag». */
function untilLabel(start: Date, now: Date): string {
  const mins = Math.round((start.getTime() - now.getTime()) / 60_000);
  const sameDay = dayIso(start) === dayIso(now);
  if (sameDay && mins < 60) return `over ${Math.max(1, mins)} min`;
  if (sameDay) return `over ${Math.floor(mins / 60)}u${String(mins % 60).padStart(2, "0")}`;
  const label = dayLabel(start, now);
  return label === "MORGEN" ? "morgen" : start.toLocaleDateString("nl-BE", { weekday: "long" });
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[13px] shrink-0">
    <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <path d={direction === "left" ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

/** Kalenderillustratie met een pil erop (uur of «Hele dag»), in hetzelfde vak als het bord van het eten. */
function CalendarIllustration({ box, label, color }: { box: number; label: string; color: Rgb }) {
  const size = Math.round(box * 0.8);
  return (
    <span className="flex shrink-0 items-center justify-center" style={{ width: box, height: box }}>
      <span className="relative block shrink-0" style={{ width: size, height: size }}>
        <Image src="/images/ui/kalender_320.webp" alt="" width={320} height={320} priority className="size-full object-contain drop-shadow-[0_24px_30px_rgba(120,60,0,0.25)]" />
        <span
          className={cn("absolute bottom-[12%] left-1/2 inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-pill bg-[var(--white)] font-extrabold shadow-[0_8px_18px_-10px_rgba(0,0,0,0.35)]", ON_DARK_TEXT)}
          style={{ height: size * 0.16, paddingInline: size * 0.06, fontSize: size * 0.09, color: deep(color, 0.6), ...onDark(color) }}
        >
          {label}
        </span>
      </span>
    </span>
  );
}

/** «Eten van vandaag»: terug naar het gerecht linksboven. */
function BackToFood({ thumb, onClick }: { thumb: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[42px] items-center gap-2 rounded-pill bg-[var(--white)]/85 pl-1.5 pr-4 text-[15px] font-bold text-text-primary shadow-[0_1px_2px_rgba(16,17,48,0.06)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto (data-URL of extern)
        <img src={thumb} alt="" className="size-[30px] rounded-full object-cover" />
      ) : (
        <span aria-hidden className="size-[30px] rounded-full border-[1.5px] border-dashed border-[var(--blue-200)] bg-[var(--blue-25)]" />
      )}
      Eten van vandaag
    </button>
  );
}

/**
 * Linksboven na een tik op een afspraak (canvas «KC» B): foto met afgeronde hoeken (geen bord, zodat je ziet
 * dat het geen gerecht is) of de kalenderillustratie met het uur; dag, titel, uur en plaats; route en terug.
 */
function EventHero({ e, now, foodThumb, onBack, dark }: { e: WeekEvent; now: Date; foodThumb: string | null; onBack: () => void; dark: boolean }) {
  const photo = agendaPhotoFor(e.title, e.location);
  const nowMs = now.getTime();
  const busy = !e.allDay && e.startAt.getTime() <= nowMs && e.endAt.getTime() > nowMs;
  const past = e.endAt.getTime() <= nowMs;
  const pill = busy ? `Nu · tot ${hhmm(e.endAt)}` : past ? "Voorbij" : `${dayLabel(e.startAt, now)} · ${hhmm(e.startAt)}`;
  const dateLabel = e.startAt.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" });
  const media = (box: number, radius: number) =>
    photo ? (
      <span className="flex shrink-0 items-center justify-center" style={{ width: box, height: box }}>
        <span
          className="relative block overflow-hidden"
          style={{ width: box * 0.92, height: box * 0.92, borderRadius: radius, boxShadow: `0 0 0 6px rgba(255,255,255,${dark ? 0.14 : 0.75}), 0 26px 40px -18px ${rgb(e.color, 0.55)}` }}
        >
          <Image src={`${photo}_480.webp`} alt="" fill sizes="260px" className="object-cover" />
        </span>
      </span>
    ) : (
      <CalendarIllustration box={box} label={hhmm(e.startAt)} color={e.color} />
    );
  return (
    <section aria-label={`Afspraak: ${agendaDisplayTitle(e.title)}`} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:items-center lg:gap-8 lg:pl-2 lg:text-left">
      <span className="lg:hidden">{media(220, 36)}</span>
      <span className="hidden lg:block">{media(260, 44)}</span>
      <div className="flex min-w-0 flex-col items-center max-lg:min-h-[146px] lg:flex-1 lg:items-start">
        <span
          className={cn("mb-2 inline-flex h-6 items-center rounded-pill bg-[var(--white)] px-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] shadow-[0_2px_8px_-3px_rgba(16,17,48,0.25)]", ON_DARK_TEXT)}
          style={{ color: deep(e.color, 0.6), ...onDark(e.color) }}
        >
          {pill}
        </span>
        <span className="text-[13px] font-bold text-[var(--text-secondary)] first-letter:uppercase lg:text-sm">
          {dateLabel}
          {/* Agendanaam enkel als het een echte naam is (een Google-agenda heet vaak gewoon het e-mailadres). */}
          {e.calendarName && !e.calendarName.includes("@") ? ` · ${e.calendarName}` : ""}
        </span>
        <h2 className="mt-1.5 text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary lg:mt-2 lg:max-w-[460px] lg:text-[40px] lg:leading-[1.05] lg:tracking-[-0.03em]">
          {agendaDisplayTitle(e.title)}
        </h2>
        <p className="mt-1.5 text-sm font-semibold text-[var(--text-secondary)] lg:mt-2.5 lg:text-[15px]">
          {`${hhmm(e.startAt)} – ${hhmm(e.endAt)}`}
          {e.location ? ` · ${e.location}` : ""}
        </p>
        <span className="mt-4 flex items-center gap-2.5 lg:mt-5">
          {e.location && !past ? <RouteButton location={e.location} color={e.color} className="static size-[42px]" /> : null}
          <BackToFood thumb={foodThumb} onClick={onBack} />
        </span>
      </div>
    </section>
  );
}

/** Linksboven na een tik op een «Hele dag»-tegel: de dag en al zijn hele-dagafspraken. */
function AllDayHero({ events, now, foodThumb, onBack }: { events: WeekEvent[]; now: Date; foodThumb: string | null; onBack: () => void }) {
  const c = events[0].color;
  const dateLabel = events[0].startAt.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" });
  const label = dayLabel(events[0].startAt, now);
  return (
    <section aria-label={`Hele dag, ${dateLabel}`} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:items-center lg:gap-8 lg:pl-2 lg:text-left">
      <span className="lg:hidden"><CalendarIllustration box={220} label="Hele dag" color={c} /></span>
      <span className="hidden lg:block"><CalendarIllustration box={260} label="Hele dag" color={c} /></span>
      <div className="flex min-w-0 flex-col items-center max-lg:min-h-[146px] lg:flex-1 lg:items-start">
        <span
          className={cn("mb-2 inline-flex h-6 items-center rounded-pill bg-[var(--white)] px-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] shadow-[0_2px_8px_-3px_rgba(16,17,48,0.25)]", ON_DARK_TEXT)}
          style={{ color: deep(c, 0.6), ...onDark(c) }}
        >
          {label} · hele dag
        </span>
        <span className="text-[13px] font-bold text-[var(--text-secondary)] first-letter:uppercase lg:text-sm">{dateLabel}</span>
        <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-left">
          {events.map((e) => (
            <li key={e.id} className="flex items-stretch gap-2.5">
              <span aria-hidden className="w-1 shrink-0 rounded-sm" style={{ backgroundColor: rgb(e.color) }} />
              <span className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.02em] text-text-primary lg:text-[30px]">{agendaDisplayTitle(e.title)}</span>
            </li>
          ))}
        </ul>
        <span className="mt-4 lg:mt-5">
          <BackToFood thumb={foodThumb} onClick={onBack} />
        </span>
      </div>
    </section>
  );
}

/** Klikbare tegel: tik (of Enter/spatie) kiest de afspraak; knoppen en links in de tegel (route) gaan voor. */
function selectProps(selected: boolean, onSelect: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": selected,
    onClick: (ev: React.MouseEvent) => {
      if ((ev.target as HTMLElement).closest("a,button")) return;
      onSelect();
    },
    onKeyDown: (ev: React.KeyboardEvent) => {
      if (ev.target !== ev.currentTarget || (ev.key !== "Enter" && ev.key !== " ")) return;
      ev.preventDefault();
      onSelect();
    },
  };
}
/** Gekozen tegel: blauwe rand zoals de gekozen dag op «Eten». De volgende afspraak krijgt enkel het label «Volgende», geen rand, zodat die niet op een keuze lijkt. */
const SELECTED_RING = "0 0 0 2px var(--blue-500), 0 0 0 5px var(--blue-50)";
const TILE_INTERACTIVE =
  "cursor-pointer transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

type Selectable = { selected: boolean; onSelect: () => void };

function EventTile({ e, now, isNext, selected, onSelect, dark }: { e: WeekEvent; now: Date; isNext: boolean; dark: boolean } & Selectable) {
  const past = e.endAt.getTime() <= now.getTime();
  const photo = agendaPhotoFor(e.title, e.location);
  if (photo) return <PhotoEventTile e={e} now={now} isNext={isNext} past={past} photo={photo} selected={selected} onSelect={onSelect} dark={dark} />;
  return (
    <article
      {...selectProps(selected, onSelect)}
      data-next={isNext ? "true" : undefined}
      aria-label={`${dayLabel(e.startAt, now).toLowerCase()}, ${e.allDay ? "hele dag" : hhmm(e.startAt)}: ${agendaDisplayTitle(e.title)}`}
      className={cn(
        "relative h-[190px] w-[150px] flex-none snap-start rounded-[26px] p-3.5 lg:h-[230px] lg:w-[220px] lg:p-4",
        TILE_INTERACTIVE,
        past && !selected && "opacity-50",
      )}
      style={{
        backgroundImage: `linear-gradient(170deg, ${rgb(e.color, 0.2)} 0%, transparent 75%)`,
        backgroundColor: "var(--white)",
        boxShadow: selected ? SELECTED_RING : "inset 0 0 0 1px var(--border-subtle)",
      }}
    >
      {isNext ? <NextBadge color={e.color} /> : null}
      <span className="block text-[11px] font-extrabold tracking-[0.06em] text-[var(--text-secondary)]">{dayLabel(e.startAt, now)}</span>
      <span
        className="mt-0.5 block text-[24px] font-extrabold tracking-[-0.02em] lg:text-[28px] [[data-theme=dark]_&]:!text-[color:var(--tile-time-dark)]"
        style={{ color: deep(e.color), ["--tile-time-dark" as string]: rgb(e.color) }}
      >
        {e.allDay ? "Hele dag" : hhmm(e.startAt)}
      </span>
      <span className="absolute inset-x-3.5 bottom-3.5 lg:inset-x-4 lg:bottom-4">
        <span className="line-clamp-2 text-[14.5px] font-extrabold leading-[1.2] text-text-primary lg:text-base">{agendaDisplayTitle(e.title)}</span>
        {e.location ? (
          <span className="mt-1 flex min-w-0 items-center gap-1 text-[12px] text-[var(--text-secondary)] lg:text-[12.5px]">
            <PinIcon />
            <span className="truncate">{e.location}</span>
          </span>
        ) : null}
      </span>
    </article>
  );
}

function NextBadge({ color }: { color: Rgb }) {
  return (
    <span
      className="absolute -top-3 left-1/2 z-[2] inline-flex h-6 -translate-x-1/2 items-center whitespace-nowrap rounded-pill px-2.5 text-[11.5px] font-bold text-white"
      style={{ backgroundColor: rgb(color) }}
    >
      Volgende
    </span>
  );
}

/**
 * Fototegel zoals op de startpagina (canvas «Fototegel blur · 2» + «L1 · Licht uitgewassen»): volle foto,
 * lichter en zachter met een witte waas, onderaan wazig en ingekleurd in de lichte afspraakkleur. Dag + uur
 * in een witte pil, titel en uur · plaats in een donkere tint van die kleur; route-knop rechtsboven.
 * Donker thema en always-on: omgekeerd, dus de foto donkerder met een donkere waas in de afspraakkleur,
 * een donkere pil en lichte tekst, zodat de tegel niet als enige fel oplicht.
 */
function PhotoEventTile({ e, now, isNext, past, photo, selected, onSelect, dark }: { e: WeekEvent; now: Date; isNext: boolean; past: boolean; photo: string; dark: boolean } & Selectable) {
  const c = e.color;
  const wash = c.map((v) => (dark ? Math.round(v * 0.2) : Math.round(255 - (255 - v) * 0.2)));
  const tint = (a: number) => `rgba(${wash[0]},${wash[1]},${wash[2]},${a})`;
  const mask = "linear-gradient(180deg, transparent 40%, #000 68%)";
  const meta = [`${hhmm(e.startAt)} – ${hhmm(e.endAt)}`, e.location].filter(Boolean).join(" · ");
  const title = agendaDisplayTitle(e.title);
  // Mobiel past «MORGEN 22:00» niet naast de route-knop: dan enkel het uur in de pil, de dag in de regel onderaan.
  const hasRoute = Boolean(e.location) && !past;
  const day = dayLabel(e.startAt, now);
  return (
    <article
      {...selectProps(selected, onSelect)}
      data-next={isNext ? "true" : undefined}
      aria-label={`${dayLabel(e.startAt, now).toLowerCase()}, ${hhmm(e.startAt)}: ${title}`}
      className={cn("relative h-[190px] w-[150px] flex-none snap-start rounded-[26px] lg:h-[230px] lg:w-[220px]", TILE_INTERACTIVE, past && !selected && "opacity-50")}
      style={{ boxShadow: selected ? SELECTED_RING : "0 12px 24px -18px rgba(16,17,48,0.45)" }}
    >
      <span className="pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[26px]" aria-hidden>
        <Image
          src={`${photo}_480.webp`}
          alt=""
          fill
          sizes="(min-width: 1024px) 220px, 150px"
          className={cn("object-cover", dark ? "brightness-[0.82] saturate-[.85]" : "brightness-[1.2] contrast-[.78] saturate-[.82]")}
        />
        {dark ? null : <span className="absolute inset-0" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />}
        <Image
          src={`${photo}_240.webp`}
          alt=""
          fill
          sizes="(min-width: 1024px) 220px, 150px"
          className={cn("scale-110 object-cover blur-[14px] saturate-[1.1]", dark ? "brightness-[0.55]" : "brightness-[1.15]")}
          style={{ WebkitMaskImage: mask, maskImage: mask }}
        />
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${tint(0)} 36%, ${tint(0.86)} 70%, ${tint(0.97)} 100%)` }} />
      </span>
      {isNext ? <NextBadge color={c} /> : null}
      <span
        className="absolute left-2.5 top-2.5 z-[2] inline-flex h-7 items-center rounded-pill px-2.5 shadow-[0_2px_8px_-3px_rgba(16,17,48,0.3)] lg:left-3 lg:top-3 lg:h-8 lg:px-3"
        style={{ backgroundColor: dark ? "rgba(14,15,22,0.72)" : "rgba(255,255,255,0.95)" }}
      >
        {/* Dag en uur allebei verticaal gecentreerd in de pil. */}
        <span className="inline-flex items-center gap-1.5 leading-none">
          <span
            className={cn("text-[10px] font-extrabold uppercase leading-none tracking-[0.06em] lg:text-[10.5px]", hasRoute && "max-lg:hidden")}
            style={{ color: dark ? pale(c, 0.55) : deep(c, 0.45) }}
          >
            {day}
          </span>
          <span className="text-sm font-extrabold leading-none tabular-nums lg:text-[15px]" style={{ color: dark ? pale(c, 0.3) : deep(c, 0.6) }}>
            {hhmm(e.startAt)}
          </span>
        </span>
      </span>
      {hasRoute ? <RouteButton location={e.location!} color={c} className="lg:right-3 lg:top-3 lg:size-8" /> : null}
      <span className="absolute inset-x-3.5 bottom-3 z-[1] flex flex-col lg:inset-x-4 lg:bottom-3.5">
        <span className="line-clamp-2 text-[15px] font-extrabold leading-[19px] lg:text-base lg:leading-5" style={{ color: dark ? pale(c, 0.14) : deep(c, 0.35) }}>
          {title}
        </span>
        <span className="mt-0.5 truncate text-xs font-medium lg:text-[12.5px]" style={{ color: dark ? pale(c, 0.45) : deep(c, 0.5) }}>
          {hasRoute ? <span className="lg:hidden">{day.charAt(0) + day.slice(1).toLowerCase()} · </span> : null}
          {meta}
        </span>
      </span>
    </article>
  );
}

/**
 * Alle hele-dag-afspraken van één dag in één tegel (zelfde stijl als «Hele dag» op de startpagina):
 * dag + aantal, «Hele dag» groot, daaronder de afspraken met een kleurstreepje. Geen foto.
 */
function AllDayTile({ events, now, isNext, selected, onSelect }: { events: WeekEvent[]; now: Date; isNext: boolean } & Selectable) {
  const c = events[0].color;
  const past = events.every((e) => e.endAt.getTime() <= now.getTime());
  const shown = events.slice(0, 3);
  return (
    <article
      {...selectProps(selected, onSelect)}
      data-next={isNext ? "true" : undefined}
      aria-label={`${dayLabel(events[0].startAt, now).toLowerCase()}, hele dag: ${events.map((e) => agendaDisplayTitle(e.title)).join(", ")}`}
      className={cn(
        "relative flex h-[190px] w-[150px] flex-none snap-start flex-col rounded-[26px] p-3.5 lg:h-[230px] lg:w-[220px] lg:p-4",
        TILE_INTERACTIVE,
        past && !selected && "opacity-50",
      )}
      style={{
        backgroundImage: `linear-gradient(170deg, ${rgb(c, 0.16)} 0%, transparent 62%)`,
        backgroundColor: "var(--white)",
        boxShadow: selected ? SELECTED_RING : "inset 0 0 0 1px var(--border-subtle)",
      }}
    >
      {isNext ? (
        <span
          className="absolute -top-3 left-1/2 inline-flex h-6 -translate-x-1/2 items-center whitespace-nowrap rounded-pill px-2.5 text-[11.5px] font-bold text-white"
          style={{ backgroundColor: rgb(c) }}
        >
          Volgende
        </span>
      ) : null}
      <span className="flex items-center justify-between">
        <span className={cn("text-[11px] font-extrabold tracking-[0.06em]", ON_DARK_TEXT)} style={{ color: deep(c, 0.55), ...onDark(c) }}>
          {dayLabel(events[0].startAt, now)}
        </span>
        {events.length > 1 ? (
          <span
            className={cn("flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-extrabold", ON_DARK_TEXT)}
            style={{ backgroundColor: rgb(c, 0.16), color: deep(c, 0.55), ...onDark(c) }}
          >
            {events.length}
          </span>
        ) : null}
      </span>
      <span
        className="mt-0.5 block text-[24px] font-extrabold tracking-[-0.02em] lg:text-[28px] [[data-theme=dark]_&]:!text-[color:var(--tile-time-dark)]"
        style={{ color: deep(c), ["--tile-time-dark" as string]: rgb(c) }}
      >
        Hele dag
      </span>
      <span className="mt-1.5 flex min-h-0 flex-col">
        {shown.map((e, i) => (
          <span
            key={e.id}
            className={cn(
              "flex gap-2 py-[7px]",
              i > 0 && "border-t border-[var(--border-subtle)]",
              // Mobiel: bij meer dan 3 maar 2 rijen, zodat «+ n meer» ruimte heeft.
              i === 2 && events.length > 3 && "max-lg:hidden",
            )}
          >
            <span className="w-1 shrink-0 rounded-sm" style={{ backgroundColor: rgb(e.color) }} aria-hidden />
            <span
              className={cn(
                "text-[13px] font-bold leading-4 text-text-primary lg:line-clamp-2 lg:text-[14px] lg:leading-[18px]",
                // Mobiel: met 1–2 afspraken is er plaats voor 2 regels, anders 1.
                events.length <= 2 ? "line-clamp-2" : "line-clamp-1",
              )}
            >
              {agendaDisplayTitle(e.title)}
            </span>
          </span>
        ))}
      </span>
      {events.length > 3 ? (
        <>
          <span className="mt-auto text-xs font-semibold text-[var(--text-tertiary)] lg:hidden">+ {events.length - 2} meer</span>
          <span className="mt-auto text-xs font-semibold text-[var(--text-tertiary)] max-lg:hidden">+ {events.length - 3} meer</span>
        </>
      ) : null}
    </article>
  );
}

type LaneItem = { kind: "event"; e: WeekEvent } | { kind: "allDay"; day: string; events: WeekEvent[] };

/** Rij: hele-dag-afspraken per dag samen in één tegel, op de plek van de eerste van die dag. */
function buildLane(events: WeekEvent[]): LaneItem[] {
  const out: LaneItem[] = [];
  const groups = new Map<string, Extract<LaneItem, { kind: "allDay" }>>();
  for (const e of events) {
    if (!e.allDay) {
      out.push({ kind: "event", e });
      continue;
    }
    const g = groups.get(e.dayIso);
    if (g) g.events.push(e);
    else {
      const item = { kind: "allDay" as const, day: e.dayIso, events: [e] };
      groups.set(e.dayIso, item);
      out.push(item);
    }
  }
  // Zelfde verjaardag meermaals in de agenda («bday», «verjaardag», …) of twee hele-dag-afspraken over
  // hetzelfde («studiedag»): één keer per dag.
  return out.map((item) => (item.kind === "allDay" ? { ...item, events: mergeAllDayDuplicates(dedupeBirthdays(item.events)) } : item));
}

function TileSkeleton() {
  return (
    <div className="h-[190px] w-[150px] flex-none rounded-[26px] bg-[var(--white)]/60 p-3.5 shadow-[inset_0_0_0_1px_var(--border-subtle)] lg:h-[230px] lg:w-[220px] lg:p-4" aria-hidden>
      <span className="shimmer block h-2.5 w-14 rounded-md" />
      <span className="shimmer mt-2 block h-6 w-20 rounded-md" />
      <span className="shimmer mt-[70px] block h-4 w-[80%] rounded-md lg:mt-[100px]" />
      <span className="shimmer mt-2 block h-3 w-[55%] rounded-md" />
    </div>
  );
}

/** Het eten van vandaag, aangeleverd door de kalenderpagina (zelfde bord en dagkaart als «Eten»). */
export type AgendaFood = {
  /** Linksboven: het gerecht van vandaag. */
  hero: React.ReactNode;
  /** Tegel in de rij op de plaats van vandaag. */
  tile: (p: { selected: boolean; onSelect: () => void }) => React.ReactNode;
  /** Kleine foto voor «Eten van vandaag». */
  thumb: string | null;
};

type Selection = { kind: "food" } | { kind: "event"; id: string } | { kind: "allDay"; day: string };
/** Zonder aanraking springt de keuze na zoveel tijd terug naar het eten. */
const BACK_TO_FOOD_MS = 3 * 60_000;

/**
 * Agendaweergave van de kalender. `onTint` geeft de kleur van de gekozen afspraak voor de band bovenaan
 * (null = het eten is gekozen; dan kleurt de pagina mee met het gerecht). `idle` = always-on: dezelfde
 * weergave, maar terug op het eten van vandaag en de rij terug op vandaag, want niemand kijkt nog mee.
 */
export function KalenderAgenda({ onTint, food, idle = false }: { onTint: (c: Rgb | null) => void; food: AgendaFood; idle?: boolean }) {
  const { state, failed, events, now, future, connect } = useAgendaWeek();
  const dark = useIsDarkTheme();
  const nowMs = now.getTime();
  const upcoming = events.filter((e) => e.endAt.getTime() > nowMs);
  const next = upcoming.find((e) => e.startAt.getTime() > nowMs) ?? null;
  // In de rij: de vorige dagen (vervaagd), vandaag en de rest van de week; hele-dag per dag gebundeld.
  const lane = buildLane(events);
  // Het eten van vandaag staat op de plaats van vandaag: vóór de eerste tegel van vandaag of later.
  const todayIso = dayIso(now);
  const foodAt = (() => {
    const i = lane.findIndex((item) => (item.kind === "event" ? item.e.dayIso : item.day) >= todayIso);
    return i === -1 ? lane.length : i;
  })();

  const [sel, setSel] = React.useState<Selection>({ kind: "food" });
  const selectedEvent = sel.kind === "event" ? (events.find((e) => e.id === sel.id) ?? null) : null;
  const selectedAllDay =
    sel.kind === "allDay" ? (lane.find((item): item is Extract<LaneItem, { kind: "allDay" }> => item.kind === "allDay" && item.day === sel.day) ?? null) : null;
  const showFood = !selectedEvent && !selectedAllDay;
  const tint = selectedEvent?.color ?? selectedAllDay?.events[0]?.color ?? null;

  React.useEffect(() => {
    onTint(tint);
  }, [tint, onTint]);

  // Na een paar minuten zonder aanraking terug naar het eten.
  React.useEffect(() => {
    if (showFood) return;
    let timer = window.setTimeout(() => setSel({ kind: "food" }), BACK_TO_FOOD_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSel({ kind: "food" }), BACK_TO_FOOD_MS);
    };
    window.addEventListener("pointerdown", reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
    };
  }, [showFood]);

  const choose = (next: Selection) => {
    setSel(next);
    // Gsm: het detail staat bovenaan, de rij een stuk lager.
    if (window.matchMedia("(max-width: 1023px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backToFood = () => setSel({ kind: "food" });

  const laneRef = React.useRef<HTMLDivElement>(null);
  const moreRef = React.useRef<HTMLDivElement>(null);
  const positioned = React.useRef(false);
  const moreAction = React.useRef({ load: future.loadMore, failed: future.failed });
  moreAction.current = { load: future.loadMore, failed: future.failed };
  const [canScroll, setCanScroll] = React.useState({ back: false, forward: false });
  const updateArrows = React.useCallback(() => {
    const el = laneRef.current;
    if (!el) return;
    setCanScroll({ back: el.scrollLeft > 4, forward: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  // Always-on begint: terug naar het eten en de rij terug op vandaag (het effect hieronder zet ze daar).
  React.useLayoutEffect(() => {
    if (!idle) return;
    setSel({ kind: "food" });
    positioned.current = false;
  }, [idle]);
  // Bij laden: de eetegel van vandaag links in beeld, met een stukje van de vorige tegel ervoor.
  React.useLayoutEffect(() => {
    const el = laneRef.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>('[data-lane-anchor="true"]');
    // Zelfde plaats als het snappunt: scroll-padding laat een derde van de vorige tegel zien.
    if (!positioned.current) {
      if (tile) el.scrollLeft = Math.max(0, tile.offsetLeft - el.offsetLeft - (parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0));
      positioned.current = true;
    }
    updateArrows();
  }, [foodAt, lane.length, idle, updateArrows]);
  React.useEffect(() => {
    const root = laneRef.current;
    const target = moreRef.current;
    if (!state?.connected || !root || !target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !moreAction.current.failed) void moreAction.current.load();
    }, { root, rootMargin: "0px 240px 0px 0px", threshold: 0.1 });
    observer.observe(target);
    // Keep the observer mounted as windows arrive. An empty month must not cause
    // an automatic request loop; the same visible button can advance it manually.
    return () => observer.disconnect();
  }, [state?.connected]);
  React.useEffect(() => {
    const root = laneRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(root);
    return () => observer.disconnect();
  }, [state?.connected, updateArrows]);
  const scrollLane = (dir: -1 | 1) => {
    const el = laneRef.current;
    if (!el) return;
    if (dir === 1 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 240) void future.loadMore();
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  // Linksboven: het eten (standaard) of de gekozen afspraak; rechts de to-do's (gsm: onder de rij).
  const hero = selectedEvent ? (
    <EventHero e={selectedEvent} now={now} foodThumb={food.thumb} onBack={backToFood} dark={dark} />
  ) : selectedAllDay ? (
    <AllDayHero events={selectedAllDay.events} now={now} foodThumb={food.thumb} onBack={backToFood} />
  ) : (
    food.hero
  );
  const shell = (laneBlock: React.ReactNode) => (
    <div className="grid grid-cols-[minmax(0,1fr)] [grid-template-areas:'hero''lane''todo'] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-8 lg:[grid-template-areas:'hero_todo''lane_lane']">
      <div className="mt-2 [grid-area:hero] lg:mt-4">{hero}</div>
      <KalenderTodoBoard className="mt-8 [grid-area:todo] lg:mt-6 lg:w-[440px] lg:self-start" />
      <div className="min-w-0 [grid-area:lane]">{laneBlock}</div>
    </div>
  );

  if (!state && !failed) {
    return shell(
      <div aria-label="Agenda laden" aria-busy>
        <div className="mb-1.5 mt-8 lg:mt-10">
          <span className="shimmer block h-5 w-28 rounded-md" />
        </div>
        <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2 pt-1.5 lg:mx-0 lg:gap-4 lg:px-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      </div>,
    );
  }

  if (!state?.connected) {
    return shell(
      <section className="mt-10 flex flex-col items-center rounded-[20px] bg-[var(--white)] px-6 py-8 text-center shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:mt-12">
        <Image src="/images/ui/kalender_320.webp" alt="" width={320} height={320} className="size-24 object-contain" />
        <p className="mt-4 text-xl font-extrabold text-text-primary">Je agenda, naast je eten</p>
        <p className="mt-1.5 max-w-[380px] text-[15px] leading-6 text-[var(--text-secondary)]">Koppel je Google-agenda om je afspraken van deze week hier te zien. De app kan ze enkel lezen.</p>
        <button
          type="button"
          onClick={connect}
          disabled={state?.configured === false}
          className="mt-5 inline-flex h-12 items-center rounded-pill bg-action-primary px-6 text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(79,85,241,0.8)] disabled:opacity-50"
        >
          Google-agenda koppelen
        </button>
      </section>,
    );
  }

  const foodTile = (
    <div key="food" data-lane-anchor="true" className="flex flex-none snap-start">
      {food.tile({ selected: showFood, onSelect: () => choose({ kind: "food" }) })}
    </div>
  );
  return shell(
    <>
      <div className="mb-1.5 mt-8 flex items-center justify-between lg:mt-10">
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-text-primary">Komende afspraken</h2>
        <span className="flex items-center gap-2 max-lg:hidden">
          <button type="button" aria-label="Eerdere afspraken" disabled={!canScroll.back} onClick={() => scrollLane(-1)} className={cn(headerRoundButtonClass, "disabled:opacity-40")}>
            <ChevronIcon direction="left" />
          </button>
          <button type="button" aria-label="Latere afspraken" disabled={!canScroll.forward && future.loading} onClick={() => scrollLane(1)} className={cn(headerRoundButtonClass, "disabled:opacity-40")}>
            <ChevronIcon direction="right" />
          </button>
        </span>
      </div>
      <div className="mb-2 text-xs text-[var(--text-tertiary)]" aria-live="polite">
        Geladen tot {new Date(future.loadedUntil.getFullYear(), future.loadedUntil.getMonth(), future.loadedUntil.getDate() - 1).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
      </div>
      <div
        ref={laneRef}
        onScroll={updateArrows}
        className="-mx-4 -mt-2 flex snap-x snap-mandatory scroll-pl-[78px] scroll-pr-4 gap-3 overflow-x-auto px-4 pb-3 pt-3.5 [scrollbar-width:none] lg:-mx-1 lg:scroll-pl-[93px] lg:scroll-pr-1 lg:gap-4 lg:px-1 [&::-webkit-scrollbar]:hidden"
      >
        {lane.flatMap((item, i) => {
          const tile =
            item.kind === "event" ? (
              <EventTile
                key={item.e.id}
                e={item.e}
                now={now}
                isNext={item.e.id === next?.id}
                selected={selectedEvent?.id === item.e.id}
                onSelect={() => choose({ kind: "event", id: item.e.id })}
                dark={dark}
              />
            ) : (
              <AllDayTile
                key={`allday-${item.day}`}
                events={item.events}
                now={now}
                isNext={item.events.some((e) => e.id === next?.id)}
                selected={selectedAllDay?.day === item.day}
                onSelect={() => choose({ kind: "allDay", day: item.day })}
              />
            );
          return i === foodAt ? [foodTile, tile] : [tile];
        })}
        {foodAt === lane.length ? foodTile : null}
        <div ref={moreRef} className="flex h-[190px] w-[150px] flex-none snap-start flex-col items-center justify-center gap-3 rounded-[26px] bg-[var(--white)]/60 p-4 text-center shadow-[inset_0_0_0_1px_var(--border-subtle)] lg:h-[230px] lg:w-[220px]" aria-busy={future.loading}>
          <p className="text-sm text-[var(--text-secondary)]">{future.failed ? "Laden is niet gelukt." : lane.length === 0 ? "Geen afspraken in de geladen periode." : "Verder kijken in je agenda"}</p>
          <button type="button" disabled={future.loading} onClick={() => void future.loadMore()} className="min-h-11 rounded-pill bg-action-primary px-4 text-sm font-bold text-white disabled:opacity-50">
            {future.loading ? "Afspraken laden…" : future.failed ? "Opnieuw proberen" : "Volgende 30 dagen"}
          </button>
        </div>
      </div>
      {failed ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Niet alle afspraken konden geladen worden.</p> : null}
    </>,
  );
}

/** Band-kleuren voor de pagina (zelfde verloop als de etenskalender). */
export function agendaBand(c: Rgb | null, dark: boolean) {
  if (!c) return null;
  if (dark) return { top: rgb(c, 0.3), bottom: rgb(c, 0.14) };
  return { top: mixWithWhite(c, 0.32), bottom: mixWithWhite(c, 0.12) };
}
