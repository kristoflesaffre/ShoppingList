"use client";

import * as React from "react";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import type { PillTabVariant } from "@/components/ui/pill_tab";
import { useLogoTint } from "@/components/loyalty_wallet";
import type { LoyaltyCardCodeType } from "@/lib/loyalty_card";
import { cn } from "@/lib/utils";

/** Eén of twee kaarten in het loyalty-paneel (combi Lidl/Delhaize: pill-tabs + één QR tegelijk). */
export type LoyaltySwipePane = {
  heading: string;
  codeType: LoyaltyCardCodeType;
  codeFormat: string;
  rawValue: string;
  footerLogoSrc: string;
  /** Kort label in pill-tab links/rechts (verplicht voor beide panelen bij combi). */
  pillTabLabel?: string;
  /** Winkelnaam op de kaart (bv. «Lidl»). */
  name?: string;
  /** Merkkleur van de kaart (hex); anders de dominante logokleur. */
  brandColor?: string;
};

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Kaartkleur: verzadigd genoeg voor witte tekst (lichte logokleuren worden donkerder). */
function cardTone(rgb: Rgb): { deep: string; light: string; soft: string } {
  const [r, g, b] = rgb;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const k = lum > 0.55 ? 0.55 / lum : 1;
  const d: Rgb = [Math.round(r * k), Math.round(g * k), Math.round(b * k)];
  const mix = (a: number) => d.map((v) => Math.round(v + (255 - v) * a)).join(", ");
  return { deep: `rgb(${d.join(", ")})`, light: `rgb(${mix(0.22)})`, soft: `rgb(${d.join(", ")})` };
}

const FALLBACK_CARD_RGB: Rgb = [79, 85, 241];

/** Voor de hand liggende kaartnummers tonen; lange QR-inhoud (links, tokens) niet. */
function readableNumber(raw: string): string | null {
  const v = raw.trim();
  if (!v || v.length > 24 || !/^[0-9A-Za-z -]+$/.test(v)) return null;
  return /^\d+$/.test(v) ? v.replace(/(\d{4})(?=\d)/g, "$1 ") : v;
}

/** Ontwerp G: grote kaart in merkkleur met witte codevlakken (barcode of QR). */
function LoyaltyBrandCard({ pane }: { pane: LoyaltySwipePane }) {
  const measured = useLogoTint(pane.brandColor ? "" : pane.footerLogoSrc);
  const tone = cardTone((pane.brandColor && hexToRgb(pane.brandColor)) || measured || FALLBACK_CARD_RGB);
  const isQr = pane.codeType === "qr";
  const number = readableNumber(pane.rawValue);
  const name = pane.name || pane.pillTabLabel || pane.heading;
  return (
    <div
      className="relative isolate flex w-full flex-col overflow-hidden rounded-[30px] p-5 text-white"
      style={{
        background: `linear-gradient(145deg, ${tone.deep} 0%, ${tone.light} 100%)`,
        boxShadow: `0 30px 50px -26px ${tone.deep}`,
      }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-[70px] -top-[60px] -z-10 size-[220px] rounded-full bg-[rgba(255,255,255,0.10)]" />
      <span aria-hidden className="pointer-events-none absolute right-[30px] top-[40px] -z-10 size-[120px] rounded-full bg-[rgba(255,255,255,0.07)]" />
      <div className="flex items-center gap-3">
        {pane.footerLogoSrc ? (
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-[#fff]">
            {/* eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos */}
            <img src={pane.footerLogoSrc} alt="" width={44} height={44} className="pointer-events-none size-11 object-contain" />
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="block truncate text-2xl font-extrabold leading-7">{name}</span>
          <span className="text-[13px] opacity-85">Klantenkaart</span>
        </span>
      </div>
      <div className="mt-[22px] flex flex-col items-center rounded-[22px] bg-[#fff] px-5 pb-3.5 pt-5 text-[#16181a] [&_svg]:pointer-events-none">
        {isQr ? (
          <div className="aspect-square w-full max-w-[240px] [&_svg]:!size-full">
            <LoyaltyCardDisplay codeType="qr" codeFormat={pane.codeFormat} rawValue={pane.rawValue} />
          </div>
        ) : (
          <div className="h-[150px] w-full [&_svg]:!h-full [&_svg]:!w-full">
            <LoyaltyCardDisplay codeType="barcode" codeFormat={pane.codeFormat} rawValue={pane.rawValue} stretch />
          </div>
        )}
        {number ? (
          <span className={cn("mt-2.5 font-mono tracking-[0.06em]", isQr ? "text-[13.5px] text-[#595f6a]" : "text-[15px]")}>{number}</span>
        ) : null}
      </div>
    </div>
  );
}

/** Zachte achtergrond in de kaartkleur. */
function useCardBackdrop(pane: LoyaltySwipePane | undefined): string {
  const measured = useLogoTint(pane && !pane.brandColor ? pane.footerLogoSrc : "");
  const rgb = (pane?.brandColor && hexToRgb(pane.brandColor)) || measured || FALLBACK_CARD_RGB;
  return `linear-gradient(180deg, var(--bg-app) 0%, color-mix(in srgb, rgb(${rgb.join(", ")}) 12%, var(--bg-app)) 100%)`;
}

/** Zelfde offset als `mt` op main / hoogte app-header op lijstdetail. */
const LIST_APP_HEADER_OFFSET = "calc(56px + env(safe-area-inset-top, 0px))";

function isInteractiveSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    'button, a, input, textarea, select, [role="checkbox"], [data-swipe-ignore], [data-item-hand]',
  );
}

/** Item-rij swipe-to-delete: niet in capture-fase overnemen (LoyaltyCardSwipeShell). */
function isSwipeToDeleteSurface(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest("[data-swipe-to-delete-surface]");
}

export type LoyaltyCardSwipeShellProps = {
  appHeader: React.ReactNode;
  bottomChrome: React.ReactNode;
  children: React.ReactNode;
  /** Minstens één paneel met geldige rawValue (lijst-detail bepaalt welke). */
  loyaltyPanes: LoyaltySwipePane[];
  onPanelChange?: (panel: "list" | "loyalty") => void;
  /** Combi: lijstje gefilterd op één winkel → die kaart eerst (0 = eerste, 1 = tweede). */
  preferredPaneIndex?: 0 | 1 | null;
};

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  originExtra: number;
  axis: "h" | "v" | null;
  width: number;
  lastExtra: number;
  fromDeleteSurface: boolean;
  /** Loyalty: meteen capture voor betrouwbare touch op SVG/QR (iOS). */
  earlyCapture: boolean;
};

/**
 * Vaste app-header blijft altijd zichtbaar; alleen het vlak eronder schuift.
 * Geen tweede header op het loyalty-scherm. Capture-fase + vroege capture op loyalty voor swipe terug.
 */
export function LoyaltyCardSwipeShell({
  appHeader,
  bottomChrome,
  children,
  loyaltyPanes,
  onPanelChange,
  preferredPaneIndex = null,
}: LoyaltyCardSwipeShellProps) {
  const swipeAreaRef = React.useRef<HTMLDivElement>(null);
  const sessionRef = React.useRef<DragSession | null>(null);
  const panelRef = React.useRef<"list" | "loyalty">("list");

  const [panel, setPanel] = React.useState<"list" | "loyalty">("list");
  const [dragExtraPx, setDragExtraPx] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [vpW, setVpW] = React.useState(0);
  /** Combi: welke kaart (links/rechts pill). */
  const [comboPillValue, setComboPillValue] =
    React.useState<PillTabVariant>("first");
  /** Na elk volledig verlaten van het loyalty-paneel: bij volgende open wisselt default-pill. */
  const loyaltyReopenCycleRef = React.useRef(0);
  const prevPanelForCycleRef = React.useRef<"list" | "loyalty">("list");

  const useComboPillTabs =
    loyaltyPanes.length === 2 &&
    loyaltyPanes[0]?.pillTabLabel != null &&
    loyaltyPanes[0].pillTabLabel.length > 0 &&
    loyaltyPanes[1]?.pillTabLabel != null &&
    loyaltyPanes[1].pillTabLabel.length > 0;

  React.useEffect(() => {
    const prev = prevPanelForCycleRef.current;
    if (prev === "loyalty" && panel === "list") {
      loyaltyReopenCycleRef.current += 1;
    }
    if (panel === "loyalty" && prev !== "loyalty" && useComboPillTabs) {
      setComboPillValue(
        preferredPaneIndex != null
          ? preferredPaneIndex === 0
            ? "first"
            : "second"
          : loyaltyReopenCycleRef.current % 2 === 0
            ? "first"
            : "second",
      );
    }
    prevPanelForCycleRef.current = panel;
  }, [panel, useComboPillTabs, preferredPaneIndex]);

  React.useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  React.useEffect(() => {
    onPanelChange?.(panel);
  }, [onPanelChange, panel]);

  const loyaltyVisible = panel === "loyalty" && dragExtraPx === 0;

  React.useLayoutEffect(() => {
    const el = swipeAreaRef.current;
    if (!el) return;
    const measure = () => {
      let w = el.getBoundingClientRect().width;
      if (w <= 0 && typeof window !== "undefined") {
        w = window.innerWidth;
      }
      setVpW(w > 0 ? Math.round(w) : 0);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const translatePx =
    vpW > 0
      ? panel === "list"
        ? -vpW + dragExtraPx
        : dragExtraPx
      : panel === "list"
        ? typeof window !== "undefined"
          ? -window.innerWidth
          : 0
        : dragExtraPx;

  const onPointerDownCapture = React.useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (isInteractiveSwipeTarget(e.target)) return;
    const area = swipeAreaRef.current;
    if (!area) return;
    let w = area.getBoundingClientRect().width;
    if (w <= 0 && typeof window !== "undefined") w = window.innerWidth;
    if (w <= 0) return;

    const origin = dragExtraPx;
    const onLoyalty = panelRef.current === "loyalty";
    const fromDeleteSurface = isSwipeToDeleteSurface(e.target);
    const earlyCapture = onLoyalty;
    if (earlyCapture) {
      try {
        area.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    sessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originExtra: origin,
      axis: null,
      width: w,
      lastExtra: origin,
      fromDeleteSurface,
      earlyCapture,
    };
    setIsDragging(true);

    const onUp = (ev: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        area.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }

      const extra = s.lastExtra;
      const sw = s.width;
      const p = panelRef.current;
      sessionRef.current = null;
      setIsDragging(false);

      if (p === "list") {
        if (extra > sw * 0.18) setPanel("loyalty");
      } else {
        if (extra < -sw * 0.18) setPanel("list");
      }
      setDragExtraPx(0);
    };

    const onMove = (ev: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;

      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;

      if (s.axis === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.12) {
          try {
            area.releasePointerCapture(ev.pointerId);
          } catch {
            /* ignore */
          }
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          sessionRef.current = null;
          setIsDragging(false);
          return;
        }
        if (s.fromDeleteSurface && dx < 0) {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          sessionRef.current = null;
          setIsDragging(false);
          return;
        }
        s.axis = "h";
        if (!s.earlyCapture) {
          try {
            area.setPointerCapture(ev.pointerId);
          } catch {
            /* ignore */
          }
        }
      }

      if (s.axis !== "h") return;

      const sw = s.width;
      let raw = s.originExtra + dx;
      const p = panelRef.current;
      if (p === "list") {
        raw = Math.min(Math.max(raw, 0), sw);
      } else {
        raw = Math.max(Math.min(raw, 0), -sw);
      }
      s.lastExtra = raw;
      setDragExtraPx(raw);

      if (ev.cancelable && Math.abs(dx) > 10) ev.preventDefault();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [dragExtraPx]);

  /*
   * Tabwissel: het witte vlak schuift mee, de oude kaart vliegt weg en de nieuwe schuift binnen
   * (richting volgt de tab). Enkel bij tikken; openen op een tab via de filter blijft rustig.
   */
  const activeIndex = comboPillValue === "first" ? 0 : 1;
  const [leaving, setLeaving] = React.useState<{ index: number; dir: 1 | -1; key: number } | null>(null);
  const enterDirRef = React.useRef<0 | 1 | -1>(0);
  const enterRef = React.useRef<HTMLDivElement>(null);
  const leaveRef = React.useRef<HTMLDivElement>(null);

  const selectTab = (i: number) => {
    if (i === activeIndex) return;
    const dir: 1 | -1 = i > activeIndex ? 1 : -1;
    if (!reduceMotion) {
      setLeaving({ index: activeIndex, dir, key: Date.now() });
      enterDirRef.current = dir;
    }
    setComboPillValue(i === 0 ? "first" : "second");
  };

  React.useLayoutEffect(() => {
    const dir = enterDirRef.current;
    enterDirRef.current = 0;
    if (!dir || !enterRef.current) return;
    enterRef.current.animate(
      [
        { transform: `translateX(${dir * 115}%) rotate(${dir * 4}deg)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)", delay: 40, fill: "backwards" },
    );
  }, [activeIndex]);

  React.useLayoutEffect(() => {
    const el = leaveRef.current;
    if (!leaving || !el) return;
    const anim = el.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: `translateX(${-leaving.dir * 115}%) rotate(${-leaving.dir * 4}deg)`, opacity: 0 },
      ],
      { duration: 340, easing: "cubic-bezier(0.55, 0, 0.75, 0.3)", fill: "forwards" },
    );
    anim.onfinish = () => setLeaving((cur) => (cur?.key === leaving.key ? null : cur));
    return () => anim.cancel();
  }, [leaving]);

  const backdrop = useCardBackdrop(
    useComboPillTabs ? loyaltyPanes[comboPillValue === "first" ? 0 : 1] : loyaltyPanes[0],
  );

  const colStyle =
    vpW > 0
      ? ({ width: vpW, minWidth: vpW, maxWidth: vpW } as React.CSSProperties)
      : { width: "50%", minWidth: "50%" } as React.CSSProperties;

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-transparent">
      {appHeader}
      <div
        ref={swipeAreaRef}
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ top: LIST_APP_HEADER_OFFSET }}
        onPointerDownCapture={onPointerDownCapture}
        aria-label="Lijstje en klantenkaart"
      >
        <div
          className={cn(
            "flex h-full",
            !isDragging && !reduceMotion && "transition-transform duration-300 ease-out",
          )}
          style={{
            width: vpW > 0 ? vpW * 2 : "200%",
            transform: `translate3d(${translatePx}px,0,0)`,
            WebkitTransform: `translate3d(${translatePx}px,0,0)`,
          }}
        >
          <section
            className="flex h-full shrink-0 flex-col"
            style={{ ...colStyle, background: backdrop }}
            aria-label="Klantenkaart"
            aria-hidden={!loyaltyVisible}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pb-[calc(30px+env(safe-area-inset-bottom,0px))] [touch-action:pan-y]">
              {useComboPillTabs ? (
                <div
                  role="tablist"
                  aria-label="Kies je klantenkaart"
                  data-swipe-ignore=""
                  className="relative mx-auto mt-12 flex w-full max-w-[400px] shrink-0 gap-1 rounded-pill bg-[var(--gray-50)] p-1"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-6px)] rounded-pill bg-[var(--white)] shadow-[0_2px_8px_-2px_rgba(16,17,48,0.18)]",
                      !reduceMotion && "transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    )}
                    style={{ transform: activeIndex === 1 ? "translateX(calc(100% + 4px))" : "none" }}
                  />
                  {loyaltyPanes.slice(0, 2).map((pane, i) => {
                    const value: PillTabVariant = i === 0 ? "first" : "second";
                    const on = comboPillValue === value;
                    return (
                      <button
                        key={pane.pillTabLabel}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => selectTab(i)}
                        className={cn(
                          "relative flex h-11 flex-1 items-center justify-center gap-2 rounded-pill text-[15px] transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                          on ? "font-extrabold text-text-primary" : "font-semibold text-[var(--text-secondary)]",
                        )}
                      >
                        {pane.footerLogoSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
                          <img src={pane.footerLogoSrc} alt="" width={24} height={24} className="size-6 rounded-full bg-[#fff] object-contain" />
                        ) : null}
                        {pane.pillTabLabel}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-x-clip py-7">
                {useComboPillTabs ? (
                  <div className="grid w-full max-w-[400px] items-center">
                    {leaving && loyaltyPanes[leaving.index] ? (
                      <div key={`leave-${leaving.key}`} ref={leaveRef} aria-hidden className="pointer-events-none [grid-area:1/1]">
                        <LoyaltyBrandCard pane={loyaltyPanes[leaving.index]!} />
                      </div>
                    ) : null}
                    <div key={`card-${activeIndex}`} ref={enterRef} className="[grid-area:1/1]">
                      <LoyaltyBrandCard pane={loyaltyPanes[activeIndex]!} />
                    </div>
                  </div>
                ) : (
                  loyaltyPanes.map((pane, idx) => (
                    <div key={`${pane.heading}-${idx}`} className="w-full max-w-[400px]">
                      <LoyaltyBrandCard pane={pane} />
                    </div>
                  ))
                )}
              </div>
              <p className="flex shrink-0 items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--text-secondary)]">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Veeg terug naar je lijstje
              </p>
            </div>
          </section>

          <div
            className="flex h-full min-h-0 shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-transparent [touch-action:pan-y]"
            style={colStyle}
            aria-hidden={loyaltyVisible}
          >
            {children}
          </div>
        </div>
      </div>
      {bottomChrome}
    </div>
  );
}
