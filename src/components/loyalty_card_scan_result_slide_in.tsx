"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { LoyaltyCardPreview } from "@/components/loyalty_card_preview";
import type { DecodeResult } from "@/lib/loyalty_card";

type SuccessDecodeResult = Extract<DecodeResult, { ok: true }>;

type Props = {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  decodeResult: SuccessDecodeResult | null;
  onSave: () => void;
  saving?: boolean;
  /** Winkelnaam + logo voor de kaartpreview (zonder → algemene klantenkaart). */
  cardName?: string;
  logoSrc?: string | null;
  /** «Opnieuw scannen»; standaard terug (sluit het blad). */
  onRescan?: () => void;
};

/** Canvas «16 · scanresultaat»: kaartpreview met vinkje, «Kaart bewaren» / «Opnieuw scannen». */
export function LoyaltyCardScanResultSlideIn({
  open,
  onClose,
  onBack,
  decodeResult,
  onSave,
  saving = false,
  cardName,
  logoSrc,
  onRescan,
}: Props) {
  if (!decodeResult) return null;
  const name = cardName?.trim() || "Klantenkaart";

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      onBack={onBack}
      title={cardName?.trim() ? `Kaart van ${cardName.trim()}` : "Klantenkaart bevestigen"}
      titleId="loyalty-scan-result-slide-title"
      containerClassName="z-[80]"
      className="md:!max-w-[500px]"
      cancelLabel={null}
      footer={
        <>
          <Button type="button" variant="primary" onClick={onSave} disabled={saving} className="md:order-2">
            {saving ? "Bewaren…" : "Kaart bewaren"}
          </Button>
          <Button type="button" variant="secondary" onClick={onRescan ?? onBack} disabled={saving} className="md:order-1">
            Opnieuw scannen
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        <LoyaltyCardPreview
          cardName={name}
          logoSrc={logoSrc}
          codeType={decodeResult.codeType}
          codeFormat={decodeResult.codeFormat}
          rawValue={decodeResult.rawValue}
          recognized
        />
        <div className="text-center">
          <p className="text-lg font-bold leading-6 text-[var(--text-primary)]">
            {decodeResult.codeType === "qr" ? "QR-code herkend" : "Barcode herkend"}
          </p>
          <p className="mt-0.5 text-[13.5px] leading-[19px] text-[var(--text-secondary)]">
            Klopt de code? Dan bewaren we je kaart.
          </p>
        </div>
      </div>
    </SlideInModal>
  );
}
