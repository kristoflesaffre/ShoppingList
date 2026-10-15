"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { startGoogleConnect, useGoogleAuthToken } from "@/lib/google-client";
import { fetchAgenda, localDayIso, useCachedAgenda } from "@/lib/agenda_cache";
import { mixWithWhite, type Rgb } from "@/lib/recipe-tint";
import { agendaPhotoFor } from "@/lib/agenda_photos";
import { agendaDisplayTitle, dedupeBirthdays } from "@/lib/agenda_birthdays";
import { RouteButton } from "@/components/home_agenda_section";

/**
 * Kalender › Agenda (canvas «Kalender · B · kalenderillustratie + tegel per afspraak»): bovenaan de
 * volgende afspraak groot naast de kalenderillustratie (met het uur erop) en «Nu: …» als er iets
 * bezig is; daaronder «Deze week», één tegel per afspraak in de kleur van zijn agenda.
 * Opbouw en maten volgen de etenskalender (Podium + Overzicht).
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

type WeekEvent = ApiEvent & {
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
function useAgendaWeek() {
  const { token, state, failed, now } = useCachedAgenda<ApiState>(weekRange);

  const events = React.useMemo((): WeekEvent[] => {
    const names: string[] = [];
    const out: WeekEvent[] = [];
    for (const e of state?.events ?? []) {
      const startAt = parseStart(e);
      if (!startAt) continue;
      const key = e.calendarName ?? e.accountId ?? "";
      if (!names.includes(key)) names.push(key);
      out.push({ ...e, startAt, endAt: parseEnd(e, startAt), dayIso: dayIso(startAt), color: CALENDAR_COLORS[names.indexOf(key) % CALENDAR_COLORS.length] });
    }
    return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || Number(b.allDay) - Number(a.allDay));
  }, [state?.events]);

  return { token, state, failed, events, now, connect: () => void startGoogleConnect(token) };
}

function dayLabel(d: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "VANDAAG";
  if (diff === 1) return "MORGEN";
  if (diff === -1) return "GISTEREN";
  return d.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric" }).replace(".", "").toUpperCase();
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

/** Bovenaan: kalenderillustratie met het uur + de volgende afspraak. */
function NextHero({ next, current, now }: { next: WeekEvent | null; current: WeekEvent | null; now: Date }) {
  // Zelfde vak als het bord op «Eten» (250 / 330 px), zodat tekst en rij op dezelfde plaats staan.
  const illustration = (box: number, size = Math.round(box * 0.8)) => (
    <span className="flex shrink-0 items-center justify-center" style={{ width: box, height: box }}>
      <span className="relative block shrink-0" style={{ width: size, height: size }}>
        <Image src="/images/ui/kalender_320.webp" alt="" width={320} height={320} priority className="size-full object-contain drop-shadow-[0_24px_30px_rgba(120,60,0,0.25)]" />
        {next ? (
          <span
            className="absolute bottom-[12%] left-1/2 inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-pill bg-[var(--white)] font-extrabold shadow-[0_8px_18px_-10px_rgba(0,0,0,0.35)]"
            style={{ height: size * 0.16, paddingInline: size * 0.06, fontSize: size * 0.09, color: deep(next.color, 0.6) }}
          >
            {next.allDay ? "Hele dag" : hhmm(next.startAt)}
          </span>
        ) : null}
      </span>
    </span>
  );
  const dateLabel = next
    ? next.startAt.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()
    : "";
  return (
    <section
      aria-label={next ? `Volgende afspraak: ${agendaDisplayTitle(next.title)}` : "Geen afspraken meer deze week"}
      className="flex flex-col items-center gap-2 text-center lg:flex-row lg:items-center lg:gap-12 lg:pl-6 lg:text-left"
    >
      <span className="lg:hidden">{illustration(250)}</span>
      <span className="hidden lg:block">{illustration(330)}</span>
      {/* Mobiel: plaats voor een titel van twee regels, zodat de rij eronder bij «Eten» en «Agenda» even hoog staat. */}
      <div className="flex min-w-0 flex-col items-center max-lg:min-h-[146px] lg:flex-1 lg:items-start">
        {next ? (
          <>
            <span className="mb-2 inline-flex h-6 items-center rounded-pill bg-[var(--white)] px-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--blue-500)] shadow-[0_2px_8px_-3px_rgba(16,17,48,0.25)]">
              {untilLabel(next.startAt, now)}
            </span>
            <span className="text-[13px] font-bold tracking-[0.02em] text-[var(--text-secondary)] lg:text-sm">{dateLabel}</span>
            <h2 className="mt-1.5 text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary lg:mt-2 lg:max-w-[520px] lg:text-[46px] lg:leading-[1.04] lg:tracking-[-0.03em]">
              {agendaDisplayTitle(next.title)}
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-[var(--text-secondary)] lg:mt-2.5 lg:text-[15px]">
              {next.allDay ? "Hele dag" : `${hhmm(next.startAt)} – ${hhmm(next.endAt)}`}
              {next.location ? ` · ${next.location}` : ""}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary lg:text-[40px]">Niets meer gepland</h2>
            <p className="mt-1.5 text-sm font-semibold text-[var(--text-secondary)]">Deze week staat er verder niets in je agenda.</p>
          </>
        )}
        {current ? (
          <span className="mt-4 inline-flex max-w-full items-center gap-2.5 rounded-[16px] bg-[var(--white)]/75 px-3.5 py-2.5 text-[13.5px] text-text-primary lg:mt-5 lg:text-sm">
            <span className="size-2 shrink-0 rounded-full bg-[#e06a6a]" aria-hidden />
            <span className="truncate">
              <b>Nu:</b> {agendaDisplayTitle(current.title)} · tot {hhmm(current.endAt)}
            </span>
          </span>
        ) : null}
      </div>
    </section>
  );
}

function EventTile({ e, now, isNext }: { e: WeekEvent; now: Date; isNext: boolean }) {
  const past = e.endAt.getTime() <= now.getTime();
  const photo = agendaPhotoFor(e.title, e.location);
  if (photo) return <PhotoEventTile e={e} now={now} isNext={isNext} past={past} photo={photo} />;
  return (
    <article
      data-next={isNext ? "true" : undefined}
      aria-label={`${dayLabel(e.startAt, now).toLowerCase()}, ${e.allDay ? "hele dag" : hhmm(e.startAt)}: ${agendaDisplayTitle(e.title)}`}
      className={cn(
        "relative h-[190px] w-[150px] flex-none snap-start rounded-[26px] p-3.5 lg:h-[230px] lg:w-[220px] lg:p-4",
        past && "opacity-50",
      )}
      style={{
        backgroundImage: `linear-gradient(170deg, ${rgb(e.color, 0.2)} 0%, transparent 75%)`,
        backgroundColor: "var(--white)",
        boxShadow: isNext ? `0 0 0 2.5px ${rgb(e.color)}, 0 14px 30px -18px ${rgb(e.color, 0.7)}` : "inset 0 0 0 1px var(--border-subtle)",
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
 */
function PhotoEventTile({ e, now, isNext, past, photo }: { e: WeekEvent; now: Date; isNext: boolean; past: boolean; photo: string }) {
  const c = e.color;
  const light = c.map((v) => Math.round(255 - (255 - v) * 0.2));
  const tint = (a: number) => `rgba(${light[0]},${light[1]},${light[2]},${a})`;
  const mask = "linear-gradient(180deg, transparent 40%, #000 68%)";
  const meta = [`${hhmm(e.startAt)} – ${hhmm(e.endAt)}`, e.location].filter(Boolean).join(" · ");
  const title = agendaDisplayTitle(e.title);
  // Mobiel past «MORGEN 22:00» niet naast de route-knop: dan enkel het uur in de pil, de dag in de regel onderaan.
  const hasRoute = Boolean(e.location) && !past;
  const day = dayLabel(e.startAt, now);
  return (
    <article
      data-next={isNext ? "true" : undefined}
      aria-label={`${dayLabel(e.startAt, now).toLowerCase()}, ${hhmm(e.startAt)}: ${title}`}
      className={cn("relative h-[190px] w-[150px] flex-none snap-start rounded-[26px] lg:h-[230px] lg:w-[220px]", past && "opacity-50")}
      style={{ boxShadow: isNext ? `0 0 0 2.5px ${rgb(c)}, 0 14px 30px -18px ${rgb(c, 0.7)}` : "0 12px 24px -18px rgba(16,17,48,0.45)" }}
    >
      <span className="pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[26px]" aria-hidden>
        <Image src={`${photo}_480.webp`} alt="" fill sizes="(min-width: 1024px) 220px, 150px" className="object-cover brightness-[1.2] contrast-[.78] saturate-[.82]" />
        <span className="absolute inset-0" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
        <Image
          src={`${photo}_240.webp`}
          alt=""
          fill
          sizes="(min-width: 1024px) 220px, 150px"
          className="scale-110 object-cover blur-[14px] brightness-[1.15] saturate-[1.1]"
          style={{ WebkitMaskImage: mask, maskImage: mask }}
        />
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${tint(0)} 36%, ${tint(0.86)} 70%, ${tint(0.97)} 100%)` }} />
      </span>
      {isNext ? <NextBadge color={c} /> : null}
      <span
        className="absolute left-2.5 top-2.5 z-[2] inline-flex h-7 items-center rounded-pill px-2.5 shadow-[0_2px_8px_-3px_rgba(16,17,48,0.3)] lg:left-3 lg:top-3 lg:h-8 lg:px-3"
        style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
      >
        {/* Dag en uur allebei verticaal gecentreerd in de pil. */}
        <span className="inline-flex items-center gap-1.5 leading-none">
          <span
            className={cn("text-[10px] font-extrabold uppercase leading-none tracking-[0.06em] lg:text-[10.5px]", hasRoute && "max-lg:hidden")}
            style={{ color: deep(c, 0.45) }}
          >
            {day}
          </span>
          <span className="text-sm font-extrabold leading-none tabular-nums lg:text-[15px]" style={{ color: deep(c, 0.6) }}>
            {hhmm(e.startAt)}
          </span>
        </span>
      </span>
      {hasRoute ? <RouteButton location={e.location!} color={c} className="lg:right-3 lg:top-3 lg:size-8" /> : null}
      <span className="absolute inset-x-3.5 bottom-3 z-[1] flex flex-col lg:inset-x-4 lg:bottom-3.5">
        <span className="line-clamp-2 text-[15px] font-extrabold leading-[19px] lg:text-base lg:leading-5" style={{ color: deep(c, 0.35) }}>
          {title}
        </span>
        <span className="mt-0.5 truncate text-xs font-medium lg:text-[12.5px]" style={{ color: deep(c, 0.5) }}>
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
function AllDayTile({ events, now, isNext }: { events: WeekEvent[]; now: Date; isNext: boolean }) {
  const c = events[0].color;
  const past = events.every((e) => e.endAt.getTime() <= now.getTime());
  const shown = events.slice(0, 3);
  return (
    <article
      data-next={isNext ? "true" : undefined}
      aria-label={`${dayLabel(events[0].startAt, now).toLowerCase()}, hele dag: ${events.map((e) => agendaDisplayTitle(e.title)).join(", ")}`}
      className={cn(
        "relative flex h-[190px] w-[150px] flex-none snap-start flex-col rounded-[26px] p-3.5 lg:h-[230px] lg:w-[220px] lg:p-4",
        past && "opacity-50",
      )}
      style={{
        backgroundImage: `linear-gradient(170deg, ${rgb(c, 0.16)} 0%, transparent 62%)`,
        backgroundColor: "var(--white)",
        boxShadow: isNext ? `0 0 0 2.5px ${rgb(c)}, 0 14px 30px -18px ${rgb(c, 0.7)}` : "inset 0 0 0 1px var(--border-subtle)",
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
        <span className="text-[11px] font-extrabold tracking-[0.06em]" style={{ color: deep(c, 0.55) }}>
          {dayLabel(events[0].startAt, now)}
        </span>
        {events.length > 1 ? (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-extrabold"
            style={{ backgroundColor: rgb(c, 0.16), color: deep(c, 0.55) }}
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
  // Zelfde verjaardag meermaals in de agenda («bday», «verjaardag», …): één keer per dag.
  return out.map((item) => (item.kind === "allDay" ? { ...item, events: dedupeBirthdays(item.events) } : item));
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

/** Agendaweergave van de kalender. `onTint` geeft de kleur van de volgende afspraak voor de band bovenaan. */
export function KalenderAgenda({ onTint }: { onTint: (c: Rgb | null) => void }) {
  const { state, failed, events, now, connect } = useAgendaWeek();
  const nowMs = now.getTime();
  const upcoming = events.filter((e) => e.endAt.getTime() > nowMs);
  const current = upcoming.find((e) => !e.allDay && e.startAt.getTime() <= nowMs) ?? null;
  const next = upcoming.find((e) => e.startAt.getTime() > nowMs) ?? null;
  // In de rij: de vorige dagen (vervaagd), vandaag en de rest van de week; hele-dag per dag gebundeld.
  const lane = buildLane(events);

  React.useEffect(() => {
    onTint(next?.color ?? current?.color ?? null);
  }, [next?.color, current?.color, onTint]);

  const laneRef = React.useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = React.useState({ back: false, forward: false });
  const updateArrows = React.useCallback(() => {
    const el = laneRef.current;
    if (!el) return;
    setCanScroll({ back: el.scrollLeft > 4, forward: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  // Bij laden: de volgende afspraak links in beeld, met een stukje van de vorige ervoor.
  const nextId = next?.id ?? null;
  React.useLayoutEffect(() => {
    const el = laneRef.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>('[data-next="true"]');
    // Zelfde plaats als het snappunt: scroll-padding laat een derde van de vorige tegel zien.
    if (tile) el.scrollLeft = Math.max(0, tile.offsetLeft - el.offsetLeft - (parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0));
    updateArrows();
  }, [nextId, lane.length, updateArrows]);
  const scrollLane = (dir: -1 | 1) => {
    const el = laneRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (!state && !failed) {
    return (
      <div aria-label="Agenda laden" aria-busy>
        <div className="mt-2 flex flex-col items-center gap-2 lg:mt-4 lg:flex-row lg:gap-12 lg:pl-6">
          <span className="flex size-[250px] items-center justify-center lg:size-[330px]">
            <span className="shimmer block size-[200px] rounded-[40px] lg:size-[264px]" />
          </span>
          <span className="flex flex-col items-center gap-2.5 lg:items-start">
            <span className="shimmer block h-6 w-32 rounded-pill" />
            <span className="shimmer block h-3.5 w-44 rounded-md" />
            <span className="shimmer block h-10 w-64 rounded-md lg:h-12 lg:w-96" />
            <span className="shimmer block h-3.5 w-52 rounded-md" />
          </span>
        </div>
        <div className="mb-1.5 mt-8 lg:mt-10">
          <span className="shimmer block h-5 w-28 rounded-md" />
        </div>
        <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2 pt-1.5 lg:mx-0 lg:gap-4 lg:px-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!state?.connected) {
    return (
      <section className="flex min-h-[min(520px,calc(100dvh-12rem))] flex-1 flex-col items-center justify-center">
        <div className="flex w-full max-w-[380px] flex-col items-center text-center">
          <Image src="/images/ui/kalender_320.webp" alt="" width={320} height={320} className="size-28 object-contain" />
          <p className="mt-5 text-xl font-extrabold text-text-primary">Je agenda, naast je eten</p>
          <p className="mt-1.5 text-[15px] leading-6 text-[var(--text-secondary)]">Koppel je Google-agenda om je afspraken van deze week hier te zien. De app kan ze enkel lezen.</p>
          <button
            type="button"
            onClick={connect}
            disabled={state?.configured === false}
            className="mt-5 inline-flex h-12 items-center rounded-pill bg-action-primary px-6 text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(79,85,241,0.8)] disabled:opacity-50"
          >
            Google-agenda koppelen
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="mt-2 lg:mt-4">
        <NextHero next={next} current={current} now={now} />
      </div>

      <div className="mb-1.5 mt-8 flex items-center justify-between lg:mt-10">
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-text-primary">Deze week</h2>
        <span className="flex items-center gap-2 max-lg:hidden">
          <button type="button" aria-label="Eerdere afspraken" disabled={!canScroll.back} onClick={() => scrollLane(-1)} className={cn(headerRoundButtonClass, "disabled:opacity-40")}>
            <ChevronIcon direction="left" />
          </button>
          <button type="button" aria-label="Latere afspraken" disabled={!canScroll.forward} onClick={() => scrollLane(1)} className={cn(headerRoundButtonClass, "disabled:opacity-40")}>
            <ChevronIcon direction="right" />
          </button>
        </span>
      </div>
      {lane.length > 0 ? (
        <div
          ref={laneRef}
          onScroll={updateArrows}
          className="-mx-4 flex -mt-2 snap-x snap-mandatory scroll-pl-[78px] scroll-pr-4 gap-3 overflow-x-auto px-4 pb-3 pt-3.5 [scrollbar-width:none] lg:-mx-1 lg:scroll-pl-[93px] lg:scroll-pr-1 lg:gap-4 lg:px-1 [&::-webkit-scrollbar]:hidden"
        >
          {lane.map((item) =>
            item.kind === "event" ? (
              <EventTile key={item.e.id} e={item.e} now={now} isNext={item.e.id === next?.id} />
            ) : (
              <AllDayTile
                key={`allday-${item.day}`}
                events={item.events}
                now={now}
                isNext={item.events.some((e) => e.id === next?.id)}
              />
            ),
          )}
        </div>
      ) : (
        <p className="rounded-[22px] bg-[var(--white)]/60 px-5 py-6 text-center text-sm text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border-subtle)]">
          Geen afspraken deze week.
        </p>
      )}
      {failed ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Niet alle afspraken konden geladen worden.</p> : null}
    </>
  );
}

/** Band-kleuren voor de pagina (zelfde verloop als de etenskalender). */
export function agendaBand(c: Rgb | null, dark: boolean) {
  if (!c) return null;
  if (dark) return { top: rgb(c, 0.3), bottom: rgb(c, 0.14) };
  return { top: mixWithWhite(c, 0.32), bottom: mixWithWhite(c, 0.12) };
}
