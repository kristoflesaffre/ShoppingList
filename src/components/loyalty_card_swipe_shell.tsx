"use client";

import * as React from "react";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import type { LoyaltyCardCodeType } from "@/lib/loyalty_card";
import { masterStoreLabelFromListIcon } from "@/lib/master-stores";
import { cn } from "@/lib/utils";

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
  listIcon: string;
  codeType: LoyaltyCardCodeType;
  codeFormat: string;
  rawValue: string;
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
  listIcon,
  codeType,
  codeFormat,
  rawValue,
  onPanelChange,
}: LoyaltyCardSwipeShellProps) {
  const swipeAreaRef = React.useRef<HTMLDivElement>(null);
  const sessionRef = React.useRef<DragSession | null>(null);
  const panelRef = React.useRef<"list" | "loyalty">("list");

  const [panel, setPanel] = React.useState<"list" | "loyalty">("list");
  const [dragExtraPx, setDragExtraPx] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [vpW, setVpW] = React.useState(0);

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

  const storeLabel = masterStoreLabelFromListIcon(listIcon);
  const loyaltyHeading =
    storeLabel.length > 0 ? `Klantenkaart ${storeLabel}` : "Klantenkaart";

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
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-[var(--space-4)] pb-[calc(var(--space-6)+env(safe-area-inset-bottom,0px))] pt-[var(--space-4)] [touch-action:pan-y]">
              <h2 className="text-center text-[length:var(--text-page-title)] font-bold leading-[var(--leading-32)] tracking-[var(--tracking-normal)] text-[var(--text-primary)]">
                {loyaltyHeading}
              </h2>
              <div className="mt-[var(--space-8)] box-border flex aspect-square w-[min(256px,70vw)] max-w-full shrink-0 flex-col bg-[var(--white)] p-[var(--space-1)]">
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden [&_svg]:pointer-events-none">
                  <LoyaltyCardDisplay
                    codeType={codeType}
                    codeFormat={codeFormat}
                    rawValue={rawValue}
                    displaySize="fullscreen"
                    fullscreenQrSize={248}
                  />
                </div>
              </div>
              {listIcon ? (
                <div className="mt-auto flex flex-1 flex-col justify-end pt-[var(--space-8)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos */}
                  <img
                    src={listIcon}
                    alt=""
                    width={98}
                    height={98}
                    className="pointer-events-none size-[98px] shrink-0 object-contain"
                  />
                </div>
              ) : null}
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
