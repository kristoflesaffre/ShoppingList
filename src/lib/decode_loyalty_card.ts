import type { DecodeResult, LoyaltyCardCodeType } from "./loyalty_card";

// Matrix/2D formats → "qr", all others → "barcode"
const QR_FORMATS = new Set([
  "QRCode",
  "QRCodeModel1",
  "QRCodeModel2",
  "MicroQRCode",
  "RMQRCode",
  "DataMatrix",
  "PDF417",
  "CompactPDF417",
  "MicroPDF417",
  "Aztec",
  "AztecCode",
  "MaxiCode",
]);

/**
 * Decodeer een barcode/QR-code vanuit een `ImageData` object.
 * Wordt intern gebruikt door `decodeLoyaltyCard` en direct door de live camera scanner.
 */
export async function decodeLoyaltyCardFromImageData(
  imageData: ImageData,
  opts?: { tryHarder?: boolean },
): Promise<DecodeResult> {
  const { readBarcodes } = await import("zxing-wasm/reader");

  const results = await readBarcodes(imageData, {
    formats: [],
    tryHarder: opts?.tryHarder ?? true,
  });

  const hit = results.find((r) => r.isValid);
  if (!hit) {
    return { ok: false, error: "Geen QR-code of barcode gevonden in de screenshot." };
  }

  const fmt = hit.format as string;
  const codeType: LoyaltyCardCodeType = QR_FORMATS.has(fmt) ? "qr" : "barcode";
  return { ok: true, codeType, codeFormat: fmt, rawValue: hit.text };
}

export async function decodeLoyaltyCard(dataUrl: string): Promise<DecodeResult> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, error: "Canvas niet beschikbaar." };
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeLoyaltyCardFromImageData(imageData, { tryHarder: true });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Afbeelding laden mislukt."));
    img.src = dataUrl;
  });
}
