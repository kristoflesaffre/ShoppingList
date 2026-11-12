"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { calendarDaySummary, CalendarDayPlate, CalendarLoosePlate, useLoosePhotos } from "@/components/calendar_day_visuals";
import { addDays, toIsoDate, type DayEntry } from "@/lib/calendar-utils";
import { useAgendaWeek, type WeekEvent } from "@/components/kalender_agenda";
import { agendaDisplayTitle } from "@/lib/agenda_birthdays";
import { agendaPhotoFor } from "@/lib/agenda_photos";
import { TodoPostit, useNearTodos } from "@/components/home_todo_section";
import { daysUntil, localIso, sortTasks, type TodoDue, type TodoTask } from "@/lib/todoist-client";
import { displayQuantity } from "@/lib/recipe_ingredient_quantity";
import type { Rgb } from "@/lib/recipe-tint";

/**
 * Kalender · always-on (canvas «KB»): na twee minuten zonder aanraking op een tablet wordt de kalender zwart,
 * zoals het dashboard (pixelbaan, pixelrust en nachtstand komen uit `useAlwaysOn` + globals.css). Eén lijn van
 * links naar rechts: vandaag groot met het eten, de afspraken van vandaag en de post-its; daarna vijf dagen als
 * kolom met het bord, de naam, de afspraken en eventueel een post-it. Een tik op een gerecht opent meteen het
 * detail (`data-aod-pass`: die tik maakt het scherm niet wakker); elders maakt de eerste tik het scherm wakker.
 */

const NEXT_DAYS = 5;
/** Detail sluit vanzelf na zoveel tijd zonder aanraking. */
const DETAIL_IDLE_MS = 30_000;

const rgb = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hhmm = (d: Date) => d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });

type Day = { iso: string; date: Date; entry: DayEntry | null; events: WeekEvent[]; tasks: { task: TodoTask; due: TodoDue }[] };

function useClock(): Date {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Bord van een dag: gerechtfoto rond, losse items op een wit bord, of gestippeld leeg. Gedimd. */
function AodPlate({ iso, entry, size }: { iso: string; entry: DayEntry | null; size: number }) {
  const summary = calendarDaySummary(iso, entry);
  const loosePhotos = useLoosePhotos(summary?.loose);
  if (!summary) {
    return <span aria-hidden className="block shrink-0 rounded-full border-[1.6px] border-dashed border-fixed-white/20" style={{ width: size, height: size }} />;
  }
  if (summary.loose) {
    return (
      <span className="block shrink-0 brightness-[0.7]" style={{ width: size, height: size }}>
        <CalendarLoosePlate photos={loosePhotos} size={size} />
      </span>
    );
  }
  if (summary.photo) {
    return (
      <span className="block shrink-0 overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto (data-URL of extern) */}
        <img src={summary.photo} alt="" className="aod-kenburns size-full scale-[1.08] object-cover brightness-[0.72] saturate-[0.9]" />
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center justify-center brightness-[0.7]" style={{ width: size, height: size }}>
      <CalendarDayPlate src={null} size={size * 0.85} freeze={summary.fromStock} />
    </span>
  );
}

function EventLine({ e }: { e: WeekEvent }) {
  return (
    <span className="grid grid-cols-[4px_minmax(0,1fr)] gap-x-2">
      <span aria-hidden className="row-span-2 rounded-sm opacity-80" style={{ backgroundColor: rgb(e.color) }} />
      <span className="text-[12.5px] font-extrabold tabular-nums text-fixed-white/55">{e.allDay ? "Hele dag" : hhmm(e.startAt)}</span>
      <span className="line-clamp-2 text-[13.5px] font-bold leading-[17px] text-fixed-white/80">{agendaDisplayTitle(e.title)}</span>
    </span>
  );
}

/** Post-its op het zwarte scherm: ontkleurd en gedimd, niet afvinkbaar (eerst wakker maken). */
function DimNotes({ tasks, size, thawPhotos, className }: { tasks: Day["tasks"]; size: number; thawPhotos: Map<string, string>; className?: string }) {
  if (tasks.length === 0) return null;
  return (
    <div aria-hidden className={cn("pointer-events-none flex [filter:saturate(0.7)_brightness(0.6)]", className)}>
      {tasks.slice(0, 4).map(({ task, due }, i) => (
        <TodoPostit key={task.id} task={task} due={due} index={i} size={size} thawPhoto={thawPhotos.get(task.id)} onCheck={() => undefined} />
      ))}
    </div>
  );
}

export function KalenderAlwaysOn({ calendarMap }: { calendarMap: Map<string, DayEntry> }) {
  const now = useClock();
  const { events } = useAgendaWeek();
  const { state, thawPhotos } = useNearTodos();
  const todayIso = localIso(now);
  const [detail, setDetail] = React.useState<string | null>(null);

  const days: Day[] = React.useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tasks = state.kind === "ready" ? state.tasks : [];
    return Array.from({ length: NEXT_DAYS + 1 }, (_, i) => {
      const date = addDays(start, i);
      const iso = toIsoDate(date);
      return {
        iso,
        date,
        entry: calendarMap.get(iso) ?? null,
        events: events.filter((e) => e.dayIso === iso && (i > 0 || e.endAt.getTime() > now.getTime())),
        // Zelfde volgorde en vervaldatumlabels als op de startpagina.
        tasks: sortTasks(
          tasks.filter((t) => {
            const d = daysUntil(t, todayIso);
            return d !== null && (i === 0 ? d <= 0 : d === i);
          }),
          todayIso,
        ),
      };
    });
  }, [now, calendarMap, events, state, todayIso]);

  const today = days[0];
  const todaySummary = calendarDaySummary(today.iso, today.entry);
  const dateLabel = now.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" });
  const time = hhmm(now);
  const [hh, mm] = time.split(":");
  const detailIndex = detail ? days.findIndex((d) => d.iso === detail) : -1;

  return (
    <main aria-label="Kalender, always-on" className="relative flex min-h-dvh w-full flex-col bg-[#000] px-10 pb-8 pt-[calc(36px+env(safe-area-inset-top,0px))] text-fixed-white">
      <header className="aod-clock flex items-end gap-6">
        <span className="text-[76px] font-light leading-[0.9] tracking-[-0.03em] tabular-nums text-fixed-white/90">
          {hh}
          <span className="aod-colon">:</span>
          {mm}
        </span>
        <span className="pb-1.5 text-[20px] font-bold first-letter:uppercase text-fixed-white/85">{dateLabel}</span>
      </header>

      <div className="mt-8 flex min-h-0 flex-1 gap-7">
        {/* Vandaag: het eten groot, de afspraken van vandaag en de post-its. */}
        <section aria-label="Vandaag" className="flex w-[min(42%,520px)] shrink-0 flex-col border-r border-fixed-white/10 pr-7">
          <span className="mb-4 text-[12px] font-extrabold tracking-[0.14em] text-[#f2b778]/85">VANDAAG ETEN WE</span>
          <AodPlate iso={today.iso} entry={today.entry} size={270} />
          <h2 className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-[-0.02em] text-fixed-white">{todaySummary?.title ?? "Nog niets gepland"}</h2>
          {todaySummary ? <p className="mt-1.5 text-[15px] font-semibold text-fixed-white/50">{todaySummary.sub}</p> : null}
          {today.events.length > 0 ? (
            <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
              {today.events.slice(0, 4).map((e) => {
                const photo = agendaPhotoFor(e.title, e.location);
                return (
                  <li key={e.id} className="flex items-center gap-3">
                    {photo ? (
                      <Image src={`${photo}_240.webp`} alt="" width={40} height={40} className="size-10 shrink-0 rounded-[12px] object-cover brightness-[0.7]" />
                    ) : (
                      <span aria-hidden className="size-10 shrink-0 rounded-[12px]" style={{ backgroundColor: rgb(e.color, 0.35) }} />
                    )}
                    <b className="shrink-0 whitespace-nowrap text-[17px] font-extrabold tabular-nums text-fixed-white">{e.allDay ? "Hele dag" : hhmm(e.startAt)}</b>
                    <span className="truncate text-[16px] font-semibold text-fixed-white/70">{agendaDisplayTitle(e.title)}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <DimNotes tasks={today.tasks} size={100} thawPhotos={thawPhotos} className="mt-auto gap-4 pl-1 pt-6" />
        </section>

        {/* Komende dagen: bord · naam · afspraken · post-its. Tik op een bord = detail. */}
        <section aria-label="Komende dagen" className="flex min-w-0 flex-1 flex-col">
          <span className="mb-4 text-[12px] font-extrabold tracking-[0.14em] text-[#f2b778]/85">KOMENDE DAGEN</span>
          <div className="grid min-h-0 flex-1 grid-cols-5 gap-3.5">
            {days.slice(1).map((d, i) => {
              const summary = calendarDaySummary(d.iso, d.entry);
              const wd = d.date.toLocaleDateString("nl-BE", { weekday: "short" }).replace(".", "").toUpperCase();
              return (
                <div key={d.iso} className="flex min-w-0 flex-col items-start">
                  <span className="mb-3 flex items-baseline gap-1.5">
                    <em className="text-[12px] font-extrabold not-italic tracking-[0.08em] text-fixed-white/50">{wd}</em>
                    <b className="text-[24px] font-bold text-fixed-white/85">{d.date.getDate()}</b>
                    {i === 0 ? <span className="text-[11.5px] font-bold text-[#f2b778]/80">Morgen</span> : null}
                  </span>
                  {summary ? (
                    <button
                      type="button"
                      data-aod-pass
                      onClick={() => setDetail(d.iso)}
                      aria-label={`${d.date.toLocaleDateString("nl-BE", { weekday: "long" })}: ${summary.title}, details`}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/60"
                    >
                      <AodPlate iso={d.iso} entry={d.entry} size={112} />
                    </button>
                  ) : (
                    <AodPlate iso={d.iso} entry={null} size={112} />
                  )}
                  <b className={cn("mt-3 line-clamp-2 text-[15.5px] font-extrabold leading-[19px]", summary ? "text-fixed-white/85" : "text-fixed-white/35")}>{summary?.title ?? "Nog niets"}</b>
                  {summary?.fromStock ? <span className="mt-0.5 text-[12.5px] font-semibold text-fixed-white/45">Uit de diepvries</span> : null}
                  {d.events.length > 0 ? (
                    <span className="mt-4 flex w-full flex-col gap-2.5 border-t border-fixed-white/10 pt-3.5">
                      {d.events.slice(0, 4).map((e) => (
                        <EventLine key={e.id} e={e} />
                      ))}
                    </span>
                  ) : null}
                  <DimNotes tasks={d.tasks} size={76} thawPhotos={thawPhotos} className="mt-auto flex-col gap-4 pl-1.5 pt-4" />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {detail && detailIndex > 0 ? (
        <MealDetail
          day={days[detailIndex]}
          // Vorige/volgende: de dichtstbijzijnde komende dag waarop iets gepland staat.
          prev={days.slice(1, detailIndex).reverse().find((d) => calendarDaySummary(d.iso, d.entry)) ?? null}
          next={days.slice(detailIndex + 1).find((d) => calendarDaySummary(d.iso, d.entry)) ?? null}
          onGo={setDetail}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </main>
  );
}


/**
 * Detail van een gerecht van later (canvas «KB» B): donker venster over het gedimde scherm met foto, dag,
 * ingrediënten, wat er die dag nog in de agenda staat, vorige/volgende dag en «Open recept».
 */
function MealDetail({ day, prev, next, onGo, onClose }: { day: Day; prev: Day | null; next: Day | null; onGo: (iso: string) => void; onClose: () => void }) {
  const summary = calendarDaySummary(day.iso, day.entry);
  const recipeId = summary?.recipeId ?? null;
  const { data } = db.useQuery(recipeId ? { recipes: { $: { where: { id: recipeId } }, ingredients: {} } } : null);
  const recipe = data?.recipes?.[0] as { persons?: number; ingredients?: { id: string; name: string; quantity: string; order: number }[] } | undefined;
  const ingredients = [...(recipe?.ingredients ?? [])].sort((a, b) => a.order - b.order).slice(0, 10);
  const loose = !recipeId ? (day.entry?.looseIngredients ?? []) : [];

  // Vanzelf dicht na 30 s zonder aanraking: terug naar het always-on-scherm.
  React.useEffect(() => {
    let timer = window.setTimeout(onClose, DETAIL_IDLE_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onClose, DETAIL_IDLE_MS);
    };
    window.addEventListener("pointerdown", reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
    };
  }, [onClose, day.iso]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!summary) return null;
  const label = day.date.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "short" }).replace(".", "").toUpperCase();
  const dayName = (d: Day) => d.date.toLocaleDateString("nl-BE", { weekday: "short" }).replace(".", "");
  const nameOf = (d: Day) => calendarDaySummary(d.iso, d.entry)?.title ?? "Nog niets";
  const pill = "inline-flex h-[42px] min-w-0 items-center gap-1 rounded-pill bg-fixed-white/10 px-4 text-[13.5px] font-bold text-fixed-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/60";
  return (
    <div data-aod-pass className="fixed inset-0 z-50 flex items-center justify-center bg-[#000]/60 backdrop-blur-[10px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={summary.title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[620px] max-w-[calc(100vw-48px)] overflow-hidden rounded-[26px] bg-[#17181e] text-fixed-white shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute right-4 top-4 z-[2] flex size-9 items-center justify-center rounded-full bg-[#000]/45 text-fixed-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/60"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
        <span className="relative block h-[240px]">
          {summary.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- receptfoto (data-URL of extern)
            <img src={summary.photo} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center bg-fixed-white/5">
              <AodPlate iso={day.iso} entry={day.entry} size={180} />
            </span>
          )}
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,24,30,0)_45%,#17181e)]" />
        </span>
        <div className="relative -mt-9 px-7 pb-6">
          <span className="text-[12px] font-extrabold tracking-[0.1em] text-[#a9c6ff]">
            {label}
            {summary.fromStock ? " · UIT DE DIEPVRIES" : ""}
          </span>
          <h2 className="mt-1.5 text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em]">{summary.title}</h2>
          <p className="mt-1 text-[14.5px] font-semibold text-fixed-white/55">
            {recipe?.persons ? `${recipe.persons} personen · ` : ""}
            {summary.sub}
          </p>
          {ingredients.length > 0 || loose.length > 0 ? (
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-1.5 p-0">
              {(ingredients.length > 0 ? ingredients.map((x) => ({ key: x.id, text: `${x.quantity ? `${displayQuantity(x.quantity)} ` : ""}${x.name}` })) : loose.map((x, i) => ({ key: `${x.name}-${i}`, text: x.name }))).map((x) => (
                <li key={x.key} className="inline-flex h-[30px] items-center rounded-pill bg-fixed-white/10 px-3 text-[13px] font-semibold text-fixed-white/85">
                  {x.text}
                </li>
              ))}
            </ul>
          ) : null}
          {day.events.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] bg-fixed-white/5 px-3.5 py-3">
              <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-fixed-white/50">Ook die dag</span>
              {day.events.slice(0, 3).map((e) => (
                <EventLine key={e.id} e={e} />
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex items-center gap-2.5">
            {prev ? (
              <button type="button" onClick={() => onGo(prev.iso)} className={cn(pill, "max-w-[34%]")} aria-label={`Vorige dag: ${nameOf(prev)}`}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5 shrink-0">
                  <path d="M10 3.5 5.5 8 10 12.5" />
                </svg>
                <span className="truncate first-letter:uppercase">{dayName(prev)} · {nameOf(prev)}</span>
              </button>
            ) : (
              <span className="max-w-[34%] flex-1" />
            )}
            <span className="flex flex-1 justify-center">
              {recipeId ? (
                <Link
                  href={`/recepten/${recipeId}`}
                  className="inline-flex h-[42px] items-center rounded-pill bg-fixed-white px-6 text-[14.5px] font-bold text-[#111] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17181e]"
                >
                  Open recept
                </Link>
              ) : null}
            </span>
            {next ? (
              <button type="button" onClick={() => onGo(next.iso)} className={cn(pill, "max-w-[34%]")} aria-label={`Volgende dag: ${nameOf(next)}`}>
                <span className="truncate first-letter:uppercase">{dayName(next)} · {nameOf(next)}</span>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5 shrink-0">
                  <path d="M6 3.5 10.5 8 6 12.5" />
                </svg>
              </button>
            ) : (
              <span className="max-w-[34%] flex-1" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
