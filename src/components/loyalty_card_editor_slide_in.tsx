"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { SelectTile } from "@/components/ui/select_tile";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import { decodeLoyaltyCard } from "@/lib/decode_loyalty_card";
import type { DecodeResult } from "@/lib/loyalty_card";

type SuccessDecodeResult = Extract<DecodeResult, { ok: true }>;

export type LoyaltyCardEditorSlideInCard = {
  id: string;
  codeType: string;
  codeFormat: string;
  rawValue: string;
  cardName: string;
  createdAtIso: string;
};

const LoyaltyCardScanResultSlideIn = dynamic(
  () =>
    import("@/components/loyalty_card_scan_result_slide_in").then(
      (m) => m.LoyaltyCardScanResultSlideIn,
    ),
  { ssr: false },
);

const CameraBarcodeScannerSlideIn = dynamic(
  () =>
    import("@/components/camera_barcode_scanner_slide_in").then(
      (m) => m.CameraBarcodeScannerSlideIn,
    ),
  { ssr: false },
);

export interface LoyaltyCardEditorSlideInProps {
  /** Niet-`null` = slide open voor deze kaart */
  card: LoyaltyCardEditorSlideInCard | null;
  onClose: () => void;
  /** Store-logo onder de preview (zoals op lijstje master) */
  logoSrc: string;
  onSaveDecoded: (result: SuccessDecodeResult) => Promise<void>;
}

/**
 * Slide-in “Klantenkaart” met scan / screenshot — zelfde patroon als masterlijst (lijstje-detail).
 */
export function LoyaltyCardEditorSlideIn({
  card,
  onClose,
  logoSrc,
  onSaveDecoded,
}: LoyaltyCardEditorSlideInProps) {
  const [decodeError, setDecodeError] = React.useState<string | null>(null);
  const [decodeResult, setDecodeResult] =
    React.useState<SuccessDecodeResult | null>(null);
  const [scanResultOpen, setScanResultOpen] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!card) {
      setDecodeError(null);
      setDecodeResult(null);
      setScanResultOpen(false);
      setCameraOpen(false);
    }
  }, [card]);

  const handleSaveScan = React.useCallback(async () => {
    if (!decodeResult || !card) return;
    setSaving(true);
    try {
      await onSaveDecoded(decodeResult);
      setScanResultOpen(false);
      setDecodeResult(null);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [card, decodeResult, onClose, onSaveDecoded]);

  if (!card) return null;

  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          setDecodeError(null);
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const result = await decodeLoyaltyCard(dataUrl);
            if (!result.ok) {
              setDecodeError(result.error);
              return;
            }
            setDecodeResult(result);
            setScanResultOpen(true);
          };
          reader.readAsDataURL(file);
        }}
      />

      <SlideInModal
        open={Boolean(card)}
        onClose={onClose}
        title="Klantenkaart"
        titleId="loyalty-card-editor-slide-title"
        disableEscapeClose={scanResultOpen || cameraOpen}
        footer={
          <div className="flex w-full flex-col items-center gap-3">
            {decodeError ? (
              <p className="text-center text-xs text-[var(--color-error,#ef4444)]">
                {decodeError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setDecodeError(null);
                setCameraOpen(true);
              }}
            >
              Scan met camera
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDecodeError(null);
                photoInputRef.current?.click();
              }}
            >
              Screenshot opladen
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-6 px-4">
          <div className="flex items-center justify-center rounded-xl bg-white p-4 shadow-sm">
            <LoyaltyCardDisplay
              codeType={card.codeType as "qr" | "barcode"}
              codeFormat={card.codeFormat}
              rawValue={card.rawValue}
            />
          </div>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
            <img
              src={logoSrc}
              alt=""
              width={64}
              height={64}
              className="pointer-events-none size-16 shrink-0 object-contain"
            />
          ) : null}
        </div>
      </SlideInModal>

      <CameraBarcodeScannerSlideIn
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDecoded={(result) => {
          setCameraOpen(false);
          setDecodeResult(result);
          setScanResultOpen(true);
        }}
      />

      <LoyaltyCardScanResultSlideIn
        open={scanResultOpen}
        onClose={() => setScanResultOpen(false)}
        onBack={() => setScanResultOpen(false)}
        decodeResult={decodeResult}
        saving={saving}
        onSave={() => void handleSaveScan()}
      />
    </>
  );
}

LoyaltyCardEditorSlideIn.displayName = "LoyaltyCardEditorSlideIn";
