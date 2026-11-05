"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { Shimmer } from "@/components/ui/shimmer";
import { PosterFan } from "@/components/films/series_follow";
import { SeriesTasteCard, TasteActionBar } from "@/components/films/series_taste";
import { useSeriesTaste } from "@/hooks/use_series_taste";
import { fetchFilmDetail } from "@/lib/film-detail-client";
import { tastePosterUrl, type TasteLevel, type TasteSeries } from "@/lib/series-taste";

type Step = { id: number; level: TasteLevel | null; unseen: boolean };

const UNDO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[15px]">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

/** Waar de serie over gaat; `undefined` zolang het laadt, `null` als er niets is. */
function useOverview(id: number | undefined) {
  const [loaded, setLoaded] = React.useState<{ id: number; overview: string | null } | null>(null);
  React.useEffect(() => {
    if (!id) return;
    let active = true;
    fetchFilmDetail<{ overview?: string | null }>("tv", String(id)).then(
      (d) => active && setLoaded({ id, overview: d.overview || null }),
      () => active && setLoaded({ id, overview: null }),
    );
    return () => {
      active = false;
    };
  }, [id]);
  return loaded && loaded.id === id ? loaded.overview : undefined;
}

function WizardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Shimmer className="h-1.5 w-full rounded-pill" />
      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start lg:gap-8">
        <Shimmer className="aspect-[2/3] w-[150px] rounded-[16px] lg:w-[200px] lg:rounded-[18px]" />
        <div className="flex w-full flex-col items-center gap-3 lg:items-start lg:pt-2">
          <Shimmer className="h-8 w-56 rounded" />
          <Shimmer className="h-4 w-44 rounded" />
          <Shimmer className="h-4 w-full rounded" />
        </div>
      </div>
    </div>
  );
}

function BeoordelenInner() {
  const router = useRouter();
  const refine = useSearchParams().get("modus") === "automatisch";
  const taste = useSeriesTaste();
  const { askable, loading, explicit, auto, unseenIds, rated } = taste;

  // De wachtrij wordt één keer vastgelegd, zodat je eigen keuzes ze niet door elkaar schudden.
  const [queue, setQueue] = React.useState<TasteSeries[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [history, setHistory] = React.useState<Step[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (queue || loading || !askable) return;
    // «Verfijnen» overloopt enkel wat vanzelf op «goed» staat.
    if (refine) {
      setQueue(rated.filter((s) => s.auto));
      return;
    }
    // De catalogus staat al op bekendheid: wat je waarschijnlijk zag, komt eerst.
    setQueue(askable.filter((s) => !explicit.has(s.id) && !auto.has(s.id) && !unseenIds.has(s.id)));
  }, [queue, loading, askable, explicit, auto, unseenIds, refine, rated]);

  const current = queue?.[index] ?? null;
  const upcoming = queue?.[index + 1] ?? null;
  const overview = useOverview(current?.id);

  const answer = React.useCallback(
    async (action: (id: number) => Promise<void>) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        const step: Step = { id: current.id, level: explicit.get(current.id) ?? null, unseen: unseenIds.has(current.id) };
        await action(current.id);
        setHistory((h) => [...h, step]);
        setIndex((i) => i + 1);
      } finally {
        setBusy(false);
      }
    },
    [current, busy, explicit, unseenIds],
  );

  const { rate, markUnseen, restore } = taste;
  const handleRate = React.useCallback((level: TasteLevel) => answer((id) => rate(id, level)), [answer, rate]);
  const handleUnseen = React.useCallback(() => answer((id) => markUnseen(id)), [answer, markUnseen]);

  const undo = async () => {
    const last = history[history.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      await restore(last.id, last.level, last.unseen);
      setHistory((h) => h.slice(0, -1));
      setIndex((i) => Math.max(0, i - 1));
    } finally {
      setBusy(false);
    }
  };

  const actions = React.useRef({ handleRate, handleUnseen });
  actions.current = { handleRate, handleUnseen };
  const active = Boolean(current);
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest("input, textarea, select, button, [contenteditable]")) return;
      const run: Record<string, () => void> = {
        "0": () => void actions.current.handleRate("no"),
        "1": () => void actions.current.handleRate("good"),
        "2": () => void actions.current.handleRate("great"),
        "3": () => void actions.current.handleRate("top"),
        " ": () => void actions.current.handleUnseen(),
      };
      if (!run[e.key]) return;
      e.preventDefault();
      run[e.key]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const total = queue?.length ?? 0;
  const done = queue !== null && index >= total;
  const pct = total > 0 ? Math.min(100, (index / total) * 100) : 0;
  const title = refine ? "Oordeel verfijnen" : "Series beoordelen";
  const back = () => router.push("/films-series/smaak");
  const undoButton = history.length > 0 && !done ? (
    <Button variant="secondary" size="sm" onClick={() => void undo()} disabled={busy} className="gap-[5px]">
      {UNDO}
      Vorige
    </Button>
  ) : (
    <span className="w-10" aria-hidden />
  );
  const answered = history.length;
  const likedPosters = taste.rated
    .filter((s) => s.level !== "no")
    .slice(0, 3)
    .map(tastePosterUrl)
    .filter((p): p is string => Boolean(p));

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-3.5 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+172px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-10">
        <div className="flex h-11 items-center justify-between lg:hidden">
          <button type="button" aria-label="Terug naar jouw seriesmaak" onClick={back} className={headerRoundButtonClass}>
            {RoundIcons.back}
          </button>
          <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
          {undoButton}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <PageBackButton href="/films-series/smaak" label="Terug naar jouw seriesmaak" />
          <h1 className="text-[32px] font-bold leading-9 tracking-tight text-[var(--text-primary)]">{title}</h1>
          <span className="flex-1" />
          {undoButton}
        </div>

        <div className="w-full lg:mx-auto lg:mt-4 lg:max-w-[760px]">
          {taste.error ? (
            <div className="flex flex-col items-center gap-3 pt-24 text-center">
              <p className="text-[15px] text-[var(--text-secondary)]">De series konden niet geladen worden.</p>
              <Button variant="secondary" size="md" onClick={taste.retry}>
                Opnieuw proberen
              </Button>
            </div>
          ) : queue === null ? (
            <WizardSkeleton />
          ) : done ? (
            <div className="flex flex-col items-center gap-3 pt-16 text-center lg:pt-10">
              {likedPosters.length > 0 ? <PosterFan posters={likedPosters} width={78} /> : null}
              <h2 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">Alles overlopen</h2>
              <p className="max-w-[320px] text-[14.5px] leading-[21px] text-[var(--text-secondary)]">
                {total > 0 ? `Je overliep alle ${total} series.` : "Er zijn nu geen series om te overlopen."} Je oordelen tellen meteen mee voor je voorstellen.
              </p>
              <Button size="lg" onClick={back} className="mt-6 w-full max-w-[343px]">
                Naar jouw seriesmaak
              </Button>
            </div>
          ) : current ? (
            <div className="flex flex-col gap-5 lg:gap-7">
              <div className="flex items-center gap-2.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index} aria-label="Voortgang">
                <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-[var(--gray-100)]">
                  <div className="h-full rounded-pill bg-[var(--blue-500)] transition-[width] duration-300 ease-out-strong" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[12.5px] font-bold text-[var(--text-secondary)]">
                  {(index + 1).toLocaleString("nl-BE")} van {total.toLocaleString("nl-BE")}
                </span>
              </div>
              <SeriesTasteCard key={current.id} series={current} overview={overview} />
              <p className="text-center text-[12.5px] text-[var(--text-tertiary)] lg:pl-[232px] lg:text-left">
                <span className="hidden lg:inline">Toetsen: 0 niet goed · 1 goed · 2 heel goed · 3 topklasse · spatie niet gezien. </span>
                {answered > 0 ? "Stoppen mag altijd: je gaat later verder waar je was." : "De bekendste series komen eerst. Stoppen mag altijd."}
              </p>
              {upcoming?.p ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tastePosterUrl(upcoming) ?? undefined} alt="" aria-hidden className="hidden" />
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      {current && !done ? <TasteActionBar onRate={(l) => void handleRate(l)} onUnseen={() => void handleUnseen()} disabled={busy} /> : null}
    </div>
  );
}

/** Eén voor één de goede series van de laatste 20 jaar beoordelen: goed, heel goed, topklasse, niet goed of niet gezien. */
export default function BeoordelenPage() {
  return (
    <React.Suspense fallback={null}>
      <BeoordelenInner />
    </React.Suspense>
  );
}
