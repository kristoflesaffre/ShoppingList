"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { mixWithWhiteRgb } from "@/lib/vaste-lijstjes";
import { startGoogleConnect } from "@/lib/google-client";
import { localDayIso, useCachedAgenda } from "@/lib/agenda_cache";
import { agendaPhotoFor } from "@/lib/agenda_photos";
import { agendaDisplayTitle, dedupeBirthdays } from "@/lib/agenda_birthdays";
import { dropAllDayDuplicates, mergeAllDayDuplicates } from "@/lib/agenda_duplicates";
import { useSlidingIndicator } from "@/lib/use_sliding_indicator";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { OverviewPill } from "@/components/list_section_header";

/**
 * Agenda op de startpagina (canvas «Agenda A · Tijdlijn» + desktop «2 · Dagdelen»): de Google-afspraken
 * van vandaag. Mobiel één tijdlijn met een «nu»-lijn; vanaf md drie kolommen ochtend · middag · avond.
 * Meerdere Google-accounts kunnen gekoppeld worden; elk account krijgt een eigen kleur.
 */

type Rgb = [number, number, number];

type AgendaEvent = {
  id: string;
  title: string;
  location: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  accountId?: string;
  calendarName?: string;
};

type AgendaState = {
  configured: boolean;
  connected: boolean;
  events: AgendaEvent[];
  accounts?: { id: string; email: string | null }[];
  unavailable?: boolean;
  reconnectRequired?: boolean;
};

const TOMORROW_COLORS: Rgb[] = [
  [224, 140, 47],
  [214, 90, 120],
  [200, 112, 64],
];

const ACCOUNT_COLORS: Rgb[] = [
  [79, 85, 241],
  [229, 97, 138],
  [47, 163, 107],
  [224, 140, 47],
  [139, 108, 240],
];
const NOW_RED: Rgb = [230, 70, 70];

const PARTS: { key: "ochtend" | "middag" | "avond"; label: string; sub: string; from: number; to: number; color: Rgb; icon: string; free: { images: string[]; title: string; text: string } }[] = [
  // Ochtend: koffie met stoomkrulletjes (oranje); middag: de volle zon (geel); avond: maan.
  { key: "ochtend", label: "Ochtend", sub: "tot 12 u", from: 0, to: 12 * 60, color: [224, 140, 47], icon: "M4 12h12v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 13h1.5a2 2 0 0 1 0 4H16M6.5 3.5c-.9.9.9 1.8 0 2.7s.9 1.8 0 2.7M10 2.5c-.9.9.9 1.8 0 2.7s.9 1.8 0 2.7M13.5 3.5c-.9.9.9 1.8 0 2.7s.9 1.8 0 2.7", free: { images: ["thee", "boek", "slippers"], title: "Vrije ochtend", text: "Rustig aan de dag beginnen" } },
  { key: "middag", label: "Middag", sub: "12 – 18 u", from: 12 * 60, to: 18 * 60, color: [224, 170, 40], icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4", free: { images: ["limonade", "hangmat", "tennisracket", "bordspel"], title: "Vrije middag", text: "Niets gepland — even niks moeten" } },
  { key: "avond", label: "Avond", sub: "na 18 u", from: 18 * 60, to: 24 * 60, color: [98, 96, 230], icon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z", free: { images: ["zetel", "televisie", "kussen"], title: "Vrije avond", text: "Tijd voor jezelf" } },
];

/**
 * Figuurtje voor vrije tijd uit de reeks «ontspanning» (thee, boek, zetel, …), per dagdeel een eigen set.
 * Elke dag een ander, maar binnen dezelfde dag altijd hetzelfde (geen verspringen bij verversen).
 */
function freeImage(part: (typeof PARTS)[number], date: Date = new Date()): string {
  const day = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000);
  const name = part.free.images[day % part.free.images.length];
  return `/images/ui/${name}_240.webp`;
}

/** Leeg dagdeel: groot figuurtje uit de reeks «ontspanning» met zachte schaduw; deint traag op en neer. */
function FreePart({ part, past }: { part: (typeof PARTS)[number]; past: boolean }) {
  return (
    <div className={cn("flex min-h-[170px] flex-1 flex-col items-center justify-center pb-1 pt-3 text-center", past && "opacity-60")}>
      <span className="relative block size-[92px]">
        <Image src={freeImage(part)} alt="" width={240} height={240} className="relative z-[1] size-full object-contain motion-safe:animate-[agenda-bob_4.5s_ease-in-out_infinite]" />
        <span
          aria-hidden
          className="absolute inset-x-[22px] -bottom-1 h-2.5 rounded-[50%] blur-[4px] motion-safe:animate-[agenda-bob-shadow_4.5s_ease-in-out_infinite]"
          style={{ backgroundColor: rgb(part.color, 0.28) }}
        />
      </span>
      <p className="mt-3 text-[15px] font-extrabold text-text-primary">{part.free.title}</p>
      <p className="mt-0.5 text-[13px] text-[var(--text-tertiary)]">{past ? "Niets gepland" : part.free.text}</p>
    </div>
  );
}

const rgb = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const deep = (c: Rgb, f = 0.7) => `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)})`;

/**
 * Einde in minuten na middernacht van de startdag: een afspraak die om 00:00 (of later, de volgende dag)
 * eindigt, loopt tot het einde van de dag in plaats van «om 0 min» al voorbij te zijn.
 */
function endMinutes(startMin: number, end: string | null): number {
  const e = minutesOfDay(end);
  if (e == null) return startMin;
  return e <= startMin ? 24 * 60 : e;
}

function minutesOfDay(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.getHours() * 60 + d.getMinutes() : null;
}
function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" }) : "";
}
function accountName(email: string | null | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Agenda";
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function ConnectButton({ onConnect, disabled = false }: { onConnect: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={disabled}
      className={cn("inline-flex h-[46px] items-center gap-2.5 rounded-pill bg-action-primary pl-1.5 pr-5 text-[15px] font-bold text-white no-underline shadow-[0_10px_22px_-10px_rgba(79,85,241,0.8)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2", disabled && "cursor-not-allowed opacity-50")}
    >
      <span className="flex size-[34px] items-center justify-center rounded-full bg-[var(--white)]">
        <GoogleG className="size-[18px]" />
      </span>
      Google-agenda koppelen
    </button>
  );
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[13px] shrink-0">
    <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);

export type AgendaRow = AgendaEvent & { color: Rgb; account: string | null; startMin: number; endMin: number; state: "past" | "now" | "next" };

/** Hoe lang geleden voorbij: in het always-on-scherm vervaagt een afspraak stap voor stap. */
function pastOpacity(minutesAgo: number): number {
  if (minutesAgo < 60) return 0.45;
  if (minutesAgo < 180) return 0.3;
  return 0.2;
}

function TimelineRow({ row, nowMin }: { row: AgendaRow; nowMin: number }) {
  const now = row.state === "now";
  const style: React.CSSProperties = {};
  if (now) style.backgroundColor = rgb(row.color, 0.11);
  if (row.state === "past") (style as Record<string, string>)["--past-op"] = String(pastOpacity(nowMin - row.endMin));
  return (
    <li
      className={cn("flex gap-3", now ? "-mx-2.5 rounded-[16px] px-2.5 py-2.5" : "py-2", row.state === "past" && "aod-past opacity-[0.45]")}
      style={style}
    >
      <span className="w-11 shrink-0 text-right">
        <span className="block text-sm font-extrabold leading-5 text-text-primary">{timeLabel(row.start)}</span>
        <span className="block text-xs leading-4 text-[var(--text-tertiary)]">{timeLabel(row.end)}</span>
      </span>
      <span className="w-1 shrink-0 rounded-sm" style={{ backgroundColor: rgb(row.color) }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-bold leading-5 text-text-primary">{row.title}</span>
          {now ? (
            <span className="inline-flex h-5 shrink-0 items-center rounded-pill px-2 text-[11px] font-bold text-white" style={{ backgroundColor: rgb(row.color) }}>
              Nu
            </span>
          ) : null}
        </span>
        {row.location || row.account ? (
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] leading-[18px] text-[var(--text-secondary)]">
            {row.location ? <PinIcon /> : null}
            <span className="truncate">{[row.location, row.account].filter(Boolean).join(" · ")}</span>
          </span>
        ) : null}
      </span>
    </li>
  );
}

function NowLine({ label }: { label: string }) {
  return (
    <li className="my-0.5 flex items-center gap-2" aria-label={`Nu, ${label}`}>
      <span className="w-11 text-right text-[11.5px] font-extrabold" style={{ color: rgb(NOW_RED) }}>
        {label}
      </span>
      <span className="-ml-0.5 size-2 rounded-full" style={{ backgroundColor: rgb(NOW_RED) }} />
      <span className="h-0.5 flex-1" style={{ backgroundColor: rgb(NOW_RED, 0.6) }} />
    </li>
  );
}

/** Tijdlijn met de «nu»-lijn vóór de eerste afspraak die nog moet beginnen. */
export function Timeline({ rows, nowMin, nowLabel, showNow = true }: { rows: AgendaRow[]; nowMin: number; nowLabel: string; showNow?: boolean }) {
  const items: React.ReactNode[] = [];
  let drawn = !showNow;
  for (const row of rows) {
    if (!drawn && row.startMin > nowMin) {
      items.push(<NowLine key="__nu" label={nowLabel} />);
      drawn = true;
    }
    items.push(<TimelineRow key={row.id} row={row} nowMin={nowMin} />);
  }
  if (!drawn && rows.length > 0 && rows[rows.length - 1].endMin <= nowMin) items.push(<NowLine key="__nu" label={nowLabel} />);
  return <ul className="m-0 list-none p-0">{items}</ul>;
}

export function AllDayChips({ rows }: { rows: AgendaRow[] }) {
  if (rows.length === 0) return null;
  return (
    // Eén rij die horizontaal scrolt (op mobiel tot aan de schermrand), nooit gestapeld.
    <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
      {rows.map((r) => (
        <span
          key={r.id}
          className="inline-flex h-7 max-w-[280px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-[12.5px] font-bold"
          style={{ backgroundColor: rgb(r.color, 0.14), color: `color-mix(in srgb, ${rgb(r.color)} 62%, var(--text-primary))` }}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
          <span className="truncate">Hele dag · {r.title}</span>
        </span>
      ))}
    </div>
  );
}

/** Tegel (canvas «Agenda B · tegels»): tijd groot, titel onderaan, «Nu bezig» met gekleurde rand. */
function AgendaTile({ row, focus = false }: { row: AgendaRow; focus?: boolean }) {
  const now = row.state === "now";
  const photo = row.allDay ? null : agendaPhotoFor(row.title, row.location);
  if (photo) return <PhotoAgendaTile row={row} focus={focus} photo={photo} />;
  return (
    <li
      data-now={now ? "true" : undefined}
      data-focus={focus ? "true" : undefined}
      // Mobiel: voorbije afspraken niet meer tonen; desktop: vervaagd.
      // Voorbije afspraken niet meer tonen (mobiel én desktop): de rij begint bij wat nog komt.
      className={cn("relative flex h-[176px] w-[150px] shrink-0 snap-start flex-col rounded-[20px] p-3.5 md:w-[171px]", row.state === "past" && "hidden")}
      style={{
        backgroundImage: `linear-gradient(170deg, ${mixWithWhiteRgb(row.color, 0.18)} 0%, #fff 70%)`,
        backgroundColor: "#fff",
        boxShadow: now ? `0 0 0 2px ${rgb(row.color)}, 0 12px 24px -14px ${rgb(row.color, 0.7)}` : "inset 0 0 0 1px var(--border-subtle)",
      }}
    >
      {now ? (
        <span className="absolute -top-[11px] left-1/2 inline-flex h-[22px] -translate-x-1/2 items-center whitespace-nowrap rounded-pill px-2.5 text-[11px] font-bold text-white" style={{ backgroundColor: rgb(row.color) }}>
          Nu bezig
        </span>
      ) : null}
      {row.location && row.state !== "past" ? (
        <RouteButton location={row.location} color={row.color} />
      ) : (
        <span className="absolute right-3 top-3.5 size-[9px] rounded-full" style={{ backgroundColor: rgb(row.color) }} aria-hidden />
      )}
      <span className="text-2xl font-extrabold leading-7 tracking-[-0.02em]" style={{ color: deep(row.color) }}>
        {row.allDay ? "Hele dag" : timeLabel(row.start)}
      </span>
      {row.allDay ? null : <span className="text-xs font-semibold text-[var(--text-tertiary)]">tot {timeLabel(row.end)}</span>}
      <span className="mt-auto line-clamp-2 text-[15px] font-extrabold leading-[19px] text-text-primary">{row.title}</span>
      {row.location || row.account ? (
        <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-[var(--text-secondary)]">
          {row.location ? <PinIcon /> : null}
          <span className="truncate">{row.location ?? row.account}</span>
        </span>
      ) : null}
    </li>
  );
}

/**
 * Tegel met foto (canvas «Fototegel blur · 2» + «L1 · Licht uitgewassen»): volle foto, iets lichter en zachter
 * met een dunne witte waas, naar onder progressief wazig en ingekleurd in de lichte agendakleur; uur als witte pil,
 * titel en uur · plaats in een donkere tint van die kleur. Zo blijft de tekst ook op donkere foto's leesbaar.
 */
function PhotoAgendaTile({ row, focus, photo }: { row: AgendaRow; focus: boolean; photo: string }) {
  const now = row.state === "now";
  const c = row.color;
  const light = c.map((v) => Math.round(255 - (255 - v) * 0.2));
  const tint = (a: number) => `rgba(${light[0]},${light[1]},${light[2]},${a})`;
  const mask = "linear-gradient(180deg, transparent 40%, #000 68%)";
  const meta = [`${timeLabel(row.start)} – ${timeLabel(row.end)}`, row.location ?? row.account].filter(Boolean).join(" · ");
  return (
    <li
      data-now={now ? "true" : undefined}
      data-focus={focus ? "true" : undefined}
      className={cn("relative h-[176px] w-[150px] shrink-0 snap-start rounded-[20px] md:w-[171px]", row.state === "past" && "hidden")}
      style={{ boxShadow: now ? `0 0 0 2px ${rgb(c)}, 0 12px 24px -14px ${rgb(c, 0.7)}` : "0 12px 24px -18px rgba(16,17,48,0.45)" }}
    >
      <span className="absolute inset-0 isolate overflow-hidden rounded-[20px]" aria-hidden>
        <Image src={`${photo}_480.webp`} alt="" fill sizes="171px" className="object-cover brightness-[1.2] contrast-[.78] saturate-[.82]" />
        <span className="absolute inset-0" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
        <Image
          src={`${photo}_240.webp`}
          alt=""
          fill
          sizes="171px"
          className="scale-110 object-cover blur-[14px] brightness-[1.15] saturate-[1.1]"
          style={{ WebkitMaskImage: mask, maskImage: mask }}
        />
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${tint(0)} 36%, ${tint(0.86)} 70%, ${tint(0.97)} 100%)` }} />
      </span>
      {now ? (
        <span className="absolute -top-[11px] left-1/2 z-[2] inline-flex h-[22px] -translate-x-1/2 items-center whitespace-nowrap rounded-pill px-2.5 text-[11px] font-bold text-white" style={{ backgroundColor: rgb(c) }}>
          Nu bezig
        </span>
      ) : null}
      <span
        className="absolute left-2.5 top-2.5 z-[2] inline-flex h-7 items-center rounded-pill px-2.5 text-sm font-extrabold shadow-[0_2px_8px_-3px_rgba(16,17,48,0.3)]"
        style={{ color: deep(c, 0.6), backgroundColor: "rgba(255,255,255,0.95)" }}
      >
        {timeLabel(row.start)}
      </span>
      {row.location && row.state !== "past" ? <RouteButton location={row.location} color={c} /> : null}
      <span className="absolute inset-x-3.5 bottom-3 z-[1] flex flex-col">
        <span className="line-clamp-2 text-[15px] font-extrabold leading-[19px]" style={{ color: deep(c, 0.35) }}>
          {row.title}
        </span>
        {meta ? (
          <span className="mt-0.5 truncate text-xs font-medium" style={{ color: deep(c, 0.5) }}>
            {meta}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/** Mini-knop «Route» (enkel voor afspraken die nog komen): kies Google Maps of Waze, opent de app op de gsm. */
/**
 * Route-knop: zelfde hoogte als de uur-pil ernaast (28px; via `className` groter op desktop),
 * met een kaartpin als icoon.
 */
export function RouteButton({ location, color, className }: { location: string; color: Rgb; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLSpanElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  // Tik ernaast: menu sluiten.
  React.useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const q = encodeURIComponent(location);
  // `icon`: logo links van de naam.
  const links: { label: string; href: string; icon: string | null }[] = [
    { label: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${q}`, icon: "/logos/google-maps.jpg" },
    { label: "Waze", href: `https://waze.com/ul?q=${q}&navigate=yes`, icon: "/logos/waze.svg" },
  ];
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Route naar ${location}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "absolute right-2.5 top-2.5 z-[2] flex size-7 items-center justify-center rounded-full bg-[var(--white)] shadow-[0_2px_8px_-3px_rgba(16,17,48,0.3)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          className,
        )}
        style={{ color: deep(color, 0.75) }}
      >
        {/* Kaartpin (gevuld) met wit gaatje: «hier naartoe». */}
        <svg viewBox="0 0 24 24" aria-hidden className="size-[17px]">
          <path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor" />
          <circle cx="12" cy="9.7" r="2.6" fill="var(--white)" />
        </svg>
      </button>
      {open ? (
        <span ref={menuRef} className="absolute inset-x-2 bottom-2 z-[3] flex flex-col gap-1 rounded-[14px] bg-[var(--white)] p-1 shadow-[0_10px_28px_-10px_rgba(16,17,48,0.45)]">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2 rounded-[10px] px-1.5 text-left text-[13px] font-bold text-text-primary no-underline [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
            >
              {l.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- klein lokaal app-logo
                <img src={l.icon} alt="" width={22} height={22} className="size-[22px] shrink-0 rounded-[6px]" />
              ) : (
                <span aria-hidden className="size-[22px] shrink-0 rounded-[6px] bg-[var(--gray-50)]" />
              )}
              <span className="truncate">{l.label}</span>
            </a>
          ))}
        </span>
      ) : null}
    </>
  );
}

/** Extra tegel als er vandaag niets meer komt: «rest van de dag vrij», met het figuurtje van het dagdeel. */
function RestOfDayTile({ nowMin, wholeDay }: { nowMin: number; wholeDay: boolean }) {
  const part = PARTS.find((p) => nowMin >= p.from && nowMin < p.to) ?? PARTS[2];
  return (
    <li
      data-now="true"
      data-focus="true"
      className="relative flex h-[176px] w-[150px] shrink-0 snap-start flex-col items-center rounded-[20px] p-3.5 text-center md:w-[171px]"
      style={{
        backgroundImage: `linear-gradient(170deg, ${mixWithWhiteRgb(part.color, 0.2)} 0%, #fff 75%)`,
        backgroundColor: "#fff",
        boxShadow: `0 0 0 2px ${rgb(part.color, 0.6)}, 0 12px 24px -14px ${rgb(part.color, 0.7)}`,
      }}
    >
      <span className="absolute -top-[11px] left-1/2 inline-flex h-[22px] -translate-x-1/2 items-center whitespace-nowrap rounded-pill px-2.5 text-[11px] font-bold text-white" style={{ backgroundColor: rgb(part.color) }}>
        Nu
      </span>
      <span className="relative mt-1 block size-[72px]">
        <Image src={freeImage(part)} alt="" width={240} height={240} className="relative z-[1] size-full object-contain motion-safe:animate-[agenda-bob_4.5s_ease-in-out_infinite]" />
        <span
          aria-hidden
          className="absolute inset-x-[18px] -bottom-1 h-2 rounded-[50%] blur-[3px] motion-safe:animate-[agenda-bob-shadow_4.5s_ease-in-out_infinite]"
          style={{ backgroundColor: rgb(part.color, 0.28) }}
        />
      </span>
      <span className="mt-auto text-[15px] font-extrabold leading-[19px] text-text-primary">{wholeDay ? "Vandaag vrij" : "Rest van de dag vrij"}</span>
      <span className="mt-1 text-xs text-[var(--text-secondary)]">{part.free.text}</span>
    </li>
  );
}

/** Alle hele-dagitems van één dag samen in één tegel vooraan die dag (canvas «Hele dag · 2»). */
function AllDayStackTile({ rows }: { rows: AgendaRow[] }) {
  const c = rows[0].color;
  const shown = rows.slice(0, 3);
  return (
    <li
      aria-label={`Hele dag: ${rows.map((r) => r.title).join(", ")}`}
      className="relative flex h-[176px] w-[150px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] px-3.5 pb-3 pt-3 shadow-[inset_0_0_0_1px_var(--border-subtle)] md:w-[171px]"
      style={{ backgroundImage: `linear-gradient(170deg, ${mixWithWhiteRgb(c, 0.14)} 0%, #fff 60%)`, backgroundColor: "#fff" }}
    >
      <span className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold tracking-[0.08em]" style={{ color: deep(c, 0.6) }}>
          HELE DAG
        </span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-extrabold" style={{ backgroundColor: rgb(c, 0.16), color: deep(c, 0.55) }}>
          {rows.length}
        </span>
      </span>
      <span className="mt-1 flex min-h-0 flex-col">
        {shown.map((r, i) => (
          <span key={r.id} className={cn("flex gap-2 py-[7px]", i > 0 && "border-t border-[var(--border-subtle)]")}>
            <span className="w-1 shrink-0 rounded-sm" style={{ backgroundColor: rgb(r.color) }} aria-hidden />
            <span className="line-clamp-2 text-[13px] font-bold leading-4 text-text-primary">{r.title}</span>
          </span>
        ))}
      </span>
      {rows.length > shown.length ? <span className="mt-auto text-xs font-semibold text-[var(--text-tertiary)]">+ {rows.length - shown.length} meer</span> : null}
    </li>
  );
}

/** Verticale scheiding in de tegelrij: «Morgen · wo 14». */
function DayDivider({ date, tomorrow = false }: { date: Date; tomorrow?: boolean }) {
  const short = date.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric" }).replace(".", "");
  const label = tomorrow ? `Morgen · ${short}` : short;
  return (
    <li aria-label={label} className="flex h-[176px] w-7 shrink-0 flex-col items-center gap-2">
      <span className="w-[1.5px] flex-1 bg-[repeating-linear-gradient(var(--border-subtle)_0_6px,transparent_6px_11px)]" aria-hidden />
      <span className="rotate-180 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-tertiary)] [writing-mode:vertical-rl]">{label}</span>
      <span className="w-[1.5px] flex-1 bg-[repeating-linear-gradient(var(--border-subtle)_0_6px,transparent_6px_11px)]" aria-hidden />
    </li>
  );
}

/** Horizontale rij tegels; scrolt bij het openen naar wat nu bezig is (of het eerstvolgende). */
function TileLane({
  rows,
  allDay = [],
  nowMin,
  upcomingDays = [],
}: {
  rows: AgendaRow[];
  allDay?: AgendaRow[];
  nowMin: number;
  /** Volgende dagen met afspraken (morgen, overmorgen, …), in volgorde. */
  upcomingDays?: { date: Date; rows: AgendaRow[] }[];
}) {
  const ref = React.useRef<HTMLUListElement>(null);
  // Niets meer te komen vandaag: extra tegel «rest van de dag vrij» achteraan, die krijgt de focus.
  const restFree = rows.every((r) => r.state === "past");
  const focusId = restFree ? "rest" : (rows.find((r) => r.state !== "past")?.id ?? null);
  // Rij altijd vol: na vandaag (voorbije verborgen) dag per dag aanvullen tot het tegelbudget op is.
  // Een «Hele dag»-tegel telt als één; een lege dag wordt overgeslagen.
  let budget = LANE_TILE_BUDGET - (allDay.length > 0 ? 1 : 0) - rows.filter((r) => r.state !== "past").length - (restFree ? 1 : 0);
  const laterDays: { date: Date; allDay: AgendaRow[]; timed: AgendaRow[] }[] = [];
  for (const day of upcomingDays) {
    if (budget <= 0) break;
    const dayAllDay = day.rows.filter((r) => r.allDay);
    const room = budget - (dayAllDay.length > 0 ? 1 : 0);
    const dayTimed = day.rows.filter((r) => !r.allDay).slice(0, Math.max(0, room));
    if (dayAllDay.length === 0 && dayTimed.length === 0) continue;
    laterDays.push({ date: day.date, allDay: dayAllDay, timed: dayTimed });
    budget -= (dayAllDay.length > 0 ? 1 : 0) + dayTimed.length;
  }
  const today = new Date();
  const tomorrowIso = localDayIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  // Desktop (muis): pijlen links/rechts zolang er in die richting nog tegels zijn.
  const [canScroll, setCanScroll] = React.useState({ back: false, forward: false });
  const updateArrows = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const back = el.scrollLeft > 4;
    const forward = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    // Enkel bij een echte wijziging, zodat de effect hieronder geen render-lus veroorzaakt.
    setCanScroll((prev) => (prev.back === back && prev.forward === forward ? prev : { back, forward }));
  }, []);
  const scrollLane = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };
  // Pijlen bijwerken als de rij of het venster van grootte verandert (niet bij elke render).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows, rows.length, allDay.length, upcomingDays.length]);
  React.useEffect(() => {
    const lane = ref.current;
    if (!lane) return;
    // Voorbije tegels zijn verborgen, dus de rij begint gewoon vooraan (hele dag, dan nu en straks).
    lane.scrollLeft = 0;
  }, [focusId, rows.length, allDay.length]);
  const arrow = (dir: -1 | 1) => (
    <RoundIconButton
      tone="surface"
      size={36}
      aria-label={dir < 0 ? "Eerdere afspraken" : "Latere afspraken"}
      onClick={() => scrollLane(dir)}
      className={cn("absolute top-1/2 z-[3] -translate-y-1/2 max-md:hidden", dir < 0 ? "-left-[18px]" : "-right-[18px]")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} />
      </svg>
    </RoundIconButton>
  );
  return (
    <div className="relative">
    {canScroll.back ? arrow(-1) : null}
    {canScroll.forward ? arrow(1) : null}
    <ul
      ref={ref}
      onScroll={updateArrows}
      className="-mx-4 m-0 flex list-none snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 pt-3.5 [scrollbar-width:none] md:mx-0 md:gap-4 md:px-0 md:scroll-px-0 [&::-webkit-scrollbar]:hidden"
    >
      {allDay.length > 0 ? <AllDayStackTile rows={allDay} /> : null}
      {rows.map((row) => (
        <AgendaTile key={row.id} row={row} focus={row.id === focusId} />
      ))}
      {restFree ? <RestOfDayTile nowMin={nowMin} wholeDay={rows.length === 0 && allDay.length === 0} /> : null}
      {laterDays.map((day) => {
        const iso = localDayIso(day.date);
        return (
          <React.Fragment key={iso}>
            <DayDivider date={day.date} tomorrow={iso === tomorrowIso} />
            {day.allDay.length > 0 ? <AllDayStackTile rows={day.allDay} /> : null}
            {day.timed.map((row) => (
              <AgendaTile key={`${iso}-${row.id}`} row={row} />
            ))}
          </React.Fragment>
        );
      })}
    </ul>
    </div>
  );
}

type AgendaView = "overzicht" | "tegels";
const VIEW_KEY = "home-agenda-view";

/** Schakelaar met enkel iconen naast de titel: tegels (standaard) of overzicht (tijdlijn/dagdelen). */
function ViewToggle({ view, onChange }: { view: AgendaView; onChange: (v: AgendaView) => void }) {
  const { containerRef, indicatorStyle } = useSlidingIndicator<HTMLSpanElement>(view === "tegels" ? 0 : 1);
  const opt = (v: AgendaView, label: string, icon: React.ReactNode) => (
    <button
      data-segment
      type="button"
      role="radio"
      aria-checked={view === v}
      aria-label={label}
      title={label}
      onClick={() => onChange(v)}
      className={cn(
        "flex h-7 w-8 items-center justify-center rounded-pill transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        view === v ? "text-text-primary" : "text-[var(--text-tertiary)] [@media(hover:hover)]:hover:text-text-primary",
      )}
    >
      {icon}
    </button>
  );
  return (
    <span ref={containerRef} role="radiogroup" aria-label="Weergave agenda" className="relative isolate flex items-center gap-0.5 rounded-pill bg-[var(--gray-50)] p-[3px]">
      {/* Witte pil die met een easing naar de gekozen weergave schuift. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 -z-10 rounded-pill bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.14)] motion-reduce:!transition-none"
        style={indicatorStyle}
      />
      {/* Tegels eerst: de standaardweergave (een rij tegels = drie vierkantjes naast elkaar). */}
      {opt(
        "tegels",
        "Tegels",
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden className="size-4">
          <rect x="1.75" y="8.25" width="5.5" height="7.5" rx="1.6" />
          <rect x="9.25" y="8.25" width="5.5" height="7.5" rx="1.6" />
          <rect x="16.75" y="8.25" width="5.5" height="7.5" rx="1.6" />
        </svg>,
      )}
      {opt(
        "overzicht",
        "Overzicht",
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
          <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
        </svg>,
      )}
    </span>
  );
}

// ─── Laadskelet: zelfde opbouw als de gekozen weergave, met shimmer ────────────

const bone = "shimmer block rounded-md";

/** Eén tijdlijnrij in skeletvorm: tijd · kleurstreep · titel en plaats. */
function SkeletonRow({ wide = 0.62 }: { wide?: number }) {
  return (
    <li className="flex gap-3 py-2">
      <span className="flex w-11 shrink-0 flex-col items-end gap-1.5 pt-0.5">
        <span className={cn(bone, "h-3.5 w-9")} />
        <span className={cn(bone, "h-2.5 w-7")} />
      </span>
      <span className="shimmer w-1 shrink-0 rounded-sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
        <span className={cn(bone, "h-3.5")} style={{ width: `${Math.round(wide * 100)}%` }} />
        <span className={cn(bone, "h-2.5")} style={{ width: `${Math.round(wide * 70)}%` }} />
      </span>
    </li>
  );
}

export function SkeletonTimeline({ rows }: { rows: number[] }) {
  return (
    <ul className="m-0 list-none p-0" aria-hidden>
      {rows.map((w, i) => (
        <SkeletonRow key={i} wide={w} />
      ))}
    </ul>
  );
}

/** Laadstaat die de opbouw volgt die de gebruiker koos (overzicht of tegels; mobiel of desktop). */
function AgendaSkeleton({ view }: { view: AgendaView }) {
  if (view === "tegels") {
    return (
      <ul className="-mx-4 m-0 flex list-none gap-2.5 overflow-hidden px-4 pb-1 pt-3.5 md:mx-0 md:gap-4 md:px-0" aria-label="Agenda laden" aria-busy>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li
            key={i}
            className="flex h-[176px] w-[150px] shrink-0 flex-col rounded-[20px] bg-[var(--white)] p-3.5 shadow-[inset_0_0_0_1px_var(--border-subtle)] md:w-[171px]"
          >
            <span className={cn(bone, "h-6 w-16")} />
            <span className={cn(bone, "mt-1.5 h-3 w-12")} />
            <span className={cn(bone, "mt-auto h-4 w-[80%]")} />
            <span className={cn(bone, "mt-1.5 h-3 w-[55%]")} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div aria-label="Agenda laden" aria-busy>
      {/* Mobiel: één tijdlijn */}
      <div className={cn(cardClass, "px-4 pb-2.5 pt-3 md:hidden")}>
        <SkeletonTimeline rows={[0.7, 0.55, 0.8, 0.5]} />
      </div>
      {/* Desktop: ochtend · middag · avond */}
      <div className="hidden grid-cols-3 gap-4 md:grid">
        {[
          [0.7, 0.55],
          [0.8, 0.6],
          [0.5],
        ].map((rows, i) => (
          <div key={i} className="min-w-0 rounded-[22px] bg-[var(--white)] px-[18px] py-4 shadow-[0_0_0_1px_var(--border-subtle)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="shimmer size-[30px] rounded-[10px]" />
              <span className="flex flex-col gap-1.5">
                <span className={cn(bone, "h-4 w-20")} />
                <span className={cn(bone, "h-2.5 w-28")} />
              </span>
            </div>
            <SkeletonTimeline rows={rows} />
          </div>
        ))}
      </div>
    </div>
  );
}

const cardClass = "rounded-[22px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04),0_0_0_1px_var(--border-subtle)]";

/**
 * Afspraken van vandaag (gedeeld door de Agenda-sectie en het tablet-dashboard): laadt via
 * /api/google/dashboard, ververst bij focus en elke 5 min, en houdt «nu» bij.
 */
/** Hoeveel dagen na vandaag de tegelrij mag aanvullen. */
const UPCOMING_DAYS = 7;
/** Tegels in de rij (vandaag meegeteld): de hele komende week, de rij scrolt horizontaal. */
const LANE_TILE_BUDGET = 40;

function todayRange() {
  const timeMin = new Date();
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(timeMin);
  // Vandaag + de komende week: de tegelrij loopt door tot ze vol is (morgen, overmorgen, …).
  timeMax.setDate(timeMax.getDate() + UPCOMING_DAYS + 1);
  return { key: `today:${localDayIso(timeMin)}:${UPCOMING_DAYS + 1}d`, timeMin, timeMax };
}

function eventDayIso(e: AgendaEvent): string | null {
  if (!e.start) return null;
  if (e.allDay) return e.start.slice(0, 10);
  const d = new Date(e.start);
  return Number.isFinite(d.getTime()) ? localDayIso(d) : null;
}

export function useTodayAgenda() {
  // Gecachet (geheugen + dit toestel): home en dashboard tonen meteen de vorige stand en verversen stil.
  const { token, state, setState, failed, load, now } = useCachedAgenda<AgendaState>(todayRange);

  const accounts = state?.accounts ?? [];
  const colorOf = (accountId?: string): Rgb => {
    const i = accounts.findIndex((a) => a.id === accountId);
    return ACCOUNT_COLORS[(i < 0 ? 0 : i) % ACCOUNT_COLORS.length];
  };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowLabel = now.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
  const todayIso = localDayIso(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowIso = localDayIso(tomorrowDate);
  const events = state?.events ?? [];
  const todayEvents = events.filter((e) => (eventDayIso(e) ?? todayIso) <= todayIso);
  // Volgende dagen in warme kleuren (zoals op het canvas), zodat je in de rij meteen ziet waar vandaag stopt.
  const rowsForDay = (iso: string): AgendaRow[] => {
    const calendars: string[] = [];
    const dayRows: AgendaRow[] = events
      .filter((e) => eventDayIso(e) === iso)
      .map((e) => {
        const cal = e.calendarName ?? e.accountId ?? "";
        if (!calendars.includes(cal)) calendars.push(cal);
        return { e, color: TOMORROW_COLORS[calendars.indexOf(cal) % TOMORROW_COLORS.length] };
      })
      .map(({ e, color }) => ({
        ...e,
        title: agendaDisplayTitle(e.title),
        color,
        account: accounts.length > 1 ? accountName(accounts.find((a) => a.id === e.accountId)?.email) : null,
        startMin: e.allDay ? 0 : minutesOfDay(e.start) ?? 0,
        endMin: e.allDay ? 24 * 60 : endMinutes(minutesOfDay(e.start) ?? 0, e.end),
        state: "next" as const,
      }))
      .sort((x, y) => Number(y.allDay) - Number(x.allDay) || x.startMin - y.startMin);
    // Hele dag eerst (zoals gesorteerd), dubbele verjaardagen één keer; staat dezelfde afspraak ook met
    // een uur in de agenda, dan enkel die.
    const dayTimed = dayRows.filter((r) => !r.allDay);
    return [...dropAllDayDuplicates(mergeAllDayDuplicates(dedupeBirthdays(dayRows.filter((r) => r.allDay))), dayTimed), ...dayTimed];
  };
  const upcomingDays: { date: Date; rows: AgendaRow[] }[] = Array.from({ length: UPCOMING_DAYS }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
    return { date, rows: rowsForDay(localDayIso(date)) };
  }).filter((d) => d.rows.length > 0);
  const tomorrow: AgendaRow[] = rowsForDay(tomorrowIso);
  const allRows: AgendaRow[] = todayEvents.map((e) => {
    const startMin = e.allDay ? 0 : minutesOfDay(e.start) ?? 0;
    const endMin = e.allDay ? 24 * 60 : endMinutes(startMin, e.end);
    const account = accounts.length > 1 ? accountName(accounts.find((a) => a.id === e.accountId)?.email) : null;
    return {
      ...e,
      title: agendaDisplayTitle(e.title),
      color: colorOf(e.accountId),
      account,
      startMin,
      endMin,
      state: endMin <= nowMin ? "past" : startMin <= nowMin ? "now" : "next",
    };
  });
  return {
    token,
    state,
    setState,
    failed,
    load,
    now,
    nowMin,
    nowLabel,
    connected: !!state?.connected,
    // Zelfde verjaardag meermaals («bday», «verjaardag», …): één keer.
    // Ook als dezelfde afspraak vandaag met een uur bestaat («Fruitschildag»): enkel die met uur.
    allDay: dropAllDayDuplicates(
      mergeAllDayDuplicates(dedupeBirthdays(allRows.filter((r) => r.allDay))),
      allRows.filter((r) => !r.allDay),
    ),
    timed: allRows.filter((r) => !r.allDay).sort((a, b) => a.startMin - b.startMin),
    tomorrow,
    tomorrowDate,
    upcomingDays,
    connect: () => void startGoogleConnect(token),
  };
}

export function HomeAgendaSection({ onHide }: { ownerId?: string; onHide?: () => void }) {
  const { state, failed, load, now, nowMin, nowLabel, connected, allDay, timed, tomorrow, upcomingDays, connect } = useTodayAgenda();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  // Meteen de bewaarde weergave, zodat ook het laadskelet de juiste opbouw toont.
  const [view, setView] = React.useState<AgendaView>(() => {
    try {
      // Standaard tegels; het overzicht enkel als je daar zelf voor koos.
      return typeof window !== "undefined" && window.localStorage.getItem(VIEW_KEY) === "overzicht" ? "overzicht" : "tegels";
    } catch {
      return "tegels";
    }
  });
  React.useEffect(() => {
    // Mobiele en desktopversie van de sectie volgen dezelfde keuze.
    const onChange = (e: Event) => setView((e as CustomEvent<AgendaView>).detail);
    window.addEventListener(VIEW_KEY, onChange);
    return () => window.removeEventListener(VIEW_KEY, onChange);
  }, []);
  const changeView = (v: AgendaView) => {
    setView(v);
    window.dispatchEvent(new CustomEvent<AgendaView>(VIEW_KEY, { detail: v }));
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* niet bewaren */
    }
  };

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("google");
    const messages: Record<string, string> = {
      connected: "Je Google-agenda is gekoppeld.",
      cancelled: "Koppelen geannuleerd. Je kunt het later opnieuw proberen.",
      "permission-required": "Geef toestemming om je agenda's en afspraken te bekijken en probeer opnieuw.",
      "connection-failed": "Koppelen is niet gelukt. Probeer het opnieuw.",
      "not-configured": "Google-agenda koppelen is nog niet beschikbaar. De appbeheerder moet dit eenmalig activeren.",
      "account-limit": "Er zijn al meerdere accounts gekoppeld. Ontkoppel een account voordat je een ander toevoegt.",
    };
    if (status && messages[status]) {
      setFeedback(messages[status]);
      url.searchParams.delete("google");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);

  const allRows = [...allDay, ...timed];

  const hasEvents = connected && (allRows.length > 0 || upcomingDays.length > 0);
  const headerRight = connected ? (
    <span className="flex shrink-0 items-center gap-4">
      {/* Zelfde «Toon alle»-pil als de andere secties (K3), met het aantal komende afspraken. */}
      <OverviewPill
        href="https://calendar.google.com/calendar/r/day"
        external
        count={allRows.length + upcomingDays.reduce((n, d) => n + d.rows.length, 0)}
        ariaLabel="Open agenda in Google Agenda"
      />
    </span>
  ) : !onHide || (!state && !failed) ? null : (
    <button
      type="button"
      onClick={onHide}
      className="shrink-0 text-[15px] font-semibold text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      Sectie verbergen
    </button>
  );

  let body: React.ReactNode;
  if (!state && !failed) {
    body = <AgendaSkeleton view={view} />;
  } else if (!connected) {
    body = (
      <div className={cn(cardClass, "flex flex-col items-center gap-1.5 p-5 text-center md:flex-row md:items-center md:gap-7 md:p-6 md:text-left")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie (enkel desktop) */}
        <img src="/images/ui/kalender_320.webp" alt="" className="hidden size-[120px] shrink-0 object-contain md:block" />
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-extrabold leading-tight text-text-primary">Je dag in één oogopslag</p>
          <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">Bekijk je afspraken van vandaag. Je agenda blijft alleen-lezen.</p>
          <div className="mt-3.5">
            <ConnectButton onConnect={connect} disabled={state?.configured !== true} />
          </div>
          {state && !state.configured ? (
            <p className="mt-2.5 text-xs leading-4 text-[var(--text-tertiary)]">Nog niet beschikbaar. De appbeheerder moet Google-agenda eenmalig activeren.</p>
          ) : null}
        </div>
        <ul aria-hidden className="m-0 hidden w-[300px] shrink-0 list-none p-0 opacity-50 lg:block">
          {["09:00", "12:30", "18:00"].map((t) => (
            <li key={t} className="flex gap-2.5 py-[7px]">
              <span className="w-10 text-[13px] font-extrabold text-[var(--text-tertiary)]">{t}</span>
              <span className="w-1 rounded-sm bg-[var(--gray-50)]" />
              <span className="h-[30px] flex-1 rounded-[9px] border-[1.5px] border-dashed border-[#d5d7e6]" />
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (timed.length === 0 && allDay.length === 0 && !(view === "tegels" && upcomingDays.length > 0)) {
    body = (
      <div className={cn(cardClass, "px-5 py-6 text-center")}>
        <p className="text-base font-bold text-text-primary">{failed ? "Agenda tijdelijk niet beschikbaar" : "Niets gepland vandaag"}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{failed ? "De agenda kon niet geladen worden." : "Een vrije dag — geniet ervan."}</p>
      </div>
    );
  } else if (view === "tegels") {
    body = (
      <div>
        <TileLane rows={timed} allDay={allDay} nowMin={nowMin} upcomingDays={upcomingDays} />
      </div>
    );
  } else {
    body = (
      <>
        {/* Mobiel: één tijdlijn */}
        <div className={cn(cardClass, "px-4 pb-2.5 pt-3 md:hidden")}>
          <AllDayChips rows={allDay} />
          <Timeline rows={timed} nowMin={nowMin} nowLabel={nowLabel} />
        </div>
        {/* Desktop: ochtend · middag · avond */}
        <div className="hidden md:block">
          <AllDayChips rows={allDay} />
          <div className="grid grid-cols-3 items-stretch gap-4">
            {PARTS.map((part) => {
              const rows = timed.filter((r) => r.startMin >= part.from && r.startMin < part.to);
              const active = nowMin >= part.from && nowMin < part.to;
              return (
                <section
                  key={part.key}
                  aria-label={part.label}
                  className="flex min-w-0 flex-col rounded-[22px] bg-[var(--white)] px-[18px] py-4"
                  style={{
                    boxShadow: active ? `0 0 0 2px ${rgb(part.color, 0.55)}` : "0 0 0 1px var(--border-subtle)",
                    backgroundImage: active ? `linear-gradient(180deg, ${mixWithWhiteRgb(part.color, 0.14)}, #fff 120px)` : undefined,
                  }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-[30px] items-center justify-center rounded-[10px]" style={{ backgroundColor: mixWithWhiteRgb(part.color, 0.18), color: deep(part.color, 0.75) }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                        <path d={part.icon} />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold leading-5 text-text-primary">{part.label}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {part.sub} · {rows.length} {rows.length === 1 ? "afspraak" : "afspraken"}
                      </span>
                    </span>
                    {active ? (
                      <span className="inline-flex h-[22px] items-center rounded-pill px-2.5 text-[11px] font-bold text-white" style={{ backgroundColor: rgb(part.color) }}>
                        Nu
                      </span>
                    ) : null}
                  </div>
                  {rows.length > 0 ? (
                    <Timeline rows={rows} nowMin={nowMin} nowLabel={nowLabel} showNow={active} />
                  ) : (
                    <FreePart part={part} past={nowMin >= part.to} />
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <section aria-label="Agenda" className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <h2 className="truncate text-[22px] font-bold leading-7 tracking-[-0.01em] text-[var(--text-primary)]">Agenda</h2>
          {hasEvents || (!state && !failed) ? <ViewToggle view={view} onChange={changeView} /> : null}
        </span>
        {headerRight}
      </div>
      {feedback ? <p role="status" className="text-sm text-[var(--text-secondary)]">{feedback}</p> : null}
      {failed || state?.unavailable ? (
        <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span>{state?.reconnectRequired ? "Koppel je Google-account opnieuw om alle agenda's te bekijken." : "Niet alle afspraken konden worden geladen."}</span>
          {state?.reconnectRequired ? <button type="button" onClick={connect} className="font-semibold text-action-primary">Opnieuw koppelen</button> : <button type="button" onClick={load} className="font-semibold text-action-primary">Opnieuw proberen</button>}
        </div>
      ) : null}
      {body}
    </section>
  );
}
