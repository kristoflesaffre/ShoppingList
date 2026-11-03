"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, Poster, watchingTimeLabel } from "@/components/films/film_tiles";
import { WatchOnProjector } from "@/components/films/watch_on_projector";
import { useEpisodeInfo } from "@/hooks/use_episode_info";
import type { WatchingTvItem } from "@/hooks/use_watching_tv_items";

/**
 * Canvas «C · Popcorn»: kop van Films & series over de volle breedte. Popcornbeker op een rode
 * cinemastoel rechts, links diep fluweelrood, onderaan zacht overlopend in de app-achtergrond.
 * `children` = kopbalk (terug, titel, zoeken) en eventueel `ContinueWatchingHero`.
 */
export function CinemaHero({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,var(--cinema-night)_55%,var(--bg-app)_100%)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/films/cinema_popcorn_1920.webp"
        srcSet="/images/films/cinema_popcorn_960.webp 960w, /images/films/cinema_popcorn_1920.webp 1920w"
        sizes="(min-width: 1024px) 72vw, 100vw"
        alt=""
        aria-hidden
        className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover [mask-image:linear-gradient(180deg,#000_55%,transparent_96%)] object-[78%_35%] lg:w-[72%] lg:object-[62%_40%]"
      />
      {/* Links fluweelrood, rechts de popcorn; boven iets donkerder achter de knoppen. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--cinema-night)_0%,color-mix(in_srgb,var(--cinema-night)_88%,transparent)_38%,color-mix(in_srgb,var(--cinema-night)_30%,transparent)_100%)] lg:bg-[linear-gradient(90deg,var(--cinema-night)_0%,var(--cinema-night)_30%,color-mix(in_srgb,var(--cinema-night)_82%,transparent)_46%,color-mix(in_srgb,var(--cinema-night)_15%,transparent)_72%,color-mix(in_srgb,var(--cinema-night)_35%,transparent)_100%)]"
      />
      <span aria-hidden className="absolute left-[24%] top-[26%] -z-10 hidden size-[460px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--cinema-butter)_22%,transparent),transparent)] lg:block" />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cinema-night)_55%,transparent)_0%,transparent_22%,transparent_68%,color-mix(in_srgb,var(--bg-app)_85%,transparent)_92%,var(--bg-app)_98%)]"
      />
      <div
        className={cn(
          "mx-auto w-full max-w-[956px] px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-12",
          compact ? "pb-14 lg:pb-16" : "pb-24 lg:pb-36",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** «Verder kijken» in de kop: de serie die je laatst keek, groot met poster, voortgang, «Speel op projector» en «gezien». */
export function ContinueWatchingHero({
  item,
  onOpen,
  onNext,
}: {
  item: WatchingTvItem;
  onOpen: () => void;
  onNext: (e: React.MouseEvent) => void;
}) {
  const info = useEpisodeInfo(item.tmdbId, item.nextSeason, item.nextEpisode);
  const timeLabel = watchingTimeLabel(item, info);
  const percent = item.stremio?.percent ?? null;
  return (
    <div className="mt-8 flex items-end gap-4 lg:mt-14 lg:gap-8">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${item.title}: verder kijken`}
        className="w-[104px] shrink-0 rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/70 lg:w-[180px] lg:rounded-[16px]"
      >
        <Poster src={item.posterUrl} alt="" className="rounded-[14px] shadow-[0_30px_50px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] lg:rounded-[16px]" />
      </button>
      <div className="min-w-0 flex-1 pb-1 text-fixed-white lg:max-w-[470px]">
        <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.2em] text-[var(--cinema-butter)] lg:text-xs">Verder kijken</p>
        <h2 className="mt-1.5 line-clamp-2 text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em] lg:mt-2.5 lg:text-[52px] lg:leading-none">{item.title}</h2>
        <p className="mt-1.5 truncate text-[13.5px] text-fixed-white/80 lg:mt-3 lg:text-base">
          S{item.nextSeason} · Aflevering {item.nextEpisode}
          {info?.name ? <span className="hidden sm:inline"> — {info.name}</span> : null}
        </p>
        <div className="mt-2.5 flex max-w-[360px] items-center gap-3 lg:mt-4">
          {percent !== null ? (
            <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-sm bg-fixed-white/20">
              <span className="block h-full rounded-sm bg-[var(--cinema-butter)]" style={{ width: `${Math.max(3, percent)}%` }} />
            </span>
          ) : null}
          <span className="shrink-0 text-[12.5px] font-semibold text-fixed-white/75 lg:text-[13px]">{timeLabel}</span>
        </div>
        <div className="mt-4 flex gap-2 lg:mt-6 lg:gap-2.5">
          <WatchOnProjector tone="hero" type="tv" tmdbId={item.tmdbId} season={item.nextSeason} episode={item.nextEpisode} />
          <button
            type="button"
            onClick={onNext}
            aria-label={`Aflevering ${item.nextEpisode} gezien`}
            className="inline-flex size-[42px] items-center justify-center gap-1.5 rounded-pill bg-fixed-white/[0.08] text-[14.5px] font-semibold text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)] backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/70 [@media(hover:hover)]:hover:bg-fixed-white/[0.16] sm:w-auto sm:px-4 lg:h-[46px] lg:px-5 lg:text-[15px]"
          >
            <CheckIcon className="size-4 sm:size-3.5" />
            <span className="hidden sm:inline">Aflevering {item.nextEpisode} gezien</span>
          </button>
        </div>
      </div>
    </div>
  );
}
