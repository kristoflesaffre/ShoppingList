"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { ListItem } from "./new_item_modal";
import { cn } from "@/lib/utils";
import { DELHAIZE_LOGO_SRC, LIDL_LOGO_SRC, type ItemStore } from "@/lib/item-store";

/**
 * Canvas «Concept D · Winkelknop in de rij»: winkelkeuze per item op een Lidl / Delhaize-lijstje.
 * Klein logo op de foto; lang drukken (of rechtsklikken) opent het winkelmenu.
 */
type StoreMarkApi = { openMenu: (item: ListItem, anchor: DOMRect) => void };

const StoreMarkContext = React.createContext<StoreMarkApi | null>(null);

export const StoreMarkProvider = StoreMarkContext.Provider;

export function useStoreMark(): StoreMarkApi | null {
  return React.useContext(StoreMarkContext);
}

function Logo({ src, size, className }: { src: string; size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- winkellogo uit /public/logos
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full bg-[var(--white)] object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Eén of twee overlappende winkellogo's. */
export function StoreLogos({ store, size = 14, ring = true }: { store: ItemStore; size?: number; ring?: boolean }) {
  const ringCls = ring ? "shadow-[0_0_0_1.5px_var(--white)]" : undefined;
  if (store === "lidl") return <Logo src={LIDL_LOGO_SRC} size={size} className={ringCls} />;
  if (store === "delhaize") return <Logo src={DELHAIZE_LOGO_SRC} size={size} className={ringCls} />;
  return (
    <span className="flex shrink-0">
      <Logo src={LIDL_LOGO_SRC} size={size} className={ringCls} />
      <Logo src={DELHAIZE_LOGO_SRC} size={size} className={cn(ringCls, "-ml-[5px]")} />
    </span>
  );
}

/** Logo rechtsonder op de productfoto (alleen als er een winkel gekozen is). */
export function StoreBadge({ store, size = 14 }: { store?: ItemStore; size?: number }) {
  if (!store) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute -bottom-[3px] -right-[3px]">
      <StoreLogos store={store} size={size} />
    </span>
  );
}

const LONG_PRESS_MS = 450;

/**
 * Lang drukken op een item opent het winkelmenu; de klik die daarop volgt (vinkje) wordt
 * opgeslokt. Rechtsklikken op desktop doet hetzelfde.
 */
export function useStoreLongPress(item: ListItem) {
  const api = useStoreMark();
  const timer = React.useRef<number | null>(null);
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const fired = React.useRef(false);

  const clear = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };
  React.useEffect(() => clear, []);

  if (!api) return {};

  const open = (el: HTMLElement) => {
    fired.current = true;
    navigator.vibrate?.(10);
    api.openMenu(item, el.getBoundingClientRect());
  };

  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      const el = e.currentTarget;
      timer.current = window.setTimeout(() => open(el), LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!start.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      clear();
      if (!fired.current) open(e.currentTarget);
    },
    onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    className: "select-none [-webkit-touch-callout:none]",
  };
}

const STORE_OPTIONS: { value: ItemStore; label: string }[] = [
  { value: "lidl", label: "Lidl" },
  { value: "delhaize", label: "Delhaize" },
  { value: "both", label: "Allebei" },
];

const MENU_WIDTH = 268;

/** Menu na lang drukken: winkel kiezen, en daaronder bewerken of verwijderen. */
export function StoreMarkMenu({
  item,
  anchor,
  onPick,
  onEdit,
  onDelete,
  onClose,
}: {
  item: ListItem;
  anchor: DOMRect;
  onPick: (store: ItemStore) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null);

  React.useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 240;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(12, anchor.left), vw - MENU_WIDTH - 12);
    const below = anchor.bottom + 8;
    const top = below + h <= vh - 12 ? below : Math.max(12, anchor.top - h - 8);
    setPos({ left, top });
  }, [anchor]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    ref.current?.querySelector<HTMLButtonElement>("button[aria-checked=true], button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  const rowCls =
    "flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]";

  return createPortal(
    <div className="fixed inset-0 z-[80]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(16,17,48,0.18)]" />
      <div
        ref={ref}
        role="dialog"
        aria-label={`Waar koop je ${item.name}?`}
        className="absolute rounded-[18px] bg-[var(--white)] p-2 shadow-[0_20px_44px_-12px_rgba(16,17,48,0.45),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up"
        style={{ width: MENU_WIDTH, left: pos?.left ?? -9999, top: pos?.top ?? 0 }}
      >
        <p className="truncate px-2.5 pb-2 pt-1.5 text-xs font-bold uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
          Waar koop je {item.name}?
        </p>
        <div role="radiogroup" aria-label="Winkel" className="flex gap-1.5 px-1 pb-2">
          {STORE_OPTIONS.map((o) => {
            const on = item.store === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick(o.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-[14px] px-1 py-2.5 text-[13px] font-bold text-text-primary transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  on ? "bg-[var(--blue-25)] shadow-[inset_0_0_0_2px_var(--blue-500)]" : "bg-[var(--gray-25)]",
                )}
              >
                <StoreLogos store={o.value} size={26} ring={o.value === "both"} />
                {o.label}
              </button>
            );
          })}
        </div>
        {onEdit || onDelete ? <div className="mx-2 mb-1 h-px bg-[var(--border-subtle)]" /> : null}
        {onEdit ? (
          <button type="button" onClick={onEdit} className={cn(rowCls, "text-text-primary")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
            </svg>
            Bewerken
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" onClick={onDelete} className={cn(rowCls, "text-[var(--error-600)]")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
              <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
            Verwijderen
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Onder de lijst bij een winkelfilter: hoeveel items alleen in de andere winkel zitten. */
export function StoreHiddenNote({
  count,
  otherStore,
  onShowAll,
}: {
  count: number;
  otherStore: "lidl" | "delhaize";
  onShowAll: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-[16px] bg-[var(--white)] px-3.5 py-3 text-[13px] leading-[18px] text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border-subtle)]">
      <StoreLogos store={otherStore} size={18} ring={false} />
      <span className="min-w-0 flex-1">
        {count} {count === 1 ? "item" : "items"} alleen bij {otherStore === "lidl" ? "Lidl" : "Delhaize"} verborgen
      </span>
      <button
        type="button"
        onClick={onShowAll}
        className="shrink-0 rounded-sm text-[13px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        Toon alles
      </button>
    </div>
  );
}
