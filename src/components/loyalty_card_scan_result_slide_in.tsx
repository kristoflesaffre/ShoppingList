"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import type { DecodeResult } from "@/lib/loyalty_card";

type SuccessDecodeResult = Extract<DecodeResult, { ok: true }>;

type Props = {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  decodeResult: SuccessDecodeResult | null;
  onSave: () => void;
  saving?: boolean;
};

export function LoyaltyCardScanResultSlideIn({
  open,
  onClose,
  onBack,
  decodeResult,
  onSave,
  saving = false,
}: Props) {
  if (!decodeResult) return null;

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      onBack={onBack}
      title="Klantenkaart bevestigen"
      titleId="loyalty-scan-result-slide-title"
      containerClassName="z-[80]"
      footer={
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Opslaan…" : "Opslaan"}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-6 px-4">
        <div className="flex items-center justify-center rounded-xl bg-white p-4 shadow-sm">
          <LoyaltyCardDisplay
            codeType={decodeResult.codeType}
            codeFormat={decodeResult.codeFormat}
            rawValue={decodeResult.rawValue}
          />
        </div>

        <p className="text-center text-sm font-normal leading-20 tracking-normal text-[var(--text-secondary)]">
          {decodeResult.codeType === "qr"
            ? "QR-code herkend"
            : `Barcode herkend (${decodeResult.codeFormat})`}
        </p>
      </div>
    </SlideInModal>
  );
}
