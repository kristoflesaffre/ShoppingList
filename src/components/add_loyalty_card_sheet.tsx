"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { LoyaltyMiniCard } from "@/components/loyalty_mini_card";
import { CameraBarcodeScannerSlideIn } from "@/components/camera_barcode_scanner_slide_in";
import { LoyaltyCardScanResultSlideIn } from "@/components/loyalty_card_scan_result_slide_in";
import { decodeLoyaltyCard } from "@/lib/decode_loyalty_card";
import type { DecodeResult } from "@/lib/loyalty_card";

type SuccessDecodeResult = Extract<DecodeResult, { ok: true }>;

export interface AddLoyaltyCardSheetProps {
  open: boolean;
  onClose: () => void;
  /** Naam van de kaart (winkellabel of eigen naam uit de zoekopdracht). */
  cardName: string;
  /** Winkellogo; zonder → eerste letter op een lavendel tegel. */
  logoSrc?: string | null;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-7">
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-7">
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 16l-5-5-8 8" />
    </svg>
  );
}

/** Canvas «15 · variant 1a»: twee gelijke tegels, zelfde gewicht. */
function OptionTile({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-2.5 rounded-[20px] bg-[var(--blue-25)] px-2.5 py-[18px] shadow-[inset_0_0_0_1px_var(--blue-100)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--blue-50)]"
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_4px_10px_-6px_rgba(79,85,241,0.5)]">
        {icon}
      </span>
      <span className="text-[15px] font-bold leading-5 text-[var(--text-primary)]">{title}</span>
      <span className="text-center text-xs leading-4 text-[var(--text-secondary)]">{subtitle}</span>
    </button>
  );
}

/**
 * Klantenkaart toevoegen voor één winkel (of eigen naam): blad op mobiel, dialoog op desktop.
 * Scannen opent de camera, Screenshot een fotokiezer; daarna het bestaande scanresultaat.
 */
export function AddLoyaltyCardSheet({ open, onClose, cardName, logoSrc }: AddLoyaltyCardSheetProps) {
  const router = useRouter();
  const { user } = db.useAuth();
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [resultOpen, setResultOpen] = React.useState(false);
  const [decodeResult, setDecodeResult] = React.useState<SuccessDecodeResult | null>(null);
  const [decodeError, setDecodeError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) setDecodeError(null);
  }, [open]);

  const handlePhotoFile = (file: File) => {
    setDecodeError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await decodeLoyaltyCard(reader.result as string);
      if (!result.ok) {
        setDecodeError(result.error);
        return;
      }
      setDecodeResult(result);
      onClose();
      setResultOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!decodeResult || !user || !cardName) return;
    setSaving(true);
    try {
      await db.transact(
        db.tx.loyaltyCards[iid()].update({
          codeType: decodeResult.codeType,
          codeFormat: decodeResult.codeFormat,
          rawValue: decodeResult.rawValue,
          cardName,
          createdAtIso: new Date().toISOString(),
          ownerId: user.id,
        }),
      );
      setResultOpen(false);
      setDecodeResult(null);
      router.push("/klantenkaarten");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SlideInModal open={open} onClose={onClose} title="" className="md:!max-w-[500px]" cancelLabel={null}>
        <div className="flex flex-col gap-4 pb-6 md:pb-2">
          <div className="flex flex-col items-center gap-2 pb-1.5 text-center">
            <span className="mb-2 mt-1 block w-[220px] -rotate-3">
              <LoyaltyMiniCard label={cardName} logoSrc={logoSrc} size="lg" />
            </span>
            <p className="text-xl font-bold leading-7 text-[var(--text-primary)]">Kaart van {cardName}</p>
            <p className="text-[13.5px] leading-[19px] text-[var(--text-secondary)]">
              Scan je kaart of kies een screenshot uit de app.
            </p>
          </div>
          <div className="flex gap-2.5">
            <OptionTile
              icon={<CameraIcon />}
              title="Scannen"
              subtitle="Met je camera"
              onClick={() => {
                setDecodeError(null);
                onClose();
                setCameraOpen(true);
              }}
            />
            <OptionTile
              icon={<ImageIcon />}
              title="Screenshot"
              subtitle="Uit je foto's"
              onClick={() => {
                setDecodeError(null);
                photoInputRef.current?.click();
              }}
            />
          </div>
          {decodeError ? (
            <p className="text-center text-sm text-[var(--error-400)]" role="alert">
              {decodeError}
            </p>
          ) : null}
        </div>
      </SlideInModal>

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
          handlePhotoFile(file);
        }}
      />

      <CameraBarcodeScannerSlideIn
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDecoded={(result) => {
          setCameraOpen(false);
          setDecodeResult(result);
          setResultOpen(true);
        }}
      />

      <LoyaltyCardScanResultSlideIn
        open={resultOpen}
        onClose={() => {
          setResultOpen(false);
          setDecodeResult(null);
        }}
        onBack={() => {
          setResultOpen(false);
          setDecodeResult(null);
        }}
        decodeResult={decodeResult}
        saving={saving}
        onSave={() => void handleSave()}
        cardName={cardName}
        logoSrc={logoSrc}
        onRescan={() => {
          setResultOpen(false);
          setDecodeResult(null);
          setCameraOpen(true);
        }}
      />
    </>
  );
}
