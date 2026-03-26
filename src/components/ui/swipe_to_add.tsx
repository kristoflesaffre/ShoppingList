"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const COMMIT_RATIO = 0.36;
const MAX_REVEAL_RATIO = 0.5;
const RUBBER = 0.22;
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

function PlusSwipeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15.079 11.9997C15.079 12.2867 14.847 12.5197 14.559 12.5197H12.519V14.5607C12.519 14.8477 12.286 15.0807 11.999 15.0807C11.712 15.0807 11.479 14.8487 11.479 14.5607V12.5197H9.43997C9.15297 12.5197 8.91997 12.2867 8.91997 11.9997C8.91997 11.7127 9.15297 11.4797 9.43997 11.4797H11.48V9.43973C11.48 9.15273 11.713 8.91973 12 8.91973C12.287 8.91973 12.52 9.15273 12.52 9.43973V11.4797H14.56C14.847 11.4797 15.079 11.7127 15.079 11.9997ZM21.529 11.9997C21.529 17.2547 17.255 21.5287 12 21.5287C6.74497 21.5287 2.46997 17.2547 2.46997 11.9997C2.46997 6.74473 6.74497 2.46973 12 2.46973C17.255 2.46973 21.529 6.74473 21.529 11.9997ZM20.49 11.9997C20.49 7.31873 16.681 3.50973 12 3.50973C7.31897 3.50973 3.50997 7.31873 3.50997 11.9997C3.50997 16.6817 7.31897 20.4897 12 20.4897C16.681 20.4897 20.49 16.6817 20.49 11.9997Z"
        fill="currentColor"
      />
    </svg>
  );
}

function clampOffset(offsetPx: number, maxReveal: number): number {
  if (offsetPx <= 0) return 0;
  if (offsetPx <= maxReveal) return offsetPx;
  const over = offsetPx - maxReveal;
  return maxReveal + over * RUBBER;
}

export interface SwipeToAddProps {
  children: React.ReactNode;
  onAdd?: () => void;
  disabled?: boolean;
  className?: string;
  addActionLabel?: string;
}

/** Zelfde swipe-pattern als SwipeToDelete, maar gespiegeld naar rechts voor toevoegen. */
export function SwipeToAdd({
  children,
  onAdd,
  disabled,
  className,
  addActionLabel = "Veeg naar rechts om toe te voegen",
}: SwipeToAddProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = React.useState(0);
  const [transition, setTransition] = React.useState<string | undefined>();

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
    if (disabled || !onAdd) {
      setOffset(0);
      setTransition(undefined);
      offsetLiveRef.current = 0;
    }
  }, [disabled, onAdd]);

  const runAdd = React.useCallback(() => {
    onAdd?.();
  }, [onAdd]);

  const finishCommitAnimation = React.useCallback(() => {
    const el = surfaceRef.current;
    const w = el?.getBoundingClientRect().width ?? widthRef.current;
    committingRef.current = true;
    setTransition(`transform ${SWIPE_OUT_MS}ms ${SWIPE_OUT_EASE}`);
    setOffset(Math.max(w, widthRef.current));
    window.setTimeout(() => {
      runAdd();
      committingRef.current = false;
      setOffset(0);
      setTransition(undefined);
      offsetLiveRef.current = 0;
    }, SWIPE_OUT_MS + 16);
  }, [runAdd]);

  const onPointerDownInner = React.useCallback(
    (e: React.PointerEvent) => {
      if (!onAdd || disabled || e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;

      const root = rootRef.current;
      if (!root) return;
      widthRef.current = root.getBoundingClientRect().width;
      maxRevealRef.current = Math.min(120, widthRef.current * MAX_REVEAL_RATIO);

      draggingRef.current = true;
      pointerIdRef.current = e.pointerId;
      startClientXRef.current = e.clientX;
      startClientYRef.current = e.clientY;
      startOffsetRef.current = offsetLiveRef.current;
      axisLockedRef.current = null;
      suppressClickRef.current = false;
      setTransition(undefined);
    },
    [disabled, onAdd],
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

    const next = clampOffset(startOffsetRef.current + dx, maxRevealRef.current);
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

      if (current > threshold) {
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

  if (!onAdd || disabled) return <>{children}</>;

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full min-w-0 overflow-hidden rounded-md", className)}
      role="group"
      aria-label={addActionLabel}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-md border border-[var(--blue-500)] bg-[var(--blue-500)]"
        aria-hidden="true"
      >
        <div className="absolute left-[24px] top-1/2 -translate-y-1/2 text-[var(--white)]">
          <PlusSwipeIcon />
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
