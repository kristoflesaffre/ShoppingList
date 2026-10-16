"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import {
  useWatchingTvItems,
  type WatchingTvItem,
} from "@/hooks/use_watching_tv_items";
import type { WatchlistItem } from "@/lib/watchlist";
import {
  CastRound,
  FilmIcons,
  SoftPlayButton,
  StarGlyph,
  TrailerOverlay,
  type CastPerson,
} from "@/components/films/film_detail_ui";

/**
 * Avond op het tablet-dashboard (20 – 23 u): de series waar we mee bezig zijn (i.p.v. het weer van vandaag)
 * en suggesties uit de watchlist (i.p.v. het eten van vandaag). Een tik opent een groot venster met
 * samenvatting, cast en de trailer (YouTube, volledig scherm).
 */

const tile = "relative overflow-hidden rounded-[24px]";

/** «tv-1399» → { type: "tv", tmdbId: "1399" }. */
function parseMediaId(
  id: string,
): { type: "movie" | "tv"; tmdbId: string } | null {
  const m = /^(movie|tv)-(\d+)$/.exec(id);
  return m ? { type: m[1] as "movie" | "tv", tmdbId: m[2] } : null;
}

export type EveningMedia = {
  id: string;
  title: string;
  posterUrl: string | null;
  year: string;
  note?: string;
};

/** Poster als knop (opent het detailvenster). Breedte komt van de carrousel. */
function PosterButton({ media, onOpen }: { media: EveningMedia; onOpen: (m: EveningMedia) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(media)}
      aria-label={`${media.title} openen`}
      className="aspect-[2/3] w-[min(calc((100cqw-24px)/2.5),calc(100cqh*2/3))] shrink-0 snap-start overflow-hidden rounded-[14px] bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_14px_24px_-14px_rgba(0,0,0,0.7)] transition-transform duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-safe:active:scale-[0.97]"
    >
      {media.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- TMDB-poster
        <img src={media.posterUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center p-2 text-center text-xs font-bold text-white/80">{media.title}</span>
      )}
    </button>
  );
}

/**
 * Tegel met een horizontale carrousel van posters: maximaal 2,5 zichtbaar (de halve poster toont dat je kan
 * scrollen). Zonder titels, behalve bij één serie: dan staat de titel naast de poster.
 */
function EveningTile({
  label,
  items,
  background,
  singleTitle = false,
  onOpen,
}: {
  label: string;
  items: EveningMedia[];
  background: string;
  singleTitle?: boolean;
  onOpen: (m: EveningMedia) => void;
}) {
  const only = singleTitle && items.length === 1 ? items[0] : null;
  return (
    <section
      aria-label={label.toLowerCase()}
      className={cn(tile, "flex min-w-0 flex-1 flex-col pt-4 text-white shadow-[0_18px_40px_-24px_rgba(60,30,120,0.8)]")}
      style={{ background }}
    >
      <span className="px-[18px] text-[11.5px] font-extrabold tracking-[0.08em] text-white/75">{label}</span>
      {/* Container-query-eenheden: de postermaat volgt de ruimte in de tegel. */}
      <div className="mt-3 flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[18px] px-[18px] pb-4 [container-type:size] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((m) => (
          <PosterButton key={m.id} media={m} onOpen={onOpen} />
        ))}
        {only ? (
          <button type="button" onClick={() => onOpen(only)} className="flex min-w-0 flex-1 items-end pb-1 text-left focus-visible:outline-none">
            <span className="line-clamp-4 text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{only.title}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** Series waar we mee bezig zijn (leeg: dan blijft het weer staan). */
export function useWatchingMedia(): EveningMedia[] {
  const { watchingItems } = useWatchingTvItems();
  return React.useMemo(
    () => watchingItems.map((w: WatchingTvItem) => ({ id: w.id, title: w.title, posterUrl: w.posterUrl, year: w.year })),
    [watchingItems],
  );
}

/** Suggesties uit de watchlist (volgorde van de lijst), zonder wat we al aan het kijken zijn. */
export function useWatchlistSuggestions(exclude: readonly EveningMedia[]): EveningMedia[] {
  const { ownWatchlist, watchlist } = useFilmsLibrary();
  return React.useMemo(() => {
    const skip = new Set(exclude.map((e) => e.id));
    const list: WatchlistItem[] = (ownWatchlist?.length ? ownWatchlist : watchlist) ?? [];
    return list
      .filter((i) => !skip.has(i.id))
      .slice(0, 20)
      .map((i) => ({ id: i.id, title: i.title, posterUrl: i.posterUrl, year: i.year, note: i.type === "movie" ? "Film" : "Serie" }));
  }, [ownWatchlist, watchlist, exclude]);
}

export function WatchingTile({ items, onOpen }: { items: EveningMedia[]; onOpen: (m: EveningMedia) => void }) {
  return (
    <EveningTile
      label="AAN HET KIJKEN"
      items={items}
      singleTitle
      onOpen={onOpen}
      background="radial-gradient(120% 90% at 85% 100%, #5a3a9c 0%, #2d2160 45%, #161236 100%)"
    />
  );
}

export function WatchlistTile({ items, onOpen }: { items: EveningMedia[]; onOpen: (m: EveningMedia) => void }) {
  return (
    <EveningTile
      label="VANAVOND KIJKEN?"
      items={items}
      onOpen={onOpen}
      background="radial-gradient(120% 90% at 85% 100%, #a33d5c 0%, #5b1f3d 45%, #2a0f22 100%)"
    />
  );
}

// ─── Detailvenster ──────────────────────────────────────────────────────────

type MediaDetail = {
  id: string;
  type: "movie" | "tv";
  title: string;
  year: string;
  runtime: string;
  certification: string;
  genres: string[];
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  score: number | null;
  scoreSource: "imdb" | "tmdb";
  cast: CastPerson[];
  trailerKey: string | null;
};

export function FilmDetailModal({
  media,
  onClose,
}: {
  media: EveningMedia;
  onClose: () => void;
}) {
  const [detail, setDetail] = React.useState<MediaDetail | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const parsed = parseMediaId(media.id);

  React.useEffect(() => {
    if (!parsed) return;
    let active = true;
    fetch(`/api/films/detail?type=${parsed.type}&id=${parsed.tmdbId}`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<MediaDetail>)
          : Promise.reject(new Error(String(r.status))),
      )
      .then((d) => active && setDetail(d))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enkel opnieuw laden bij een ander item
  }, [media.id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !playing) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, playing]);

  const meta = detail
    ? [
        detail.year,
        detail.runtime,
        detail.certification,
        detail.genres.slice(0, 3).join(", "),
      ]
        .filter(Boolean)
        .join(" · ")
    : media.year;

  // Trailer buiten de achtergrond van het venster: anders sluit een tik naast de video ook het venster.
  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={media.title}
        onClick={onClose}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(8,9,24,0.6)] p-6 backdrop-blur-sm motion-safe:animate-fade-up"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[88dvh] w-full max-w-[940px] flex-col overflow-hidden rounded-[28px] bg-[#14112a] text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
        >
          {/* Achtergrondbeeld met de trailerknop */}
          <div className="relative h-[min(38dvh,340px)] w-full shrink-0 bg-[#221b45]">
            {(detail?.backdropUrl ?? media.posterUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element -- TMDB-beeld
              <img
                src={(detail?.backdropUrl ?? media.posterUrl) as string}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
            <span
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,17,42,0)_35%,rgba(20,17,42,0.85)_85%,#14112a_100%)]"
              aria-hidden
            />
            {detail?.trailerKey ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <SoftPlayButton
                  size={76}
                  aria-label={`Trailer van ${media.title} afspelen`}
                  onClick={() => setPlaying(true)}
                />
                <span className="text-sm font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                  Trailer bekijken
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-[rgba(16,17,48,0.45)] text-white backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                aria-hidden
                className="size-4"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="-mt-20 flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-8">
            <div className="relative flex items-end gap-6">
              {media.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- TMDB-poster
                <img
                  src={detail?.posterUrl ?? media.posterUrl}
                  alt=""
                  className="aspect-[2/3] w-[132px] shrink-0 rounded-[16px] object-cover shadow-[0_0_0_2px_rgba(255,255,255,0.85),0_20px_34px_-14px_rgba(0,0,0,0.8)]"
                />
              ) : null}
              <div className="min-w-0 pb-1">
                {media.note ? (
                  <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#c9b8ff]">
                    {media.note}
                  </p>
                ) : null}
                <h2 className="mt-1 text-[34px] font-extrabold leading-tight tracking-[-0.02em]">
                  {detail?.title ?? media.title}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-white/70">
                  <span>{meta}</span>
                  {detail?.score ? (
                    <span className="inline-flex items-center gap-1 font-bold text-white">
                      <StarGlyph
                        source={detail.scoreSource}
                        className="size-4"
                      />
                      {detail.score.toFixed(1)}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            {detail ? (
              <>
                {detail.overview ? (
                  <p className="mt-5 max-w-[720px] text-[15px] leading-6 text-white/85">
                    {detail.overview}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  {detail.trailerKey ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${detail.trailerKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-pill bg-white/[0.12] px-4 text-sm font-bold text-white no-underline [@media(hover:hover)]:hover:bg-white/[0.2]"
                    >
                      Op YouTube {FilmIcons.external}
                    </a>
                  ) : null}
                  <Link
                    href={`/films-series/${media.id}`}
                    className="inline-flex h-10 items-center rounded-pill bg-white/[0.12] px-4 text-sm font-bold text-white no-underline [@media(hover:hover)]:hover:bg-white/[0.2]"
                  >
                    Alles over{" "}
                    {detail.type === "tv" ? "deze serie" : "deze film"}
                  </Link>
                </div>
                {detail.cast.length > 0 ? (
                  <>
                    <h3 className="mt-7 text-base font-extrabold">Cast</h3>
                    {/* Castnamen in het wit op de donkere achtergrond. */}
                    <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_p]:!text-white/90 [&_p+p]:!text-white/55">
                      {detail.cast.slice(0, 14).map((c) => (
                        <CastRound key={c.name + c.character} person={c} />
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            ) : failed ? (
              <p className="mt-6 text-sm text-white/70">
                Details konden niet geladen worden.
              </p>
            ) : (
              <div
                className="mt-6 space-y-2"
                aria-busy
                aria-label="Details laden"
              >
                <span className="block h-3 w-[80%] animate-pulse rounded bg-white/10" />
                <span className="block h-3 w-[70%] animate-pulse rounded bg-white/10" />
                <span className="block h-3 w-[55%] animate-pulse rounded bg-white/10" />
              </div>
            )}
          </div>
        </div>
      </div>
      {playing && detail?.trailerKey ? (
        <TrailerOverlay
          videoKey={detail.trailerKey}
          title={detail.title}
          onClose={() => setPlaying(false)}
        />
      ) : null}
    </>,
    document.body,
  );
}
