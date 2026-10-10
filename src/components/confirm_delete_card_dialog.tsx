"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bevestigingsdialoog voor het verwijderen van een klantenkaart die nog aan een lijstje gelinkt is.
 * Gecentreerd over een donker overlay, twee acties: annuleren en rood verwijderen.
 */
export function ConfirmDeleteCardDialog({
  cardName,
  listName,
  description,
  deleting,
  onConfirm,
  onCancel,
}: {
  cardName: string;
  listName: string;
  /** Eigen uitleg (anders: «wordt nog gebruikt op het favorietenlijstje …»). */
  description?: React.ReactNode;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Sluit op Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, deleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
        className="w-full max-w-[358px] rounded-[20px] bg-[var(--white)] p-6 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.24)] flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="confirm-delete-title"
            className="text-base font-semibold leading-24 tracking-normal text-[var(--text-primary)]"
          >
            Klantenkaart verwijderen?
          </h2>
          <p
            id="confirm-delete-desc"
            className="text-sm font-normal leading-20 tracking-normal text-[var(--gray-600)]"
          >
            {description ?? (
              <>
                De{" "}
                <span className="font-medium text-[var(--text-primary)]">{cardName}</span> klantenkaart wordt nog
                gebruikt op het favorieten lijstje{" "}
                <span className="font-medium text-[var(--text-primary)]">&ldquo;{listName}&rdquo;</span>. Ben je zeker
                dat je deze wil verwijderen?
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className={cn(
              "w-full rounded-[var(--radius-pill)] py-2 px-4",
              "text-base font-medium leading-24 text-white",
              "bg-[var(--error-400)] transition-colors",
              "[@media(hover:hover)]:hover:bg-[var(--error-600)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {deleting ? "Verwijderen…" : "Verwijderen"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className={cn(
              "w-full rounded-[var(--radius-pill)] py-2 px-4",
              "text-base font-medium leading-24 text-[var(--action-primary)]",
              "border border-[var(--action-primary)] bg-transparent transition-colors",
              "[@media(hover:hover)]:hover:bg-[var(--blue-25)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
