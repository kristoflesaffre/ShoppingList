"use client";

import * as React from "react";
import type { LoyaltyCardCodeType } from "@/lib/loyalty_card";
import { cn } from "@/lib/utils";

type Props = {
  codeType: LoyaltyCardCodeType;
  codeFormat: string;
  rawValue: string;
  /** `fullscreen` = grotere QR/streepjescode voor het swipe-paneel op het lijstje. */
  displaySize?: "default" | "fullscreen";
  /** Alleen QR: pixelmaat binnen Figma 256px-kader (bijv. 248 met p-4). */
  fullscreenQrSize?: number;
};

/**
 * Rendert een QR-code of barcode op basis van het gedecodeerde klantenkaart-type.
 * QR/2D → react-qr-code SVG; lineaire barcodes → jsbarcode SVG.
 */
export function LoyaltyCardDisplay({
  codeType,
  codeFormat,
  rawValue,
  displaySize = "default",
  fullscreenQrSize,
}: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const isFullscreen = displaySize === "fullscreen";

  React.useEffect(() => {
    if (codeType !== "barcode") return;
    if (!svgRef.current || !rawValue) return;

    const margin = isFullscreen ? 12 : 8;
    const barcodeOpts = {
      displayValue: false,
      margin,
      ...(isFullscreen
        ? { width: 2.5, height: 120 }
        : {}),
    };

    // Dynamisch importeren zodat jsbarcode niet in de server bundle belandt
    import("jsbarcode").then(({ default: JsBarcode }) => {
      if (!svgRef.current) return;
      try {
        JsBarcode(svgRef.current, rawValue, {
          format: codeFormat,
          ...barcodeOpts,
        });
      } catch {
        // Ongekend barcode-formaat: val terug op auto-detect
        JsBarcode(svgRef.current, rawValue, {
          format: "auto",
          ...barcodeOpts,
        });
      }
    }).catch(() => {
      // jsbarcode kon niet geladen worden
    });
  }, [codeType, codeFormat, rawValue, isFullscreen]);

  if (codeType === "qr") {
    return (
      <QrDisplay
        value={rawValue}
        displaySize={displaySize}
        fullscreenQrSize={fullscreenQrSize}
      />
    );
  }

  return (
    <svg
      ref={svgRef}
      aria-label="Barcode"
      className={cn(
        "max-w-full",
        isFullscreen && "max-h-[min(40vh,200px)] w-full",
      )}
    />
  );
}

/** Lazy-loads react-qr-code om de initiële bundle klein te houden. */
function QrDisplay({
  value,
  displaySize,
  fullscreenQrSize,
}: {
  value: string;
  displaySize: "default" | "fullscreen";
  fullscreenQrSize?: number;
}) {
  const [QRCode, setQRCode] = React.useState<React.ComponentType<{ value: string; size: number }> | null>(null);
  const [pxSize, setPxSize] = React.useState(() =>
    displaySize === "fullscreen"
      ? (fullscreenQrSize ?? 280)
      : 200,
  );

  React.useEffect(() => {
    import("react-qr-code")
      .then((mod) => {
        const Cmp =
          (mod as { default?: React.ComponentType<{ value: string; size: number }> })
            .default ??
          (mod as { QRCode?: React.ComponentType<{ value: string; size: number }> })
            .QRCode;
        if (Cmp != null) setQRCode(() => Cmp as React.ComponentType<{ value: string; size: number }>);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (displaySize !== "fullscreen") {
      setPxSize(200);
      return;
    }
    if (typeof fullscreenQrSize === "number" && fullscreenQrSize > 0) {
      setPxSize(fullscreenQrSize);
      return;
    }
    const ro = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 400;
      setPxSize(Math.min(320, Math.max(240, Math.floor(w * 0.78))));
    };
    ro();
    window.addEventListener("resize", ro);
    return () => window.removeEventListener("resize", ro);
  }, [displaySize, fullscreenQrSize]);

  if (!QRCode) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-[var(--text-tertiary)]",
          displaySize === "fullscreen" ? "size-64" : "size-48",
        )}
        aria-label="QR-code laden…"
      >
        Laden…
      </div>
    );
  }

  if (typeof QRCode !== "function") {
    return null;
  }
  return <QRCode value={value} size={pxSize} />;
}
