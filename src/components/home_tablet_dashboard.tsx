"use client";

import { DashboardTodoPanel } from "@/components/home_todo_section";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { applyTheme, readThemePreference } from "@/lib/theme";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { spreadHours, useWeather, type Weather, type WeatherKind } from "@/lib/weather";
import { useVasteLijstjes } from "@/components/vaste_lijstjes";
import { VAST_COLORS, deepRgb, mixWithWhiteRgb } from "@/lib/vaste-lijstjes";
import { SkeletonTimeline, useTodayAgenda } from "@/components/home_agenda_section";
import { DashboardPhotoTimeline } from "@/components/dashboard_photo_timeline";
import { WeatherHero } from "@/components/weather_hero";
import { DashboardHuePanel } from "@/components/dashboard_hue_panel";
import { FilmDetailModal, WatchingTile, WatchlistTile, useWatchingMedia, useWatchlistSuggestions, type EveningMedia } from "@/components/dashboard_evening";
import { CalendarLoosePlate } from "@/components/calendar_day_visuals";

/**
 * Tablet-dashboard (canvas «Dashboard tablet · B iteratie»), gemaakt voor een Galaxy Tab liggend
 * (≈1138 × 712): links weer en eten — vandaag groot, morgen als smalle tegel — en rechts de dag als
 * tijdlijn. Beide kolommen zijn even hoog en vullen het scherm.
 */

export type DashboardMeal = {
  title: string;
  subtitle: string;
  href: string;
  photoUrl: string | null;
  fromStock: boolean;
  items: Array<{ name: string; photoUrl?: string | null }>;
  /** Alle losse ingrediënten (niet enkel de drie voor het bord). */
  names?: string[];
};

export type DashboardShopping = { label: string; sub: string; href: string } | null;


// ─── Weericonen (zelfde stijl als het canvas) ───────────────────────────────

const CLOUD = "M25 60h52a18 18 0 0 0 0-36 26 26 0 0 0-49-6A20 20 0 0 0 25 60z";

export function WeatherIcon({ kind, size, className }: { kind: WeatherKind; size: number; className?: string }) {
  const id = React.useId().replace(/:/g, "");
  const sun = (
    <g className="aod-sun">
      <circle cx="38" cy="38" r="30" fill="#ffd34d" opacity=".25" />
      <circle cx="38" cy="38" r="22" fill="#ffc531" />
    </g>
  );
  // Wolken in een eigen groep: de groep drijft (always-on), de path houdt zijn eigen transform.
  const cloud = (x: number, y: number, sc: number, fill: string) => (
    <g className="aod-cloud">
      <path transform={`translate(${x} ${y}) scale(${sc})`} d={CLOUD} fill={fill} />
    </g>
  );
  const drops = [36, 52, 68].map((x) => <path key={x} d={`M${x} 78 l-4 12`} stroke="#4b8df8" strokeWidth={5} strokeLinecap="round" />);
  const flakes = [36, 52, 68].map((x) => <circle key={x} cx={x} cy={84} r={3.5} fill="#9cc6ff" />);
  const body: Record<WeatherKind, React.ReactNode> = {
    zon: (
      <g className="aod-sun">
        <circle cx="50" cy="50" r="40" fill="#ffd34d" opacity=".25" />
        <circle cx="50" cy="50" r="28" fill="#ffc531" />
      </g>
    ),
    half: (
      <>
        {sun}
        {cloud(14, 22, 1, `url(#${id})`)}
      </>
    ),
    bewolkt: (
      <>
        {cloud(2, 6, 0.8, "#c9d3e8")}
        {cloud(14, 22, 1, `url(#${id})`)}
      </>
    ),
    mist: (
      <>
        {cloud(14, 12, 1, `url(#${id})`)}
        <path d="M20 82h60M28 92h44" stroke="#c9d3e8" strokeWidth={5} strokeLinecap="round" />
      </>
    ),
    regen: (
      <>
        {cloud(2, 4, 0.8, "#b7c3dc")}
        {cloud(14, 14, 1, `url(#${id})`)}
        {drops}
      </>
    ),
    buien: (
      <>
        {sun}
        {cloud(14, 16, 1, `url(#${id})`)}
        {drops}
      </>
    ),
    onweer: (
      <>
        {cloud(2, 4, 0.8, "#9aa6c4")}
        {cloud(14, 14, 1, `url(#${id})`)}
        <path d="M54 66 44 84h10l-6 14 16-20H54l6-12z" fill="#ffc531" />
      </>
    ),
    sneeuw: (
      <>
        {cloud(14, 14, 1, `url(#${id})`)}
        {flakes}
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={cn("overflow-visible drop-shadow-[0_4px_6px_rgba(20,30,80,0.18)] [[data-aod]_&]:opacity-85 [[data-aod]_&]:brightness-90", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe6f5" />
        </linearGradient>
      </defs>
      {body[kind]}
    </svg>
  );
}

// ─── Tegels ─────────────────────────────────────────────────────────────────

const tile = "relative overflow-hidden rounded-[24px]";

/** Breedte per uur in de weerstrook: zo passen er op een brede tegel (ochtend) meer uren in. */
const HOUR_SLOT_PX = 42;

function useHourSlots(): [React.RefObject<HTMLUListElement>, number] {
  const ref = React.useRef<HTMLUListElement>(null);
  const [slots, setSlots] = React.useState(6);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = Math.max(3, Math.min(12, Math.floor(el.clientWidth / HOUR_SLOT_PX)));
      setSlots((s) => (s === next ? s : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });
  return [ref, slots];
}

function TodayWeather({ weather }: { weather: Weather | null }) {
  const [hoursRef, hourSlots] = useHourSlots();
  if (!weather) {
    return <div className={cn(tile, "min-w-0 flex-1 animate-pulse bg-[linear-gradient(160deg,#5aa0ff,#86c6ff_60%,#c4e5ff)] opacity-70 [[data-theme=dark]_&]:bg-[linear-gradient(160deg,#1f3f86,#162c5e_60%,#10204a)]")} aria-label="Weer laden" />;
  }
  return (
    <section
      aria-label={`Weer vandaag in ${weather.place}`}
      className={cn(tile, "flex min-w-0 flex-1 flex-col bg-[linear-gradient(160deg,#5aa0ff,#86c6ff_60%,#c4e5ff)] px-[18px] py-4 text-fixed-white shadow-[0_18px_40px_-24px_rgba(40,100,220,0.8)] [[data-aod]_&]:bg-[linear-gradient(160deg,#173468,#0f2347_55%,#0a1630)] [[data-aod]_&]:text-[#eaf1ff] [[data-aod]_&]:shadow-[0_18px_40px_-26px_rgba(60,120,255,0.6)] [[data-theme=dark]_&]:bg-[linear-gradient(160deg,#1f3f86,#162c5e_60%,#10204a)] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(120,160,255,0.18),0_18px_40px_-28px_rgba(60,120,255,0.55)]")}
    >
      {/* Het dagbeeld (zoals weer-apps): een buiige dag toont buien, ook al is het nu even droog. */}
      <WeatherHero kind={weather.today.kind} size={196} className="absolute -right-[34px] -top-[38px]" />
      <span className="text-[11.5px] font-extrabold tracking-[0.08em] opacity-90">VANDAAG · {weather.place.toUpperCase()}</span>
      <span className="mt-1 flex items-baseline gap-2">
        <span className="text-[58px] font-extrabold leading-none tracking-[-0.04em]">{weather.now.temp}°</span>
        <span className="text-base font-bold opacity-80">{weather.today.min}°</span>
      </span>
      <span className="mt-1 text-sm font-semibold">{weather.today.label}</span>
      {weather.today.rainChance >= 20 ? (
        <span className="mt-2 inline-flex h-[26px] items-center gap-1.5 self-start rounded-pill bg-fixed-white/[0.22] px-2.5 text-xs font-bold">
          ☂ {weather.today.rainChance}% kans op regen
          {weather.rainFromHour != null ? (weather.rainFromHour === new Date().getHours() ? " · nu" : ` · vanaf ${weather.rainFromHour}u`) : ""}
        </span>
      ) : null}
      <ul ref={hoursRef} className="m-0 mt-auto flex list-none justify-between border-t border-fixed-white/30 p-0 pt-2.5">
        {spreadHours(weather.hours, hourSlots).map((h, i) => (
          <li key={h.hour} className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold text-fixed-white/85">{i === 0 ? "Nu" : `${h.hour}u`}</span>
            <WeatherIcon kind={h.kind} size={28} />
            <span className="text-[13px] font-extrabold">{h.temp}°</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TomorrowWeather({ weather }: { weather: Weather | null }) {
  const t = weather?.tomorrow;
  return (
    <section
      aria-label={t ? `Weer morgen: ${t.label}, ${t.max} tot ${t.min} graden` : "Weer morgen"}
      className={cn(tile, "flex w-[124px] shrink-0 flex-col items-center justify-center gap-1.5 bg-[linear-gradient(165deg,#7ea7ee,#a9c6f6_60%,#cadcfa)] text-center shadow-[0_14px_32px_-24px_rgba(40,100,220,0.7)] [[data-theme=dark]_&]:bg-[linear-gradient(165deg,#22345e,#1a2848_60%,#141e36)] [[data-theme=dark]_&]:shadow-[0_0_0_1px_#263256] [[data-sunset]_&]:bg-none [[data-sunset]_&]:bg-fixed-white/20 [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] [[data-sunset]_&]:backdrop-blur-[14px]")}
    >
      <span className="text-[11px] font-extrabold tracking-[0.08em] text-fixed-white/90 [[data-theme=dark]_&]:text-[#a9c2ef] [[data-sunset]_&]:text-fixed-white">MORGEN</span>
      {t ? (
        <>
          <WeatherHero kind={t.kind} size={76} />
          <span className="text-2xl font-extrabold leading-none text-fixed-white [[data-theme=dark]_&]:text-[#e4ecff]">{t.max}°</span>
          <span className="text-[13px] font-bold text-fixed-white/80 [[data-theme=dark]_&]:text-[#8fa3c8] [[data-sunset]_&]:text-fixed-white/80">{t.min}°</span>
          {t.rainChance >= 20 ? <span className="mt-0.5 text-xs font-extrabold text-fixed-white [[data-theme=dark]_&]:text-[#a9c2ef] [[data-sunset]_&]:text-fixed-white">☂ {t.rainChance}%</span> : null}
        </>
      ) : (
        <span className="size-16 animate-pulse rounded-full bg-fixed-white/40" />
      )}
    </section>
  );
}

function mealPhoto(meal: DashboardMeal | null, getPhoto: (name: string) => string | null): string | null {
  if (!meal) return null;
  return meal.photoUrl ?? meal.items.map((i) => i.photoUrl ?? getPhoto(i.name)).find(Boolean) ?? null;
}

/** Compositie van drie ingrediënten (zetmeel achter links, groente achter rechts, vlees/vis vooraan), dicht op elkaar in een vak van 270px. */
const MEAL_TRIO = [
  { x: 4, y: 52, s: 168, r: -16, z: 1 },
  { x: 100, y: 22, s: 172, r: 14, z: 2 },
  // Vooraan schuin (45°): breekt de rechte lijnen en leidt het oog de hoek in.
  { x: 62, y: 96, s: 186, r: 45, z: 3 },
] as const;

/** Productfoto's voor het bord bij losse ingrediënten (zetmeel, groente, vlees/vis eerst). */
function plateItemPhotos(meal: DashboardMeal | null, getPhoto: (name: string) => string | null): string[] {
  if (!meal || meal.photoUrl) return [];
  return meal.items.map((i) => i.photoUrl ?? getPhoto(i.name)).filter((p): p is string => Boolean(p));
}

function TodayMeal({ meal }: { meal: DashboardMeal | null }) {
  const getPhoto = useItemPhotoUrl(320);
  const photo = mealPhoto(meal, getPhoto);
  const platePhotos = plateItemPhotos(meal, getPhoto);
  // Losse ingrediënten: de titel noemt er twee («A, B +8»); de rest staat in klein lettertype eronder.
  const inTitle = new Set((meal?.items ?? []).slice(0, 2).map((i) => i.name));
  const otherNames = meal && !meal.photoUrl ? (meal.names ?? []).filter((n) => !inTitle.has(n)) : [];
  const others = otherNames.length ? otherNames.map((n, i) => (i === 0 ? n.charAt(0).toUpperCase() + n.slice(1) : n)).join(", ") : null;
  const inner = (
    <>
      {platePhotos.length > 1 ? (
        // Losse ingrediënten: zetmeel, groente en vlees/vis als losse compositie in de hoek rechtsonder
        // (geen bord), deels van de tegel af; de titel staat dan bovenaan.
        <span className="aod-kenburns absolute -bottom-[78px] -right-[70px] isolate size-[270px] [[data-aod]_&]:brightness-[0.6] [[data-aod]_&]:saturate-[0.85] [[data-theme=dark]_&]:brightness-[0.85] [[data-theme=dark]_&]:saturate-[0.9]" aria-hidden>
          {platePhotos.slice(0, 3).map((src, i) => {
            const slot = MEAL_TRIO[i];
            return (
              // eslint-disable-next-line @next/next/no-img-element -- productfoto uit de app
              <img
                key={src + i}
                src={src}
                alt=""
                className="absolute object-contain drop-shadow-[0_16px_18px_rgba(120,60,0,0.35)]"
                style={{ left: slot.x, top: slot.y, width: slot.s, height: slot.s, zIndex: slot.z, transform: `rotate(${slot.r}deg)` }}
              />
            );
          })}
        </span>
      ) : photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto of productfoto uit de app
        <img src={photo} alt="" className="aod-kenburns absolute -right-[30px] -top-1.5 size-[250px] object-contain drop-shadow-[0_18px_24px_rgba(120,60,0,0.35)] [[data-aod]_&]:brightness-[0.6] [[data-aod]_&]:saturate-[0.85] [[data-theme=dark]_&]:brightness-[0.85] [[data-theme=dark]_&]:saturate-[0.9]" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- lokale illustratie
        <img src="/images/ui/kalender_320.webp" alt="" className="absolute -bottom-4 -right-4 size-[180px] object-contain opacity-90" />
      )}
      <span className="absolute left-[18px] top-4 text-[11.5px] font-extrabold tracking-[0.08em] text-[rgba(90,40,0,0.75)] [[data-aod]_&]:text-[#d8a874] [[data-theme=dark]_&]:text-[#e9b47a]">VANDAAG ETEN WE</span>
      <span className={cn("absolute left-[18px] z-[4] max-w-[60%]", platePhotos.length > 1 ? "top-[42px]" : "bottom-[18px]")}>
        <span className={cn("block font-extrabold leading-tight tracking-[-0.02em] text-[#3d1d00] [[data-aod]_&]:text-[#ffe9cc] [[data-theme=dark]_&]:text-[#ffe7c7]", platePhotos.length > 1 ? "text-[30px]" : "text-[34px]")}>{meal?.title ?? "Nog niets gepland"}</span>
        {others ? (
          <span className="mt-1 line-clamp-5 block text-[13.5px] font-semibold leading-snug text-[rgba(61,29,0,0.75)] [[data-aod]_&]:text-[#d8a874] [[data-theme=dark]_&]:text-[#e9b47a]">{others}</span>
        ) : (
          <span className="block text-[13.5px] font-semibold text-[rgba(61,29,0,0.75)] [[data-aod]_&]:text-[#d8a874] [[data-theme=dark]_&]:text-[#e9b47a]">{meal ? meal.subtitle : "Plan iets in de kalender"}</span>
        )}
      </span>
    </>
  );
  const cls = cn(
    tile,
    "block min-w-0 flex-1 bg-[radial-gradient(120%_95%_at_80%_35%,#ffe6a8_0%,#ffc76b_45%,#f59f3a_100%)] no-underline shadow-[0_18px_40px_-22px_rgba(230,140,30,0.9)] [[data-aod]_&]:bg-[radial-gradient(120%_95%_at_80%_35%,#5a3510_0%,#3a2209_50%,#1d1105_100%)] [[data-aod]_&]:shadow-[0_18px_40px_-26px_rgba(255,150,40,0.5)] [[data-theme=dark]_&]:bg-[linear-gradient(160deg,#4a2c16,#33200f_60%,#24170b)] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(255,180,90,0.16),0_18px_40px_-28px_rgba(255,150,40,0.45)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
  );
  return meal ? (
    <Link href={meal.href} className={cls} aria-label={`Vandaag: ${meal.title}`}>
      {inner}
    </Link>
  ) : (
    <Link href="/kalender" className={cls}>
      {inner}
    </Link>
  );
}

function TomorrowMeal({ meal }: { meal: DashboardMeal | null }) {
  const getPhoto = useItemPhotoUrl(320);
  const photo = mealPhoto(meal, getPhoto);
  // Losse ingrediënten (geen receptfoto): tot drie op een wit bord, zoals in de kalender.
  const itemPhotos = plateItemPhotos(meal, getPhoto);
  // Losse ingrediënten: de tegel is hoog genoeg om ze allemaal te noemen (i.p.v. «A, B +2»).
  const names = meal?.names?.length ? meal.names : (meal?.items ?? []).map((i) => i.name);
  const allNames = meal && !meal.photoUrl && names.length > 1 ? names.map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(", ") : null;
  return (
    <Link
      href={meal?.href ?? "/kalender"}
      aria-label={meal ? `Morgen: ${meal.title}` : "Morgen: nog niets gepland"}
      className={cn(
        tile,
        "flex w-[124px] shrink-0 flex-col items-center justify-center gap-2 bg-[linear-gradient(165deg,#ffb48c,#ffcfae_60%,#ffe2cc)] px-2.5 py-3 text-center no-underline shadow-[0_14px_32px_-24px_rgba(230,120,60,0.8)] [[data-theme=dark]_&]:bg-[linear-gradient(165deg,#3a2a24,#2c201b_60%,#211814)] [[data-theme=dark]_&]:shadow-[0_0_0_1px_#3d2d25] [[data-sunset]_&]:bg-none [[data-sunset]_&]:bg-fixed-white/20 [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] [[data-sunset]_&]:backdrop-blur-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
      )}
    >
      <span className="text-[11px] font-extrabold tracking-[0.08em] text-[rgb(139,87,29)] [[data-theme=dark]_&]:text-[#e0b48e] [[data-sunset]_&]:text-fixed-white/90">
        MORGEN
      </span>
      {itemPhotos.length > 1 ? (
        // Zelfde warme, zachte schaduw als het bord van vandaag: het bord «zweeft» boven de tegel.
        <span className="drop-shadow-[0_14px_18px_rgba(120,60,0,0.32)] [[data-theme=dark]_&]:brightness-[0.8]">
          <CalendarLoosePlate photos={itemPhotos.slice(0, 3)} size={88} />
        </span>
      ) : photo ? (
        <span className="block size-[76px] overflow-hidden rounded-full bg-fixed-white shadow-[0_12px_20px_-12px_rgba(120,40,0,0.6)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto of productfoto uit de app */}
          <img src={photo} alt="" className="aod-kenburns size-full object-cover [[data-theme=dark]_&]:brightness-[0.8] [[data-theme=dark]_&]:saturate-[0.85]" />
        </span>
      ) : (
        <span className="flex size-[76px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[rgba(120,55,15,0.3)] bg-fixed-white/25 text-2xl text-[rgba(120,55,15,0.55)] [[data-theme=dark]_&]:border-[rgba(255,215,184,0.35)] [[data-theme=dark]_&]:bg-transparent [[data-theme=dark]_&]:text-[rgba(255,215,184,0.6)] [[data-sunset]_&]:border-fixed-white/50 [[data-sunset]_&]:bg-transparent [[data-sunset]_&]:text-fixed-white/80">?</span>
      )}
      <span className={cn("text-[13.5px] font-extrabold leading-tight text-[#3d1d00] [[data-theme=dark]_&]:text-[#ffd7b8] [[data-sunset]_&]:text-fixed-white", allNames ? "line-clamp-6" : "line-clamp-2")}>
        {allNames ?? meal?.title ?? "Nog niets"}
      </span>
      {meal?.fromStock ? (
        <span className="inline-flex h-[22px] items-center gap-1 rounded-pill bg-fixed-white px-2 text-[11px] font-extrabold text-[#2f6fd0] [[data-theme=dark]_&]:bg-[rgba(80,130,255,0.16)] [[data-theme=dark]_&]:text-[#8fb8ff]" title="Vanavond uit de diepvries halen">
          ❄ ontdooien
        </span>
      ) : null}
    </Link>
  );
}


function AgendaColumn() {
  const { state, connected, allDay, timed, upcomingDays, nowMin, nowLabel, connect } = useTodayAgenda();
  const left = timed.filter((r) => r.state !== "past").length;

  // Focus op wat komt: de nu-lijn staat bovenaan, met hoogstens anderhalve voorbije rij erboven (de laatste
  // helemaal, die ervoor half). Zelf gescrold? Dan een minuut niet terugspringen.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const userScrolledAt = React.useRef(0);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const mark = () => (userScrolledAt.current = Date.now());
    el.addEventListener("wheel", mark, { passive: true });
    el.addEventListener("touchstart", mark, { passive: true });
    return () => {
      el.removeEventListener("wheel", mark);
      el.removeEventListener("touchstart", mark);
    };
  }, [connected]);
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    const now = el?.querySelector<HTMLElement>("[data-agenda-now]");
    if (!el || !now || Date.now() - userScrolledAt.current < 60_000) return;
    const top = (node: Element) => node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    const prev = now.previousElementSibling;
    const before = prev?.previousElementSibling;
    let target = top(now);
    if (prev) target = before ? top(before) + before.getBoundingClientRect().height / 2 : top(prev);
    target = Math.max(0, target - 6);
    // Weinig afspraken na «nu»? Dan wat lege ruimte onderaan, zodat de nu-lijn toch naar boven kan.
    const spacer = el.querySelector<HTMLElement>("[data-agenda-spacer]");
    if (spacer) {
      const contentH = el.scrollHeight - spacer.offsetHeight;
      spacer.style.height = `${Math.max(0, target + el.clientHeight - contentH)}px`;
    }
    el.scrollTop = target;
  }, [connected, allDay.length, timed.length, upcomingDays.length, nowLabel]);

  return (
    <section
      aria-label="Agenda vandaag"
      // Licht (canvas «agendakleur overdag, voller» D · Petrol): diep groenblauw met glastegels en witte tekst.
      className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[24px] bg-[#1f9b8e] bg-[linear-gradient(160deg,#178f86_0%,#24a796_50%,#3cc0a6_100%)] px-5 py-4 text-fixed-white shadow-[0_18px_40px_-22px_rgba(23,143,134,0.8)] [[data-theme=dark]_&]:bg-[#151a2c] [[data-theme=dark]_&]:bg-[linear-gradient(170deg,#1c2238_0%,#151a2c_50%,#10131f_100%)] [[data-theme=dark]_&]:shadow-[0_0_0_1px_#262d48,0_18px_40px_-26px_rgba(60,80,160,0.5)] [[data-sunset]_&]:bg-none [[data-sunset]_&]:bg-fixed-white/[0.14] [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] [[data-sunset]_&]:backdrop-blur-[18px]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-fixed-white">Vandaag</h2>
        {connected ? (
          <span className="text-[12.5px] text-fixed-white/80">
            {timed.length} {timed.length === 1 ? "afspraak" : "afspraken"}
            {left > 0 && left < timed.length ? ` · nog ${left}` : ""}
          </span>
        ) : null}
      </div>

      {!state ? (
        <div className="flex-1" aria-label="Agenda laden" aria-busy>
          <div className="mb-2.5 flex items-center gap-3.5 rounded-[18px] bg-fixed-white/[0.14] px-3.5 py-3">
            <span className="shimmer size-[58px] shrink-0 rounded-2xl" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="shimmer block h-2.5 w-16 rounded-md" />
              <span className="shimmer block h-4 w-[60%] rounded-md" />
              <span className="shimmer block h-3 w-[35%] rounded-md" />
            </span>
          </div>
          <SkeletonTimeline rows={[0.7, 0.55, 0.8, 0.5]} />
        </div>
      ) : !connected ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-[17px] font-extrabold text-fixed-white">Je dag in één oogopslag</p>
          <p className="max-w-[260px] text-sm text-fixed-white/80">Koppel je Google-agenda om je afspraken van vandaag hier te zien.</p>
          <button type="button" onClick={connect} className="inline-flex h-11 items-center rounded-pill bg-action-primary px-5 text-sm font-bold text-fixed-white">
            Google-agenda koppelen
          </button>
        </div>
      ) : (
        <>
          {/* Kleine binnenmarge (en even veel negatieve marge): randen en schaduwen van tegels aan de bovenkant
              en rechts vallen anders weg tegen de rand van het scrollvak. */}
          <div ref={scrollRef} className="-mx-1.5 -mt-1.5 min-h-0 flex-1 overflow-y-auto px-1.5 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DashboardPhotoTimeline allDay={allDay} timed={timed} upcomingDays={upcomingDays} nowMin={nowMin} nowLabel={nowLabel} />
            <div data-agenda-spacer aria-hidden />
          </div>
        </>
      )}

    </section>
  );
}


/** Herinneringen naast de weergaveschakelaar: verjaardagen uit kado-lijstjes binnen 30 dagen. */
export function DashboardReminders({ userId }: { userId: string }) {
  const { lists } = useVasteLijstjes(userId);
  const chips = lists
    .filter((l) => l.type === "kado" && l.eventDate)
    .map((l) => {
      const [, m, d] = (l.eventDate as string).split("-").map(Number);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let next = new Date(today.getFullYear(), m - 1, d);
      if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
      const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
      const who = l.name.replace(/^kado'?s\s*/i, "").trim() || l.name;
      return { id: l.id, days, label: days === 0 ? `🎂 ${who} jarig vandaag` : days === 1 ? `🎂 ${who} morgen jarig` : `🎂 ${who} over ${days} dagen` };
    })
    .filter((c) => c.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 2);
  if (chips.length === 0) return null;
  return (
    <span className="flex gap-1.5">
      {chips.map((c) => (
        <Link key={c.id} href={`/vast/${c.id}`} className="inline-flex h-7 items-center rounded-pill bg-[#fbe2ea] px-3 text-xs font-bold text-[#8f3756] no-underline [[data-aod]_&]:bg-[rgba(229,97,138,0.16)] [[data-aod]_&]:text-[#f0a3bd]">
          {c.label}
        </Link>
      ))}
    </span>
  );
}

/**
 * Moment van de dag voor het dashboard: ochtend (5 – 10 u), avond (20 – 23 u) of overdag.
 * Testen kan op elk uur met `?moment=ochtend|dag|avond` in de adresbalk (blijft hangen in deze tab tot
 * «Echte tijd» of `?moment=auto`); er verschijnt dan een kleine schakelaar bovenaan.
 */
export type DashboardMoment = "ochtend" | "dag" | "avond";
const MOMENTS: { key: DashboardMoment; label: string }[] = [
  { key: "ochtend", label: "Ochtend" },
  { key: "dag", label: "Overdag" },
  { key: "avond", label: "Avond" },
];
const MOMENT_TEST_KEY = "dashboard-moment-test";

export function momentAt(d: Date): DashboardMoment {
  const h = d.getHours();
  if (h >= 5 && h < 10) return "ochtend";
  if (h >= 20 && h < 23) return "avond";
  return "dag";
}

function isMoment(v: string | null): v is DashboardMoment {
  return v === "ochtend" || v === "dag" || v === "avond";
}

function useDashboardMoment(): { moment: DashboardMoment; testMoment: DashboardMoment | null; setTestMoment: (m: DashboardMoment | null) => void } {
  const [real, setReal] = React.useState<DashboardMoment>(() => momentAt(new Date()));
  const [testMoment, setTest] = React.useState<DashboardMoment | null>(null);
  React.useEffect(() => {
    const tick = () => setReal(momentAt(new Date()));
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    // Testmodus: uit de adresbalk, anders wat eerder in deze tab gekozen is.
    try {
      const param = new URLSearchParams(window.location.search).get("moment");
      if (isMoment(param)) sessionStorage.setItem(MOMENT_TEST_KEY, param);
      else if (param === "auto") sessionStorage.removeItem(MOMENT_TEST_KEY);
      const stored = sessionStorage.getItem(MOMENT_TEST_KEY);
      setTest(isMoment(stored) ? stored : null);
    } catch {
      /* geen sessionStorage: geen testmodus */
    }
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  const setTestMoment = React.useCallback((m: DashboardMoment | null) => {
    try {
      if (m) sessionStorage.setItem(MOMENT_TEST_KEY, m);
      else sessionStorage.removeItem(MOMENT_TEST_KEY);
    } catch {
      /* negeren */
    }
    setTest(m);
  }, []);
  return { moment: testMoment ?? real, testMoment, setTestMoment };
}

type TestTheme = "light" | "dark" | "aod";
const TEST_THEMES: { key: TestTheme; label: string }[] = [
  { key: "light", label: "Licht" },
  { key: "dark", label: "Donker" },
  { key: "aod", label: "Always-on" },
];

/** Huidig thema op <html>: always-on (data-aod), anders het app-thema (data-theme). */
function currentTestTheme(): TestTheme {
  const root = document.documentElement;
  return root.dataset.aod ? "aod" : root.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Thema enkel voor deze test (niet opgeslagen): licht, donker (app-thema «Avond») of het always-on-scherm.
 * «Echte tijd» zet het opgeslagen thema terug.
 */
function applyTestTheme(theme: TestTheme | null) {
  const root = document.documentElement;
  delete root.dataset.aod;
  if (theme === null) {
    applyTheme(readThemePreference());
    return;
  }
  applyTheme(theme === "light" ? "light" : "dark");
  if (theme === "aod") root.dataset.aod = "on";
}

const segment = (on: boolean) => cn("h-8 whitespace-nowrap rounded-pill px-3", on ? "bg-fixed-white text-[#14112a]" : "text-fixed-white/80 [@media(hover:hover)]:hover:bg-fixed-white/10");

/**
 * Zonsondergang (canvas «avond, zonsondergang in glas» C1 · Avondrood): 's avonds in het lichte thema krijgt
 * <html> `data-sunset`; de pagina wordt een lucht van oranje naar violet en alle panelen worden matglas
 * (`[[data-sunset]_&]:`-varianten). In het donkere thema en always-on blijft palet B.
 */
/** useLayoutEffect in de browser, useEffect op de server (geen waarschuwing bij server-rendering). */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/** Of de avondlucht nu zou gelden (avond, licht thema, vanaf md); zelfde voorwaarden als useSunset. */
function sunsetApplies(on: boolean): boolean {
  const root = document.documentElement;
  return on && window.matchMedia("(min-width: 768px)").matches && root.dataset.theme !== "dark" && !root.dataset.aod;
}

/** Meteen bij het wisselen (zonder her-render): avondlucht aan of uit, met dezelfde voorwaarden als useSunset. */
export function syncSunsetNow(toDashboard: boolean): void {
  let moment = momentAt(new Date());
  try {
    const stored = sessionStorage.getItem(MOMENT_TEST_KEY);
    if (isMoment(stored)) moment = stored;
  } catch {
    /* geen sessionStorage */
  }
  const root = document.documentElement;
  if (sunsetApplies(toDashboard && moment === "avond")) root.dataset.sunset = "";
  else delete root.dataset.sunset;
}

function useSunset(on: boolean) {
  // Layout-effect: de lucht staat aan vóór het eerste frame van het dashboard, zodat inhoud, lucht en glas
  // samen beginnen (geen frame met de gewone kleuren, en niet eerder dan de inhoud).
  useIsoLayoutEffect(() => {
    const root = document.documentElement;
    // De lucht is een eigen laag (body::after in globals.css) die op [data-sunset] in- en uitfadet.
    // Enkel waar het dashboard echt zichtbaar is (vanaf md); op de gsm is het verborgen maar wel gemount.
    const wide = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      if (sunsetApplies(on)) {
        root.dataset.sunset = "";
      } else {
        delete root.dataset.sunset;
      }
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-aod"] });
    wide.addEventListener("change", sync);
    return () => {
      mo.disconnect();
      wide.removeEventListener("change", sync);
      delete root.dataset.sunset;
    };
  }, [on]);
}

/** Kleine schakelaar bovenaan in het midden, enkel zichtbaar in testmodus: moment van de dag + thema. */
function MomentTestBar({ value, onChange }: { value: DashboardMoment; onChange: (m: DashboardMoment | null) => void }) {
  const [theme, setTheme] = React.useState<TestTheme>("light");
  React.useEffect(() => setTheme(currentTestTheme()), []);
  const pickTheme = (t: TestTheme) => {
    applyTestTheme(t);
    setTheme(t);
  };
  return (
    <div
      data-test-bar
      className="fixed left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-pill bg-[rgba(16,17,48,0.88)] p-1 pl-3 text-xs font-bold text-fixed-white shadow-[0_12px_28px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md"
    >
      <span className="mr-1 text-fixed-white/60">Test</span>
      {MOMENTS.map((m) => (
        <button key={m.key} type="button" onClick={() => onChange(m.key)} aria-pressed={value === m.key} className={segment(value === m.key)}>
          {m.label}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-fixed-white/20" aria-hidden />
      {TEST_THEMES.map((t) => (
        <button key={t.key} type="button" onClick={() => pickTheme(t.key)} aria-pressed={theme === t.key} className={segment(theme === t.key)}>
          {t.label}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-fixed-white/20" aria-hidden />
      <button
        type="button"
        onClick={() => {
          applyTestTheme(null);
          onChange(null);
        }}
        className="h-8 whitespace-nowrap rounded-pill px-3 text-fixed-white/80 [@media(hover:hover)]:hover:bg-fixed-white/10"
      >
        Echte tijd
      </button>
    </div>
  );
}

/** Rij met posters: vaste hoogte (posterhoogte + label en marges), zodat de filmtegel en de tegel ernaast
 *  (weer/eten morgen) even hoog zijn en de posters die hoogte vullen. */
const POSTER_ROW = "h-[calc(var(--poster-h)+62px)] shrink-0";
const POSTER_LIMIT = { "--poster-h": "calc((max(650px, 100dvh - 196px) - 263px) / 2 - 62px)" } as React.CSSProperties;

/** Avond: series i.p.v. het weer van vandaag, watchlist i.p.v. het eten van vandaag (met terugval). */
function EveningLeft({ weather, todayMeal, tomorrowMeal }: { weather: Weather | null; todayMeal: DashboardMeal | null; tomorrowMeal: DashboardMeal | null }) {
  const watching = useWatchingMedia();
  const suggestions = useWatchlistSuggestions(watching);
  const [open, setOpen] = React.useState<EveningMedia | null>(null);
  return (
    <>
      {/* Rijen met posters zijn zo hoog als hun posters; de rest van de kolom is voor de verlichting.
          --poster-h: maximale posterhoogte zodat het lichtpaneel altijd ±215px houdt (kolomhoogte
          − 2 tussenruimtes − paneel, gedeeld door twee rijen, min. de rand rond de posters). */}
      <div className={cn("flex gap-3.5", watching.length > 0 ? POSTER_ROW : "min-h-0 flex-1")} style={POSTER_LIMIT}>
        {watching.length > 0 ? <WatchingTile items={watching} onOpen={setOpen} /> : <TodayWeather weather={weather} />}
        <TomorrowWeather weather={weather} />
      </div>
      <div className={cn("flex gap-3.5", suggestions.length > 0 ? POSTER_ROW : "min-h-0 flex-1")} style={POSTER_LIMIT}>
        {suggestions.length > 0 ? <WatchlistTile items={suggestions} onOpen={setOpen} /> : <TodayMeal meal={todayMeal} />}
        <TomorrowMeal meal={tomorrowMeal} />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <DashboardHuePanel cinema />
        <a href="/profiel/panasonic" className="absolute left-[76px] top-3.5 z-10 flex min-h-7 items-center rounded-pill bg-fixed-white/10 px-3 text-xs font-bold text-fixed-white/90">Klimaat ↗</a>
        <a href="/profiel/projectiescherm" className="absolute left-[162px] top-3.5 z-10 flex min-h-7 items-center rounded-pill bg-fixed-white/10 px-3 text-xs font-bold text-fixed-white/90">Scherm ↗</a>
      </div>
      {open ? <FilmDetailModal media={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

export function HomeTabletDashboard({
  todayMeal,
  tomorrowMeal,
  active = true,
}: {
  todayMeal: DashboardMeal | null;
  tomorrowMeal: DashboardMeal | null;
  shoppingCount: number;
  nextShopping: DashboardShopping;
  /** Zichtbaar? Het dashboard blijft gemount als je naar het overzicht wisselt (snel terug); verborgen geen lucht. */
  active?: boolean;
}) {
  const weather = useWeather();
  const { moment, testMoment, setTestMoment } = useDashboardMoment();
  const morning = moment === "ochtend";
  useSunset(moment === "avond" && active);
  // Hoogte van de bovenste rij links: het takenpaneel rechts krijgt precies die hoogte (het grid loopt door).
  const leftRef = React.useRef<HTMLDivElement>(null);
  const [topRowHeight, setTopRowHeight] = React.useState<number | null>(null);
  React.useEffect(() => {
    const row = leftRef.current?.firstElementChild as HTMLElement | null;
    if (!row || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTopRowHeight(Math.round(row.getBoundingClientRect().height)));
    ro.observe(row);
    return () => ro.disconnect();
  }, [moment]);
  // Min. 650px hoog: op een laag scherm scrolt de pagina i.p.v. posters en lichtpaneel te pletten
  // (posters blijven ±130px hoog, zie POSTER_LIMIT).
  return (
    <div className="flex h-[max(650px,calc(100dvh-196px))] gap-3.5 pt-5">
      <div ref={leftRef} className="flex w-[min(497px,46%)] shrink-0 flex-col gap-3.5">
        {moment === "avond" ? (
          <EveningLeft weather={weather} todayMeal={todayMeal} tomorrowMeal={tomorrowMeal} />
        ) : (
          <>
            <div className="flex min-h-0 flex-1 gap-3.5">
              <TodayWeather weather={weather} />
              {morning ? null : <TomorrowWeather weather={weather} />}
            </div>
            <div className="flex min-h-0 flex-1 gap-3.5">
              <TodayMeal meal={todayMeal} />
              {morning ? null : <TomorrowMeal meal={tomorrowMeal} />}
            </div>
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        {/* Post-its met open taken bovenaan, even hoog als de bovenste rij links; de agenda vult de rest, en zonder
            open taken de volle hoogte. Ook 's ochtends lopen morgen en de volgende dagen door in de agenda. */}
        <DashboardTodoPanel height={topRowHeight} />
        <AgendaColumn />
      </div>
      {testMoment ? <MomentTestBar value={testMoment} onChange={setTestMoment} /> : null}
    </div>
  );
}
