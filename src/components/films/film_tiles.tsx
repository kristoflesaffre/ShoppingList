"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ui/shimmer";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { WatchOnProjector } from "@/components/films/watch_on_projector";
import type { WatchlistItem } from "@/lib/watchlist";
import type { WatchingTvItem } from "@/hooks/use_watching_tv_items";
import { usePosterTint, posterTintColors } from "@/hooks/use_poster_tint";
import { useEpisodeInfo, type EpisodeInfo } from "@/hooks/use_episode_info";

function ThreeDotsIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Tegels voor Films & series (canvas «20» en «22»): poster met score/type, postertegel met
 * oogknop, partneracties en de «Aan het kijken»-kaart met ⋯-menu.
 */

function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }}
      aria-hidden
    />
  );
}

export function EyeIcon({ className = "size-[15px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function CheckIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Poster 2:3 met afgeronde hoeken; zonder beeld een filmicoon. */
export function Poster({ src, alt, children, className }: { src: string | null; alt: string; children?: React.ReactNode; className?: string }) {
  // Shimmer tot de poster binnen is; daarna zacht invloeien.
  const [loadedSrc, setLoadedSrc] = React.useState<string | null>(null);
  const loaded = loadedSrc === src;
  const imgRef = React.useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete && el.naturalWidth > 0) setLoadedSrc(src);
    },
    [src],
  );
  return (
    <span
      className={cn(
        "relative block aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-[var(--gray-50)] shadow-[0_10px_20px_-14px_rgba(16,17,48,0.6)]",
        src && !loaded && "shimmer",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setLoadedSrc(src)}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="flex size-full items-center justify-center">
          <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
        </span>
      )}
      {children}
    </span>
  );
}

/** Score als donker glazen labeltje linksonder op de poster. */
export function RatingChip({ score, source }: { score: number; source?: "imdb" | "tmdb" | null }) {
  return (
    <span className="absolute bottom-[7px] left-[7px] inline-flex h-[22px] items-center gap-[3px] rounded-pill bg-[rgba(16,17,48,0.62)] px-[7px] text-[11.5px] font-bold text-fixed-white backdrop-blur-md">
      <svg viewBox="0 0 24 24" aria-hidden className="size-3">
        <path fill={source === "imdb" ? "#f5b301" : "#a9adf4"} d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
      </svg>
      {score.toFixed(1)}
    </span>
  );
}

/** Film of serie op de poster: de score betekent iets anders bij een serie dan bij een film. */
export function TypeChip({ type }: { type: "movie" | "tv" }) {
  return (
    <span className="absolute left-[7px] top-[7px] inline-flex h-[22px] items-center rounded-pill bg-[rgba(16,17,48,0.62)] px-2 text-[11px] font-bold uppercase tracking-[0.04em] text-fixed-white backdrop-blur-md">
      {type === "movie" ? "Film" : "Serie"}
    </span>
  );
}

export function PosterTile({
  item,
  scoreSource,
  buttonRef,
  onOpen,
  onSeen,
  seenLabel,
  className,
}: {
  item: WatchlistItem;
  scoreSource?: "imdb" | "tmdb";
  buttonRef?: (el: HTMLButtonElement | null) => void;
  onOpen: () => void;
  onSeen?: (e: React.MouseEvent) => void;
  /** Toegankelijk label van de oogknop (standaard «Markeer … als bekeken»). */
  seenLabel?: string;
  /** Standaard een vaste breedte voor een horizontale rij; in een raster `w-full`. */
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className ?? "w-[120px] lg:w-[140px]")}>
      <button
        type="button"
        ref={buttonRef}
        onClick={onOpen}
        className="block w-full rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <Poster src={item.posterUrl} alt={item.title}>
          {item.score != null ? <RatingChip score={item.score} source={scoreSource} /> : null}
        </Poster>
        <p className="mt-2 truncate text-[13.5px] font-bold leading-[18px] text-[var(--text-primary)]">{item.title}</p>
        <p className="text-xs leading-4 text-[var(--text-tertiary)]">{item.year}</p>
      </button>
      {onSeen ? (
        <button
          type="button"
          aria-label={seenLabel ?? `Markeer ${item.title} als bekeken`}
          onClick={onSeen}
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-[rgba(16,17,48,0.5)] text-fixed-white backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white [@media(hover:hover)]:hover:bg-[rgba(16,17,48,0.7)]"
        >
          <EyeIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function PartnerAction({
  label,
  tone = "gray",
  onClick,
  children,
}: {
  label: string;
  tone?: "blue" | "gray";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 flex-1 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        tone === "blue"
          ? "bg-[var(--blue-50)] text-[var(--blue-500)] [@media(hover:hover)]:hover:bg-[var(--blue-100)]"
          : "bg-[var(--gray-50)] text-[var(--text-secondary)] [@media(hover:hover)]:hover:bg-[var(--gray-100)]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Canvas «20 · Aan het kijken»: poster, titel, seizoen · aflevering, voortgang; klein knopje
 * «Aflevering n gezien» en een ⋯-menu voor het hele seizoen of de hele serie.
 */
/** «Nog 15 min», «48 min» of «Nog 1 min · finale» onder de titel van een «Aan het kijken»-kaart. */
export function watchingTimeLabel(item: WatchingTvItem, info: EpisodeInfo | null): string {
  const s = item.stremio;
  let time = "";
  if (s && s.durationMs > 0 && s.positionMs > 0) time = `Nog ${Math.max(1, Math.ceil((s.durationMs - s.positionMs) / 60_000))} min`;
  else if (info?.minutes) time = `${info.minutes} min`;
  else if (s?.durationMs) time = `${Math.round(s.durationMs / 60_000)} min`;
  const parts = [time || "Volgende aflevering", info?.finale ? "finale" : ""].filter(Boolean);
  return parts.join(" · ");
}

/** Ronde play-knop met voortgangsring (Stremio) rond de rand. */
function PlayProgressRing({ percent }: { percent: number }) {
  const r = 16.5;
  const c = 2 * Math.PI * r;
  const shown = Math.min(100, Math.max(2, percent));
  return (
    <span className="relative flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)]">
      <svg viewBox="0 0 38 38" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <circle cx="19" cy="19" r={r} fill="none" stroke="var(--gray-100)" strokeWidth={3.5} />
        <circle cx="19" cy="19" r={r} fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeDasharray={`${(shown / 100) * c} ${c}`} />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden className="ml-px size-2.5">
        <path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.2-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function WatchingCard({
  item,
  menuOpen,
  onToggleMenu,
  onOpen,
  onNext,
  onSeason,
  onSeries,
  onNotStarted,
  className,
}: {
  item: WatchingTvItem;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onNext: (e: React.MouseEvent) => void;
  onSeason: () => void;
  onSeries: () => void;
  /** Bij een nieuw seizoen (aflevering 1): uit «Aan het kijken», blijft op de watchlist. */
  onNotStarted?: () => void;
  /** Standaard 300px in een horizontale rij; op een eigen pagina `w-full`. */
  className?: string;
}) {
  const menuItem =
    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:bg-[var(--gray-25)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]";
  const menuIcon = "flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]";
  /* Het menu hangt in een portal (vast onder de ⋯-knop): de horizontale rij zou het anders afsnijden. */
  const dotsRef = React.useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = React.useState<{ top: number; right: number } | null>(null);
  React.useLayoutEffect(() => {
    if (!menuOpen) return;
    const place = () => {
      const r = dotsRef.current?.getBoundingClientRect();
      if (r) setAnchor({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right - 6) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [menuOpen]);
  const tint = usePosterTint(item.posterUrl);
  const light = posterTintColors(tint);
  const dark = posterTintColors(tint, true);
  const info = useEpisodeInfo(item.tmdbId, item.nextSeason, item.nextEpisode);
  const timeLabel = watchingTimeLabel(item, info);
  const tintVars = {
    "--tint-wash": light.wash,
    "--tint-wash-dark": dark.wash,
    "--tint-glow": light.glow,
    "--tint-label": light.label,
    "--tint-label-dark": dark.label,
  } as React.CSSProperties;
  return (
    <div data-watch-menu style={tintVars} className={cn("relative flex shrink-0 flex-col pt-5", className ?? "w-[300px] lg:w-[340px]")}>
      {/* Canvas «C · Sfeerkleur van de poster»: de poster steekt boven de kaart uit, de kaart kleurt mee.
          `flex-1`: in een rij zijn alle kaarten even hoog, ook zonder afleveringstitel. */}
      <div className="relative flex min-h-[136px] flex-1 rounded-[20px] bg-[var(--white)] py-3.5 pl-[118px] pr-3.5 shadow-[inset_0_0_0_1px_var(--border-subtle),0_1px_2px_rgba(16,17,48,0.04)] lg:min-h-[148px] lg:pl-[124px]">
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[20px] [background:var(--tint-wash)] [[data-theme=dark]_&]:[background:var(--tint-wash-dark)]" />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${item.title}: seizoen ${item.nextSeason}, aflevering ${item.nextEpisode}`}
          className="absolute -top-5 left-3.5 w-[90px] rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] lg:w-[96px]"
        >
          <Poster src={item.posterUrl} alt="" className="rounded-[12px] shadow-[0_18px_28px_-16px_var(--tint-glow),0_8px_16px_-10px_rgba(16,17,48,0.45)]" />
        </button>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <button type="button" onClick={onOpen} className="min-w-0 text-left focus-visible:outline-none">
            <p className="text-[10.5px] font-bold uppercase leading-4 tracking-[0.12em] text-[var(--tint-label)] [[data-theme=dark]_&]:text-[var(--tint-label-dark)]">
              S{item.nextSeason} · Aflevering {item.nextEpisode}
            </p>
            <p className="mt-0.5 truncate text-base font-bold leading-[21px] text-[var(--text-primary)]">{item.title}</p>
            {info?.name ? (
              <p className="truncate text-[12.5px] leading-[17px] text-[var(--text-secondary)]">{info.name}</p>
            ) : null}
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="mt-1.5 hidden items-center gap-1.5 self-start rounded-pill text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] lg:inline-flex"
          >
            <PlayProgressRing percent={item.stremio?.percent ?? 0} />
            <span className="whitespace-nowrap text-[12.5px] font-semibold text-[var(--text-secondary)]">{timeLabel}</span>
          </button>
          <div className="mt-auto flex items-center gap-1.5 pt-2.5">
            {/* Hoofdactie: de volgende aflevering op de projector; «Gezien» is secundair (zacht, enkel een oogje). */}
            <WatchOnProjector tone="icon" type="tv" tmdbId={item.tmdbId} season={item.nextSeason} episode={item.nextEpisode} />
            <RoundIconButton tone="primary" size={36} onClick={onNext} aria-label={`Aflevering ${item.nextEpisode} gezien`} title="Gezien">
              <EyeIcon className="size-[18px]" />
            </RoundIconButton>
            <button
              ref={dotsRef}
              type="button"
              aria-label="Meer opties"
              aria-expanded={menuOpen}
              onClick={onToggleMenu}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-50)]",
                menuOpen ? "bg-[var(--blue-50)] text-[var(--blue-500)]" : "text-[var(--text-secondary)]",
              )}
            >
              <ThreeDotsIcon className="size-[18px]" />
            </button>
          </div>
        </div>
      </div>
      {menuOpen && anchor
        ? createPortal(
        <div
          role="menu"
          data-watch-menu
          style={{ top: anchor.top, right: anchor.right }}
          className="fixed z-[60] w-[250px] overflow-hidden rounded-[18px] bg-[var(--white)] shadow-[0_18px_40px_-14px_rgba(16,17,48,0.4),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up"
        >
          <button type="button" role="menuitem" onClick={onNext} className={menuItem}>
            <span className={menuIcon}><CheckIcon className="size-4" /></span>
            <span>
              <span className="block text-sm font-semibold text-[var(--text-primary)]">Aflevering {item.nextEpisode} gezien</span>
              <span className="block text-[11.5px] text-[var(--text-secondary)]">Volgende: aflevering {item.nextEpisode + 1}</span>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={onSeason} className={cn(menuItem, "border-t border-[var(--border-subtle)]")}>
            <span className={menuIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                <rect x="4" y="5" width="16" height="14" rx="2.5" />
                <path d="M8.5 12.2l2.3 2.3 4.7-4.7" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold text-[var(--text-primary)]">Seizoen {item.nextSeason} helemaal gezien</span>
              <span className="block text-[11.5px] text-[var(--text-secondary)]">Verder met seizoen {item.nextSeason + 1}</span>
            </span>
          </button>
          {onNotStarted && item.nextEpisode === 1 && item.nextSeason > item.lastWatched.season ? (
            <button type="button" role="menuitem" onClick={onNotStarted} className={cn(menuItem, "border-t border-[var(--border-subtle)]")}>
              <span className={menuIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                  <path d="M6.5 4.5h11v15l-5.5-3.6-5.5 3.6z" />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">Nog niet aan begonnen</span>
                <span className="block text-[11.5px] text-[var(--text-secondary)]">Blijft op de watchlist</span>
              </span>
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={onSeries} className={cn(menuItem, "border-t border-[var(--border-subtle)]")}>
            <span className={menuIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                <path d="M3.5 12.5l3.5 3.5 7-7.5" />
                <path d="M10.5 15l1 1 8.5-9" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold text-[var(--text-primary)]">Hele serie gezien</span>
              <span className="block text-[11.5px] text-[var(--text-secondary)]">Uit «Aan het kijken» halen</span>
            </span>
          </button>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}


/** Laadvorm van `WatchingCard`: zelfde maten, poster steekt boven de kaart uit. */
export function WatchingCardSkeleton({ className }: { className?: string }) {
  // Zelfde maten als `WatchingCard`: poster boven de kaart, label · titel · aflevering, (desktop) speelring, knoppen.
  return (
    <div aria-hidden className={cn("flex shrink-0 flex-col pt-5", className ?? "w-[300px] lg:w-[340px]")}>
      <div className="relative flex min-h-[136px] flex-1 rounded-[20px] bg-[var(--white)] py-3.5 pl-[118px] pr-3.5 shadow-[inset_0_0_0_1px_var(--border-subtle),0_1px_2px_rgba(16,17,48,0.04)] lg:min-h-[148px] lg:pl-[124px]">
        <Shimmer className="absolute -top-5 left-3.5 aspect-[2/3] w-[90px] rounded-[12px] lg:w-[96px]" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Shimmer className="mt-[3px] h-2.5 w-2/5 rounded-md" />
          <Shimmer className="mt-[7px] h-4 w-3/4 rounded-md" />
          <Shimmer className="mt-1.5 h-3 w-1/2 rounded-md" />
          <div className="mt-2 hidden items-center gap-1.5 lg:flex">
            <Shimmer className="size-6 rounded-full" />
            <Shimmer className="h-3 w-16 rounded-md" />
          </div>
          <div className="mt-auto flex items-center gap-1.5 pt-2.5">
            <Shimmer className="size-9 rounded-full" />
            <Shimmer className="size-9 rounded-full" />
            <Shimmer className="size-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Canvas «22 · Ingang wizard A»: eerste tegel in de rij van je partner — een waaier van haar
 * posters met «Start». Opent de swipe-stapel om de voorstellen één voor één te bekijken.
 */
export function OneByOneTile({
  posters,
  count,
  onClick,
  className,
}: {
  posters: (string | null)[];
  count: number;
  onClick: () => void;
  className?: string;
}) {
  const fan = posters.filter(Boolean).slice(0, 3) as string[];
  // Achterste kaarten eerst; de voorste (eerste voorstel) ligt recht bovenop.
  const layout = [
    { rot: -10, dx: -14 },
    { rot: 8, dx: 14 },
    { rot: 0, dx: 0 },
  ];
  const ordered = fan.length === 3 ? [fan[2], fan[1], fan[0]] : fan.slice().reverse();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${count} voorstellen één voor één bekijken`}
      className={cn("group block shrink-0 self-start text-left focus-visible:outline-none", className ?? "w-[120px] lg:w-[140px]")}
    >
      <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-[linear-gradient(160deg,var(--blue-50),#dfe0fd)] shadow-[0_10px_20px_-14px_rgba(16,17,48,0.6)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--border-focus)] group-focus-visible:ring-offset-2">
        {ordered.map((src, i) => {
          const l = layout[layout.length - ordered.length + i];
          return (
            <span
              key={src + i}
              className="absolute left-1/2 top-[42%] block aspect-[2/3] w-[60%] overflow-hidden rounded-[10px] shadow-[0_10px_18px_-8px_rgba(16,17,48,0.45),0_0_0_2px_#fff] transition-transform duration-300 ease-out-strong"
              style={{ transform: `translate(-50%, -50%) translateX(${l.dx}px) rotate(${l.rot}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
            </span>
          );
        })}
        <span className="absolute inset-x-0 bottom-2.5 flex justify-center">
          <span className="inline-flex h-7 items-center gap-[5px] rounded-pill bg-[var(--blue-500)] px-[11px] text-xs font-bold text-fixed-white shadow-[0_6px_14px_-6px_rgba(79,85,241,0.7)] transition-transform duration-fast ease-out-strong motion-safe:group-active:scale-95">
            <svg viewBox="0 0 24 24" aria-hidden className="size-3">
              <path d="M7.5 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.02 4.75A1 1 0 0 0 7.5 5.6z" transform="translate(-0.9 0)" fill="currentColor" />
            </svg>
            Start
          </span>
        </span>
      </span>
      <span className="mt-2 block truncate text-[13.5px] font-bold leading-[18px] text-[var(--text-primary)]">Eén voor één</span>
      <span className="block text-xs leading-4 text-[var(--text-tertiary)]">
        {count} {count === 1 ? "voorstel" : "voorstellen"}
      </span>
    </button>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }).replace(".", "");
}

function daysUntil(iso: string): number {
  const d = new Date(`${iso}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

/**
 * Canvas «Nieuw seizoen · A · Teaser met beeld»: kaart voor een serie die je helemaal zag en waarvan
 * een volgend seizoen uit is (groen NIEUW · S5) of aangekondigd (glazen «Over 77 dagen»). Sfeerbeeld
 * van de serie als achtergrond, poster van het nieuwe seizoen erop, één witte actie, ✕ rechtsboven.
 */
export function NewSeasonCard({
  item,
  onOpen,
  onAdd,
  onDismiss,
  className,
}: {
  item: {
    title: string;
    posterUrl: string | null;
    seasonPosterUrl?: string | null;
    backdropUrl?: string | null;
    season: number;
    airDate: string;
    released: boolean;
  };
  onOpen: () => void;
  onAdd: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  const days = item.released ? 0 : daysUntil(item.airDate);
  const countdown = days <= 0 ? "VANDAAG" : days === 1 ? "MORGEN" : `OVER ${days} DAGEN`;
  const poster = item.seasonPosterUrl ?? item.posterUrl;
  const background = item.backdropUrl ?? poster;
  return (
    <article
      className={cn(
        "relative isolate h-[204px] shrink-0 overflow-hidden rounded-[20px] bg-[var(--cinema-night)] shadow-[0_14px_30px_-18px_rgba(16,17,48,0.55)] lg:h-[224px]",
        className ?? "w-[300px] lg:w-auto",
      )}
    >
      {background ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={background}
          alt=""
          aria-hidden
          className={cn("absolute inset-0 -z-10 size-full object-cover object-[50%_30%]", !item.backdropUrl && "scale-110 blur-md")}
        />
      ) : null}
      <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(10,6,12,0.94)_0%,rgba(10,6,12,0.55)_48%,rgba(10,6,12,0.05)_100%)]" />
      {/* Hele kaart opent de serie; de knoppen liggen erboven. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${item.title} bekijken`}
        className="absolute inset-0 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fixed-white/70"
      />
      <span
        className={cn(
          "pointer-events-none absolute left-3.5 top-3.5 inline-flex h-6 items-center rounded-pill px-2.5 text-[11px] font-extrabold tracking-[0.06em] text-fixed-white",
          item.released
            ? "bg-[var(--badge-new)]"
            : "bg-fixed-white/[0.16] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] backdrop-blur-md",
        )}
      >
        {item.released ? `NIEUW · S${item.season}` : countdown}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Seizoen ${item.season} van ${item.title} verbergen`}
        className="absolute right-3 top-3 flex size-[30px] items-center justify-center rounded-full bg-fixed-white/[0.14] text-fixed-white backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/70 [@media(hover:hover)]:hover:bg-fixed-white/[0.24]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden className="size-3.5">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end gap-3.5">
        <span className="w-[60px] shrink-0 lg:w-[64px]">
          <Poster src={poster} alt="" className="rounded-[10px] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.12)]" />
        </span>
        <div className="min-w-0 flex-1 text-fixed-white">
          <p className="truncate text-xs font-semibold text-fixed-white/70">
            Seizoen {item.season} · {item.released ? "sinds" : "vanaf"} {formatShortDate(item.airDate)}
          </p>
          <h3 className="mt-0.5 truncate text-[19px] font-extrabold leading-6 tracking-[-0.02em] lg:text-xl">{item.title}</h3>
          <button
            type="button"
            onClick={onAdd}
            className="pointer-events-auto mt-2.5 inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-pill bg-fixed-white px-3.5 text-[13px] font-bold text-[var(--cinema-night)] transition-transform duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white/70 motion-safe:active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden className="size-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {item.released ? "Op watchlist" : "Alvast op watchlist"}
          </button>
        </div>
      </div>
    </article>
  );
}
