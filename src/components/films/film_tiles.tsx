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
          <span className="inline-flex h-7 items-center gap-[5px] rounded-pill bg-[var(--blue-500)] px-[11px] text-xs font-bold text-white shadow-[0_6px_14px_-6px_rgba(79,85,241,0.7)] transition-transform duration-fast ease-out-strong motion-safe:group-active:scale-95">
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

/**
 * Canvas «22 · Nieuw seizoen A»: kaart voor een serie die je helemaal zag en waarvan een
 * volgend seizoen uit is (groen NIEUW) of aangekondigd (grijs BINNENKORT).
 */
export function NewSeasonCard({
  item,
  onOpen,
  onAdd,
  onDismiss,
  className,
}: {
  item: { title: string; posterUrl: string | null; season: number; airDate: string; released: boolean };
  onOpen: () => void;
  onAdd: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 gap-3 rounded-[20px] bg-[var(--white)] p-2.5 shadow-[inset_0_0_0_1px_var(--border-subtle)]", className ?? "w-[300px] lg:w-auto")}>
      <button type="button" onClick={onOpen} aria-label={`${item.title} bekijken`} className="w-[70px] shrink-0 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]">
        <Poster src={item.posterUrl} alt="" className="rounded-[12px]" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <button type="button" onClick={onOpen} className="min-w-0 text-left focus-visible:outline-none">
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-pill px-[7px] text-[10.5px] font-extrabold tracking-[0.05em]",
              item.released ? "bg-[#e9f9ef] text-[#1f9d55]" : "bg-[var(--gray-50)] text-[var(--text-secondary)]",
            )}
          >
            {item.released ? "NIEUW" : "BINNENKORT"}
          </span>
          <span className="mt-[5px] block truncate text-[15px] font-bold leading-5 text-[var(--text-primary)]">{item.title}</span>
          <span className="mt-px block text-[12.5px] text-[var(--text-secondary)]">
            Seizoen {item.season} · {item.released ? "sinds" : "vanaf"} {formatShortDate(item.airDate)}
          </span>
        </button>
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "inline-flex h-[30px] items-center gap-[5px] rounded-pill px-3 text-[12.5px] font-bold transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              item.released ? "bg-[var(--blue-500)] text-white" : "bg-[var(--blue-50)] text-[var(--blue-500)]",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {item.released ? "Watchlist" : "Alvast op watchlist"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Seizoen ${item.season} van ${item.title} verbergen`}
            className="flex size-[30px] items-center justify-center rounded-full bg-[var(--gray-50)] text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-100)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
