"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Canvas «Lege staten 3»: secties die je nog niet gebruikt (kalender, klantenkaarten, films) als
 * gekleurde banners naast elkaar. Hoe minder er overblijven, hoe groter titel en illustratie.
 * De knop staat altijd onderaan, zodat hij per tegel op dezelfde hoogte staat.
 * Mobiel: veegrij met stipjes; nog één over → volle breedte.
 */
export type DiscoverBanner = {
  id: string;
  label: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  illustrationSrc: string;
  /** Lichte tint linksboven van het verloop. */
  tint: string;
  /** Kleur van het label. */
  accent: string;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="size-3.5">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Banner({
  item,
  size,
  onHide,
  className,
}: {
  item: DiscoverBanner;
  size: "s" | "m" | "l" | "xl";
  onHide: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("relative isolate flex flex-col overflow-hidden rounded-[24px] p-[22px]", className)}
      style={{ background: `linear-gradient(140deg, ${item.tint} 0%, var(--white) 100%)` }}
    >
      <button
        type="button"
        onClick={() => onHide(item.id)}
        aria-label={`${item.label} verbergen`}
        className="absolute right-2.5 top-2.5 z-10 flex size-[30px] items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors [@media(hover:hover)]:hover:bg-[rgba(16,17,48,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <CloseIcon />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
      <img
        src={item.illustrationSrc}
        alt=""
        aria-hidden
        className={cn(
          "pointer-events-none absolute -z-10 -rotate-[8deg] object-contain",
          size === "s" && "-bottom-5 -right-4 size-[120px]",
          size === "m" && "-bottom-[22px] -right-[18px] size-[150px]",
          size === "l" && "-bottom-6 right-2 size-[180px]",
          size === "xl" && "-bottom-8 right-8 size-[230px]",
        )}
      />
      <div
        className={cn(
          "flex flex-1 flex-col",
          size === "s" && "max-w-[200px]",
          size === "m" && "max-w-[220px]",
          size === "l" && "max-w-[290px]",
          size === "xl" && "max-w-[460px]",
        )}
      >
        <p className="text-xs font-extrabold uppercase tracking-[0.06em]" style={{ color: item.accent }}>
          {item.label}
        </p>
        <h3
          className={cn(
            "mt-1.5 font-extrabold text-text-primary",
            size === "s" && "text-lg leading-[22px]",
            size === "m" && "text-xl leading-6",
            size === "l" && "text-2xl leading-7",
            size === "xl" && "text-[28px] leading-8",
          )}
        >
          {item.title}
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-[19px] text-[var(--text-secondary)]">{item.text}</p>
        {/* Knop altijd onderaan: zelfde hoogte in elke tegel. */}
        <div className="mt-auto pt-3.5">
          <Link
            href={item.href}
            className="inline-flex h-[34px] items-center rounded-pill bg-[var(--blue-500)] px-3.5 text-sm font-semibold text-white no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          >
            {item.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HomeDiscoverBanners({ items, onHide }: { items: DiscoverBanner[]; onHide: (id: string) => void }) {
  const laneRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);

  const handleScroll = React.useCallback(() => {
    const el = laneRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    children.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - el.offsetLeft - el.scrollLeft);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = children.length - 1;
    setActive(best);
  }, []);

  if (items.length === 0) return null;
  const desktopSize = items.length >= 3 ? "m" : items.length === 2 ? "l" : "xl";

  return (
    <section aria-label="Ontdek meer" className="min-w-0">
      {/* Mobiel */}
      <div className="md:hidden">
        <h2 className="mb-3 text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">Ontdek meer</h2>
        {items.length === 1 ? (
          <Banner item={items[0]} size="s" onHide={onHide} className="min-h-[190px]" />
        ) : (
          <>
            <div
              ref={laneRef}
              onScroll={handleScroll}
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item) => (
                <Banner key={item.id} item={item} size="s" onHide={onHide} className="min-h-[220px] w-[300px] shrink-0 snap-start" />
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
              {items.map((item, i) => (
                <span
                  key={item.id}
                  className={cn("h-1.5 rounded-full transition-[width,background-color] duration-base", i === active ? "w-[18px] bg-[var(--blue-500)]" : "w-1.5 bg-[var(--gray-200)]")}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tablet en desktop: samen de volle breedte, even hoog. */}
      <div className="hidden gap-4 md:flex">
        {items.map((item) => (
          <Banner
            key={item.id}
            item={item}
            size={desktopSize}
            onHide={onHide}
            className={cn("min-w-0 flex-1", desktopSize === "xl" ? "min-h-[220px]" : desktopSize === "l" ? "min-h-[210px]" : "min-h-[190px]")}
          />
        ))}
      </div>
    </section>
  );
}
