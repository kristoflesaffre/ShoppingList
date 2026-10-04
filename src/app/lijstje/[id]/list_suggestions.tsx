"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "@/lib/utils";

export type Suggestion = {
  /** Unieke sleutel ("tk:<id>" of "vl:<naam>"), ook gebruikt om te verbergen. */
  key: string;
  name: string;
  quantity: string;
  photo: string | null;
  /** Extra regel, bv. «door Chloé». */
  meta?: string;
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function SuggestionRow({ s, onAdd, onDismiss }: { s: Suggestion; onAdd: () => void; onDismiss: () => void }) {
  return (
    <li className="flex items-center gap-3 border-t border-[var(--border-subtle)] py-2.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--gray-25)]">
        {s.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto
          <img src={s.photo} alt="" className="size-8 object-contain" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1 leading-[18px]">
        <span className="block truncate text-[15px] font-semibold text-text-primary">{s.name}</span>
        <span className="block truncate text-[13px] text-[var(--text-tertiary)]">
          {s.quantity}
          {s.meta ? ` · ${s.meta}` : ""}
        </span>
      </span>
      <button
        type="button"
        aria-label={`${s.name} niet toevoegen`}
        onClick={onDismiss}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--error-25)] text-[var(--error-400)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <TrashIcon />
      </button>
      <button
        type="button"
        aria-label={`${s.name} toevoegen aan lijstje`}
        onClick={onAdd}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <PlusIcon />
      </button>
    </li>
  );
}

/**
 * Suggesties bovenaan een lijstje (canvas «Suggesties · S3»): een smalle banner met het aantal,
 * die een sheet opent met twee bronnen — de te kopen-lijst en het vorige lijstje — elk met
 * vuilbakje (verbergen) en plus (toevoegen).
 */
export function ListSuggestions({
  teKopen,
  previous,
  previousLabel,
  onAdd,
  onAddAll,
  onDismiss,
}: {
  teKopen: Suggestion[];
  previous: Suggestion[];
  /** Naam van het vorige lijstje, bv. «September 27». */
  previousLabel: string | null;
  onAdd: (s: Suggestion) => void;
  onAddAll: () => void;
  onDismiss: (s: Suggestion) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const total = teKopen.length + previous.length;

  React.useEffect(() => {
    if (total === 0) setOpen(false);
  }, [total]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (total === 0) return null;
  const suggestions = [...teKopen, ...previous];
  const singleSuggestion = total === 1 ? suggestions[0] : null;
  const photos = suggestions.map((s) => s.photo).filter((p): p is string => Boolean(p)).slice(0, 4);
  const parts = [
    teKopen.length ? `${teKopen.length} te kopen` : null,
    previous.length ? `${previous.length} van vorig lijstje` : null,
  ].filter(Boolean);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (singleSuggestion) {
            onAdd(singleSuggestion);
            return;
          }
          setOpen(true);
        }}
        aria-haspopup={singleSuggestion ? undefined : "dialog"}
        className="flex w-full items-center gap-3 rounded-[16px] bg-[var(--blue-25)] px-3 py-2.5 text-left shadow-[inset_0_0_0_1.5px_var(--blue-100)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <span className="flex shrink-0 pl-1">
          {photos.map((p, i) => (
            <span
              key={i}
              className="-ml-2 flex size-[30px] items-center justify-center rounded-full bg-[var(--white)] shadow-[0_0_0_2px_var(--blue-25)] first:ml-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale productfoto */}
              <img src={p} alt="" className="size-6 object-contain" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1 leading-4">
          <span className="block text-sm font-bold text-text-primary">
            {total} {total === 1 ? "suggestie" : "suggesties"}
          </span>
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {singleSuggestion ? singleSuggestion.name : parts.join(" · ")}
          </span>
        </span>
        <span className="inline-flex h-[30px] shrink-0 items-center rounded-pill bg-[var(--blue-500)] px-3 text-[13px] font-semibold text-white">
          {singleSuggestion ? "Toevoegen" : "Bekijken"}
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? ReactDOM.createPortal(
            <div className="fixed inset-0 z-[55] flex items-end justify-center md:items-center md:p-6">
              <div aria-hidden className="absolute inset-0 bg-[rgba(16,17,48,0.35)]" onClick={() => setOpen(false)} />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Suggesties"
                className={cn(
                  "relative flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-[var(--white)] shadow-[0_-14px_40px_-12px_rgba(16,17,48,0.3)] motion-safe:animate-fade-up",
                  "md:max-w-[480px] md:rounded-[26px]",
                )}
              >
                <span aria-hidden className="mx-auto mt-2.5 block h-1 w-[38px] rounded-full bg-[var(--gray-100)] md:hidden" />
                <div className="flex items-center justify-between px-[18px] pb-1 pt-3">
                  <h2 className="text-lg font-bold text-text-primary">Suggesties</h2>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={onAddAll} className="text-[13px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]">
                      Alles toevoegen
                    </button>
                    <button
                      type="button"
                      aria-label="Sluiten"
                      onClick={() => setOpen(false)}
                      className="flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className="size-5">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto px-[18px] pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
                  {teKopen.length > 0 ? (
                    <section className="mt-2.5">
                      <h3 className="pb-1 text-xs font-bold tracking-[0.05em] text-[var(--text-tertiary)]">UIT JE TE KOPEN-LIJST · {teKopen.length}</h3>
                      <ul>
                        {teKopen.map((s) => (
                          <SuggestionRow key={s.key} s={s} onAdd={() => onAdd(s)} onDismiss={() => onDismiss(s)} />
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {previous.length > 0 ? (
                    <section className="mt-3">
                      <h3 className="pb-1 text-xs font-bold tracking-[0.05em] text-[var(--text-tertiary)]">
                        NIET GEHAALD OP {previousLabel ? `«${previousLabel.toUpperCase()}»` : "VORIG LIJSTJE"} · {previous.length}
                      </h3>
                      <ul>
                        {previous.map((s) => (
                          <SuggestionRow key={s.key} s={s} onAdd={() => onAdd(s)} onDismiss={() => onDismiss(s)} />
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
