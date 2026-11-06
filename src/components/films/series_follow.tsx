"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SeasonPills, StarGlyph } from "@/components/films/film_detail_ui";
import { Poster } from "@/components/films/film_tiles";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { fetchFilmDetail } from "@/lib/film-detail-client";
import { isReturningStatus, seasonStatusFromDetail, type OngoingSeries } from "@/lib/series-follow";

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
}

type SeasonState = Pick<OngoingSeries, "lastSeason" | "nextSeason" | "airing">;

/** Wat er over het volgende seizoen bekend is, als korte tekst en toon (groen / lavendel / grijs). */
export function nextSeasonLabel(series: SeasonState): { label: string; tone: "known" | "announced" | "waiting" } {
  const next = series.nextSeason;
  if (series.airing) return { label: `Seizoen ${series.lastSeason} loopt nu`, tone: "known" };
  if (next?.airDate) return { label: `Seizoen ${next.seasonNumber} · vanaf ${formatDay(next.airDate)}`, tone: "known" };
  if (next) return { label: `Seizoen ${next.seasonNumber} aangekondigd`, tone: "announced" };
  return { label: `Wacht op seizoen ${series.lastSeason + 1}`, tone: "waiting" };
}

/** Volgorde in «Series die je volgt»: datum bekend · aangekondigd · wachten · afgelopen (dan op datum). */
export type FollowedSeriesOrder = { rank: number; date: string };

export function followedSeriesOrder(series: SeasonState, ended: boolean): FollowedSeriesOrder {
  if (ended) return { rank: 3, date: "" };
  const tone = nextSeasonLabel(series).tone;
  const rank = tone === "known" ? 0 : tone === "announced" ? 1 : 2;
  return { rank, date: series.airing ? "" : (series.nextSeason?.airDate ?? "") };
}

const CHIP_TONES = {
  known: "bg-[#e9f9ef] text-[#1f9d55]",
  announced: "bg-[var(--blue-50)] text-[var(--blue-500)]",
  waiting: "bg-[var(--gray-50)] text-[var(--text-secondary)]",
} as const;

/**
 * Canvas «Series volgen» 2: wat er over het volgende seizoen bekend is.
 * Groen = datum bekend of seizoen loopt nu, lavendel = aangekondigd, grijs = nog niets.
 */
export function NextSeasonChip({ series, className }: { series: SeasonState; className?: string }) {
  const { label, tone } = nextSeasonLabel(series);
  return (
    <span className={cn("inline-flex h-6 items-center rounded-pill px-[9px] text-xs font-extrabold", CHIP_TONES[tone], className)}>{label}</span>
  );
}

/**
 * Canvas «Series volgen» 2: één serie in de wizard — poster, status volgend seizoen, score,
 * korte beschrijving en «Gezien t.e.m.» (seizoenpillen, standaard het laatste seizoen).
 */
export function SeriesFollowCard({
  series,
  through,
  onThroughChange,
}: {
  series: OngoingSeries;
  through: number;
  onThroughChange: (season: number) => void;
}) {
  const seasonsLabel = `${series.lastSeason} ${series.lastSeason === 1 ? "seizoen" : "seizoenen"}`;
  // Lange series: het gekozen (laatste) seizoen in beeld schuiven, zonder de pagina te laten scrollen.
  const pillsRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const pill = pillsRef.current?.querySelector<HTMLElement>("[aria-selected=true]");
    const scroller = pill?.closest<HTMLElement>(".overflow-x-auto");
    if (!pill || !scroller) return;
    const left = pill.offsetLeft - scroller.offsetLeft;
    if (left + pill.offsetWidth > scroller.scrollLeft + scroller.clientWidth || left < scroller.scrollLeft) {
      scroller.scrollLeft = left + pill.offsetWidth - scroller.clientWidth + 16;
    }
  }, [series.tmdbId, through]);
  return (
    <div className="flex flex-col items-center gap-2.5 text-center lg:flex-row lg:items-start lg:gap-8 lg:text-left">
      <div className="aspect-[2/3] w-[150px] shrink-0 overflow-hidden rounded-[16px] bg-[var(--gray-100)] shadow-[0_18px_30px_-16px_rgba(16,17,48,0.6)] lg:w-[200px] lg:rounded-[18px]">
        {series.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={series.posterUrl} alt={`Poster van ${series.title}`} className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-2.5 lg:w-auto lg:flex-1 lg:items-start lg:pt-1.5">
        <NextSeasonChip series={series} className="mt-1.5 lg:mt-0" />
        <h1 className="text-[26px] font-extrabold leading-[30px] tracking-[-0.02em] text-[var(--text-primary)] lg:text-[36px] lg:leading-10">{series.title}</h1>
        <p className="flex flex-wrap items-center justify-center gap-1 text-[13.5px] text-[var(--text-secondary)] lg:text-sm [&_b]:text-[var(--text-primary)]">
          {series.score != null ? (
            <>
              <StarGlyph source="tmdb" />
              <b className="font-bold">{series.score.toFixed(1)}</b>
              <span>·</span>
            </>
          ) : null}
          {series.year ? <span>{series.year} ·</span> : null}
          <span>{seasonsLabel}</span>
        </p>
        {series.overview ? (
          <p className="line-clamp-2 text-sm leading-5 text-[var(--text-secondary)] lg:line-clamp-3 lg:text-[15px] lg:leading-[22px] lg:text-[var(--text-primary)]">{series.overview}</p>
        ) : null}
        {series.seasons.length > 1 ? (
          <div ref={pillsRef} className="mt-1 flex w-full flex-col gap-2 text-left">
            <span className="text-xs font-extrabold tracking-[0.05em] text-[var(--text-tertiary)]">GEZIEN T.E.M.</span>
            <SeasonPills
              ariaLabel="Gezien tot en met seizoen"
              seasons={series.seasons.map((s) => ({ seasonNumber: s.seasonNumber, label: `S${s.seasonNumber}`, watched: 0, total: 0 }))}
              selected={through}
              onSelect={onThroughChange}
              className="lg:mx-0 lg:px-0"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Waaier van drie posters (achterste eerst), zoals bij «Eén voor één». */
export function PosterFan({ posters, width = 56, className }: { posters: string[]; width?: number; className?: string }) {
  const fan = posters.slice(0, 3);
  const layout = [
    { rot: -10, dx: -16 },
    { rot: 8, dx: 16 },
    { rot: 0, dx: 0 },
  ];
  const ordered = fan.slice().reverse();
  return (
    <span aria-hidden className={cn("relative block shrink-0", className)} style={{ width: width + 50, height: width * 1.5 + 16 }}>
      {ordered.map((src, i) => {
        const l = layout[layout.length - ordered.length + i];
        return (
          <span
            key={src + i}
            className="absolute left-1/2 top-1/2 block aspect-[2/3] overflow-hidden rounded-[9px] shadow-[0_10px_18px_-8px_rgba(16,17,48,0.45),0_0_0_2px_#fff]"
            style={{ width, transform: `translate(-50%, -50%) translateX(${l.dx}px) rotate(${l.rot}deg)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
          </span>
        );
      })}
    </span>
  );
}

/**
 * Canvas «Series volgen» 1: banner op «Films & series» zolang er lopende series zijn die je
 * nog niet overliep. Desktop: knop rechts; mobiel: knop onder de tekst.
 */
export function SeriesFollowBanner({
  count,
  posters,
  onStart,
  onDismiss,
}: {
  count: number;
  posters: string[];
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="relative flex items-center gap-3 rounded-[20px] bg-[image:var(--gradient-store-default)] p-4 lg:gap-[18px] lg:px-[22px] lg:py-[18px]">
      <PosterFan posters={posters} width={46} className="lg:hidden" />
      <PosterFan posters={posters} width={56} className="hidden lg:block" />
      <div className="min-w-0 flex-1 pr-5 lg:pr-0">
        <p className="text-[11.5px] font-extrabold tracking-[0.06em] text-[var(--blue-500)]">SERIES VOLGEN</p>
        <h2 className="mt-[3px] text-base font-extrabold text-[var(--text-primary)] lg:text-lg">Welke series kijken jullie?</h2>
        <p className="mt-[3px] text-[12.5px] leading-[17px] text-[var(--text-secondary)] lg:text-[13.5px] lg:leading-[19px]">
          {count} lopende {count === 1 ? "serie wacht" : "series wachten"} op een nieuw seizoen. Volg je er een, dan komt het volgende seizoen vanzelf op jullie watchlist.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-2.5 inline-flex h-[34px] items-center rounded-pill bg-[var(--blue-500)] px-3.5 text-[13.5px] font-bold text-fixed-white transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 lg:hidden"
        >
          Overlopen
        </button>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="hidden h-[42px] shrink-0 items-center rounded-pill bg-[var(--blue-500)] px-[18px] text-[15px] font-bold text-fixed-white transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 lg:mr-6 lg:inline-flex"
      >
        Overlopen
      </button>
      <RoundIconButton tone="neutral" size={28} onClick={onDismiss} aria-label="Banner verbergen" className="absolute right-2.5 top-2.5">
        {RoundIcons.close}
      </RoundIconButton>
    </section>
  );
}

type FollowedDetail = {
  title: string;
  year: string;
  posterUrl: string | null;
  status?: string | null;
  seasons?: { seasonNumber: number; episodeCount: number; airDate?: string | null }[];
};

/**
 * Gevolgde series in hun volgorde: eerst aankomend op datum, dan aangekondigd, dan wachten, dan afgelopen;
 * nog onbekend = bij «wachten». Geef `onOrder` door aan `FollowedSeriesTile`, die de stand ophaalt.
 */
export function useFollowedSeriesOrder<T extends { tmdbId: string }>(followed: T[]) {
  const [orders, setOrders] = React.useState<Record<string, FollowedSeriesOrder>>({});
  const onOrder = React.useCallback((tmdbId: string, order: FollowedSeriesOrder) => {
    setOrders((prev) => (prev[tmdbId]?.rank === order.rank && prev[tmdbId]?.date === order.date ? prev : { ...prev, [tmdbId]: order }));
  }, []);
  const sorted = React.useMemo(
    () =>
      followed
        .map((s, i) => ({ s, i, o: orders[s.tmdbId] ?? { rank: 2, date: "" } }))
        .sort((a, b) => a.o.rank - b.o.rank || (a.o.date && b.o.date ? a.o.date.localeCompare(b.o.date) : a.o.date ? -1 : b.o.date ? 1 : 0) || a.i - b.i)
        .map((x) => x.s),
    [followed, orders],
  );
  return { sorted, onOrder };
}

/**
 * Eén gevolgde serie in «Series die je volgt»: poster met ✕ (niet meer volgen), titel en wat er over
 * het volgende seizoen bekend is (groen = datum, lavendel = aangekondigd, grijs = wachten, of «Afgelopen»).
 */
export function FollowedSeriesTile({
  series,
  onOpen,
  onUnfollow,
  onOrder,
  className,
}: {
  series: { tmdbId: string; title: string; year: string; posterUrl: string | null };
  onOpen: () => void;
  onUnfollow?: () => void;
  /** Meldt waar de serie in de lijst hoort zodra bekend is wat er over het volgende seizoen geweten is. */
  onOrder?: (tmdbId: string, order: FollowedSeriesOrder) => void;
  className?: string;
}) {
  const [detail, setDetail] = React.useState<FollowedDetail | null>(null);
  React.useEffect(() => {
    let active = true;
    fetchFilmDetail<FollowedDetail>("tv", series.tmdbId).then((d) => active && setDetail(d), () => {});
    return () => {
      active = false;
    };
  }, [series.tmdbId]);
  const title = series.title || detail?.title || "";
  const posterUrl = series.posterUrl ?? detail?.posterUrl ?? null;
  const ended = detail?.status != null && !isReturningStatus(detail.status);
  const seasonState = detail?.seasons ? seasonStatusFromDetail(detail.seasons) : null;
  const state = seasonState ? nextSeasonLabel(seasonState) : null;
  const order = detail ? followedSeriesOrder(seasonState ?? { lastSeason: 0, nextSeason: null, airing: false }, ended) : null;
  const orderKey = order ? `${order.rank}|${order.date}` : null;
  React.useEffect(() => {
    if (order && onOrder) onOrder(series.tmdbId, order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, series.tmdbId]);
  return (
    <div className={cn("relative shrink-0", className ?? "w-[120px] lg:w-[140px]")}>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <Poster src={posterUrl} alt="" />
        <p className="mt-2 truncate text-[13.5px] font-bold leading-[18px] text-[var(--text-primary)]">{title}</p>
        {ended ? (
          <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-tertiary)]">Afgelopen</p>
        ) : state ? (
          <p
            className={cn(
              "mt-0.5 truncate text-xs font-semibold",
              state.tone === "known" ? "text-[#1f9d55]" : state.tone === "announced" ? "text-[var(--blue-500)]" : "text-[var(--text-secondary)]",
            )}
            title={state.label}
          >
            {state.tone === "announced" && seasonState?.nextSeason ? (
              // Kort in de smalle tegel: ✓ Seizoen n (aangekondigd staat in tooltip en aria-label).
              <span className="inline-flex items-center gap-1" aria-label={state.label}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3 shrink-0">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                Seizoen {seasonState.nextSeason.seasonNumber}
              </span>
            ) : (
              state.label
            )}
          </p>
        ) : (
          <span className="mt-1 block h-3 w-20 rounded-pill bg-[var(--gray-50)]" aria-hidden />
        )}
      </button>
      {onUnfollow ? (
        <RoundIconButton
          tone="surface"
          size={28}
          onClick={onUnfollow}
          aria-label={`${title} niet meer volgen`}
          title="Niet meer volgen"
          className="absolute right-1.5 top-1.5"
        >
          {RoundIcons.close}
        </RoundIconButton>
      ) : null}
    </div>
  );
}
