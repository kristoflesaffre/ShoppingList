"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { LoyaltyCardPreview } from "@/components/loyalty_card_preview";
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
  /** «Kaart verwijderen» onderaan het blad. */
  onDelete?: () => void;
}

/**
 * Kaartcode vervangen via camera of screenshot: bestandskiezer, camerascanner en bevestigscherm.
 * Gedeeld door de slide-in (bewerkmodus raster) en de schermvullende kaartweergave.
 */
export function useLoyaltyCardReplace(
  onSaveDecoded: (result: SuccessDecodeResult) => Promise<void>,
  onSaved?: () => void,
  /** Winkelnaam + logo voor de kaartpreview in het scanresultaat. */
  card?: { cardName?: string; logoSrc?: string | null },
) {
  const [decodeError, setDecodeError] = React.useState<string | null>(null);
  const [decodeResult, setDecodeResult] =
    React.useState<SuccessDecodeResult | null>(null);
  const [scanResultOpen, setScanResultOpen] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const reset = React.useCallback(() => {
    setDecodeError(null);
    setDecodeResult(null);
    setScanResultOpen(false);
    setCameraOpen(false);
  }, []);

  const handleSaveScan = React.useCallback(async () => {
    if (!decodeResult) return;
    setSaving(true);
    try {
      await onSaveDecoded(decodeResult);
      setScanResultOpen(false);
      setDecodeResult(null);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [decodeResult, onSaveDecoded, onSaved]);

  const startCamera = React.useCallback(() => {
    setDecodeError(null);
    setCameraOpen(true);
  }, []);

  const startUpload = React.useCallback(() => {
    setDecodeError(null);
    photoInputRef.current?.click();
  }, []);

  const elements = (
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
      <CameraBarcodeScannerSlideIn
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onPickScreenshot={() => {
          setCameraOpen(false);
          photoInputRef.current?.click();
        }}
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
        cardName={card?.cardName}
        logoSrc={card?.logoSrc}
        onRescan={() => {
          setScanResultOpen(false);
          setDecodeResult(null);
          setCameraOpen(true);
        }}
      />
    </>
  );

  return {
    decodeError,
    startCamera,
    startUpload,
    reset,
    elements,
    /** Camera of bevestigscherm staat open (Escape hoort daar). */
    busy: cameraOpen || scanResultOpen,
  };
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[22px]">
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[22px]">
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 16l-5-5-8 8" />
    </svg>
  );
}

function ReplaceTile({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-2 rounded-[18px] bg-[var(--blue-25)] px-2 py-3.5 shadow-[inset_0_0_0_1px_var(--blue-100)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--blue-50)]"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_4px_10px_-6px_rgba(79,85,241,0.5)]">
        {icon}
      </span>
      <span className="text-sm font-bold leading-5 text-[var(--text-primary)]">{title}</span>
      <span className="text-[11.5px] leading-4 text-[var(--text-secondary)]">{subtitle}</span>
    </button>
  );
}

/**
 * Canvas «16 · Klantenkaart bewerken»: kaartpreview in winkeltint, «Code vervangen» met twee
 * gelijke tegels (Scannen / Screenshot) en «Kaart verwijderen».
 */
export function LoyaltyCardEditorSlideIn({
  card,
  onClose,
  logoSrc,
  onSaveDecoded,
  onDelete,
}: LoyaltyCardEditorSlideInProps) {
  const replace = useLoyaltyCardReplace(onSaveDecoded, onClose, {
    cardName: card?.cardName,
    logoSrc: logoSrc || null,
  });
  const { reset } = replace;

  React.useEffect(() => {
    if (!card) reset();
  }, [card, reset]);

  if (!card) return null;

  return (
    <>
      <SlideInModal
        open={Boolean(card)}
        onClose={onClose}
        title={`Kaart van ${card.cardName}`}
        titleId="loyalty-card-editor-slide-title"
        disableEscapeClose={replace.busy}
        className="md:!max-w-[500px]"
        cancelLabel={null}
      >
        <div className="flex flex-col gap-5 pb-4 md:pb-2">
          <LoyaltyCardPreview
            cardName={card.cardName}
            logoSrc={logoSrc || null}
            codeType={card.codeType as "qr" | "barcode"}
            codeFormat={card.codeFormat}
            rawValue={card.rawValue}
          />
          <div>
            <p className="px-0.5 pb-2 text-[13px] font-semibold text-[var(--text-secondary)]">Code vervangen</p>
            <div className="flex gap-2.5">
              <ReplaceTile icon={<CameraIcon />} title="Scannen" subtitle="Met je camera" onClick={replace.startCamera} />
              <ReplaceTile icon={<ImageIcon />} title="Screenshot" subtitle="Uit je foto's" onClick={replace.startUpload} />
            </div>
            {replace.decodeError ? (
              <p className="pt-2 text-center text-xs text-[var(--error-400)]" role="alert">
                {replace.decodeError}
              </p>
            ) : null}
          </div>
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="mx-auto inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-[14.5px] font-semibold text-[var(--error-600)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--error-25)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
              </svg>
              Kaart verwijderen
            </button>
          ) : null}
        </div>
      </SlideInModal>

      {replace.elements}
    </>
  );
}

LoyaltyCardEditorSlideIn.displayName = "LoyaltyCardEditorSlideIn";
