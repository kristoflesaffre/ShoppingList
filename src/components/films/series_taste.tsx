"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Poster } from "@/components/films/film_tiles";
import { PosterFan } from "@/components/films/series_follow";
import { useSeriesTaste } from "@/hooks/use_series_taste";
import { TASTE_LEVELS, TASTE_WALL_COLS, TASTE_WALL_ROWS, tasteLabel, tastePosterUrl, tasteSmallPosterUrl, tasteStars, type TasteLevel, type TasteRating, type TasteRecommendation, type TasteProfile, type TasteSeries, type TasteWallTile } from "@/lib/series-taste";

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
  className,
}: {
  value?: TasteLevel | null;
  onRate: (level: TasteLevel) => void;
  disabled?: boolean;
  className?: string;
}) {
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
              selected
                ? "bg-[var(--blue-50)] text-[var(--blue-500)] shadow-[inset_0_0_0_2px_var(--blue-500)]"
                : "bg-[var(--white)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-subtle),0_1px_2px_rgba(16,17,48,0.04)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]",
            )}
          >
            <span className={cn("flex h-[18px] items-center", stars > 0 ? "text-[15px] text-[var(--blue-500)]" : "text-[var(--text-secondary)]")}>
              {stars > 0 ? <TasteStars count={stars} /> : CROSS}
            </span>
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Vaste balk onderaan de wizard: vier oordelen, en daaronder «Niet gezien» (wat je het vaakst tikt). */
export function TasteActionBar({ onRate, onUnseen, disabled }: { onRate: (level: TasteLevel) => void; onUnseen: () => void; disabled?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-[linear-gradient(180deg,rgba(245,246,250,0),var(--bg-app)_24px)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-7">
      <div className="pointer-events-auto mx-auto flex max-w-[560px] flex-col gap-2">
        <TasteRatingButtons onRate={onRate} disabled={disabled} />
        <Button variant="secondary" size="md" onClick={onUnseen} disabled={disabled} className="w-full gap-2">
          {EYE_OFF}
          Niet gezien
        </Button>
      </div>
    </div>
  );
}

/** Eén serie om te beoordelen: poster, titel, score en waar ze over gaat (die tekst laadt apart). */
export function SeriesTasteCard({ series, overview }: { series: TasteSeries; overview: string | null | undefined }) {
  const poster = tastePosterUrl(series);
  const seasons = series.s ? `${series.s} ${series.s === 1 ? "seizoen" : "seizoenen"}` : null;
  return (
    <div className="flex flex-col items-center gap-2.5 text-center lg:flex-row lg:items-start lg:gap-8 lg:text-left">
      <div className="aspect-[2/3] w-[150px] shrink-0 overflow-hidden rounded-[16px] bg-[var(--gray-100)] shadow-[0_18px_30px_-16px_rgba(16,17,48,0.6)] lg:w-[200px] lg:rounded-[18px]">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={`Poster van ${series.n}`} className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-2 lg:w-auto lg:flex-1 lg:items-start lg:pt-1.5">
        <h1 className="mt-1.5 text-[26px] font-extrabold leading-[30px] tracking-[-0.02em] text-[var(--text-primary)] lg:mt-0 lg:text-[36px] lg:leading-10">{series.n}</h1>
        <p className="flex flex-wrap items-center justify-center gap-1 text-[13.5px] text-[var(--text-secondary)] lg:justify-start lg:text-sm">
          <svg viewBox="0 0 24 24" aria-hidden className="size-3.5" fill="#f5b301">
            <path d={STAR_PATH} />
          </svg>
          <b className="font-bold text-[var(--text-primary)]">{series.r.toFixed(1)}</b>
          {series.y ? <span>· {series.y}</span> : null}
          {seasons ? <span>· {seasons}</span> : null}
        </p>
        {series.g.length > 0 ? <p className="text-[13px] text-[var(--text-secondary)]">{series.g.slice(0, 3).join(" · ")}</p> : null}
        {overview === undefined ? (
          <span className="flex w-full flex-col items-center gap-1.5 lg:items-start" aria-hidden>
            <span className="shimmer h-3.5 w-full rounded" />
            <span className="shimmer h-3.5 w-4/5 rounded" />
          </span>
        ) : overview ? (
          <p className="line-clamp-3 text-sm leading-5 text-[var(--text-secondary)] lg:line-clamp-5 lg:text-[15px] lg:leading-[22px] lg:text-[var(--text-primary)]">{overview}</p>
        ) : null}
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

/** Banner op «Films & series» zolang je nog niets beoordeelde. */
export function SeriesTasteBanner({ posters, onStart, onDismiss }: { posters: string[]; onStart: () => void; onDismiss: () => void }) {
  return (
    <section className="relative flex items-center gap-3 rounded-[20px] bg-[image:var(--gradient-store-default)] p-4 lg:gap-[18px] lg:px-[22px] lg:py-[18px]">
      <PosterFan posters={posters} width={46} className="lg:hidden" />
      <PosterFan posters={posters} width={56} className="hidden lg:block" />
      <div className="min-w-0 flex-1 pr-5 lg:pr-0">
        <p className="text-[11.5px] font-extrabold tracking-[0.06em] text-[var(--blue-500)]">JOUW SMAAK</p>
        <h2 className="mt-[3px] text-base font-extrabold text-[var(--text-primary)] lg:text-lg">Welke series vond je goed?</h2>
        <p className="mt-[3px] text-[12.5px] leading-[17px] text-[var(--text-secondary)] lg:text-[13.5px] lg:leading-[19px]">
          Geef de goede series van de laatste 20 jaar een oordeel. Zo leert de app wat je waarschijnlijk ook goed zal vinden.
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
}: {
  series: TasteSheetSeries | null;
  value: TasteLevel | null;
  auto: boolean;
  onClose: () => void;
  onRate: (level: TasteLevel) => void;
  onUnseen: () => void;
  /** Weg als je al op de pagina van de serie zit. */
  onOpenSeries?: () => void;
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
                {auto ? `${series.year ? " · " : ""}Telt vanzelf mee als goed, omdat je ze volgt of zag` : ""}
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
                Naar de serie
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </SlideInModal>
  );
}

/** Op de detailpagina van een serie: jouw oordeel bekijken en wijzigen. */
export function SeriesTasteDetailRow({ series }: { series: TasteSheetSeries }) {
  const { ratings, rate, markUnseen } = useSeriesTaste();
  const [open, setOpen] = React.useState(false);
  const rating = ratings.get(series.id);
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
      <TasteRatingSheet
        series={open ? series : null}
        value={rating?.level ?? null}
        auto={Boolean(rating?.auto)}
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
    </>
  );
}
