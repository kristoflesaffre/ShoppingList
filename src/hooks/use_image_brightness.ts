"use client";

import * as React from "react";

/** Deel van een beeld, als fracties van breedte en hoogte (0–1). */
export type ImageRegion = { x0: number; y0: number; x1: number; y1: number };

const cache = new Map<string, number | null>();

/** Gemiddelde waargenomen helderheid (0 = zwart, 1 = wit) van een stuk van een beeld. */
async function measureBrightness(src: string, region: ImageRegion): Promise<number | null> {
  // Via fetch, zoals usePosterTint: een beeld dat al zonder CORS in het geheugen zit, zou het canvas besmetten.
  const res = await fetch(src, { mode: "cors" });
  if (!res.ok) return null;
  const img = await createImageBitmap(await res.blob());
  const w = 32, h = 18;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const sx = img.width * region.x0, sy = img.height * region.y0;
  ctx.drawImage(img, sx, sy, img.width * region.x1 - sx, img.height * region.y1 - sy, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  return sum / (data.length / 4);
}

/**
 * Is een stuk van een beeld licht? Voor knoppen die over een foto liggen: op een lichte plek krijgen ze
 * een donkere ondergrond. `null` zolang het niet gemeten is (of meten niet lukt).
 */
export function useImageRegionIsLight(src: string | null | undefined, region: ImageRegion, threshold = 0.55): boolean | null {
  const key = src ? `${src}|${region.x0},${region.y0},${region.x1},${region.y1}` : null;
  const [value, setValue] = React.useState<number | null>(() => (key ? cache.get(key) ?? null : null));
  React.useEffect(() => {
    if (!src || !key) {
      setValue(null);
      return;
    }
    if (cache.has(key)) {
      setValue(cache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    measureBrightness(src, region)
      .then((v) => {
        cache.set(key, v);
        if (!cancelled) setValue(v);
      })
      .catch(() => cache.set(key, null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- region zit al in key
  }, [key]);
  return value == null ? null : value > threshold;
}
