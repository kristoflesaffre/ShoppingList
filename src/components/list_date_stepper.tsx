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
        <DatePickerModal
          title="Winkeldag kiezen"
          value={value}
          quickPicks={[
            { label: "Vandaag", iso: toIsoDate(today) },
            { label: "Morgen", iso: toIsoDate(addDays(today, 1)) },
          ]}
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

/**
 * Datum in een formulier: zelfde vorm als het invoerveld (grijs, radius 16, h 48), kalender-icoon rechts.
 * Een tik opent de datumkiezer; bij een gekozen datum staat daar ook «Datum wissen».
 */
export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Kies een datum",
  pickerTitle,
  quickPicks,
  hideLabel = false,
}: {
  label: string;
  /** Snelkeuzes in de kalender. */
  quickPicks?: { label: string; iso: string }[];
  /** Het label staat al ernaast (formulierrij). */
  hideLabel?: boolean;
  /** Titel van de kalender als het label daar te lang voor is. */
  pickerTitle?: string;
  /** ISO-datum "YYYY-MM-DD"; leeg = nog niets gekozen. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const display = value ? isoToDate(value).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <div className="flex w-full flex-col gap-2">
      {hideLabel ? null : (
        <span aria-hidden className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
          {label}
        </span>
      )}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${label}: ${display ?? placeholder}`}
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center gap-2 rounded-[16px] bg-[var(--gray-25)] px-4 text-left text-[15px] leading-24 transition-[background-color,box-shadow] duration-fast ease-out-strong focus-visible:bg-[var(--white)] focus-visible:shadow-[inset_0_0_0_1.5px_var(--blue-300)] focus-visible:outline-none"
      >
        <span className={cn("min-w-0 flex-1 truncate", display ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>{display ?? placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5 shrink-0 text-[var(--text-secondary)]">
          <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
          <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
        </svg>
      </button>
      {open ? (
        <DatePickerModal
          title={pickerTitle ?? label}
          value={value}
          quickPicks={quickPicks}
          onClose={() => setOpen(false)}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
          onClear={
            value
              ? () => {
                  onChange("");
                  setOpen(false);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

/**
 * Datumkiezer (canvas «Datum A2 · modal»): gecentreerde kalender; een tik op een dag kiest die meteen.
 * Onderaan snelkeuzes en, met `onClear`, «Datum wissen».
 */
export function DatePickerModal({
  title,
  value,
  quickPicks = [],
  onClose,
  onPick,
  onClear,
}: {
  title: string;
  /** ISO-datum "YYYY-MM-DD"; leeg = nog niets gekozen (de kalender opent op deze maand). */
  value: string;
  quickPicks?: { label: string; iso: string }[];
  onClose: () => void;
  onPick: (iso: string) => void;
  onClear?: () => void;
}) {
  const today = startOfToday();
  const todayIso = toIsoDate(today);
  const [view, setView] = React.useState(() => {
    const start = value ? isoToDate(value) : today;
    return new Date(start.getFullYear(), start.getMonth(), 1);
  });
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
          <h2 id={titleId} className="truncate px-8 text-base font-semibold leading-6 text-[var(--text-primary)]">
            {title}
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

        {quickPicks.length > 0 || onClear ? (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {quickPicks.map((q) => (
              <button key={q.label} type="button" onClick={() => onPick(q.iso)} className={quickBtn}>
                {q.label}
              </button>
            ))}
            {onClear ? (
              <button type="button" onClick={onClear} className={cn(quickBtn, "bg-[var(--gray-50)] text-[var(--text-secondary)] [@media(hover:hover)]:hover:bg-[var(--gray-100)]")}>
                Datum wissen
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
