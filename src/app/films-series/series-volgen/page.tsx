"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { Shimmer } from "@/components/ui/shimmer";
import { DeckActionBar } from "@/components/films/film_detail_ui";
import { PosterFan, SeriesFollowCard } from "@/components/films/series_follow";
import { useSeriesFollow } from "@/hooks/use_series_follow";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[30px]">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
const PLUS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-5">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const UNDO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[15px]">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

function FollowSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start lg:gap-8">
      <Shimmer className="aspect-[2/3] w-[150px] rounded-[16px] lg:w-[200px] lg:rounded-[18px]" />
      <div className="flex w-full flex-col items-center gap-3 lg:items-start lg:pt-2">
        <Shimmer className="h-6 w-40 rounded-pill" />
        <Shimmer className="h-8 w-56 rounded" />
        <Shimmer className="h-4 w-44 rounded" />
        <Shimmer className="h-4 w-full rounded" />
        <Shimmer className="h-4 w-4/5 rounded" />
      </div>
    </div>
  );
}

/**
 * Canvas «Films · Series volgen»: lopende series tussen twee seizoenen één voor één overlopen.
 * ✕ kijk ik niet · ✓ ik kijk dit (gevolgd: nieuw seizoen komt vanzelf op de watchlist) · + wil ik zien.
 */
export default function SeriesVolgenPage() {
  const router = useRouter();
  const f = useSeriesFollow();
  const [through, setThrough] = React.useState<number | null>(null);
  const currentId = f.current?.tmdbId;
  React.useEffect(() => setThrough(null), [currentId]);
  const chosenThrough = through ?? f.current?.lastSeason ?? 1;

  const actions = React.useRef({ skip: f.skip, follow: () => f.follow(chosenThrough), want: f.want });
  actions.current = { skip: f.skip, follow: () => f.follow(chosenThrough), want: f.want };
  const active = Boolean(f.current);
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      const run = { ArrowLeft: actions.current.skip, ArrowRight: actions.current.follow, ArrowDown: actions.current.want }[e.key];
      if (!run) return;
      e.preventDefault();
      void run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const back = () => router.push("/films-series");
  const undoButton = f.canUndo && !f.done ? (
    <Button variant="secondary" size="sm" onClick={() => void f.undo()} disabled={f.busy} className="gap-[5px]">
      {UNDO}
      Vorige
    </Button>
  ) : (
    <span className="w-10" aria-hidden />
  );
  const pct = f.total > 0 ? Math.min(100, ((f.position - 1) / f.total) * 100) : 0;

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-3.5 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+150px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-10">
        {/* Mobiel: terug · titel · Vorige; desktop: ronde terugknop naast de grote titel */}
        <div className="flex h-11 items-center justify-between lg:hidden">
          <button type="button" aria-label="Terug naar films en series" onClick={back} className={headerRoundButtonClass}>
            {RoundIcons.back}
          </button>
          <p className="text-base font-semibold text-[var(--text-primary)]">Series volgen</p>
          {undoButton}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <PageBackButton href="/films-series" label="Terug naar films en series" />
          <h1 className="text-[32px] font-bold leading-9 tracking-tight text-[var(--text-primary)]">Series volgen</h1>
          <span className="flex-1" />
          {undoButton}
        </div>

        <div className="w-full lg:mx-auto lg:mt-4 lg:max-w-[760px]">
          {f.error ? (
            <div className="flex flex-col items-center gap-3 pt-24 text-center">
              <p className="text-[15px] text-[var(--text-secondary)]">De series konden niet geladen worden.</p>
              <Button variant="secondary" size="md" onClick={f.retry}>
                Opnieuw proberen
              </Button>
            </div>
          ) : f.loading ? (
            <div className="flex flex-col gap-6">
              <Shimmer className="h-1.5 w-full rounded-pill" />
              <FollowSkeleton />
            </div>
          ) : f.done ? (
            <div className="flex flex-col items-center gap-3 pt-16 text-center lg:pt-10">
              {f.followedPosters.length > 0 ? <PosterFan posters={f.followedPosters} width={78} /> : null}
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
                {f.followed > 0 ? `Je volgt ${f.followed} ${f.followed === 1 ? "serie" : "series"}` : "Alles overlopen"}
              </h1>
              <p className="max-w-[320px] text-[14.5px] leading-[21px] text-[var(--text-secondary)]">
                Komt er een nieuw seizoen uit van een serie die je volgt, dan staat het vanzelf op jullie watchlist en bij «Aan het kijken».
              </p>
              <p className="text-[13px] leading-[19px] text-[var(--text-tertiary)]">
                {f.total > 0 ? `Je overliep alle ${f.total} series.` : "Er zijn nu geen nieuwe series om te overlopen."} Nieuwe kandidaten verschijnen vanzelf.
              </p>
              <Button size="lg" onClick={back} className="mt-6 w-full max-w-[343px]">
                Naar Films &amp; series
              </Button>
            </div>
          ) : f.current ? (
            <div className="flex flex-col gap-5 lg:gap-7">
              <div className="flex items-center gap-2.5" role="progressbar" aria-valuemin={1} aria-valuemax={f.total} aria-valuenow={f.position} aria-label="Voortgang">
                <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-[var(--gray-100)]">
                  <div className="h-full rounded-pill bg-[var(--blue-500)] transition-[width] duration-300 ease-out-strong" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[12.5px] font-bold text-[var(--text-secondary)]">
                  {f.position} van {f.total}
                </span>
              </div>
              <SeriesFollowCard key={f.current.tmdbId} series={f.current} through={chosenThrough} onThroughChange={setThrough} />
              <p className="hidden text-[12.5px] text-[var(--text-tertiary)] lg:block lg:pl-[232px]">Toetsen: ← kijk ik niet · → ik kijk dit · ↓ wil ik zien</p>
            </div>
          ) : null}
        </div>
      </main>

      {f.current && !f.done ? (
        <DeckActionBar
          downLabel="Kijk ik niet"
          upLabel="Ik kijk dit"
          upIcon={CHECK}
          seen={{ label: "Wil ik zien", icon: PLUS }}
          onDown={() => void f.skip()}
          onUp={() => void f.follow(chosenThrough)}
          onSeen={() => void f.want()}
        />
      ) : null}
    </div>
  );
}
