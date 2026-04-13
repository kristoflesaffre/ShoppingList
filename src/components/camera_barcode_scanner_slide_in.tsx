"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { decodeLoyaltyCardFromImageData } from "@/lib/decode_loyalty_card";
import type { DecodeResult } from "@/lib/loyalty_card";

type DecodeSuccessResult = Extract<DecodeResult, { ok: true }>;

export function CameraBarcodeScannerSlideIn({
  open,
  onClose,
  onDecoded,
}: {
  open: boolean;
  onClose: () => void;
  onDecoded: (result: DecodeSuccessResult) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = React.useRef(false);
  const closedRef = React.useRef(false);

  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameraReady, setCameraReady] = React.useState(false);

  const stopCamera = React.useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  React.useEffect(() => {
    if (!open) {
      closedRef.current = true;
      stopCamera();
      setCameraError(null);
      return;
    }

    closedRef.current = false;
    setCameraError(null);
    setCameraReady(false);

    let acquired: MediaStream | null = null;

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
                stopCamera();
                onDecoded(result);
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
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCameraError("Camera-toegang geweigerd. Sta camera-toegang toe in je browserinstellingen.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCameraError("Geen camera gevonden op dit apparaat.");
        } else {
          setCameraError("Camera kon niet worden gestart.");
        }
      });

    return () => {
      closedRef.current = true;
      if (acquired) {
        acquired.getTracks().forEach((t) => t.stop());
      }
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Scan klantenkaart"
      titleId="camera-scanner-slide-title"
      containerClassName="z-[60]"
      bodyFullWidth
      bodyClassName="pb-0 pt-0"
    >
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />

      <div className="flex flex-col items-center gap-4 px-4 pb-6">
        {cameraError ? (
          <div className="flex min-h-[240px] w-full max-w-[480px] flex-col items-center justify-center gap-3 rounded-[12px] bg-[var(--gray-50)] px-6 text-center">
            <span
              aria-hidden="true"
              className="inline-block size-12 shrink-0 bg-[var(--gray-400)]"
              style={{
                WebkitMaskImage: 'url("/icons/camera.svg")',
                maskImage: 'url("/icons/camera.svg")',
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
            <p className="text-sm font-medium text-[var(--text-secondary)]">{cameraError}</p>
          </div>
        ) : (
          <div className="relative w-full max-w-[480px] overflow-hidden rounded-[12px] bg-black" style={{ aspectRatio: "4/3", maxHeight: "min(55dvh, 360px)" }}>
            {/* Video feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />

            {/* Viewfinder overlay */}
            {cameraReady && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* Dark borders around the scan area */}
                <div className="absolute inset-0 bg-black/40" />
                {/* Clear scan window */}
                <div
                  className="relative z-10 rounded-[8px] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
                  style={{ width: "65%", aspectRatio: "1/1" }}
                >
                  {/* Corner accents */}
                  <span className="absolute left-0 top-0 h-5 w-5 rounded-tl-[6px] border-l-2 border-t-2 border-white" />
                  <span className="absolute right-0 top-0 h-5 w-5 rounded-tr-[6px] border-r-2 border-t-2 border-white" />
                  <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-[6px] border-b-2 border-l-2 border-white" />
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-br-[6px] border-b-2 border-r-2 border-white" />
                </div>
              </div>
            )}

            {/* Loading state */}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="route-loading-spinner" />
              </div>
            )}
          </div>
        )}

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Richt je camera op de barcode of QR-code van je klantenkaart
        </p>
      </div>
    </SlideInModal>
  );
}
