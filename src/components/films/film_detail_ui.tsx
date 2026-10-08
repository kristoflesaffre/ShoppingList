"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Bouwstenen voor canvas «21 · Films & series — detail, afleveringen, cast»: zachte play-knop,
 * glazen icoonknop op een foto, seizoenpillen met voortgangsringetje, afleveringrij, cast.
 */

export const FilmIcons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  ),
  dots: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
      <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
};

export function StarGlyph({ source, className }: { source?: "imdb" | "tmdb" | null; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-3.5 shrink-0", className)}>
      <path fill={source === "tmdb" ? "#a9adf4" : "#f5b301"} d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
    </svg>
  );
}

/** Ronde knop van mat glas, voor op een foto (terug, meer). */
export function GlassIconButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(16,17,48,0.32)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-[10px] transition-transform duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Zachte, half-doorzichtige play-knop met optisch gecentreerde driehoek. */
export function SoftPlayButton({ size = 44, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: number; "aria-label": string }) {
  return (
    <button
      type="button"
      style={{ width: size, height: size }}
      className={cn(
        "flex items-center justify-center rounded-full bg-[rgba(16,17,48,0.22)] text-[rgba(255,255,255,0.95)] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),0_6px_16px_-6px_rgba(0,0,0,0.45)] backdrop-blur-[10px] transition-[transform,background-color] duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:scale-105 [@media(hover:hover)]:hover:bg-[rgba(16,17,48,0.34)]",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: Math.round(size * 0.41), height: Math.round(size * 0.41) }}>
        <path d="M7.5 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.02 4.75A1 1 0 0 0 7.5 5.6z" transform="translate(-0.9 0)" fill="currentColor" />
      </svg>
    </button>
  );
}

/** Trailer van YouTube over het hele scherm; sluiten met ✕, Escape of een tik naast de video. */
export function TrailerOverlay({ videoKey, title, onClose }: { videoKey: string; title: string; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Trailer van ${title}`} onClick={onClose} className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-[rgba(8,9,24,0.92)] p-4">
      <div className="aspect-video w-full max-w-[1000px] overflow-hidden rounded-[16px] bg-black" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&playsinline=1`}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          title={`Trailer van ${title}`}
          className="size-full"
        />
      </div>
      {/* Sommige trailers mogen niet ingesloten worden; dan blijft YouTube zelf over. */}
      <a
        href={`https://www.youtube.com/watch?v=${videoKey}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-[rgba(255,255,255,0.14)] px-4 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:bg-[rgba(255,255,255,0.22)]"
      >
        Speelt niet af? Bekijk op YouTube
        {FilmIcons.external}
      </a>
      <button
        type="button"
        onClick={onClose}
        aria-label="Trailer sluiten"
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+16px)] flex size-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.14)] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}

/** Pilknop voor de acties op de detailpagina. */
export function ActionPill({
  tone = "surface",
  icon,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "soft" | "surface" | "white" | "glass"; icon?: React.ReactNode }) {
  const tones = {
    primary: "bg-[var(--blue-500)] text-white [@media(hover:hover)]:hover:bg-[var(--blue-600,#3f45e0)]",
    soft: "bg-[var(--blue-50)] text-[var(--blue-500)] [@media(hover:hover)]:hover:bg-[var(--blue-100)]",
    surface: "bg-[var(--white)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-subtle)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]",
    white: "bg-white text-[var(--blue-500)]",
    glass: "bg-[rgba(255,255,255,0.14)] text-white [@media(hover:hover)]:hover:bg-[rgba(255,255,255,0.22)]",
  } as const;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 min-w-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-pill px-4 text-[15px] font-bold transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/** Kleine link-chip naar IMDb of YouTube. */
export function ExternalChip({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 items-center gap-[7px] rounded-pill bg-[var(--white)] px-3.5 text-[13.5px] font-bold text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
    >
      {children}
      <span className="text-[var(--text-tertiary)]">{FilmIcons.external}</span>
    </a>
  );
}

export function ImdbMark() {
  return <span className="inline-flex h-[18px] items-center rounded-[4px] bg-[#f5c518] px-[5px] text-[11.5px] font-black text-black">IMDb</span>;
}

/** Voortgangsringetje (0–1). Bij 0 enkel het spoor. */
export function ProgressRing({ value, className, track, color }: { value: number; className?: string; track: string; color: string }) {
  const r = 6.5;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4 shrink-0", className)}>
      <circle cx="8" cy="8" r={r} fill="none" stroke={track} strokeWidth={2.2} />
      {v > 0 ? (
        <circle
          cx="8"
          cy="8"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap={v >= 1 ? "butt" : "round"}
          strokeDasharray={`${c * v} ${c}`}
          transform="rotate(-90 8 8)"
          className="transition-[stroke-dasharray] duration-300 ease-out"
        />
      ) : null}
    </svg>
  );
}

export type SeasonPill = { seasonNumber: number; label: string; watched: number; total: number };

/** Canvas «21 · Seizoenpillen A»: niets zolang je niet begon, ringetje als je bezig bent, vinkje als het seizoen gezien is. */
export function SeasonPills({ seasons, selected, onSelect, className }: { seasons: SeasonPill[]; selected: number; onSelect: (n: number) => void; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4", className)} style={{ scrollbarWidth: "none" }}>
      <div role="tablist" aria-label="Seizoenen" className="flex w-max gap-2 py-0.5">
        {seasons.map((s) => {
          const active = s.seasonNumber === selected;
          const value = s.total > 0 ? s.watched / s.total : 0;
          return (
            <button
              key={s.seasonNumber}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${s.label}, ${s.watched} van ${s.total} gezien`}
              onClick={() => onSelect(s.seasonNumber)}
              className={cn(
                "inline-flex h-[34px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill px-3.5 text-[13.5px] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                active
                  ? "bg-[var(--blue-500)] font-bold text-white"
                  : "bg-[var(--white)] font-semibold text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border-subtle)]",
              )}
            >
              {s.label}
              {s.total > 0 && s.watched >= s.total ? (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full",
                    active ? "bg-white text-[var(--blue-500)]" : "bg-[var(--blue-500)] text-white",
                  )}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              ) : s.total > 0 && s.watched > 0 ? (
                <ProgressRing
                  value={value}
                  track={active ? "rgba(255,255,255,0.35)" : "var(--gray-50)"}
                  color={active ? "#fff" : "var(--blue-500)"}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatAirDate(airDate: string | null): string {
  if (!airDate) return "";
  const d = new Date(airDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export type EpisodeRowData = {
  episodeNumber: number;
  name: string;
  airDate: string | null;
  runtime: string;
  rating: number | null;
  overview: string;
  stillUrl: string | null;
};

/** Eén aflevering in een witte lijstkaart: still, titel, datum · duur · score, oog/vinkje. */
export function EpisodeRow({
  ep,
  watched,
  showOverview,
  onOpen,
  onToggle,
}: {
  ep: EpisodeRowData;
  watched: boolean;
  showOverview?: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const date = formatAirDate(ep.airDate);
  return (
    <div className="relative flex gap-3 border-t border-[var(--border-subtle)] px-3.5 py-3 first:border-t-0">
      <button
        type="button"
        onClick={onOpen}
        className={cn("flex min-w-0 flex-1 gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded-[10px]", showOverview ? "items-start" : "items-center")}
      >
        <span className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-[10px] bg-[var(--gray-100)] lg:h-[68px] lg:w-[120px]">
          {ep.stillUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ep.stillUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : null}
          {watched ? <span aria-hidden className="absolute inset-0 bg-[rgba(79,85,241,0.35)]" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold leading-[19px] text-[var(--text-primary)]">
            {ep.episodeNumber}. {ep.name}
          </span>
          <span className="mt-[3px] flex items-center gap-[5px] whitespace-nowrap text-[12.5px] text-[var(--text-tertiary)]">
            {[date, ep.runtime].filter(Boolean).join(" · ")}
            {ep.rating != null ? (
              <>
                {date || ep.runtime ? " ·" : null}
                <StarGlyph className="size-3" />
                <b className="font-semibold text-[var(--text-primary)]">{ep.rating.toFixed(1)}</b>
              </>
            ) : null}
          </span>
          {showOverview && ep.overview ? (
            <span className="mt-1.5 line-clamp-2 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">{ep.overview}</span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={watched}
        aria-label={watched ? `Aflevering ${ep.episodeNumber} niet gezien` : `Aflevering ${ep.episodeNumber} gezien`}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center self-center rounded-full transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          watched ? "bg-[var(--blue-500)] text-white" : "bg-[var(--gray-50)] text-[var(--text-secondary)] [@media(hover:hover)]:hover:bg-[var(--gray-100)]",
        )}
      >
        {watched ? FilmIcons.check : FilmIcons.eye}
      </button>
    </div>
  );
}

export function EpisodeRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-3.5 py-3 first:border-t-0">
      <div className="h-14 w-24 shrink-0 rounded-[10px] shimmer lg:h-[68px] lg:w-[120px]" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-3/4 rounded shimmer" />
        <div className="h-3 w-1/2 rounded shimmer" />
      </div>
      <div className="size-9 rounded-full shimmer" />
    </div>
  );
}

export function ListCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[inset_0_0_0_1px_var(--border-subtle)]", className)}>{children}</div>;
}

export type CastPerson = { name: string; character: string; profileUrl: string | null };

function Initials({ name }: { name: string }) {
  const parts = name.split(/\s+/).filter(Boolean);
  const t = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return <span className="text-sm font-bold text-[var(--blue-500)]">{t}</span>;
}

/** Ronde castfoto met naam en rol eronder (horizontale rij). */
export function CastRound({ person }: { person: CastPerson }) {
  return (
    <div className="w-[84px] shrink-0 text-center">
      <span className="mx-auto flex size-[72px] items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] shadow-[0_8px_16px_-10px_rgba(16,17,48,0.5)]">
        {person.profileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.profileUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <Initials name={person.name} />
        )}
      </span>
      <p className="mt-2 line-clamp-2 text-[12.5px] font-bold leading-4 text-[var(--text-primary)]">{person.name}</p>
      {person.character ? <p className="mt-px truncate text-[11.5px] leading-[15px] text-[var(--text-tertiary)]">{person.character}</p> : null}
    </div>
  );
}

/** Castlid als rij in een lijstkaart. */
export function CastRow({ person, extra }: { person: CastPerson; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-3.5 py-2.5 first:border-t-0">
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)]">
        {person.profileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.profileUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <Initials name={person.name} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-bold text-[var(--text-primary)]">{person.name}</p>
        {person.character ? <p className="mt-px truncate text-[12.5px] text-[var(--text-secondary)]">{person.character}</p> : null}
      </div>
      {extra}
    </div>
  );
}

/** Sectiekop: titel links, link rechts. */
export function DetailSectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[19px] font-bold leading-6 text-[var(--text-primary)]">{title}</h2>
      {action && onAction ? (
        <button type="button" onClick={onAction} className="shrink-0 text-sm font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded">
          {action}
        </button>
      ) : null}
    </div>
  );
}

/** Kop voor een subpagina (afleveringen, cast): terugknop, grote titel, onderregel. */
export function SubpageHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Terug"
          onClick={onBack}
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] lg:ml-0 lg:bg-[var(--white)] lg:text-[var(--text-secondary)] lg:shadow-[0_1px_3px_rgba(16,17,48,0.10)]"
        >
          {FilmIcons.back}
        </button>
        {right}
      </div>
      <div className="mt-1">
        <h1 className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[32px]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
    </>
  );
}
