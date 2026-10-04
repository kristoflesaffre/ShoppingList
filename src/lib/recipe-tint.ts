"use client";

import * as React from "react";

/**
 * Receptkleur automatisch uit de foto (canvas «Receptkleur · automatisch uit de foto»).
 * Enkel het midden van het (ronde) bord telt — daar ligt het eten, niet de kom of tafel —,
 * wit/grijs/zwart wordt overgeslagen en verzadigde kleuren wegen zwaarder. De dominante kleur
 * wordt daarna uitgewassen met wit tot de zachte band (detailpagina) en tegel (overzicht).
 */
export type Rgb = [number, number, number];

/** Lavendel als terugval: recept zonder foto of foto die niet gemeten kan worden. */
export const RECIPE_TINT_FALLBACK: Rgb = [79, 85, 241];

const SAMPLE = 64;
const CENTER_RADIUS = 0.34;

/** Dominante kleur uit RGBA-pixels van een vierkant SAMPLE×SAMPLE-beeld (puur, testbaar). */
export function pickRecipeTint(data: ArrayLike<number>, size = SAMPLE): Rgb | null {
  const buckets = new Map<string, { w: number; r: number; g: number; b: number }>();
  const c = (size - 1) / 2;
  const maxD2 = (size * CENTER_RADIUS) ** 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x - c) ** 2 + (y - c) ** 2 > maxD2) continue;
      const i = (y * size + x) * 4;
      if (data[i + 3] < 200) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const sat = max - Math.min(r, g, b);
      if (sat < 40 || max < 50) continue;
      const w = sat / 255;
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      const e = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
      e.w += w;
      e.r += r * w;
      e.g += g * w;
      e.b += b * w;
      buckets.set(key, e);
    }
  }
  let best: { w: number; r: number; g: number; b: number } | null = null;
  buckets.forEach((e) => {
    if (!best || e.w > best.w) best = e;
  });
  if (!best) return null;
  const { w, r, g, b } = best;
  return [Math.round(r / w), Math.round(g / w), Math.round(b / w)];
}

export function mixWithWhite([r, g, b]: Rgb, amount: number): string {
  const m = (v: number) => Math.round(255 * (1 - amount) + v * amount);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

/** Kleuren voor band/tegel; donker thema = zachte tint over het donkere vlak. */
export function recipeTintColors(tint: Rgb | null, dark = false) {
  const base = tint ?? RECIPE_TINT_FALLBACK;
  const [r, g, b] = base;
  if (dark) {
    return { top: `rgba(${r}, ${g}, ${b}, 0.26)`, mid: `rgba(${r}, ${g}, ${b}, 0.12)` };
  }
  // Terugval (geen foto) iets zachter, zodat lavendel niet overheerst.
  return tint
    ? { top: mixWithWhite(base, 0.3), mid: mixWithWhite(base, 0.16) }
    : { top: mixWithWhite(base, 0.12), mid: mixWithWhite(base, 0.06) };
}

/** Korte, stabiele sleutel voor een (mogelijk lange data-)URL. */
export function photoKey(src: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i += src.length > 4096 ? 7 : 1) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${src.length.toString(36)}-${(h >>> 0).toString(36)}`;
}

const CACHE_KEY = "sl-recipe-tints-v1";
const cache = new Map<string, Rgb | null>();
let cacheLoaded = false;
const pending = new Map<string, Promise<Rgb | null>>();

function loadCache() {
  if (cacheLoaded || typeof window === "undefined") return;
  cacheLoaded = true;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, Rgb | null>)) cache.set(k, v);
  } catch {
    /* geen opslag: gewoon opnieuw meten */
  }
}

function saveCache() {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    /* negeren */
  }
}

async function measure(src: string): Promise<Rgb | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SAMPLE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  // Zelfde uitsnede als de ronde foto: vierkant uit het midden.
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, SAMPLE, SAMPLE);
  return pickRecipeTint(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data);
}

/** Receptkleur voor een foto; gemeten in de browser en gecachet (geheugen + localStorage). */
export function useRecipeTint(photoUrl: string | null | undefined): Rgb | null {
  loadCache();
  const key = photoUrl ? photoKey(photoUrl) : "";
  const [tint, setTint] = React.useState<Rgb | null>(() => (key ? cache.get(key) ?? null : null));
  React.useEffect(() => {
    if (!photoUrl || !key) {
      setTint(null);
      return;
    }
    if (cache.has(key)) {
      setTint(cache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    let job = pending.get(key);
    if (!job) {
      job = measure(photoUrl)
        .catch(() => null)
        .then((rgb) => {
          cache.set(key, rgb);
          pending.delete(key);
          saveCache();
          return rgb;
        });
      pending.set(key, job);
    }
    void job.then((rgb) => {
      if (!cancelled) setTint(rgb);
    });
    return () => {
      cancelled = true;
    };
  }, [photoUrl, key]);
  return tint;
}

export function useIsDarkTheme(): boolean {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Hoeveelheid herschalen voor een ander aantal personen ("2 pakken" → "3 pakken"). */
export function scaleQuantity(quantity: string, factor: number): string {
  if (!quantity || factor === 1) return quantity;
  const m = quantity.trim().match(/^(\d+(?:[.,]\d+)?)(\s*.*)$/);
  if (!m) return quantity;
  const value = Number(m[1].replace(",", ".")) * factor;
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")}${m[2]}`;
}
