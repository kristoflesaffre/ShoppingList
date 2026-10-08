"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageBackButton } from "@/components/ui/page_back_button";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { recipeHeroClickHandler } from "@/lib/recipe_hero_transition";
import { lastEatenLabel } from "@/lib/recipe-stats";
import { Medal, StatPlate, useRecipeStats } from "@/app/recepten/recipe_stats_sections";

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-6">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3 shrink-0">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-[18px] bg-[var(--white)] px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--border-subtle)]">
      <p className="text-[22px] font-extrabold leading-7 tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">{value}</p>
      <p className="text-xs leading-4 text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

/**
 * Canvas «Recepten · volledige ranglijst»: hoe vaak elk recept op de kalender stond (zonder
 * desserts), met een schakelaar tussen meest en minst gegeten.
 */
export default function RanglijstPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const { isLoading, todayIso, summary, ranked } = useRecipeStats(user?.id ?? null);
  const [order, setOrder] = React.useState<"meest" | "minst">("meest");

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  if (authLoading || !user || isLoading) return <PageSpinner />;

  /* Rangnummer volgt altijd «meest gegeten»; de schakelaar draait enkel de volgorde om. */
  const rows = ranked.map((r, i) => ({ ...r, rank: i + 1 }));
  const shown = order === "meest" ? rows : [...rows].reverse();

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[var(--bg-app)]">
      <div className="fixed inset-x-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <header className="mx-auto flex h-16 max-w-[620px] items-center px-4">
          <Link
            href="/recepten"
            aria-label="Terug naar recepten"
            className="flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <BackArrowIcon />
          </Link>
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[620px] flex-1 flex-col gap-4 px-4 pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+8px+env(safe-area-inset-top,0px))] motion-safe:animate-fade-up lg:gap-[18px] lg:pt-12">
        <div>
          <div className="flex items-center gap-3">
            <PageBackButton href="/recepten" label="Terug naar recepten" />
            <h1 className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">Ranglijst</h1>
          </div>
          <p className="mt-0.5 text-[13.5px] leading-[19px] text-[var(--text-secondary)] lg:pl-12">
            Hoe vaak elk recept op de kalender stond
          </p>
        </div>

        <div className="flex gap-2.5">
          <StatTile value={summary.meals} label="maaltijden gekookt" />
          <StatTile value={ranked.length} label="recepten" />
          <StatTile value={summary.never} label="nooit gegeten" />
        </div>

        <div role="radiogroup" aria-label="Volgorde" className="flex rounded-pill bg-[var(--gray-50)] p-1 lg:w-[320px]">
          {(["meest", "minst"] as const).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={order === o}
              onClick={() => setOrder(o)}
              className={cn(
                "flex h-9 flex-1 items-center justify-center rounded-pill text-sm font-semibold transition-[background-color,color,box-shadow] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                order === o
                  ? "bg-[var(--white)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(16,17,48,0.12)]"
                  : "text-[var(--text-secondary)]",
              )}
            >
              {o === "meest" ? "Meest gegeten" : "Minst gegeten"}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="py-8 text-center text-base font-medium text-[var(--text-tertiary)]">Nog geen recepten</p>
        ) : (
          <ol className="m-0 list-none overflow-hidden rounded-[22px] bg-[var(--white)] p-0 shadow-[inset_0_0_0_1px_var(--border-subtle)]">
            {shown.map(({ recipe, stat, rank }, i) => (
              <li key={recipe.id} className={cn(i > 0 && "border-t border-[var(--border-subtle)]")}>
                <Link
                  href={`/recepten/${recipe.id}`}
                  onClick={recipeHeroClickHandler(recipe.id, recipe.photoUrl)}
                  className="flex items-center gap-3 px-3.5 py-2.5 no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
                >
                  <span className="flex w-[26px] shrink-0 justify-center">
                    {rank <= 3 && stat.count > 0 ? (
                      <Medal rank={rank as 1 | 2 | 3} size={26} />
                    ) : (
                      <span className="text-[15px] font-bold text-[var(--text-tertiary)] tabular-nums">{rank}</span>
                    )}
                  </span>
                  <StatPlate src={recipe.photoUrl} size={44} shadow={false} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold leading-5 text-[var(--text-primary)]">{recipe.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs leading-4 text-[var(--text-secondary)]">
                      <ClockIcon />
                      {lastEatenLabel(stat.lastIso, todayIso, false)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[17px] font-extrabold tabular-nums",
                      stat.count === 0 ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]",
                    )}
                  >
                    {stat.count}×
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
