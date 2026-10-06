"use client";

import * as React from "react";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import { cardColors, useIsDarkTheme, useLogoTint } from "@/components/loyalty_wallet";

/** EAN-13 leesbaar groeperen: 1 · 6 · 6 (bv. 5 412345 678908); andere codes ongewijzigd. */
function formatCodeValue(raw: string): string {
  if (/^\d{13}$/.test(raw)) return `${raw.slice(0, 1)} ${raw.slice(1, 7)} ${raw.slice(7)}`;
  return raw;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * Canvas «16 · Klantenkaart»: de kaart als echte kaart in de winkeltint (zoals de kaarttegel),
 * logo + naam bovenaan, wit codevlak met de code en het nummer eronder.
 */
export function LoyaltyCardPreview({
  cardName,
  logoSrc,
  codeType,
  codeFormat,
  rawValue,
  recognized = false,
}: {
  cardName: string;
  logoSrc?: string | null;
  codeType: "qr" | "barcode";
  codeFormat: string;
  rawValue: string;
  /** Scanresultaat: blauw vinkje op de kaart. */
  recognized?: boolean;
}) {
  const dark = useIsDarkTheme();
  const colors = cardColors(useLogoTint(logoSrc ?? ""), dark);
  return (
    <div
      className="relative mx-auto w-full max-w-[320px] rounded-[22px] p-4 shadow-[0_22px_40px_-24px_rgba(16,17,48,0.35)]"
      style={{ background: colors.background, boxShadow: `inset 0 0 0 1px ${colors.edge}, 0 22px 40px -24px rgba(16,17,48,0.35)` }}
    >
      {recognized ? (
        <span className="absolute -right-2.5 -top-2.5 flex size-8 items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] shadow-[0_0_0_4px_var(--white)]">
          <CheckIcon />
        </span>
      ) : null}
      <div className="mb-3.5 flex items-center gap-2.5">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- winkellogo
          <img src={logoSrc} alt="" width={30} height={30} className="size-[30px] object-contain" />
        ) : (
          <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-[var(--white)] text-sm font-bold text-[var(--blue-500)]">
            {cardName.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate text-base font-bold text-[var(--text-primary)]">{cardName}</span>
      </div>
      <div className="flex flex-col items-center rounded-[14px] bg-[var(--white)] px-3 pb-2.5 pt-3.5">
        <LoyaltyCardDisplay codeType={codeType} codeFormat={codeFormat} rawValue={rawValue} />
        {codeType === "barcode" ? (
          <p className="mt-2 text-center text-[13px] tabular-nums tracking-[0.18em] text-[#595f6a]">
            {formatCodeValue(rawValue)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
