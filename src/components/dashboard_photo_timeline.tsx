"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { agendaPhotoFor } from "@/lib/agenda_photos";
import type { AgendaRow } from "@/components/home_agenda_section";

/**
 * Agenda op het tablet-dashboard (canvas «Dashboard · A1 iteratie»): één fototijdlijn voor vandaag en de
 * volgende dagen. Elke tegel is 72px hoog (hele dag én afspraken), voorbije afspraken krimpen tot een
 * regel van 40px zonder foto. Een foto neemt rechts 45% van de tegel en vloeit links uit in de tint.
 */

type Rgb = AgendaRow["color"];
const NOW_RED = "rgb(230,70,70)";

const rgba = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const deep = (c: Rgb, k: number) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// Via `new RegExp`: de `u`-vlag mag niet als letterlijke regex bij het huidige TypeScript-target.
const LEADING_EMOJI = new RegExp(String.raw`^((?:\p{Extended_Pictographic}|\u{FE0F}|\u{200D})+)\s*`, "u");

function splitEmoji(title: string): { emoji: string; text: string } {
  const m = title.match(LEADING_EMOJI);
  return m ? { emoji: m[1], text: title.slice(m[0].length) || title } : { emoji: "📅", text: title };
}

function timeLabel(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" }) : "";
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-[13px] shrink-0">
    <path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor" />
    <circle cx="12" cy="9.7" r="2.6" fill="#fff" />
  </svg>
);

/** Foto rechts (`width` van de tegel) die links uitvloeit in het wit van de tegel. */
function TilePhoto({ photo, width }: { photo: string; width: number }) {
  return (
    <>
      {/* Zonsondergang: de foto loopt via een masker uit in het glas (geen kleurvlak erover). */}
      <span
        className="absolute inset-y-0 right-0 [mask-image:linear-gradient(90deg,transparent_0%,#000_40%)] [[data-theme=dark]_&]:brightness-[0.8] [[data-theme=dark]_&]:[mask-image:none]"
        style={{ width: `${width}%` }}
        aria-hidden
      >
        <Image src={`${photo}_480.webp`} alt="" fill sizes="320px" className="object-cover" />
      </span>
      <span
        className="absolute inset-0 hidden [[data-theme=dark]_&]:block"
        style={{ background: `linear-gradient(90deg, var(--tile-bg) ${100 - width}%, transparent ${100 - width + 17}%)` }}
        aria-hidden
      />
    </>
  );
}

// Licht (petrol agendapaneel) en zonsondergang: glastegel met witte tekst, foto loopt via een masker uit.
// Donker (canvas «avond in donker» B · Nachtblauw glas): donkere tegel met lichte tekst, foto's iets gedimd. De kleuren komen
// via CSS-variabelen (--tile-bg, --t1/--t2/--t0 en hun donkere tegenhangers) zodat één tegel beide thema's kent.
const tileBase =
  "relative flex h-[72px] min-w-0 items-center overflow-hidden rounded-[18px] bg-[var(--tile-bg)] [--tile-bg:rgba(255,255,255,0.18)] [box-shadow:var(--lift)] [[data-theme=dark]_&]:[--tile-bg:#242a3e] [[data-theme=dark]_&]:[box-shadow:var(--lift-dark)] [[data-sunset]_&]:[--tile-bg:rgba(255,255,255,0.26)]";
const lift = (ring = "inset 0 0 0 1px rgba(255,255,255,0.34)") => ring;
const liftDark = (ring = "inset 0 0 0 1px rgba(255,255,255,0.08)") => ring;
/** Afspraakkleur gemengd met wit (voor labels op de donkere tegel). */
const tintLight = (c: Rgb, k = 0.45) => `rgb(${c.map((v) => Math.round(v + (255 - v) * k)).join(",")})`;
const textVars = (c: Rgb): React.CSSProperties =>
  ({ "--t0": deep(c, 0.6), "--t1": deep(c, 0.35), "--t2": deep(c, 0.55), "--t0d": tintLight(c) }) as React.CSSProperties;
const T0 = "text-fixed-white/75 [[data-theme=dark]_&]:text-[color:var(--t0d)] [[data-sunset]_&]:text-[#ffe2a0]";
const T1 = "text-fixed-white [[data-theme=dark]_&]:text-[#eef0fb]";
const T2 = "text-fixed-white/80 [[data-theme=dark]_&]:text-[#a9afcc]";

function AllDayTile({ row, narrow }: { row: AgendaRow; narrow: boolean }) {
  const { emoji, text: full } = splitEmoji(row.title);
  // «[Smartschool] Soepdag»: de bron tussen haken als onderregel, zodat de titel leesbaar blijft.
  const source = full.match(/^\[([^\]]+)\]\s*/);
  const text = source ? full.slice(source[0].length) || full : full;
  const photo = agendaPhotoFor(row.title, row.location);
  const width = narrow ? 34 : 45;
  const sub = row.location ?? row.account ?? source?.[1] ?? null;
  return (
    <div className={cn(tileBase, "gap-3 pr-4", photo ? "pl-4" : "pl-3.5")} style={{ ...textVars(row.color), "--lift": lift(), "--lift-dark": liftDark() } as React.CSSProperties}>
      {photo ? (
        <TilePhoto photo={photo} width={width} />
      ) : (
        // Geen foto: dan zegt het emoji-vierkantje wat voor dag het is.
        // Geen achtergrond achter het emoji; zelfde grootte als in de «+n meer»-tegel.
        <span className="relative flex w-8 shrink-0 items-center justify-center text-[26px] leading-none" aria-hidden>
          {emoji}
        </span>
      )}
      <span className="relative flex min-w-0 flex-col leading-tight" style={photo ? { maxWidth: `calc(${100 - width}% - 12px)` } : undefined}>
        <span className={cn("text-[10.5px] font-extrabold tracking-[0.08em]", T0)}>HELE DAG</span>
        <span className={cn("truncate text-base font-extrabold", T1)}>{text}</span>
        {sub ? (
          <span className={cn("truncate text-[12.5px]", T2)}>
            {sub}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** Hele-dagitems van één dag: 1 over de volle breedte, 2 naast elkaar, 3+ twee tegels + «+n meer» (klapt open). */
function AllDayRow({ rows }: { rows: AgendaRow[] }) {
  const [open, setOpen] = React.useState(false);
  if (rows.length === 0) return null;
  const collapsed = rows.length > 2 && !open;
  const shown = collapsed ? rows.slice(0, 2) : rows;
  const rest = rows.slice(2);
  return (
    <div className={cn("grid gap-3", rows.length === 1 ? "grid-cols-1" : collapsed ? "grid-cols-[1fr_1fr_104px]" : "grid-cols-2")}>
      {shown.map((r) => (
        <AllDayTile key={r.id} row={r} narrow={rows.length > 1} />
      ))}
      {rows.length > 2 ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Minder tonen" : `Nog ${rest.length} hele-dagitem${rest.length === 1 ? "" : "s"}: ${rest.map((r) => r.title).join(", ")}`}
          // Zelfde glastegel als de andere kaarten; de verborgen items als emoji (zonder achtergrond).
          className={cn(
            "flex h-[72px] items-center justify-center gap-2 rounded-[18px] bg-fixed-white/[0.18] px-3 text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.34)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white [[data-sunset]_&]:bg-fixed-white/[0.26] [[data-theme=dark]_&]:bg-[#242a3e] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
            open && "col-span-2",
          )}
        >
          {open ? (
            <span className="text-[13px] font-bold">Minder tonen</span>
          ) : (
            <>
              <span className="flex gap-1 text-[26px] leading-none" aria-hidden>
                {rest.slice(0, 2).map((r) => (
                  <span key={r.id}>{splitEmoji(r.title).emoji}</span>
                ))}
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[17px] font-extrabold">+{rest.length}</span>
                <span className="text-[11px] font-bold text-fixed-white/80">meer</span>
              </span>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

function EventTile({ row }: { row: AgendaRow }) {
  const photo = agendaPhotoFor(row.title, row.location);
  const now = row.state === "now";
  const meta = `${timeLabel(row.start)} – ${timeLabel(row.end)}${row.location ? ` · ${row.location}` : ""}`;
  return (
    <div
      className={cn(tileBase, "px-4")}
      style={
        {
          ...textVars(row.color),
          "--lift": lift(now ? `inset 0 0 0 2px ${rgba(row.color)}` : undefined),
          "--lift-dark": liftDark(now ? `inset 0 0 0 2px ${rgba(row.color)}` : undefined),
        } as React.CSSProperties
      }
    >
      {photo ? <TilePhoto photo={photo} width={45} /> : null}
      <span className="relative flex min-w-0 flex-col gap-0.5 leading-tight" style={photo ? { maxWidth: "calc(55% - 8px)" } : undefined}>
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("truncate text-base font-extrabold", T1)}>{row.title}</span>
          {now ? (
            <span className="inline-flex h-5 shrink-0 items-center rounded-pill px-2 text-[11px] font-bold text-fixed-white" style={{ backgroundColor: rgba(row.color) }}>
              Nu
            </span>
          ) : null}
        </span>
        <span className={cn("flex min-w-0 items-center gap-1 text-[12.5px]", T2)}>
          {row.location ? <PinIcon /> : null}
          <span className="truncate">{meta}</span>
        </span>
      </span>
    </div>
  );
}

/** Voorbije afspraak: lage grijze regel, zonder foto. */
function PastLine({ row }: { row: AgendaRow }) {
  return (
    <div className="aod-past flex h-10 min-w-0 items-center gap-2.5 rounded-xl bg-fixed-white/[0.14] px-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)] [[data-theme=dark]_&]:shadow-none [[data-aod]_&]:bg-white/[0.06] [[data-aod]_&]:shadow-none">
      <span className="size-2 shrink-0 rounded-full opacity-60" style={{ backgroundColor: rgba(row.color) }} aria-hidden />
      <span className="truncate text-sm font-semibold text-fixed-white/75 [[data-theme=dark]_&]:text-[var(--text-tertiary)]">{row.title}</span>
    </div>
  );
}

function Row({ time, children, past = false }: { time?: AgendaRow; children: React.ReactNode; past?: boolean }) {
  return (
    <li className="grid grid-cols-[56px_1fr] items-center gap-x-4">
      <span className="flex flex-col items-end leading-tight">
        {time ? (
          <>
            <span className={cn("text-base font-extrabold", past ? "text-fixed-white/60 [[data-theme=dark]_&]:text-[var(--text-tertiary)]" : "text-fixed-white")}>{timeLabel(time.start)}</span>
            <span className="text-[12.5px] text-fixed-white/70 [[data-theme=dark]_&]:text-[var(--text-tertiary)]">{timeLabel(time.end)}</span>
          </>
        ) : null}
      </span>
      {children}
    </li>
  );
}

function NowLine({ label, text }: { label: string; text: string | null }) {
  return (
    <li className="grid h-5 grid-cols-[56px_1fr_auto] items-center gap-x-4" aria-label={`Nu, ${label}`}>
      <span className="text-right text-[13.5px] font-extrabold text-[#ffe08a] [[data-theme=dark]_&]:text-[color:var(--now)] [[data-sunset]_&]:text-[#ffe2a0]" style={{ "--now": NOW_RED } as React.CSSProperties}>
        {label}
      </span>
      {/* Zonsondergang: de nu-lijn warm geel i.p.v. rood. */}
      <span className="relative h-0.5 rounded-sm bg-[#ffe08a] [[data-theme=dark]_&]:bg-[rgba(230,70,70,0.75)] [[data-sunset]_&]:bg-[#ffe2a0]">
        <span className="absolute -left-[5px] -top-1 size-2.5 rounded-full bg-[#ffe08a] [[data-theme=dark]_&]:bg-[rgb(230,70,70)] [[data-sunset]_&]:bg-[#ffe2a0]" />
      </span>
      {text ? (
        <span className="text-[13px] font-semibold text-[#ffe08a] [[data-theme=dark]_&]:text-[rgb(192,58,58)] [[data-sunset]_&]:text-[#ffe2a0]">
          {text}
        </span>
      ) : null}
    </li>
  );
}

function DaySeparator({ date, tomorrow }: { date: Date; tomorrow: boolean }) {
  const long = date.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric" });
  return (
    <li className="ml-[72px] pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-fixed-white/75 [[data-theme=dark]_&]:text-[var(--text-tertiary)]">
      {tomorrow ? `Morgen · ${long}` : long}
    </li>
  );
}

export function DashboardPhotoTimeline({
  allDay,
  timed,
  upcomingDays,
  nowMin,
  nowLabel,
  maxDays = 3,
}: {
  allDay: AgendaRow[];
  timed: AgendaRow[];
  upcomingDays: { date: Date; rows: AgendaRow[] }[];
  nowMin: number;
  nowLabel: string;
  maxDays?: number;
}) {
  const nextIndex = timed.findIndex((r) => r.startMin > nowMin);
  const nothingLeft = timed.every((r) => r.state === "past");
  const restText = nothingLeft ? (nowMin >= 18 * 60 ? "Rest van de avond vrij" : "Rest van de dag vrij") : null;
  const nowLine = <NowLine key="__nu" label={nowLabel} text={restText} />;

  const items: React.ReactNode[] = [];
  if (allDay.length > 0)
    items.push(
      <Row key="__allday">
        <AllDayRow rows={allDay} />
      </Row>,
    );
  timed.forEach((r, i) => {
    if (i === nextIndex) items.push(nowLine);
    items.push(
      <Row key={r.id} time={r} past={r.state === "past"}>
        {r.state === "past" ? <PastLine row={r} /> : <EventTile row={r} />}
      </Row>,
    );
  });
  if (nextIndex < 0) items.push(nowLine);

  const tomorrowIso = new Date(Date.now() + 86_400_000).toDateString();
  upcomingDays.slice(0, maxDays).forEach(({ date, rows }) => {
    const key = date.toISOString();
    items.push(<DaySeparator key={`sep-${key}`} date={date} tomorrow={date.toDateString() === tomorrowIso} />);
    const dayAllDay = rows.filter((r) => r.allDay);
    if (dayAllDay.length > 0)
      items.push(
        <Row key={`ad-${key}`}>
          <AllDayRow rows={dayAllDay} />
        </Row>,
      );
    rows
      .filter((r) => !r.allDay)
      .forEach((r) =>
        items.push(
          <Row key={`${key}-${r.id}`} time={r}>
            <EventTile row={r} />
          </Row>,
        ),
      );
  });

  return <ul className="m-0 flex list-none flex-col gap-3 p-0">{items}</ul>;
}
