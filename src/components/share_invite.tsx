"use client";

import * as React from "react";
import { Shimmer } from "@/components/ui/shimmer";

/**
 * Canvas «24 · Gedeelde link»: uitnodigingskaart voor iedereen die een deellink opent
 * (lijstje, recept, films & series, te kopen, samen delen). Eerst zien wat het is, dan
 * bewust «Meedoen»; nooit meer stil lid worden.
 */

const ENVELOPE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
    <rect x="3" y="5.5" width="18" height="13" rx="3" />
    <path d="M4 7.5l8 6 8-6" />
  </svg>
);

export const InviteIcons = {
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M15 14.6c2.6-.3 4.6 1.1 5.2 4.4" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </svg>
  ),
  brokenLink: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[30px]">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      <path d="M4 4l16 16" />
    </svg>
  ),
};

/** Wit tegeltje met een afbeelding (winkellogo, illustratie). */
export function InviteTile({ src, tint }: { src: string; tint?: boolean }) {
  return (
    <span className={`flex size-[104px] items-center justify-center rounded-[28px] shadow-[0_18px_30px_-16px_rgba(16,17,48,0.35)] ${tint ? "bg-[var(--blue-25)]" : "bg-[var(--white)]"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-[66px] object-contain" />
    </span>
  );
}

/** Rond bord met de receptfoto. */
export function InvitePlate({ src }: { src: string }) {
  return (
    <span className="block size-[132px] overflow-hidden rounded-full bg-[var(--white)] shadow-[0_18px_30px_-14px_rgba(16,17,48,0.45),0_0_0_6px_var(--white)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full scale-[1.08] object-cover" />
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] pt-[calc(env(safe-area-inset-top,0px)+56px)] lg:justify-center lg:gap-[22px] lg:pt-0">
      <p className="hidden text-[15px] font-extrabold text-[var(--blue-500)] lg:block">Shopping List</p>
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  );
}

export function ShareInvite({
  state,
  eyebrow = "Uitnodiging",
  visual,
  title,
  subtitle,
  note,
  noteIcon = InviteIcons.people,
  acceptLabel,
  busyLabel,
  onAccept,
  onDecline,
  errorTitle = "Deze link werkt niet meer",
  errorText = "Misschien werd het delen gestopt. Vraag om een nieuwe link.",
  errorActionLabel = "Naar start",
  onErrorAction,
  acceptError,
}: {
  state: "loading" | "ready" | "busy" | "error";
  eyebrow?: string;
  visual?: React.ReactNode;
  title?: string;
  subtitle?: string;
  note?: React.ReactNode;
  noteIcon?: React.ReactNode;
  acceptLabel: string;
  busyLabel: string;
  onAccept: () => void;
  onDecline: () => void;
  errorTitle?: string;
  errorText?: string;
  errorActionLabel?: string;
  onErrorAction: () => void;
  /** Fout bij het accepteren (kaart blijft staan, knop opnieuw beschikbaar). */
  acceptError?: string | null;
}) {
  if (state === "error") {
    return (
      <Shell>
        <div className="mt-[18vh] rounded-[28px] bg-[var(--white)] px-6 pb-6 pt-8 text-center shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:mt-0">
          <span className="mx-auto flex size-[72px] items-center justify-center rounded-full bg-[var(--gray-50)] text-[var(--text-secondary)]">{InviteIcons.brokenLink}</span>
          <h1 className="mt-4 text-[21px] font-extrabold text-[var(--text-primary)]">{errorTitle}</h1>
          <p className="mt-1.5 text-sm leading-5 text-[var(--text-secondary)]">{errorText}</p>
          <button
            type="button"
            onClick={onErrorAction}
            className="mt-[22px] flex h-[50px] w-full items-center justify-center rounded-pill bg-[var(--blue-50)] text-base font-bold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            {errorActionLabel}
          </button>
        </div>
      </Shell>
    );
  }

  const loading = state === "loading";
  return (
    <Shell>
      <div className="overflow-hidden rounded-[28px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04),0_24px_48px_-28px_rgba(16,17,48,0.25)]">
        <div className="relative flex h-[224px] items-center justify-center bg-[radial-gradient(120%_90%_at_50%_0%,#e4e6ff_0%,var(--blue-25)_60%,var(--white)_100%)] pt-[34px]">
          <span className="absolute left-1/2 top-[18px] inline-flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-pill bg-[var(--white)] px-3 text-xs font-extrabold uppercase tracking-[0.05em] text-[var(--blue-500)] shadow-[0_4px_12px_-6px_rgba(79,85,241,0.4)]">
            {ENVELOPE}
            {eyebrow}
          </span>
          {loading ? <Shimmer className="size-[104px] rounded-[28px]" /> : visual}
        </div>
        <div className="px-6 pb-6 pt-1 text-center">
          {loading ? (
            <>
              <Shimmer className="mx-auto h-7 w-3/5 rounded-md" />
              <Shimmer className="mx-auto mt-2 h-4 w-2/5 rounded-md" />
              <Shimmer className="mt-[18px] h-[60px] rounded-2xl" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
              {note ? (
                <div className="mt-[18px] flex items-center gap-2.5 rounded-2xl bg-[var(--gray-25)] px-3.5 py-3 text-left text-[13px] leading-[18px] text-[var(--text-secondary)]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[inset_0_0_0_1px_var(--border-subtle)]">{noteIcon}</span>
                  <span>{note}</span>
                </div>
              ) : null}
            </>
          )}
          {acceptError ? <p className="mt-3 text-sm text-[var(--error-600)]">{acceptError}</p> : null}
          <button
            type="button"
            disabled={state !== "ready"}
            onClick={onAccept}
            className="mt-5 flex h-[50px] w-full items-center justify-center gap-2.5 rounded-pill bg-[var(--blue-500)] text-base font-bold text-white transition-[opacity,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:opacity-85"
          >
            {state === "busy" ? (
              <>
                <span aria-hidden className="size-[18px] animate-spin rounded-full border-[2.4px] border-[rgba(255,255,255,0.4)] border-t-white motion-reduce:animate-none" />
                {busyLabel}
              </>
            ) : (
              acceptLabel
            )}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={state === "busy"}
            className="mt-3 text-sm font-semibold text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
          >
            Niet nu
          </button>
        </div>
      </div>
    </Shell>
  );
}
