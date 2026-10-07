"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
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
  /**
   * Positie van de aangetikte minikaart in het raster: de kaart vliegt vandaar naar haar plek
   * bovenaan het blad (gedeelde-elementovergang). Zonder → geen vlucht.
   */
  originRect?: DOMRect | null;
  /** De vlucht is geland (of overgeslagen). */
  onFlightEnd?: () => void;
}

const FLIGHT_MS = 460;
/** Licht doorschietend: de kanteling en schaal veren net voorbij en zetten zich dan. */
const FLIGHT_EASE = "cubic-bezier(0.22, 1.12, 0.36, 1)";
const CARD_TILT_DEG = -3;

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
 * Plek van `el` zoals die wordt wanneer het blad klaar is met inschuiven/schalen: we halen voor elk
 * getransformeerd voorouder (blad, inhoud die invaagt) de lopende translate/scale eruit.
 */
function settledRect(el: HTMLElement): { x: number; y: number; w: number; h: number } {
  const r = el.getBoundingClientRect();
  let x = r.left;
  let y = r.top;
  let w = r.width;
  let h = r.height;
  for (let node = el.parentElement; node; node = node.parentElement) {
    const t = getComputedStyle(node).transform;
    if (!t || t === "none") continue;
    const m = new DOMMatrixReadOnly(t);
    const s = m.a || 1;
    const p = node.getBoundingClientRect();
    const pcx = p.left + p.width / 2;
    const pcy = p.top + p.height / 2;
    x = pcx - m.e + (x - pcx) / s;
    y = pcy - m.f + (y - pcy) / s;
    w /= s;
    h /= s;
  }
  return { x, y, w, h };
}

export function AddLoyaltyCardSheet({
  open,
  onClose,
  cardName,
  logoSrc,
  originRect,
  onFlightEnd,
}: AddLoyaltyCardSheetProps) {
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

  /* ── Vlucht van de minikaart: raster → blad ── */
  const slotRef = React.useRef<HTMLSpanElement>(null);
  const flyerRef = React.useRef<HTMLDivElement>(null);
  const [flight, setFlight] = React.useState<{ x: number; y: number; w: number; h: number; origin: DOMRect } | null>(null);
  const [landed, setLanded] = React.useState(true);
  const onFlightEndRef = React.useRef(onFlightEnd);
  onFlightEndRef.current = onFlightEnd;

  React.useLayoutEffect(() => {
    if (!open || !originRect) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onFlightEndRef.current?.();
      return;
    }
    setLanded(false);
    const raf = requestAnimationFrame(() => {
      const slot = slotRef.current;
      if (!slot) {
        setLanded(true);
        onFlightEndRef.current?.();
        return;
      }
      setFlight({ ...settledRect(slot), origin: originRect });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, originRect]);

  React.useLayoutEffect(() => {
    const el = flyerRef.current;
    if (!flight || !el) return;
    const { x, y, w, h, origin } = flight;
    const dx = origin.left + origin.width / 2 - (x + w / 2);
    const dy = origin.top + origin.height / 2 - (y + h / 2);
    const s0 = origin.width / w;
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s0}) rotate(0deg)`, boxShadow: "0 0 0 rgba(16,17,48,0)" },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 24}px) scale(${(s0 + 1) / 2 + 0.06}) rotate(${CARD_TILT_DEG * 0.6}deg)`, offset: 0.55 },
        { transform: `translate(0px, 0px) scale(1) rotate(${CARD_TILT_DEG}deg)` },
      ],
      { duration: FLIGHT_MS, easing: FLIGHT_EASE, fill: "forwards" },
    );
    const done = () => {
      setLanded(true);
      setFlight(null);
      onFlightEndRef.current?.();
    };
    anim.onfinish = done;
    anim.oncancel = done;
    return () => anim.cancel();
  }, [flight]);

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
            <span ref={slotRef} className="mb-2 mt-1 block w-[220px]">
              <span className={cn("block -rotate-3", !landed && "opacity-0")}>
                <LoyaltyMiniCard label={cardName} logoSrc={logoSrc} size="lg" />
              </span>
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

      {flight
        ? createPortal(
            <div
              ref={flyerRef}
              aria-hidden
              className="pointer-events-none fixed z-[200] will-change-transform"
              style={{ left: flight.x, top: flight.y, width: flight.w }}
            >
              <LoyaltyMiniCard label={cardName} logoSrc={logoSrc} size="lg" />
            </div>,
            document.body,
          )
        : null}

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
