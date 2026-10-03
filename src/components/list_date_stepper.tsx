"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import { toIsoDate } from "@/lib/calendar-utils";

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;
const WEEKDAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"] as const;
const WEEKDAY_HEADERS = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"] as const;

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** «Vandaag» / «Gisteren» / «Morgen», anders de weekdag. */
function dayLabel(date: Date, today: Date): string {
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Vandaag";
  if (diff === -1) return "Gisteren";
  if (diff === 1) return "Morgen";
  const day = WEEKDAYS[date.getDay()];
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-[18px] shrink-0", className)}
    >
      <path d={direction === "left" ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

/**
 * Winkeldag kiezen (canvas «Datum A2»): ronde zachte chevronknoppen voor vorige/volgende dag,
 * in het midden «Vandaag» met de datum in actiekleur (stippellijn) als knop.
 * Een tik op de datum opent een gecentreerde kalendermodal («Datum A2 · modal»).
 */
export function ListDateStepper({
  value,
  onChange,
}: {
  /** ISO-datum "YYYY-MM-DD". */
  value: string;
  onChange: (iso: string) => void;
}) {
  const today = startOfToday();
  const selected = isoToDate(value);
  const [open, setOpen] = React.useState(false);
  const fullLabel = selected.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const sub = `${selected.getDate()} ${MONTHS[selected.getMonth()]}${
    selected.getFullYear() !== today.getFullYear() ? ` ${selected.getFullYear()}` : ""
  }`;

  const roundBtn =
    "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--blue-25)] text-[var(--blue-500)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-95 [@media(hover:hover)]:hover:bg-[var(--blue-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

  return (
    <div className="flex w-full items-center justify-between gap-2.5">
      <button
        type="button"
        aria-label="Vorige dag"
        onClick={() => onChange(toIsoDate(addDays(selected, -1)))}
        className={roundBtn}
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Winkeldag: ${fullLabel}. Kies een datum`}
        onClick={() => setOpen(true)}
        className="flex h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-lg px-4 transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <span className="truncate text-[17px] font-semibold leading-[22px] tracking-tight text-[var(--text-primary)]">
          {dayLabel(selected, today)}
        </span>
        <span className="truncate text-[13px] leading-[18px] text-[var(--blue-400)] underline decoration-[var(--blue-200)] decoration-dotted underline-offset-[3px]">
          {sub}
        </span>
      </button>
      <button
        type="button"
        aria-label="Volgende dag"
        onClick={() => onChange(toIsoDate(addDays(selected, 1)))}
        className={roundBtn}
      >
        <ChevronIcon direction="right" />
      </button>
      {open ? (
        <ListDatePickerModal
          value={value}
          onClose={() => setOpen(false)}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ListDatePickerModal({
  value,
  onClose,
  onPick,
}: {
  value: string;
  onClose: () => void;
  onPick: (iso: string) => void;
}) {
  const today = startOfToday();
  const todayIso = toIsoDate(today);
  const selected = isoToDate(value);
  const [view, setView] = React.useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    dialogRef.current?.querySelector<HTMLButtonElement>("[aria-pressed=true]")?.focus();
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const lead = (view.getDay() + 6) % 7;
  const gridStart = addDays(view, -lead);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const monthLabel = `${MONTHS[view.getMonth()].charAt(0).toUpperCase()}${MONTHS[view.getMonth()].slice(1)} ${view.getFullYear()}`;
  const shiftMonth = (n: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));

  const navBtn =
    "flex size-8 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
  const quickBtn =
    "inline-flex h-8 items-center rounded-pill bg-[var(--blue-25)] px-3.5 text-[13px] font-medium text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <div aria-hidden className="absolute inset-0 bg-[rgba(16,17,48,0.45)]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex w-full max-w-[360px] flex-col gap-3 rounded-[24px] bg-[var(--white)] px-4 pb-[18px] pt-4 shadow-[0_24px_60px_-16px_rgba(16,17,48,0.4)] motion-safe:animate-fade-up"
      >
        <div className="relative flex h-8 items-center justify-center">
          <h2 id={titleId} className="text-base font-semibold leading-6 text-[var(--text-primary)]">
            Winkeldag kiezen
          </h2>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={onClose}
            className="absolute -right-1.5 -top-1 flex size-10 items-center justify-center rounded-full text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden className="size-5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Vorige maand" onClick={() => shiftMonth(-1)} className={navBtn}>
              <ChevronIcon direction="left" />
            </button>
            <span className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]" aria-live="polite">
              {monthLabel}
            </span>
            <button type="button" aria-label="Volgende maand" onClick={() => shiftMonth(1)} className={navBtn}>
              <ChevronIcon direction="right" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold leading-4 text-[var(--gray-400)]" aria-hidden>
            {WEEKDAY_HEADERS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d) => {
              const iso = toIsoDate(d);
              const isSel = iso === value;
              const isToday = iso === todayIso;
              const inMonth = d.getMonth() === view.getMonth();
              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  onClick={() => onPick(iso)}
                  className={cn(
                    "flex h-[38px] items-center justify-center rounded-[10px] text-[15px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                    isSel
                      ? "bg-[var(--blue-50)] font-semibold text-[var(--blue-500)] shadow-[inset_0_0_0_1px_var(--blue-500)]"
                      : isToday
                        ? "font-semibold text-[var(--blue-500)] shadow-[inset_0_0_0_1.5px_var(--blue-200)]"
                        : inMonth
                          ? "text-[var(--text-primary)] [@media(hover:hover)]:hover:bg-[var(--blue-25)]"
                          : "text-[var(--gray-200)] [@media(hover:hover)]:hover:bg-[var(--blue-25)]",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center gap-2 pt-1">
          <button type="button" onClick={() => onPick(todayIso)} className={quickBtn}>
            Vandaag
          </button>
          <button type="button" onClick={() => onPick(toIsoDate(addDays(today, 1)))} className={quickBtn}>
            Morgen
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
