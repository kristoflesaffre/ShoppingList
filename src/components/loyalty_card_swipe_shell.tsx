"use client";

import * as React from "react";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import { PillTab, type PillTabVariant } from "@/components/ui/pill_tab";
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
};

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
    if (panel === "loyalty" && useComboPillTabs) {
      setComboPillValue(
        loyaltyReopenCycleRef.current % 2 === 0 ? "first" : "second",
      );
    }
    prevPanelForCycleRef.current = panel;
  }, [panel, useComboPillTabs]);

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
            className="flex h-full shrink-0 flex-col bg-[var(--white)]"
            style={colStyle}
            aria-label="Klantenkaart"
            aria-hidden={!loyaltyVisible}
          >
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-[var(--space-4)] pb-[calc(var(--space-12)+env(safe-area-inset-bottom,0px))] [touch-action:pan-y]",
                useComboPillTabs
                  ? "justify-start pt-[var(--space-12)]"
                  : "justify-center pt-[var(--space-4)]",
              )}
            >
              <div
                className={cn(
                  "flex w-full flex-col items-center",
                  !useComboPillTabs && loyaltyPanes.length > 1
                    ? "gap-[var(--space-12)]"
                    : useComboPillTabs
                      ? "min-h-0 flex-1"
                      : "",
                )}
              >
                {useComboPillTabs ? (
                  <>
                    {/**
                     * Figma 903:6212 / 903:6569 — pill blijft top-aligned; alleen blok eronder
                     * mag in hoogte wisselen (anders verspringt de pill door justify-center op de hele kolom).
                     */}
                    <PillTab
                      value={comboPillValue}
                      onValueChange={setComboPillValue}
                      labelFirst={loyaltyPanes[0]!.pillTabLabel!}
                      labelSecond={loyaltyPanes[1]!.pillTabLabel!}
                      className="mb-[var(--space-8)] w-full max-w-[400px] shrink-0"
                      data-swipe-ignore=""
                    />
                    <div className="flex min-h-0 w-full max-w-[400px] flex-1 flex-col items-center justify-center">
                      {(() => {
                        const pane =
                          loyaltyPanes[comboPillValue === "first" ? 0 : 1]!;
                        const isQr = pane.codeType === "qr";
                        return (
                          <div className="flex w-full flex-col items-center">
                            <h2 className="flex min-h-[calc(2*var(--leading-32))] items-center justify-center px-[var(--space-2)] text-center text-[length:var(--text-page-title)] font-bold leading-[var(--leading-32)] tracking-[var(--tracking-normal)] text-[var(--text-primary)]">
                              {pane.heading}
                            </h2>
                            <div
                              className={cn(
                                "mt-[var(--space-8)] box-border flex w-full max-w-[256px] shrink-0 flex-col bg-[var(--white)] p-[var(--space-1)]",
                                isQr && "aspect-square max-h-[256px]",
                              )}
                            >
                              <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden [&_svg]:pointer-events-none">
                                <LoyaltyCardDisplay
                                  codeType={pane.codeType}
                                  codeFormat={pane.codeFormat}
                                  rawValue={pane.rawValue}
                                  displaySize="fullscreen"
                                  fullscreenQrSize={isQr ? 248 : undefined}
                                />
                              </div>
                            </div>
                            {pane.footerLogoSrc ? (
                              <div className="mt-[var(--space-12)] flex h-[98px] shrink-0 flex-col items-center justify-end">
                                {/* eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos */}
                                <img
                                  src={pane.footerLogoSrc}
                                  alt=""
                                  width={98}
                                  height={98}
                                  className="pointer-events-none size-[98px] shrink-0 object-contain"
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  loyaltyPanes.map((pane, idx) => {
                    const isQr = pane.codeType === "qr";
                    return (
                      <div
                        key={`${pane.heading}-${idx}`}
                        className="flex w-full max-w-[400px] flex-col items-center"
                      >
                        <h2 className="px-[var(--space-2)] text-center text-[length:var(--text-page-title)] font-bold leading-[var(--leading-32)] tracking-[var(--tracking-normal)] text-[var(--text-primary)]">
                          {pane.heading}
                        </h2>
                        <div
                          className={cn(
                            "mt-[var(--space-8)] box-border flex w-full max-w-[256px] shrink-0 flex-col bg-[var(--white)] p-[var(--space-1)]",
                            isQr && "aspect-square max-h-[256px]",
                          )}
                        >
                          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden [&_svg]:pointer-events-none">
                            <LoyaltyCardDisplay
                              codeType={pane.codeType}
                              codeFormat={pane.codeFormat}
                              rawValue={pane.rawValue}
                              displaySize="fullscreen"
                              fullscreenQrSize={isQr ? 248 : undefined}
                            />
                          </div>
                        </div>
                        {pane.footerLogoSrc ? (
                          <div className="mt-[var(--space-12)] flex shrink-0 flex-col items-center">
                            {/* eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos */}
                            <img
                              src={pane.footerLogoSrc}
                              alt=""
                              width={98}
                              height={98}
                              className="pointer-events-none size-[98px] shrink-0 object-contain"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
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
