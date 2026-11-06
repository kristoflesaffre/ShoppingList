"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ActionPill, FilmIcons } from "@/components/films/film_detail_ui";
import { PageBackButton } from "@/components/ui/page_back_button";
import { headerGlassButtonClass } from "@/components/ui/header_round_button";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { Shimmer } from "@/components/ui/shimmer";
import { PosterFan } from "@/components/films/series_follow";
import { SeriesTasteCard, TasteActionBar } from "@/components/films/series_taste";
import { useTaste } from "@/hooks/use_series_taste";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import type { TasteKind } from "@/lib/taste-kinds";
import { setForcedDark } from "@/lib/theme";
import { fetchFilmDetail } from "@/lib/film-detail-client";
import { tastePosterUrl, type TasteLevel, type TasteSeries } from "@/lib/series-taste";

/** `addedToWatchlist`: hier op de watchlist gezet, dus «Vorige» haalt de titel er ook weer af. */
type Step = { id: number; level: TasteLevel | null; unseen: boolean; addedToWatchlist: boolean };

const UNDO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[15px]">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

const useBrowserLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

type SeriesExtra = { overview: string | null; backdropUrl: string | null };

/** Waar de titel over gaat + het sfeerbeeld; `undefined` zolang het laadt. */
function useTitleExtra(id: number | undefined, type: TasteKind["type"]) {
  const [loaded, setLoaded] = React.useState<({ id: number } & SeriesExtra) | null>(null);
  React.useEffect(() => {
    if (!id) return;
    let active = true;
    fetchFilmDetail<{ overview?: string | null; backdropUrl?: string | null }>(type, String(id)).then(
      (d) => active && setLoaded({ id, overview: d.overview || null, backdropUrl: d.backdropUrl || null }),
      () => active && setLoaded({ id, overview: null, backdropUrl: null }),
    );
    return () => {
      active = false;
    };
  }, [id, type]);
  return loaded && loaded.id === id ? loaded : undefined;
}

/** Sfeerbeeld van de titel bovenaan, dat onderaan en opzij uitvloeit in het donkere doek. */
function Backdrop({ src, fallback }: { src: string | null | undefined; fallback: string | null }) {
  const image = src ?? fallback;
  if (!image) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden lg:h-[620px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={image}
        src={image}
        alt=""
        className={
          src
            ? "size-full object-cover object-top opacity-45"
            : "size-full scale-110 object-cover opacity-30 blur-3xl"
        }
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,14,18,0.35)_0%,rgba(12,14,18,0.55)_45%,var(--bg-app)_100%)]" />
      <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_at_50%_20%,transparent_40%,var(--bg-app)_85%)] lg:block" />
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Shimmer className="h-1.5 w-full rounded-pill" />
      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start lg:gap-8">
        <Shimmer className="aspect-[2/3] w-[164px] rounded-[16px] lg:w-[260px] lg:rounded-[20px]" />
        <div className="flex w-full flex-col items-center gap-3 lg:items-start lg:pt-2">
          <Shimmer className="h-8 w-56 rounded" />
          <Shimmer className="h-4 w-44 rounded" />
          <Shimmer className="h-4 w-full rounded" />
        </div>
      </div>
    </div>
  );
}

function RatePageInner({ kind }: { kind: TasteKind }) {
  const router = useRouter();
  // Donker zoals de andere filmpagina's (cinema-thema), ongeacht het gekozen thema.
  useBrowserLayoutEffect(() => {
    setForcedDark(true);
    return () => setForcedDark(false);
  }, []);
  const refine = useSearchParams().get("modus") === "automatisch";
  const { many, Many } = kind.words;
  const titleInSentence = kind.title[0].toLowerCase() + kind.title.slice(1);
  const taste = useTaste(kind);
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
  const extra = useTitleExtra(current?.id, kind.type);
  const overview = extra === undefined ? undefined : extra.overview;
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useFilmsLibrary();
  const watchlistId = current ? kind.libraryId(current.id) : null;
  const inWatchlist = watchlistId ? isInWatchlist(watchlistId) : false;
  const answer = React.useCallback(
    async (action: (id: number) => Promise<void>, addedToWatchlist = false) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        const step: Step = { id: current.id, level: explicit.get(current.id) ?? null, unseen: unseenIds.has(current.id), addedToWatchlist };
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

  const toggleWatchlist = () => {
    if (!current || !watchlistId) return;
    if (inWatchlist) {
      void removeFromWatchlist(watchlistId);
      return;
    }
    const add = () =>
      addToWatchlist({
        id: watchlistId,
        type: kind.type,
        title: current.n,
        year: current.y ? String(current.y) : "",
        posterUrl: tastePosterUrl(current),
        score: current.r,
        overview: extra?.overview ?? null,
      });
    // Bij «verfijnen» zag je de titel al: dan telt ze niet als «niet gezien» en blijf je staan.
    if (refine) {
      void add();
      return;
    }
    // Wat je nog wil zien, heb je niet gezien: dat is meteen je antwoord op deze titel.
    void answer(async (id) => {
      await add();
      await markUnseen(id);
    }, true);
  };

  const undo = async () => {
    const last = history[history.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      await restore(last.id, last.level, last.unseen);
      if (last.addedToWatchlist) await removeFromWatchlist(kind.libraryId(last.id));
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
  const title = refine ? "Oordeel verfijnen" : `${Many} beoordelen`;
  const back = () => router.push(kind.overviewPath);
  const undoButton = history.length > 0 && !done ? (
    <button
      type="button"
      onClick={() => void undo()}
      disabled={busy}
      className="flex h-10 shrink-0 items-center gap-[6px] rounded-pill bg-fixed-white/[0.12] px-4 text-[14px] font-bold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-md transition-[transform,background-color] duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/70 disabled:opacity-60 [@media(hover:hover)]:hover:bg-fixed-white/[0.2]"
    >
      {UNDO}
      Vorige
    </button>
  ) : (
    <span className="w-10" aria-hidden />
  );
  const likedPosters = taste.rated
    .filter((s) => s.level !== "no")
    .slice(0, 3)
    .map(tastePosterUrl)
    .filter((p): p is string => Boolean(p));

  const progress = (
    <div className="flex items-center gap-3" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index} aria-label="Voortgang">
      <div className="h-1 flex-1 overflow-hidden rounded-pill bg-fixed-white/[0.14]">
        <div className="h-full rounded-pill bg-fixed-white transition-[width] duration-300 ease-out-strong" style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-fixed-white/70">
        {(index + 1).toLocaleString("nl-BE")} / {total.toLocaleString("nl-BE")}
      </span>
    </div>
  );

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[var(--bg-app)]">
      {current && !done ? <Backdrop src={extra?.backdropUrl} fallback={extra === undefined ? null : tastePosterUrl(current)} /> : null}
      <main className="relative mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+176px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:gap-8 lg:px-8 lg:pb-[200px] lg:pt-10">
        <div className="flex h-11 items-center justify-between gap-3 lg:hidden">
          <button type="button" aria-label={`Terug naar ${titleInSentence}`} onClick={back} className={headerGlassButtonClass}>
            {RoundIcons.back}
          </button>
          <p className="text-base font-semibold text-fixed-white">{title}</p>
          {undoButton}
        </div>
        <div className="hidden items-center gap-4 lg:flex">
          <PageBackButton href={kind.overviewPath} label={`Terug naar ${titleInSentence}`} tone="glass" />
          <h2 className="shrink-0 text-[20px] font-bold tracking-[-0.01em] text-fixed-white">{title}</h2>
          {current && !done ? <div className="mx-6 min-w-0 flex-1">{progress}</div> : <span className="flex-1" />}
          {undoButton}
        </div>

        <div className="w-full">
          {taste.error ? (
            <div className="flex flex-col items-center gap-3 pt-24 text-center">
              <p className="text-[15px] text-fixed-white/70">De {many} konden niet geladen worden.</p>
              <Button variant="secondary" size="md" onClick={taste.retry}>
                Opnieuw proberen
              </Button>
            </div>
          ) : queue === null ? (
            <WizardSkeleton />
          ) : done ? (
            <div className="flex flex-col items-center gap-3 pt-16 text-center lg:pt-10">
              {likedPosters.length > 0 ? <PosterFan posters={likedPosters} width={78} /> : null}
              <h2 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-fixed-white">Alles overlopen</h2>
              <p className="max-w-[320px] text-[14.5px] leading-[21px] text-fixed-white/70">
                {total > 0 ? `Je overliep alle ${total} ${many}.` : `Er zijn nu geen ${many} om te overlopen.`} Je oordelen tellen meteen mee voor je voorstellen.
              </p>
              <Button size="lg" onClick={back} className="mt-6 w-full max-w-[343px]">
                Naar {titleInSentence}
              </Button>
            </div>
          ) : current ? (
            <div className="flex flex-col gap-6 lg:pt-6">
              <div className="lg:hidden">{progress}</div>
              <SeriesTasteCard
                key={current.id}
                series={current}
                overview={overview}
                action={
                  <ActionPill
                    tone={inWatchlist ? "screen" : "glass"}
                    icon={inWatchlist ? FilmIcons.check : FilmIcons.plus}
                    aria-pressed={inWatchlist}
                    aria-label={inWatchlist ? "Van je watchlist halen" : "Op je watchlist zetten"}
                    onClick={toggleWatchlist}
                    className="h-10 text-[14px]"
                  >
                    {inWatchlist ? "Op je watchlist" : "Watchlist"}
                  </ActionPill>
                }
              />
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

/** Eén voor één de goede series of films beoordelen: goed, heel goed, topklasse, niet goed of niet gezien. */
export function TasteRatePage({ kind }: { kind: TasteKind }) {
  return (
    <React.Suspense fallback={null}>
      <RatePageInner kind={kind} />
    </React.Suspense>
  );
}
