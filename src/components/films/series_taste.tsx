"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Poster } from "@/components/films/film_tiles";
import { PosterFan } from "@/components/films/series_follow";
import { useTaste } from "@/hooks/use_series_taste";
import { SERIES_TASTE, type TasteKind } from "@/lib/taste-kinds";
import { TASTE_LEVELS, TASTE_WALL_COLS, TASTE_WALL_ROWS, tasteLabel, tastePosterUrl, tasteSmallPosterUrl, tasteStars, type TasteLevel, type TasteProgress, type TasteRating, type TasteRecommendation, type TasteProfile, type TasteSeries, type TasteWallTile } from "@/lib/series-taste";

const STAR_PATH = "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z";

/** 1 tot 3 sterren; de kleur komt uit `currentColor`. */
export function TasteStars({ count, className }: { count: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-px", className)}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-[1em]" fill="currentColor">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

const CROSS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden className="size-[17px]">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const EYE_OFF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
    <path d="M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.3 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 4.2-1" />
    <path d="M10 10.1a2.8 2.8 0 0 0 3.9 3.9" />
  </svg>
);

/** Oordeel als label op een poster: donker glas met botergele sterren, of een kruisje bij «niet goed». */
export function TasteBadge({ level, className }: { level: TasteLevel; className?: string }) {
  const stars = tasteStars(level);
  return (
    <span
      role="img"
      aria-label={tasteLabel(level)}
      className={cn(
        "absolute left-[7px] top-[7px] inline-flex h-[22px] items-center rounded-pill bg-[rgba(16,17,48,0.62)] px-[7px] text-[11px] font-bold text-fixed-white backdrop-blur-md",
        className,
      )}
    >
      {stars > 0 ? <TasteStars count={stars} className="text-[var(--cinema-butter)]" /> : <span className="flex [&_svg]:size-3">{CROSS}</span>}
    </span>
  );
}

/**
 * De vier oordelen als even grote knoppen. Het kruisje staat bewust los van de sterren:
 * «niet goed» is geen vierde trede maar het tegendeel.
 */
export function TasteRatingButtons({
  value,
  onRate,
  disabled,
  tone = "default",
  className,
}: {
  value?: TasteLevel | null;
  onRate: (level: TasteLevel) => void;
  disabled?: boolean;
  /** «glass»: op het donkere cinema-doek (wizard «Series beoordelen»). */
  tone?: "default" | "glass";
  className?: string;
}) {
  const glass = tone === "glass";
  return (
    <div role="radiogroup" aria-label="Jouw oordeel" className={cn("grid grid-cols-4 gap-2", className)}>
      {TASTE_LEVELS.map(({ level, label, stars }) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onRate(level)}
            className={cn(
              "flex h-[66px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[16px] px-1 text-[12.5px] font-bold leading-4 transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:opacity-60",
              glass
                ? selected
                  ? "bg-fixed-white text-[var(--cinema-screen)]"
                  : "bg-fixed-white/[0.08] text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] backdrop-blur-md [@media(hover:hover)]:hover:bg-fixed-white/[0.15]"
                : selected
                  ? "bg-[var(--blue-50)] text-[var(--blue-500)] shadow-[inset_0_0_0_2px_var(--blue-500)]"
                  : "bg-[var(--white)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-subtle),0_1px_2px_rgba(16,17,48,0.04)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]",
            )}
          >
            <span
              className={cn(
                "flex h-[18px] items-center",
                stars > 0 ? cn("text-[15px]", glass ? "text-[var(--cinema-butter)]" : "text-[var(--blue-500)]") : glass ? "text-fixed-white/70" : "text-[var(--text-secondary)]",
              )}
            >
              {stars > 0 ? <TasteStars count={stars} /> : CROSS}
            </span>
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Vaste balk onderaan de wizard op het donkere doek: vier oordelen, en daaronder «Niet gezien» (wat je het vaakst tikt). */
export function TasteActionBar({ onRate, onUnseen, disabled }: { onRate: (level: TasteLevel) => void; onUnseen: () => void; disabled?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-[linear-gradient(180deg,transparent,var(--bg-app)_32px)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-9 lg:pb-8">
      <div className="pointer-events-auto mx-auto flex max-w-[600px] flex-col gap-2">
        <TasteRatingButtons tone="glass" onRate={onRate} disabled={disabled} />
        <button
          type="button"
          onClick={onUnseen}
          disabled={disabled}
          className="flex h-[42px] w-full items-center justify-center gap-2 rounded-pill text-[14.5px] font-bold text-fixed-white/75 transition-[background-color,color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/70 disabled:opacity-60 [@media(hover:hover)]:hover:bg-fixed-white/[0.08] [@media(hover:hover)]:hover:text-fixed-white"
        >
          {EYE_OFF}
          Niet gezien
        </button>
      </div>
    </div>
  );
}

/**
 * Eén serie om te beoordelen: poster, titel, score, genres, een actie (bv. watchlist)
 * en waar ze over gaat (die tekst laadt apart). Gemaakt voor het donkere cinema-doek.
 */
export function SeriesTasteCard({ series, overview, action }: { series: TasteSeries; overview: string | null | undefined; action?: React.ReactNode }) {
  const poster = tastePosterUrl(series);
  const seasons = series.s ? `${series.s} ${series.s === 1 ? "seizoen" : "seizoenen"}` : null;
  return (
    <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-end lg:gap-10 lg:text-left">
      <div className="aspect-[2/3] w-[164px] shrink-0 overflow-hidden rounded-[16px] bg-fixed-white/[0.06] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.85),inset_0_0_0_1px_rgba(255,255,255,0.08)] lg:w-[260px] lg:rounded-[20px]">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={`Poster van ${series.n}`} className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-2.5 lg:w-auto lg:flex-1 lg:items-start lg:pb-1">
        <h1 className="text-balance text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] text-fixed-white lg:text-[52px]">{series.n}</h1>
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13.5px] text-fixed-white/70 lg:justify-start lg:text-[15px]">
          <svg viewBox="0 0 24 24" aria-hidden className="size-3.5" fill="#f5b301">
            <path d={STAR_PATH} />
          </svg>
          <b className="font-bold text-fixed-white">{series.r.toFixed(1)}</b>
          {series.y ? <span>· {series.y}</span> : null}
          {seasons ? <span>· {seasons}</span> : null}
          {series.g.length > 0 ? <span>· {series.g.slice(0, 2).join(", ")}</span> : null}
        </p>
        {overview === undefined ? (
          <span className="mt-1 flex w-full max-w-[560px] flex-col items-center gap-1.5 lg:items-start" aria-hidden>
            <span className="shimmer h-3.5 w-full rounded" />
            <span className="shimmer h-3.5 w-4/5 rounded" />
          </span>
        ) : overview ? (
          <p className="mt-1 line-clamp-3 max-w-[560px] text-[14px] leading-[21px] text-fixed-white/75 lg:line-clamp-4 lg:text-[15.5px] lg:leading-6">{overview}</p>
        ) : null}
        {action ? <div className="mt-2 flex">{action}</div> : null}
      </div>
    </div>
  );
}

/** Beoordeelde serie in het overzicht: poster met oordeel, titel en het oordeel in woorden. */
export function RatedSeriesTile({ series, rating, onOpen }: { series: TasteSeries; rating: TasteRating; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${series.n}: ${tasteLabel(rating.level)}${rating.auto ? ", automatisch" : ""}. Oordeel wijzigen`}
      className="block w-full min-w-0 rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      <Poster src={tastePosterUrl(series)} alt="">
        <TasteBadge level={rating.level} />
      </Poster>
      <p className="mt-2 truncate text-[13.5px] font-bold leading-[18px] text-[var(--text-primary)]">{series.n}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-secondary)]">
        {tasteLabel(rating.level)}
        {rating.auto ? " · automatisch" : ""}
      </p>
    </button>
  );
}

/** Voorstel: poster, titel en op welke series die lijkt. */
export function TasteRecommendationTile({ recommendation, onOpen, className }: { recommendation: TasteRecommendation; onOpen: () => void; className?: string }) {
  const { series, because } = recommendation;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block shrink-0 rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
        className ?? "w-[132px] lg:w-[148px]",
      )}
    >
      <Poster src={tastePosterUrl(series)} alt="" />
      <p className="mt-2 truncate text-[13.5px] font-bold leading-[18px] text-[var(--text-primary)]">{series.n}</p>
      {because.length > 0 ? (
        <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-[var(--text-secondary)]">Lijkt op {because.map((b) => b.n).join(" en ")}</p>
      ) : null}
    </button>
  );
}

function wallTileClass(level: TasteLevel | null, filter: TasteLevel | "all") {
  if (filter !== "all") return level === filter ? "" : "brightness-[0.34] grayscale";
  if (level === "top" || level === "great") return "";
  if (level === "good") return "brightness-[0.72] saturate-[0.9]";
  return "brightness-[0.34] grayscale";
}

function TasteWallStrip({ tiles, filter }: { tiles: readonly TasteWallTile[]; filter: TasteLevel | "all" }) {
  return (
    <div
      className="grid shrink-0"
      style={{
        gridTemplateColumns: `repeat(${TASTE_WALL_COLS}, var(--wall-cell-w))`,
        gridTemplateRows: `repeat(${TASTE_WALL_ROWS}, var(--wall-cell-h))`,
      }}
    >
      {tiles.map((t) => (
        <div
          key={t.key}
          className="p-[3px]"
          style={{ gridColumn: `${t.col + 1} / span ${t.big ? 2 : 1}`, gridRow: `${t.row + 1} / span ${t.big ? 2 : 1}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(t.big ? tastePosterUrl(t.series) : tasteSmallPosterUrl(t.series)) ?? undefined}
            alt=""
            decoding="async"
            draggable={false}
            className={cn(
              "size-full object-cover transition-[filter] duration-300",
              t.big ? "rounded-[10px] lg:rounded-[12px]" : "rounded-[6px] lg:rounded-[7px]",
              wallTileClass(t.level, filter),
            )}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Canvas «Smaak D · Alles aan de muur»: strook van 30 × 3 posters over de volle breedte die traag
 * van rechts naar links schuift. Hoe beter je een serie vond, hoe groter en feller ze hangt; wat je
 * niet goed vond, zakt grijs weg. Met een filter lichten enkel de series met dat oordeel op.
 * Staat stil bij «verminderde beweging» en pauzeert onder de muis.
 */
export function TasteWallBanner({ tiles, filter, className }: { tiles: readonly TasteWallTile[]; filter: TasteLevel | "all"; className?: string }) {
  return (
    <div aria-hidden className={cn("taste-wall absolute inset-x-0 top-0 h-[288px] overflow-hidden [--wall-cell-h:96px] [--wall-cell-w:64px] lg:h-[432px] lg:[--wall-cell-h:144px] lg:[--wall-cell-w:96px]", className)}>
      {tiles.length > 0 ? (
        <div className="taste-wall-track flex w-max">
          <TasteWallStrip tiles={tiles} filter={filter} />
          <TasteWallStrip tiles={tiles} filter={filter} />
        </div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--bg-app) 46%, transparent) 0%, transparent 20%, transparent 58%, var(--bg-app) 98%)" }}
      />
    </div>
  );
}

/**
 * Voortgang van je seriesmaak op de startpagina: hoeveel je nog moet overlopen, met de knop om verder
 * te gaan. Zelfde balk als op «Jouw seriesmaak», zonder het zoekveld. Te smal = de knoppen eronder.
 */
export function SeriesTasteProgressCard({
  progress,
  onStart,
  onRefine,
  className,
}: {
  progress: TasteProgress;
  onStart: () => void;
  onRefine: () => void;
  className?: string;
}) {
  const { total, answered, toGo, pct, autoCount } = progress;
  const nl = (n: number) => n.toLocaleString("nl-BE");
  return (
    <section aria-label="Jouw seriesmaak" className={cn("flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[20px] bg-[var(--white)] p-4 shadow-card lg:py-3.5 lg:pl-5 lg:pr-4", className)}>
      <div className="min-w-[240px] flex-1">
        <p className="flex items-baseline justify-between gap-3 text-sm font-bold text-[var(--text-primary)]">
          <span>Nog {nl(toGo)} van de {nl(total)} te overlopen</span>
          <span className="shrink-0 text-[13px] font-bold text-[var(--blue-500)]">{Math.floor(pct)}%</span>
        </p>
        <div
          role="progressbar"
          aria-label="Series overlopen"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          className="mt-2 h-1.5 overflow-hidden rounded-pill bg-[var(--gray-100)]"
        >
          <div className="h-full rounded-pill bg-[var(--blue-500)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button size="md" onClick={onStart} className="w-full sm:w-auto">
          Series beoordelen
        </Button>
        {autoCount > 0 ? (
          <Button variant="secondary" size="md" onClick={onRefine} className="w-full sm:w-auto">
            {autoCount} automatisch verfijnen
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** Banner op «Films & series» zolang je nog niets beoordeelde. */
export function SeriesTasteBanner({
  posters,
  onStart,
  onDismiss,
  title = "Welke series vond je goed?",
  text = "Geef de goede series van de laatste 20 jaar een oordeel. Zo leert de app wat je waarschijnlijk ook goed zal vinden.",
}: {
  posters: string[];
  onStart: () => void;
  onDismiss: () => void;
  title?: string;
  text?: string;
}) {
  return (
    <section className="relative flex items-center gap-3 rounded-[20px] bg-[image:var(--gradient-store-default)] p-4 lg:gap-[18px] lg:px-[22px] lg:py-[18px]">
      <PosterFan posters={posters} width={46} className="lg:hidden" />
      <PosterFan posters={posters} width={56} className="hidden lg:block" />
      <div className="min-w-0 flex-1 pr-5 lg:pr-0">
        <p className="text-[11.5px] font-extrabold tracking-[0.06em] text-[var(--blue-500)]">JOUW SMAAK</p>
        <h2 className="mt-[3px] text-base font-extrabold text-[var(--text-primary)] lg:text-lg">{title}</h2>
        <p className="mt-[3px] text-[12.5px] leading-[17px] text-[var(--text-secondary)] lg:text-[13.5px] lg:leading-[19px]">
          {text}
        </p>
        <Button size="sm" onClick={onStart} className="mt-2.5 lg:hidden">
          Beoordelen
        </Button>
      </div>
      <Button size="md" onClick={onStart} className="hidden shrink-0 lg:mr-6 lg:inline-flex">
        Beoordelen
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Banner verbergen"
        className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-[rgba(255,255,255,0.7)] text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [&_svg]:size-3"
      >
        {CROSS}
      </button>
    </section>
  );
}

export type TasteSheetSeries = { id: number; title: string; year: string; posterUrl: string | null };

/**
 * «Je smaak tot nu toe» (voorstel A · Woordwolk): alle genres die je goed vindt als pillen, groter naarmate ze
 * vaker terugkomen. Geen cijfers.
 */
export function TasteProfileCard({ profile }: { profile: TasteProfile }) {
  return (
    <section
      aria-label="Je smaak tot nu toe"
      className="flex flex-col gap-3 rounded-[20px] bg-fixed-white/[0.07] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] lg:px-6 lg:py-5"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--cinema-rose)]">Je smaak tot nu toe</p>
        <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Genres die je goed vindt</p>
      </div>
      <ul className="m-0 flex list-none flex-wrap items-center gap-2 pl-0">
        {profile.genres.map((g) => (
          <li
            key={g.name}
            className={cn(
              "rounded-pill font-bold text-[var(--text-primary)]",
              g.size === "lg"
                ? "bg-[color:color-mix(in_srgb,var(--cinema-rose)_16%,transparent)] px-4 py-2 text-[18px] shadow-[inset_0_0_0_1px_rgba(242,184,194,0.35)] lg:text-[21px]"
                : "bg-fixed-white/[0.09] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
              g.size === "md" && "px-3.5 py-1.5 text-[15.5px] lg:text-[17px]",
              g.size === "sm" && "px-3 py-1 text-[13.5px] lg:text-[14.5px]",
            )}
          >
            {g.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Blad om één oordeel te geven of te wijzigen, vanuit het overzicht, zoeken of de detailpagina. */
export function TasteRatingSheet({
  series,
  value,
  auto,
  onClose,
  onRate,
  onUnseen,
  onOpenSeries,
  kind = SERIES_TASTE,
}: {
  series: TasteSheetSeries | null;
  value: TasteLevel | null;
  auto: boolean;
  onClose: () => void;
  onRate: (level: TasteLevel) => void;
  onUnseen: () => void;
  /** Weg als je al op de pagina van de serie of film zit. */
  onOpenSeries?: () => void;
  kind?: TasteKind;
}) {
  return (
    <SlideInModal open={Boolean(series)} onClose={onClose} title="Jouw oordeel" titleId="taste-sheet-title">
      {series ? (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 shrink-0">
              <Poster src={series.posterUrl} alt="" className="rounded-[8px] shadow-none" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold text-[var(--text-primary)]">{series.title}</p>
              <p className="text-[13px] text-[var(--text-secondary)]">
                {series.year}
                {auto ? `${series.year ? " · " : ""}Telt vanzelf mee als goed, ${kind.words.autoReason}` : ""}
              </p>
            </div>
          </div>
          <TasteRatingButtons value={auto ? null : value} onRate={onRate} />
          <div className="flex gap-2">
            <Button variant="secondary" size="md" onClick={onUnseen} className="flex-1 gap-2">
              {EYE_OFF}
              Niet gezien
            </Button>
            {onOpenSeries ? (
              <Button variant="secondary" size="md" onClick={onOpenSeries} className="flex-1">
                Naar {kind.words.theOne}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </SlideInModal>
  );
}

/**
 * Oordeel op de detailpagina van een serie of film. `tone="glass"`: glazen paneel op het cinema-doek met de vier oordelen als
 * chips (canvas «Seriedetail donker · E»); een tik op het gekozen oordeel opent het blad (o.a. «Niet gezien»).
 */
export function SeriesTasteDetailRow({ series, tone = "default", kind = SERIES_TASTE, className }: { series: TasteSheetSeries; tone?: "default" | "glass"; kind?: TasteKind; className?: string }) {
  const { ratings, rate, markUnseen } = useTaste(kind);
  const [open, setOpen] = React.useState(false);
  const rating = ratings.get(series.id);
  const sheet = (
    <TasteRatingSheet
      series={open ? series : null}
      value={rating?.level ?? null}
      auto={Boolean(rating?.auto)}
      kind={kind}
      onClose={() => setOpen(false)}
      onRate={(level) => {
        void rate(series.id, level, { title: series.title, year: series.year, posterUrl: series.posterUrl });
        setOpen(false);
      }}
      onUnseen={() => {
        void markUnseen(series.id);
        setOpen(false);
      }}
    />
  );
  if (tone === "glass") {
    return (
      <>
        <div className={cn("rounded-[22px] bg-fixed-white/[0.06] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-xl lg:px-5 lg:py-4", className)}>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-fixed-white/50">
            Jouw oordeel{rating?.auto ? " · automatisch" : ""}
          </p>
          <div role="radiogroup" aria-label="Jouw oordeel" className="mt-2.5 flex flex-wrap gap-1">
            {TASTE_LEVELS.map((l) => {
              const on = rating?.level === l.level && !rating.auto;
              return (
                <button
                  key={l.level}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={l.label}
                  title={l.label}
                  onClick={() => (on ? setOpen(true) : void rate(series.id, l.level, { title: series.title, year: series.year, posterUrl: series.posterUrl }))}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-pill px-2.5 text-[12.5px] font-bold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white",
                    on
                      ? "bg-fixed-white text-[var(--cinema-screen)]"
                      : rating?.level === l.level
                        ? "bg-fixed-white/[0.16] text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]"
                        : "bg-fixed-white/[0.08] text-fixed-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] [@media(hover:hover)]:hover:bg-fixed-white/[0.14]",
                  )}
                >
                  {l.stars > 0 ? <TasteStars count={l.stars} className="text-[12px]" /> : null}
                  {l.stars <= 1 ? l.label : null}
                </button>
              );
            })}
          </div>
        </div>
        {sheet}
      </>
    );
  }
  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-[16px] bg-[var(--white)] px-4 py-2.5 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Jouw oordeel</p>
          <p className="flex items-center gap-1.5 truncate text-[15px] font-bold text-[var(--text-primary)]">
            {rating ? (
              <>
                {tasteStars(rating.level) > 0 ? <TasteStars count={tasteStars(rating.level)} className="text-[var(--blue-500)]" /> : null}
                {tasteLabel(rating.level)}
                {rating.auto ? <span className="font-semibold text-[var(--text-tertiary)]">· automatisch</span> : null}
              </>
            ) : (
              "Nog niet beoordeeld"
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {rating ? "Wijzig" : "Beoordeel"}
        </Button>
      </div>
      {sheet}
    </>
  );
}
