"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/lib/watchlist";
import type { WatchingTvItem } from "@/hooks/use_watching_tv_items";

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
    <span className="absolute bottom-[7px] left-[7px] inline-flex h-[22px] items-center gap-[3px] rounded-pill bg-[rgba(16,17,48,0.62)] px-[7px] text-[11.5px] font-bold text-white backdrop-blur-md">
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
    <span className="absolute left-[7px] top-[7px] inline-flex h-[22px] items-center rounded-pill bg-[rgba(16,17,48,0.62)] px-2 text-[11px] font-bold uppercase tracking-[0.04em] text-white backdrop-blur-md">
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
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-[rgba(16,17,48,0.5)] text-white backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:bg-[rgba(16,17,48,0.7)]"
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
export function WatchingCard({
  item,
  menuOpen,
  onToggleMenu,
  onOpen,
  onNext,
  onSeason,
  onSeries,
  className,
}: {
  item: WatchingTvItem;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onNext: (e: React.MouseEvent) => void;
  onSeason: () => void;
  onSeries: () => void;
  /** Standaard 300px in een horizontale rij; op een eigen pagina `w-full`. */
  className?: string;
}) {
  const progress = Math.min(95, Math.max(6, (item.lastWatched.episode / Math.max(item.nextEpisode, item.lastWatched.episode + 1)) * 100));
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
  return (
    <div data-watch-menu className={cn("relative shrink-0", className ?? "w-[300px] lg:w-auto")}>
      <div className="flex gap-3 rounded-[20px] bg-[var(--white)] p-2.5 shadow-[inset_0_0_0_1px_var(--border-subtle)]">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${item.title}: seizoen ${item.nextSeason}, aflevering ${item.nextEpisode}`}
          className="w-[70px] shrink-0 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <Poster src={item.posterUrl} alt="" className="rounded-[12px]" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <button type="button" onClick={onOpen} className="min-w-0 text-left focus-visible:outline-none">
            <p className="truncate text-[15px] font-bold leading-5 text-[var(--text-primary)]">{item.title}</p>
            <p className="mt-0.5 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
              Seizoen {item.nextSeason} · Aflevering {item.nextEpisode}
            </p>
            <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-sm bg-[var(--gray-50)]">
              <span className="block h-full rounded-sm bg-[var(--blue-500)]" style={{ width: `${progress}%` }} />
            </span>
          </button>
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex h-7 min-w-0 items-center gap-1 rounded-pill bg-[var(--blue-50)] px-2.5 text-xs font-bold text-[var(--blue-500)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--blue-100)]"
            >
              <CheckIcon />
              <span className="truncate">Aflevering {item.nextEpisode} gezien</span>
            </button>
            <button
              ref={dotsRef}
              type="button"
              aria-label="Meer opties"
              aria-expanded={menuOpen}
              onClick={onToggleMenu}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                menuOpen ? "bg-[var(--blue-50)] text-[var(--blue-500)]" : "bg-[var(--gray-50)] text-[var(--text-secondary)]",
              )}
            >
              <ThreeDotsIcon className="size-4" />
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


/** Kaartenstapel-icoon voor «één voor één» door een lijst gaan. */
export function StackIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="6" y="7" width="12" height="14" rx="2.5" />
      <path d="M8.5 4h7M10.5 1.8h3" />
    </svg>
  );
}

/**
 * Ingang naar de swipe-stapel van je partner: titels één voor één fullscreen bekijken
 * (canvas «22 · Actiebalk B»).
 */
export function OneByOneButton({ onClick, size = "sm", className }: { onClick: () => void; size?: "sm" | "lg"; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill font-bold transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
        size === "sm"
          ? "h-8 bg-[var(--blue-50)] px-3 text-[13px] text-[var(--blue-500)] [@media(hover:hover)]:hover:bg-[var(--blue-100)]"
          : "h-11 bg-[var(--blue-500)] px-5 text-[15px] text-white [@media(hover:hover)]:hover:bg-[var(--blue-600,#3f45e0)]",
        className,
      )}
    >
      <StackIcon className={size === "sm" ? "size-[15px]" : "size-[18px]"} />
      {size === "sm" ? "Eén voor één" : "Eén voor één bekijken"}
    </button>
  );
}
