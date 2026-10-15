"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { useWeather, type Weather, type WeatherKind } from "@/lib/weather";
import { useVasteLijstjes } from "@/components/vaste_lijstjes";
import { VAST_COLORS, deepRgb, mixWithWhiteRgb } from "@/lib/vaste-lijstjes";
import { SkeletonTimeline, useTodayAgenda } from "@/components/home_agenda_section";
import { DashboardPhotoTimeline } from "@/components/dashboard_photo_timeline";
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

function TodayWeather({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return <div className={cn(tile, "min-w-0 flex-1 animate-pulse bg-[linear-gradient(160deg,#5aa0ff,#86c6ff_60%,#c4e5ff)] opacity-70")} aria-label="Weer laden" />;
  }
  return (
    <section
      aria-label={`Weer vandaag in ${weather.place}`}
      className={cn(tile, "flex min-w-0 flex-1 flex-col bg-[linear-gradient(160deg,#5aa0ff,#86c6ff_60%,#c4e5ff)] px-[18px] py-4 text-white shadow-[0_18px_40px_-24px_rgba(40,100,220,0.8)] [[data-aod]_&]:bg-[linear-gradient(160deg,#173468,#0f2347_55%,#0a1630)] [[data-aod]_&]:text-[#eaf1ff] [[data-aod]_&]:shadow-[0_18px_40px_-26px_rgba(60,120,255,0.6)]")}
    >
      <WeatherIcon kind={weather.now.kind} size={136} className="absolute -right-[18px] -top-[26px]" />
      <span className="text-[11.5px] font-extrabold tracking-[0.08em] opacity-90">VANDAAG · {weather.place.toUpperCase()}</span>
      <span className="mt-1 flex items-baseline gap-2">
        <span className="text-[58px] font-extrabold leading-none tracking-[-0.04em]">{weather.now.temp}°</span>
        <span className="text-base font-bold opacity-80">{weather.today.min}°</span>
      </span>
      <span className="mt-1 text-sm font-semibold">{weather.now.label}</span>
      {weather.rainFromHour != null ? (
        <span className="mt-2 inline-flex h-[26px] items-center gap-1.5 self-start rounded-pill bg-white/[0.22] px-2.5 text-xs font-bold">
          ☂ {weather.rainFromHour === new Date().getHours() ? "Kans op regen nu" : `Regen vanaf ${weather.rainFromHour}u`}
        </span>
      ) : null}
      <ul className="m-0 mt-auto flex list-none justify-between border-t border-white/30 p-0 pt-2.5">
        {weather.hours.map((h, i) => (
          <li key={h.hour} className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold text-white/85">{i === 0 ? "Nu" : `${h.hour}u`}</span>
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
      className={cn(tile, "flex w-[124px] shrink-0 flex-col items-center justify-center gap-1.5 bg-[linear-gradient(165deg,#7ea7ee,#a9c6f6_60%,#cadcfa)] text-center shadow-[0_14px_32px_-24px_rgba(40,100,220,0.7)] [[data-aod]_&]:bg-[linear-gradient(170deg,#141c33,#0d1222)] [[data-aod]_&]:shadow-[0_0_0_1px_#1d2742]")}
    >
      <span className="text-[11px] font-extrabold tracking-[0.08em] text-white/90 [[data-aod]_&]:text-[#9db7e6]">MORGEN</span>
      {t ? (
        <>
          <WeatherIcon kind={t.kind} size={64} />
          <span className="text-2xl font-extrabold leading-none text-white [[data-aod]_&]:text-[#e4e9f7]">{t.max}°</span>
          <span className="text-[13px] font-bold text-white/80 [[data-aod]_&]:text-[#7d8aa8]">{t.min}°</span>
        </>
      ) : (
        <span className="size-16 animate-pulse rounded-full bg-white/40" />
      )}
    </section>
  );
}

function mealPhoto(meal: DashboardMeal | null, getPhoto: (name: string) => string | null): string | null {
  if (!meal) return null;
  return meal.photoUrl ?? meal.items.map((i) => i.photoUrl ?? getPhoto(i.name)).find(Boolean) ?? null;
}

function TodayMeal({ meal }: { meal: DashboardMeal | null }) {
  const getPhoto = useItemPhotoUrl(320);
  const photo = mealPhoto(meal, getPhoto);
  const inner = (
    <>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto of productfoto uit de app
        <img src={photo} alt="" className="aod-kenburns absolute -right-[30px] -top-1.5 size-[250px] object-contain drop-shadow-[0_18px_24px_rgba(120,60,0,0.35)] [[data-aod]_&]:brightness-[0.6] [[data-aod]_&]:saturate-[0.85]" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- lokale illustratie
        <img src="/images/ui/kalender_320.webp" alt="" className="absolute -bottom-4 -right-4 size-[180px] object-contain opacity-90" />
      )}
      <span className="absolute left-[18px] top-4 text-[11.5px] font-extrabold tracking-[0.08em] text-[rgba(90,40,0,0.75)] [[data-aod]_&]:text-[#d8a874]">VANDAAG ETEN WE</span>
      <span className="absolute bottom-[18px] left-[18px] max-w-[60%]">
        <span className="block text-[34px] font-extrabold leading-tight tracking-[-0.02em] text-[#3d1d00] [[data-aod]_&]:text-[#ffe9cc]">{meal?.title ?? "Nog niets gepland"}</span>
        <span className="block text-[13.5px] font-semibold text-[rgba(61,29,0,0.75)] [[data-aod]_&]:text-[#d8a874]">{meal ? meal.subtitle : "Plan iets in de kalender"}</span>
      </span>
    </>
  );
  const cls = cn(
    tile,
    "block min-w-0 flex-1 bg-[radial-gradient(120%_95%_at_80%_35%,#ffe6a8_0%,#ffc76b_45%,#f59f3a_100%)] no-underline shadow-[0_18px_40px_-22px_rgba(230,140,30,0.9)] [[data-aod]_&]:bg-[radial-gradient(120%_95%_at_80%_35%,#5a3510_0%,#3a2209_50%,#1d1105_100%)] [[data-aod]_&]:shadow-[0_18px_40px_-26px_rgba(255,150,40,0.5)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
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
  const itemPhotos = meal && !meal.photoUrl ? meal.items.map((i) => i.photoUrl ?? getPhoto(i.name)).filter(Boolean) : [];
  // Losse ingrediënten: de tegel is hoog genoeg om ze allemaal te noemen (i.p.v. «A, B +2»).
  const allNames = meal && !meal.photoUrl && meal.items.length > 1 ? meal.items.map((i) => i.name.charAt(0).toUpperCase() + i.name.slice(1)).join(", ") : null;
  return (
    <Link
      href={meal?.href ?? "/kalender"}
      aria-label={meal ? `Morgen: ${meal.title}` : "Morgen: nog niets gepland"}
      className={cn(
        tile,
        "flex w-[124px] shrink-0 flex-col items-center justify-center gap-2 bg-[linear-gradient(165deg,#ffb48c,#ffcfae_60%,#ffe2cc)] px-2.5 py-3 text-center no-underline shadow-[0_14px_32px_-24px_rgba(230,120,60,0.8)] [[data-aod]_&]:bg-[linear-gradient(170deg,#2a1a10,#160e09)] [[data-aod]_&]:shadow-[0_0_0_1px_#3a2612] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
      )}
    >
      <span className="text-[11px] font-extrabold tracking-[0.08em] text-[rgb(139,87,29)] [[data-aod]_&]:text-[#d8a874]">
        MORGEN
      </span>
      {itemPhotos.length > 1 ? (
        // Zelfde warme, zachte schaduw als het bord van vandaag: het bord «zweeft» boven de tegel.
        <span className="drop-shadow-[0_14px_18px_rgba(120,60,0,0.32)] [[data-aod]_&]:brightness-[0.6]">
          <CalendarLoosePlate photos={itemPhotos.slice(0, 3)} size={88} />
        </span>
      ) : photo ? (
        <span className="block size-[76px] overflow-hidden rounded-full bg-white shadow-[0_12px_20px_-12px_rgba(120,40,0,0.6)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- receptfoto of productfoto uit de app */}
          <img src={photo} alt="" className="aod-kenburns size-full object-cover [[data-aod]_&]:brightness-[0.6] [[data-aod]_&]:saturate-[0.85]" />
        </span>
      ) : (
        <span className="flex size-[76px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[rgba(120,55,15,0.3)] bg-white/25 text-2xl text-[rgba(120,55,15,0.55)]">?</span>
      )}
      <span className={cn("text-[13.5px] font-extrabold leading-tight text-[#3d1d00] [[data-aod]_&]:text-[#e4e6ef]", allNames ? "line-clamp-6" : "line-clamp-2")}>
        {allNames ?? meal?.title ?? "Nog niets"}
      </span>
      {meal?.fromStock ? (
        <span className="inline-flex h-[22px] items-center gap-1 rounded-pill bg-white px-2 text-[11px] font-extrabold text-[#2f6fd0] [[data-aod]_&]:bg-[rgba(80,130,255,0.16)] [[data-aod]_&]:text-[#8fb8ff]" title="Vanavond uit de diepvries halen">
          ❄ ontdooien
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Snelkoppeling onderaan de agenda (Te kopen, volgend lijstje): zelfde zachte kleurverloop en
 * illustratie (deels van de tegel af) als de vaste tegels op de startpagina.
 */
function ShortcutTile({
  href,
  color,
  icon,
  lead,
  kicker,
  title,
  sub,
}: {
  href: string;
  color: [number, number, number];
  icon: string;
  lead?: React.ReactNode;
  kicker?: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="relative flex h-[68px] min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-[20px] pl-4 pr-[84px] no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [[data-aod]_&]:brightness-[0.5]"
      style={{
        backgroundImage: `linear-gradient(120deg, ${mixWithWhiteRgb(color, 0.3)} 0%, ${mixWithWhiteRgb(color, 0.1)} 100%)`,
        boxShadow: `inset 0 0 0 1px ${mixWithWhiteRgb(color, 0.22)}, 0 12px 24px -18px ${deepRgb(color, 0.9)}`,
        color: deepRgb(color),
      }}
    >
      {lead}
      <span className="flex min-w-0 flex-col leading-tight">
        {kicker ? <span className="text-[10.5px] font-extrabold tracking-[0.08em]">{kicker}</span> : null}
        <span className="truncate text-[15px] font-extrabold text-text-primary">{title}</span>
        <span className="truncate text-[12.5px] font-semibold">{sub}</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
      <img src={icon} alt="" aria-hidden className="pointer-events-none absolute -bottom-3 right-2 size-[78px] rotate-[-6deg] object-contain drop-shadow-[0_8px_10px_rgba(16,17,48,0.18)]" />
    </Link>
  );
}

function AgendaColumn({ shoppingCount, nextShopping }: { shoppingCount: number; nextShopping: DashboardShopping }) {
  const { state, connected, allDay, timed, upcomingDays, nowMin, nowLabel, connect } = useTodayAgenda();
  const left = timed.filter((r) => r.state !== "past").length;

  return (
    <section
      aria-label="Agenda vandaag"
      className="flex min-w-0 flex-1 flex-col rounded-[24px] bg-[var(--white)] bg-[linear-gradient(170deg,#e3e6ff_0%,#f3f2ff_38%,#ffffff_70%)] px-5 py-4 shadow-[0_18px_40px_-28px_rgba(79,85,241,0.55),0_0_0_1px_var(--border-subtle)] [[data-aod]_&]:bg-[#0b0c12] [[data-aod]_&]:bg-none [[data-aod]_&]:shadow-[0_0_0_1px_#191b25]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-text-primary">Vandaag</h2>
        {connected ? (
          <span className="text-[12.5px] text-[var(--text-secondary)]">
            {timed.length} {timed.length === 1 ? "afspraak" : "afspraken"}
            {left > 0 && left < timed.length ? ` · nog ${left}` : ""}
          </span>
        ) : null}
      </div>

      {!state ? (
        <div className="flex-1" aria-label="Agenda laden" aria-busy>
          <div className="mb-2.5 flex items-center gap-3.5 rounded-[18px] bg-[var(--gray-25)] px-3.5 py-3 [[data-aod]_&]:bg-[#141519]">
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
          <p className="text-[17px] font-extrabold text-text-primary">Je dag in één oogopslag</p>
          <p className="max-w-[260px] text-sm text-[var(--text-secondary)]">Koppel je Google-agenda om je afspraken van vandaag hier te zien.</p>
          <button type="button" onClick={connect} className="inline-flex h-11 items-center rounded-pill bg-action-primary px-5 text-sm font-bold text-white">
            Google-agenda koppelen
          </button>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DashboardPhotoTimeline allDay={allDay} timed={timed} upcomingDays={upcomingDays} nowMin={nowMin} nowLabel={nowLabel} />
          </div>
        </>
      )}

      <div className="mt-3 flex gap-3">
        <ShortcutTile
          href="/te-kopen"
          color={VAST_COLORS.blauw}
          icon="/images/ui/kopen_240.webp"
          lead={<b className="text-[28px] font-extrabold leading-none tabular-nums">{shoppingCount}</b>}
          title="Te kopen"
          sub={shoppingCount === 1 ? "product open" : "producten open"}
        />
        <ShortcutTile
          href={nextShopping?.href ?? "/lijstjes-beheren/lijstjes"}
          color={VAST_COLORS.groen}
          icon="/images/ui/lijstje_160.webp"
          kicker={nextShopping ? "VOLGEND LIJSTJE" : undefined}
          title={nextShopping ? nextShopping.label : "Lijstjes"}
          sub={nextShopping ? nextShopping.sub : "alle lijstjes"}
        />
      </div>
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

export function HomeTabletDashboard({
  todayMeal,
  tomorrowMeal,
  shoppingCount,
  nextShopping,
}: {
  todayMeal: DashboardMeal | null;
  tomorrowMeal: DashboardMeal | null;
  shoppingCount: number;
  nextShopping: DashboardShopping;
}) {
  const weather = useWeather();
  return (
    <div className="flex h-[max(470px,calc(100dvh-196px))] gap-3.5 pt-5 motion-safe:animate-fade-up">
      <div className="flex w-[min(497px,46%)] shrink-0 flex-col gap-3.5">
        <div className="flex min-h-0 flex-1 gap-3.5">
          <TodayWeather weather={weather} />
          <TomorrowWeather weather={weather} />
        </div>
        <div className="flex min-h-0 flex-1 gap-3.5">
          <TodayMeal meal={todayMeal} />
          <TomorrowMeal meal={tomorrowMeal} />
        </div>
      </div>
      <AgendaColumn shoppingCount={shoppingCount} nextShopping={nextShopping} />
    </div>
  );
}
