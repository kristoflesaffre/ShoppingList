"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { decodeLoyaltyCardFromImageData } from "@/lib/decode_loyalty_card";
import type { DecodeResult } from "@/lib/loyalty_card";

type DecodeSuccessResult = Extract<DecodeResult, { ok: true }>;

/** Hoe lang de groene «Gevonden!»-bevestiging blijft staan voor het resultaat opent. */
const FOUND_MS = 650;

type CameraError = "denied" | "none" | "other";

const CAMERA_ERROR_TEXT: Record<CameraError, { title: string; text: string }> = {
  denied: {
    title: "Geen toegang tot je camera",
    text: "Sta camera-toegang toe in de instellingen van je browser, of kies een screenshot van je kaart.",
  },
  none: {
    title: "Geen camera gevonden",
    text: "Dit toestel heeft geen camera die we kunnen gebruiken. Kies een screenshot van je kaart.",
  },
  other: {
    title: "Camera start niet",
    text: "Probeer het nog eens, of kies een screenshot van je kaart.",
  },
};

function Corner({ className }: { className: string }) {
  return <span aria-hidden className={`absolute size-6 border-current ${className}`} />;
}

/**
 * Canvas «27 · Kaart scannen»: camerabeeld met een brede scanzone (alleen de rand donker),
 * blauwe scanlijn en zaklampknop; bij een treffer kort groen «Gevonden!»; zonder camera-toegang
 * een duidelijke uitleg met «Opnieuw proberen» en «Screenshot kiezen».
 */
export function CameraBarcodeScannerSlideIn({
  open,
  onClose,
  onDecoded,
  onPickScreenshot,
}: {
  open: boolean;
  onClose: () => void;
  onDecoded: (result: DecodeSuccessResult) => void;
  /** Uitweg zonder camera: screenshot van de kaart kiezen. */
  onPickScreenshot?: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const foundTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanningRef = React.useRef(false);
  const closedRef = React.useRef(false);

  const [cameraError, setCameraError] = React.useState<CameraError | null>(null);
  const [cameraReady, setCameraReady] = React.useState(false);
  const [found, setFound] = React.useState(false);
  const [torchAvailable, setTorchAvailable] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  const stopCamera = React.useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setTorchAvailable(false);
    setTorchOn(false);
  }, []);

  React.useEffect(() => {
    if (!open) {
      closedRef.current = true;
      if (foundTimerRef.current) clearTimeout(foundTimerRef.current);
      stopCamera();
      setCameraError(null);
      setFound(false);
      return;
    }

    closedRef.current = false;
    setCameraError(null);
    setCameraReady(false);
    setFound(false);

    let acquired: MediaStream | null = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("none");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((stream) => {
        if (closedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = stream;
        streamRef.current = stream;

        // Zaklamp: enkel tonen als het toestel het ondersteunt (vooral Android/Chrome).
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchAvailable(Boolean(caps.torch));

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        video.play().catch(() => {});

        video.onloadedmetadata = () => {
          if (closedRef.current) return;
          setCameraReady(true);

          intervalRef.current = setInterval(async () => {
            if (scanningRef.current) return;
            const v = videoRef.current;
            const c = canvasRef.current;
            if (!v || !c || v.readyState < 2) return;

            scanningRef.current = true;
            try {
              c.width = v.videoWidth;
              c.height = v.videoHeight;
              const ctx = c.getContext("2d");
              if (!ctx) return;
              ctx.drawImage(v, 0, 0);
              const imageData = ctx.getImageData(0, 0, c.width, c.height);
              const result = await decodeLoyaltyCardFromImageData(imageData, { tryHarder: false });
              if (result.ok && !closedRef.current) {
                if (intervalRef.current !== null) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                setFound(true);
                foundTimerRef.current = setTimeout(() => {
                  stopCamera();
                  onDecoded(result);
                }, FOUND_MS);
              }
            } finally {
              scanningRef.current = false;
            }
          }, 250);
        };
      })
      .catch((err: unknown) => {
        if (closedRef.current) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") setCameraError("denied");
        else if (name === "NotFoundError" || name === "DevicesNotFoundError") setCameraError("none");
        else setCameraError("other");
      });

    return () => {
      closedRef.current = true;
      if (foundTimerRef.current) clearTimeout(foundTimerRef.current);
      if (acquired) acquired.getTracks().forEach((t) => t.stop());
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }

  const error = cameraError ? CAMERA_ERROR_TEXT[cameraError] : null;

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Kaart scannen"
      titleId="camera-scanner-slide-title"
      containerClassName="z-[60]"
      className="md:!max-w-[500px]"
      cancelLabel={null}
      footer={
        error ? (
          <div className="flex w-full flex-col items-center gap-1.5">
            {cameraError !== "none" ? (
              <Button type="button" variant="primary" onClick={() => setAttempt((a) => a + 1)} className="w-full max-w-none">
                Opnieuw proberen
              </Button>
            ) : null}
            {onPickScreenshot ? (
              <button
                type="button"
                onClick={onPickScreenshot}
                className="inline-flex h-11 items-center justify-center self-center rounded-pill px-4 text-[15px] font-bold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                Screenshot kiezen
              </button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {/* Verborgen canvas om beelden uit de video te halen */}
      <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />

      <div className="flex w-full flex-col gap-[18px] pb-2">
        {error ? (
          <div className="flex flex-col items-center gap-2.5 px-2 pb-1.5 pt-6 text-center" role="alert">
            <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-[var(--gray-50)] text-[var(--text-secondary)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-8">
                <path d="M4 4l16 16" />
                <path d="M9.5 5h5l1.5 2H19a2 2 0 0 1 2 2v8.5M17 19H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </span>
            <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{error.title}</p>
            <p className="text-[13.5px] leading-[19px] text-[var(--text-secondary)]">{error.text}</p>
          </div>
        ) : (
          <>
            <div className="relative h-[380px] overflow-hidden rounded-[22px] bg-[#1b1c22] md:h-[320px]">
              <video ref={videoRef} playsInline muted autoPlay className="size-full object-cover" />

              {cameraReady ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {/* Scanzone: alleen de rand eromheen wordt donker */}
                  <div
                    className={`relative h-[47%] w-[76%] max-w-[300px] rounded-[12px] shadow-[0_0_0_999px_rgba(10,10,14,0.55)] transition-colors duration-200 ${found ? "text-[#2fbf71]" : "text-white"}`}
                  >
                    <Corner className="left-0 top-0 rounded-tl-[10px] border-l-[3px] border-t-[3px]" />
                    <Corner className="right-0 top-0 rounded-tr-[10px] border-r-[3px] border-t-[3px]" />
                    <Corner className="bottom-0 left-0 rounded-bl-[10px] border-b-[3px] border-l-[3px]" />
                    <Corner className="bottom-0 right-0 rounded-br-[10px] border-b-[3px] border-r-[3px]" />
                    {found ? (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <span className="flex size-14 items-center justify-center rounded-full bg-[#2fbf71] text-white shadow-[0_0_0_8px_rgba(47,191,113,0.25)] motion-safe:animate-pop">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-7">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>
                      </span>
                    ) : (
                      <span className="scan-line absolute inset-x-3.5 top-1/2 h-0.5 rounded-full bg-[var(--blue-500)] shadow-[0_0_12px_2px_rgba(79,85,241,0.8)]" />
                    )}
                  </div>
                  <span
                    aria-live="polite"
                    className="absolute left-1/2 top-4 inline-flex h-8 -translate-x-1/2 items-center whitespace-nowrap rounded-pill bg-[rgba(16,17,48,0.45)] px-[13px] text-[13px] font-semibold text-white backdrop-blur-[10px]"
                  >
                    {found ? "Gevonden!" : "Richt op de barcode of QR-code"}
                  </span>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-[rgba(255,255,255,0.8)]">
                  <span aria-hidden className="size-7 animate-spin rounded-full border-[3px] border-[rgba(255,255,255,0.25)] border-t-white motion-reduce:animate-none" />
                  Camera starten…
                </div>
              )}

              {cameraReady && torchAvailable && !found ? (
                <button
                  type="button"
                  onClick={() => void toggleTorch()}
                  aria-pressed={torchOn}
                  aria-label={torchOn ? "Zaklamp uit" : "Zaklamp aan"}
                  className={`absolute bottom-3.5 right-3.5 flex size-10 items-center justify-center rounded-full backdrop-blur-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${torchOn ? "bg-white text-[var(--text-primary)]" : "bg-[rgba(16,17,48,0.45)] text-white"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
                    <path d="M9 2h6l-1 6h3l-7 14 1-9H7z" />
                  </svg>
                </button>
              ) : null}
            </div>

            <p className="flex items-center gap-2.5 rounded-[16px] bg-[var(--gray-25)] px-3.5 py-[11px] text-[13px] leading-[18px] text-[var(--text-secondary)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px] shrink-0 text-[var(--blue-500)]">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v.01M11 12h1v5h1" />
              </svg>
              Houd je kaart plat en goed verlicht. Werkt met barcodes en QR-codes.
            </p>
          </>
        )}
      </div>
    </SlideInModal>
  );
}
