"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Fractie van de rij-breedte: ver genoeg loslaten = verwijderen (Gmail-achtig). */
const COMMIT_RATIO = 0.36;
/** Max zichtbare rode zone. */
const MAX_REVEAL_RATIO = 0.5;
/** Weerstand na max reveal (rubber band). */
const RUBBER = 0.22;
/** Pas preventDefault vanaf hier: lagere waarde breekt browser-klik na lichte jitter. */
const PREVENT_DEFAULT_DX = 18;
const SPRING_MS = 320;
const SPRING_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SWIPE_OUT_MS = 260;
const SWIPE_OUT_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return true;
  return !!target.closest(
    'button, a, input, textarea, select, [role="checkbox"], [data-swipe-ignore], [data-item-hand]',
  );
}

/** public/icons/recycle_bin.svg (fill black in asset) → wit op error-600 via filter. */
function RecycleBinSwipeIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statisch SVG-icoon uit /public
    <img
      src="/icons/recycle_bin.svg"
      alt=""
      width={24}
      height={24}
      draggable={false}
      className={cn(
        "h-[24px] w-[24px] shrink-0 brightness-0 invert",
        className,
      )}
      aria-hidden="true"
    />
  );
}

function clampOffset(offsetPx: number, maxReveal: number): number {
  if (offsetPx >= 0) return 0;
  if (offsetPx >= -maxReveal) return offsetPx;
  const over = offsetPx + maxReveal;
  return -maxReveal + over * RUBBER;
}

export interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete?: () => void;
  disabled?: boolean;
  className?: string;
  deleteActionLabel?: string;
}

/**
 * Gmail-achtig: veeg naar links → rode zone met prullenbak; los ver genoeg = verwijderen.
 */
export function SwipeToDelete({
  children,
  onDelete,
  disabled,
  className,
  deleteActionLabel = "Veeg naar links om te verwijderen",
}: SwipeToDeleteProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = React.useState(0);
  const [transition, setTransition] = React.useState<string | undefined>(
    undefined,
  );

  const offsetLiveRef = React.useRef(0);
  React.useEffect(() => {
    offsetLiveRef.current = offset;
  }, [offset]);

  const draggingRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);
  const startClientXRef = React.useRef(0);
  const startClientYRef = React.useRef(0);
  const startOffsetRef = React.useRef(0);
  const axisLockedRef = React.useRef<"h" | "v" | null>(null);
  const maxRevealRef = React.useRef(96);
  const widthRef = React.useRef(0);
  const suppressClickRef = React.useRef(false);
  const committingRef = React.useRef(false);

  React.useEffect(() => {
    if (disabled || !onDelete) {
      setOffset(0);
      setTransition(undefined);
      offsetLiveRef.current = 0;
    }
  }, [disabled, onDelete]);

  const runDelete = React.useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  const finishCommitAnimation = React.useCallback(() => {
    const el = surfaceRef.current;
    const w = el?.getBoundingClientRect().width ?? widthRef.current;
    committingRef.current = true;
    setTransition(`transform ${SWIPE_OUT_MS}ms ${SWIPE_OUT_EASE}`);
    setOffset(-Math.max(w, widthRef.current));
    window.setTimeout(() => {
      runDelete();
      committingRef.current = false;
      setOffset(0);
      setTransition(undefined);
      offsetLiveRef.current = 0;
    }, SWIPE_OUT_MS + 16);
  }, [runDelete]);

  const onPointerDownInner = React.useCallback(
    (e: React.PointerEvent) => {
      if (!onDelete || disabled || e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;

      const root = rootRef.current;
      if (!root) return;
      widthRef.current = root.getBoundingClientRect().width;
      maxRevealRef.current = Math.min(
        120,
        widthRef.current * MAX_REVEAL_RATIO,
      );

      draggingRef.current = true;
      pointerIdRef.current = e.pointerId;
      startClientXRef.current = e.clientX;
      startClientYRef.current = e.clientY;
      startOffsetRef.current = offsetLiveRef.current;
      axisLockedRef.current = null;
      suppressClickRef.current = false;
      setTransition(undefined);
      /* Geen capture op down: voorkomt dat een gewone tap geen click meer krijgt. */
    },
    [disabled, onDelete],
  );

  const onPointerMoveInner = React.useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - startClientXRef.current;
    const dy = e.clientY - startClientYRef.current;

    if (axisLockedRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.1) {
        axisLockedRef.current = "v";
        draggingRef.current = false;
        pointerIdRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      axisLockedRef.current = "h";
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (axisLockedRef.current !== "h") return;

    if (Math.abs(dx) > 14) suppressClickRef.current = true;

    const next = clampOffset(
      startOffsetRef.current + dx,
      maxRevealRef.current,
    );

    if (e.cancelable && Math.abs(dx) > PREVENT_DEFAULT_DX) e.preventDefault();
    offsetLiveRef.current = next;
    setOffset(next);
  }, []);

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      draggingRef.current = false;
      pointerIdRef.current = null;
      axisLockedRef.current = null;

      const w = widthRef.current || 1;
      const threshold = w * COMMIT_RATIO;
      const current = offsetLiveRef.current;

      if (committingRef.current) return;

      if (current < -threshold) {
        finishCommitAnimation();
        return;
      }

      setTransition(`transform ${SPRING_MS}ms ${SPRING_EASE}`);
      offsetLiveRef.current = 0;
      setOffset(0);
      window.setTimeout(() => setTransition(undefined), SPRING_MS + 40);
    },
    [finishCommitAnimation],
  );

  const onPointerCancel = React.useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    draggingRef.current = false;
    pointerIdRef.current = null;
    axisLockedRef.current = null;
    setTransition(`transform ${SPRING_MS}ms ${SPRING_EASE}`);
    offsetLiveRef.current = 0;
    setOffset(0);
    window.setTimeout(() => setTransition(undefined), SPRING_MS + 40);
  }, []);

  const onClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  }, []);

  if (!onDelete || disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full min-w-0 overflow-hidden rounded-md",
        className,
      )}
      role="group"
      aria-label={deleteActionLabel}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-md border border-[var(--error-600)] bg-[var(--error-600)]"
        aria-hidden="true"
      >
        <div className="absolute right-[24px] top-1/2 -translate-y-1/2">
          <RecycleBinSwipeIcon />
        </div>
      </div>

      <div
        ref={surfaceRef}
        className="relative z-[1] touch-pan-y rounded-md"
        style={{
          transform: `translate3d(${offset}px,0,0)`,
          transition,
          willChange: transition ? "transform" : undefined,
        }}
        onPointerDown={onPointerDownInner}
        onPointerMove={onPointerMoveInner}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
