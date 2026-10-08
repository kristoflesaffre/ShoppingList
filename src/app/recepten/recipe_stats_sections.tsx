"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { buildCalendarEntries } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { recipeTintColors, useIsDarkTheme, useRecipeTint } from "@/lib/recipe-tint";
import { recipeHeroClickHandler } from "@/lib/recipe_hero_transition";
import {
  computeRecipeStats,
  lastEatenLabel,
  longAgoRecipes,
  agoLabel,
  type RecipeStat,
  type RecipeStatsSummary,
} from "@/lib/recipe-stats";

export type StatsRecipe = { id: string; name: string; photoUrl: string | null; category: string | null };
export type RankedRecipe = { recipe: StatsRecipe; stat: RecipeStat };

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Kalender + recepten van de gebruiker → hoe vaak en wanneer laatst elk recept gegeten is. */
export function useRecipeStats(ownerId: string | null): {
  isLoading: boolean;
  todayIso: string;
  summary: RecipeStatsSummary;
  ranked: RankedRecipe[];
} {
  const { isLoading, data } = db.useQuery(
    ownerId ? { lists: { $: { where: { ownerId } }, items: {} }, recipes: {} } : null,
  );
  return React.useMemo(() => {
    const todayIso = toIso(new Date());
    const recipes: StatsRecipe[] = ((data?.recipes ?? []) as Array<Record<string, unknown>>)
      .filter((r) => r.ownerId == null || r.ownerId === ownerId)
      .map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        photoUrl: (r.photoUrl as string | null | undefined) ?? null,
        category: (r.category as string | null | undefined) ?? null,
      }));
    const entries = buildCalendarEntries(
      (data?.lists ?? []) as Parameters<typeof buildCalendarEntries>[0],
      (data?.recipes ?? []) as Parameters<typeof buildCalendarEntries>[1],
    );
    const summary = computeRecipeStats(entries, recipes, todayIso);
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const ranked = summary.ranking.flatMap((stat) => {
      const recipe = byId.get(stat.recipeId);
      return recipe ? [{ recipe, stat }] : [];
    });
    return { isLoading: Boolean(ownerId) && isLoading, todayIso, summary, ranked };
  }, [data, isLoading, ownerId]);
}

/* ------------------------------------------------------------------ */

const MEDAL_METAL: Record<1 | 2 | 3, [string, string, string]> = {
  1: ["#ffd75e", "#f2a516", "#c77f06"],
  2: ["#dfe5ef", "#9aa6bd", "#6d7891"],
  3: ["#f6b07a", "#d9692a", "#a9481a"],
};

/** Design system «Medaille»: lint in V bovenaan, metalen schijf met het cijfer (goud · zilver · brons). */
export function Medal({ rank, size = 26, className }: { rank: 1 | 2 | 3; size?: number; className?: string }) {
  const [hi, mid, lo] = MEDAL_METAL[rank];
  const gid = `medal-${React.useId().replace(/:/g, "")}`;
  return (
    <svg
      width={size}
      height={Math.round(size * 1.32)}
      viewBox="0 0 24 32"
      aria-label={`Plaats ${rank}`}
      role="img"
      className={cn("block shrink-0", className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset=".55" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
      </defs>
      <path d="M4 0h6l5 12h-6z" fill="#5b61f0" />
      <path d="M20 0h-6l-5 12h6z" fill="#3d43c9" />
      <path d="M7 0h2l4.6 11H11.6z" fill="#fff" opacity=".35" />
      <circle cx="12" cy="21" r="10" fill={`url(#${gid})`} />
      <circle cx="12" cy="21" r="7.6" fill="none" stroke={lo} strokeOpacity=".45" strokeWidth="1" />
      <text
        x="12"
        y="25.2"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#fff"
        stroke={lo}
        strokeWidth=".6"
        style={{ paintOrder: "stroke", fontFamily: "inherit" }}
      >
        {rank}
      </text>
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

/** Rond bord met de receptfoto; `data-hero-plate` laat het naar de receptpagina vliegen. */
export function StatPlate({ src, size, shadow = true }: { src: string | null; size: number; shadow?: boolean }) {
  return (
    <span
      data-hero-plate
      aria-hidden
      className={cn(
        "block shrink-0 overflow-hidden rounded-full bg-[var(--white)]",
        shadow && "shadow-[0_14px_26px_-14px_rgba(16,17,48,0.45)]",
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB
        <img src={src} alt="" decoding="async" loading="lazy" className="size-full scale-[1.08] object-cover" />
      ) : null}
    </span>
  );
}

/** Zachte achtergrond in de kleur van het gerecht (zoals de receptkaart). */
function useDishBackground(src: string | null): React.CSSProperties {
  const tint = recipeTintColors(useRecipeTint(src), useIsDarkTheme());
  return { backgroundImage: `linear-gradient(120deg, ${tint.mid} 0%, ${tint.top} 100%)` };
}

const cardLink =
  "no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

function SectionHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">{title}</h2>
        <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--text-secondary)]">{sub}</p>
      </div>
      {right}
    </div>
  );
}

/* ---------------- Meest gegeten ---------------- */

function FavoriteCard({ item, todayIso }: { item: RankedRecipe; todayIso: string }) {
  const { recipe, stat } = item;
  const bg = useDishBackground(recipe.photoUrl);
  return (
    <Link
      href={`/recepten/${recipe.id}`}
      onClick={recipeHeroClickHandler(recipe.id, recipe.photoUrl)}
      style={bg}
      className={cn(
        "relative flex min-h-[160px] overflow-hidden rounded-[24px] shadow-[inset_0_0_0_1px_rgba(16,17,48,0.05)] lg:min-h-[200px] lg:flex-1",
        cardLink,
      )}
    >
      <span className="absolute -right-[22px] top-1/2 -translate-y-1/2">
        <span className="lg:hidden">
          <StatPlate src={recipe.photoUrl} size={150} />
        </span>
        <span className="hidden lg:block">
          <StatPlate src={recipe.photoUrl} size={190} />
        </span>
      </span>
      <span className="relative flex max-w-[calc(100%-140px)] flex-col justify-between gap-3 p-4 pr-0 lg:max-w-[calc(100%-180px)] lg:p-[18px]">
        <span className="flex items-center gap-2">
          <Medal rank={1} size={26} />
          <span className="text-xs font-bold tracking-[0.06em] text-[#8a6a2a] dark:text-[#e2c27e]">FAVORIET</span>
        </span>
        <span className="flex flex-col">
          <span className="line-clamp-2 text-[19px] font-extrabold leading-[23px] text-[var(--text-primary)]">{recipe.name}</span>
          <span className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[34px] font-extrabold leading-[34px] tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">{stat.count}×</span>
            <span className="text-[13px] text-[var(--text-secondary)]">gegeten</span>
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <ClockIcon className="size-3 shrink-0" />
            {lastEatenLabel(stat.lastIso, todayIso)}
          </span>
        </span>
      </span>
    </Link>
  );
}

function RunnerCard({ item, rank, todayIso }: { item: RankedRecipe; rank: 2 | 3; todayIso: string }) {
  const { recipe, stat } = item;
  const bg = useDishBackground(recipe.photoUrl);
  return (
    <Link
      href={`/recepten/${recipe.id}`}
      onClick={recipeHeroClickHandler(recipe.id, recipe.photoUrl)}
      style={bg}
      className={cn(
        "flex min-w-0 flex-1 overflow-hidden rounded-[20px] p-3 shadow-[inset_0_0_0_1px_rgba(16,17,48,0.05)] lg:items-center lg:p-4",
        cardLink,
      )}
    >
      {/* Mobiel gestapeld (alles past op de smalle tegel); desktop naast elkaar. */}
      <span className="flex w-full min-w-0 flex-col lg:flex-row lg:items-center lg:gap-3.5">
        <span className="flex items-start justify-between lg:contents">
          <span className="lg:hidden">
            <StatPlate src={recipe.photoUrl} size={48} />
          </span>
          <span className="hidden lg:block">
            <StatPlate src={recipe.photoUrl} size={64} />
          </span>
          <span className="lg:hidden">
            <Medal rank={rank} size={26} />
          </span>
        </span>
        <span className="mt-2.5 flex min-w-0 flex-col lg:mt-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="hidden lg:block">
              <Medal rank={rank} size={22} />
            </span>
            <span className="truncate text-[13px] font-bold leading-[17px] text-[var(--text-primary)] lg:text-[15px] lg:leading-5">
              {recipe.name}
            </span>
          </span>
          <span className="mt-0.5 flex items-baseline gap-1 lg:mt-1">
            <span className="text-[17px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] tabular-nums lg:text-[22px]">{stat.count}×</span>
            <span className="text-[11.5px] text-[var(--text-secondary)] lg:text-xs">gegeten</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-[var(--text-secondary)] lg:text-[11.5px]">
            <ClockIcon className="size-3 shrink-0" />
            <span className="lg:hidden">{lastEatenLabel(stat.lastIso, todayIso, false)}</span>
            <span className="hidden lg:inline">{lastEatenLabel(stat.lastIso, todayIso)}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Canvas «Recepten · meest gegeten»: #1 groot in zijn kleur, #2 en #3 ernaast/eronder. */
export function MostEatenSection({ ranked, todayIso }: { ranked: RankedRecipe[]; todayIso: string }) {
  const top = ranked.filter((r) => r.stat.count > 0).slice(0, 3);
  if (top.length === 0) return null;
  return (
    <section aria-label="Meest gegeten">
      <SectionHead
        title="Meest gegeten"
        sub="Jullie vaste waarden"
        right={
          <Link
            href="/recepten/ranglijst"
            className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-[var(--blue-500)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            Ranglijst
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        }
      />
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-stretch lg:gap-3.5">
        <div className="flex flex-col lg:w-[58%] lg:shrink-0">
          <FavoriteCard item={top[0]} todayIso={todayIso} />
        </div>
        {top.length > 1 ? (
          <div className="flex gap-2.5 lg:flex-1 lg:flex-col lg:gap-3.5">
            {top.slice(1).map((item, i) => (
              <RunnerCard key={item.recipe.id} item={item} rank={(i + 2) as 2 | 3} todayIso={todayIso} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------- Lang niet meer gegeten ---------------- */

function Postcard({ item, todayIso }: { item: RankedRecipe; todayIso: string }) {
  const { recipe, stat } = item;
  return (
    <Link
      href={`/recepten/${recipe.id}`}
      className={cn(
        "relative block h-[196px] w-[150px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-[var(--gray-50)] shadow-[0_12px_24px_-16px_rgba(16,17,48,0.5)] lg:h-[214px] lg:w-auto",
        cardLink,
      )}
    >
      {recipe.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB
        <img src={recipe.photoUrl} alt="" decoding="async" loading="lazy" className="absolute inset-0 size-full scale-[1.35] object-cover" />
      ) : null}
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,17,48,0)_35%,rgba(16,17,48,0.72)_100%)]" />
      <span className="absolute left-2.5 top-2.5 inline-flex h-6 items-center gap-1 rounded-pill bg-[rgba(255,255,255,0.92)] px-2 shadow-[0_1px_3px_rgba(16,17,48,0.12)] text-[11.5px] font-bold text-[#16181a]">
        <ClockIcon className="size-3 shrink-0" />
        {stat.lastIso ? agoLabel(stat.lastIso, todayIso) : ""}
      </span>
      <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-sm font-bold leading-[18px] text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.25)]">
        {recipe.name}
      </span>
    </Link>
  );
}

/** Canvas «Recepten · lang niet meer gegeten»: foto's over de hele kaart, ander ritme dan de tegels. */
export function LongAgoSection({ ranked, todayIso }: { ranked: RankedRecipe[]; todayIso: string }) {
  const ids = new Set(longAgoRecipes(ranked.map((r) => r.stat), todayIso).map((s) => s.recipeId));
  const items = ranked
    .filter((r) => ids.has(r.recipe.id))
    .sort((a, b) => (a.stat.lastIso ?? "").localeCompare(b.stat.lastIso ?? ""));
  if (items.length === 0) return null;
  return (
    <section aria-label="Lang niet meer gegeten">
      <SectionHead title="Lang niet meer gegeten" sub="Tijd om er eentje terug te halen?" />
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-3.5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => (
          <div key={item.recipe.id} className={cn("contents", i >= 5 && "lg:hidden")}>
            <Postcard item={item} todayIso={todayIso} />
          </div>
        ))}
      </div>
    </section>
  );
}
