"use client";

import * as React from "react";

export type Rgb = [number, number, number];

const CACHE_KEY = "sl-poster-tints-v1";
const cache = new Map<string, Rgb | null>();
let cacheLoaded = false;

function loadCache() {
  if (cacheLoaded || typeof window === "undefined") return;
  cacheLoaded = true;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    for (const [src, rgb] of Object.entries(JSON.parse(raw) as Record<string, Rgb | null>)) cache.set(src, rgb);
  } catch {
    /* geen opslag: gewoon opnieuw meten */
  }
}

function saveCache() {
  try {
    // Alleen de laatste 80 posters bewaren, anders groeit dit eindeloos.
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(Array.from(cache).slice(-80))));
  } catch {
    /* negeren */
  }
}

/**
 * Sfeerkleur van een poster: kleine canvasweergave, bijna-zwart en bijna-wit overgeslagen, pixels per tint
 * gegroepeerd en gewogen op verzadiging. Zo wint het rood van Daredevil en het groengrijs van Slow Horses,
 * niet het donker dat op bijna elke poster overheerst.
 */
async function measurePosterTint(src: string): Promise<Rgb | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const w = 24, h = 36;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map<number, { weight: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 45 || min > 225) continue;
    const chroma = max - min;
    if (chroma < 14) continue;
    let hue = 0;
    if (max === r) hue = ((g - b) / chroma + 6) % 6;
    else if (max === g) hue = (b - r) / chroma + 2;
    else hue = (r - g) / chroma + 4;
    const key = Math.floor(hue * 2); // 12 tintvakken van 30°
    const weight = chroma / 255;
    const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
    bucket.weight += weight;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    buckets.set(key, bucket);
  }
  let best: { weight: number; r: number; g: number; b: number } | null = null;
  buckets.forEach((bucket) => {
    if (!best || bucket.weight > best.weight) best = bucket;
  });
  if (!best) return null;
  const { weight, r, g, b } = best;
  return [Math.round(r / weight), Math.round(g / weight), Math.round(b / weight)];
}

/** Sfeerkleur van een poster, gecachet per beeld (geheugen + localStorage). `null` zolang onbekend. */
export function usePosterTint(src: string | null): Rgb | null {
  loadCache();
  const [tint, setTint] = React.useState<Rgb | null>(() => (src ? cache.get(src) ?? null : null));
  React.useEffect(() => {
    if (!src) {
      setTint(null);
      return;
    }
    if (cache.has(src)) {
      setTint(cache.get(src) ?? null);
      return;
    }
    let cancelled = false;
    measurePosterTint(src)
      .then((rgb) => {
        cache.set(src, rgb);
        saveCache();
        if (!cancelled) setTint(rgb);
      })
      .catch(() => {
        cache.set(src, null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return tint;
}

function toHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

/**
 * Kleuren voor een kaart in de sfeer van de poster: een zacht verloop achter de poster en een
 * leesbare labelkleur (donker in licht thema, licht in donker thema). Zonder kleur: lavendel.
 */
export function posterTintColors(tint: Rgb | null, dark = false) {
  const [r, g, b] = tint ?? [79, 85, 241];
  const [h, s] = toHsl([r, g, b]);
  const sat = Math.round(Math.min(0.62, Math.max(0.22, s)) * 100);
  return {
    wash: `linear-gradient(100deg, rgba(${r}, ${g}, ${b}, ${dark ? 0.24 : 0.2}) 0%, rgba(${r}, ${g}, ${b}, ${dark ? 0.1 : 0.08}) 45%, rgba(${r}, ${g}, ${b}, 0) 78%)`,
    glow: `rgba(${r}, ${g}, ${b}, ${dark ? 0.45 : 0.38})`,
    label: `hsl(${Math.round(h)} ${sat}% ${dark ? 72 : 34}%)`,
  };
}
