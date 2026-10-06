"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import { useLoyaltyCardReplace } from "@/components/loyalty_card_editor_slide_in";
import { Button } from "@/components/ui/button";
import type { DecodeResult } from "@/lib/loyalty_card";
import { cn } from "@/lib/utils";

export type WalletCard = {
  id: string;
  codeType: string;
  codeFormat: string;
  rawValue: string;
  cardName: string;
  logoSrc: string;
};

type Rgb = [number, number, number];

const TINT_CACHE_KEY = "sl-logo-tints-v1";
/** Lavendel als terugval zolang het logo nog niet gemeten is (of geen kleur heeft). */
const FALLBACK_TINT: Rgb = [79, 85, 241];

const tintCache = new Map<string, Rgb | null>();
let tintCacheLoaded = false;

function loadTintCache() {
  if (tintCacheLoaded || typeof window === "undefined") return;
  tintCacheLoaded = true;
  try {
    const raw = window.localStorage.getItem(TINT_CACHE_KEY);
    if (!raw) return;
    for (const [src, rgb] of Object.entries(JSON.parse(raw) as Record<string, Rgb | null>)) tintCache.set(src, rgb);
  } catch {
    /* geen opslag beschikbaar: gewoon opnieuw meten */
  }
}

function saveTintCache() {
  try {
    window.localStorage.setItem(TINT_CACHE_KEY, JSON.stringify(Object.fromEntries(tintCache)));
  } catch {
    /* negeren */
  }
}

/**
 * Meest prominente (verzadigde) kleur in het logo: pixels van een kleine canvasweergave,
 * grijzen/wit/zwart overgeslagen, kleuren in emmers gegroepeerd en de grootste emmer gekozen.
 */
async function measureLogoTint(src: string): Promise<Rgb | null> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) < 40) continue;
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  buckets.forEach((bucket) => {
    if (!best || bucket.n > best.n) best = bucket;
  });
  if (!best) return null;
  const { n, r, g, b } = best;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/** Dominante logokleur, gecachet per logo (geheugen + localStorage). */
export function useLogoTint(src: string): Rgb | null {
  loadTintCache();
  const [tint, setTint] = React.useState<Rgb | null>(() => tintCache.get(src) ?? null);
  React.useEffect(() => {
    if (!src) return;
    if (tintCache.has(src)) {
      setTint(tintCache.get(src) ?? null);
      return;
    }
    let cancelled = false;
    measureLogoTint(src)
      .then((rgb) => {
        tintCache.set(src, rgb);
        saveTintCache();
        if (!cancelled) setTint(rgb);
      })
      .catch(() => {
        tintCache.set(src, null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return tint;
}

function mixWithWhite([r, g, b]: Rgb, amount: number): string {
  const m = (v: number) => Math.round(255 * (1 - amount) + v * amount);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

/** Heel licht geel heeft meer kleur nodig om nog als geel te lezen. */
function isYellowish([r, g, b]: Rgb): boolean {
  return r > 200 && g > 180 && b < 120;
}

/** Uitgewassen kaartkleur + iets diepere rand/accent, afgeleid van de logokleur. */
export function cardColors(tint: Rgb | null, dark = false) {
  const base = tint ?? FALLBACK_TINT;
  if (dark) {
    const [r, g, b] = base;
    return {
      background: `rgba(${r}, ${g}, ${b}, 0.16)`,
      edge: `rgba(${r}, ${g}, ${b}, 0.32)`,
      accent: `rgb(${r}, ${g}, ${b})`,
    };
  }
  const yellow = isYellowish(base);
  return {
    background: mixWithWhite(base, yellow ? 0.24 : 0.11),
    edge: mixWithWhite(base, yellow ? 0.32 : 0.2),
    accent: mixWithWhite(base, 0.6),
  };
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

function CodeTypeIcon({ codeType, className }: { codeType: string; className?: string }) {
  return codeType === "qr" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden className={cn("size-4", className)}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className={cn("size-4", className)}>
      <path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12" />
    </svg>
  );
}

function CardLogo({ src, size, morph }: { src: string; size: number; morph?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
    <img src={src} alt="" width={size} height={size} data-morph={morph} className="shrink-0 object-contain" style={{ width: size, height: size }} />
  );
}

/** Kop van een walletkaart: logo, naam en het type code. */
function WalletCardHead({ card, accent }: { card: WalletCard; accent: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <CardLogo src={card.logoSrc} size={36} morph={`logo-${card.id}`} />
      <span className="min-w-0 flex-1 truncate text-base font-semibold leading-6 text-text-primary">
        <span data-morph={`name-${card.id}`} className="inline-block">
          {card.cardName}
        </span>
      </span>
      <span style={{ color: accent }} className="flex">
        <CodeTypeIcon codeType={card.codeType} />
      </span>
    </span>
  );
}

/** Zichtbare kop van elke kaart in de stapel (Apple Wallet). */
const STRIP = 58;
/** Ruimte tussen een opengeklapte kaart en de kaart eronder. */
const OPEN_GAP = 10;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DURATION = 480;
/** Na het openklappen meteen door naar schermvullend (iets vóór het einde, voor één vloeiende beweging). */
const UNFOLD_TO_FULLSCREEN_MS = 336;
/** Openklappen richting schermvullend: duidelijk zichtbaar, lineair zodat de snelheid doorloopt in de morph. */
const FLOW_UNFOLD_MS = 336;


/** Echte code als klein voorbeeld (geschaald), zodat kaarten «echt» ogen nog voor je tikt. */
export function CodePreview({ card, className }: { card: WalletCard; className?: string }) {
  const isQr = card.codeType === "qr";
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none flex items-center justify-center overflow-hidden rounded-[10px] bg-white",
        isQr ? "size-[62px] p-1.5 [&_svg]:!size-full" : "h-[46px] w-full px-2 [&_svg]:!h-full [&_svg]:!w-full",
        className,
      )}
    >
      <LoyaltyCardDisplay codeType={isQr ? "qr" : "barcode"} codeFormat={card.codeFormat} rawValue={card.rawValue} />
    </span>
  );
}

/**
 * Mobiele wallet volgens het Apple Wallet-principe (canvas «Kaarten 1b/1c» + voorbeeld):
 * alle kaarten liggen op elkaar met enkel hun kop zichtbaar; de onderste kaart toont je
 * volledig, met een voorbeeld van de code. Tik op een kaart: die schuift vloeiend naar boven
 * en vouwt open met de scanbare code, de rest zakt samen tot een stapeltje eronder.
 * Nog een tik op de geopende kaart toont hem schermvullend (canvas «Kaartmodal C»);
 * een tik op het stapeltje legt alles terug.
 */
export function LoyaltyWallet({
  cards,
  reducedMotion,
  viewingId,
  onOpen,
}: {
  cards: WalletCard[];
  reducedMotion: boolean;
  /** Kaart die nu schermvullend open is; zodra die sluit, schuift de stapel weer dicht. */
  viewingId: string | null;
  onOpen: (card: WalletCard) => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const pendingRef = React.useRef<number | null>(null);
  const wasViewingRef = React.useRef(false);
  /** Openklappen richting schermvullend: lineair (geen ease-out), zodat de snelheid doorloopt in de morph. */
  const [flowingOpen, setFlowingOpen] = React.useState(false);

  // Terugweg: de schermvullende weergave krimpt eerst terug in de open kaart, daarna klapt de stapel dicht.
  React.useEffect(() => {
    if (viewingId) wasViewingRef.current = true;
    else if (wasViewingRef.current) {
      wasViewingRef.current = false;
      setFlowingOpen(false);
      setSelectedId(null);
    }
  }, [viewingId]);

  React.useEffect(() => () => {
    if (pendingRef.current) window.clearTimeout(pendingRef.current);
  }, []);
  const [width, setWidth] = React.useState(343);
  const dark = useIsDarkTheme();
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 343);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (selectedId && !cards.some((c) => c.id === selectedId)) setSelectedId(null);
  }, [cards, selectedId]);

  const cardH = Math.round(width / 1.586);
  const n = cards.length;
  /** Hoogte van een opengeklapte kaart: kop + wit codevlak (canvas «Kaarten 1b/1c»). */
  const codeH = () => Math.max(cardH, 236);
  const last = cards[n - 1];
  /** Onderste kaart ligt al open: QR-kaarten tonen daar meteen het 1c-codevlak. */
  const isOpen = (card: WalletCard) => card.id === selectedId || (card === last && last.codeType === "qr");

  // Openklappen op de plek zelf: de kaart blijft liggen en groeit, de kaarten eronder schuiven op.
  const ys: number[] = [];
  let y = 0;
  cards.forEach((card, i) => {
    ys.push(y);
    y += isOpen(card) && i < n - 1 ? codeH() + OPEN_GAP : STRIP;
  });
  const lastH = last ? (isOpen(last) ? codeH() : cardH) : 0;
  const height = n ? ys[n - 1] + lastH : 0;

  // Openen richting schermvullend: constante snelheid, geen trage start (en geen afremmen vóór de morph).
  const ease = flowingOpen ? "linear" : EASE;
  const dur = flowingOpen ? FLOW_UNFOLD_MS : DURATION;
  const transition = reducedMotion
    ? "none"
    : `transform ${dur}ms ${ease}, height ${dur}ms ${ease}, box-shadow ${dur}ms ${ease}`;

  return (
    <div
      ref={rootRef}
      className="relative"
      style={{ height, transition: reducedMotion ? "none" : `height ${dur}ms ${ease}` }}
    >
      {cards.map((card, i) => {
        const open = isOpen(card);
        const isLast = i === n - 1;
        return (
          <WalletCardView
            key={card.id}
            card={card}
            dark={dark}
            open={open}
            showCode={open}
            showPreview={isLast && !open}
            onToggle={() => {
              if (pendingRef.current || viewingId) return;
              if (open) {
                onOpen(card);
                return;
              }
              // Eén beweging: de kaart klapt open in de stapel en gaat meteen door naar schermvullend.
              setFlowingOpen(true);
              setSelectedId(card.id);
              pendingRef.current = window.setTimeout(
                () => {
                  pendingRef.current = null;
                  onOpen(card);
                },
                reducedMotion ? 0 : UNFOLD_TO_FULLSCREEN_MS,
              );
            }}
            style={{
              height: open ? codeH() : cardH,
              transform: `translate3d(0, ${ys[i]}px, 0)`,
              zIndex: i + 1,
              transition,
            }}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </div>
  );
}

function WalletCardView({
  card,
  dark,
  open,
  showCode,
  showPreview,
  onToggle,
  style,
  reducedMotion,
}: {
  card: WalletCard;
  dark: boolean;
  open: boolean;
  showCode: boolean;
  showPreview: boolean;
  onToggle: () => void;
  style: React.CSSProperties;
  reducedMotion: boolean;
}) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  const isQr = card.codeType === "qr";
  const fade = (visible: boolean, delay: number, hideDelay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: reducedMotion ? "none" : visible ? `opacity 160ms ease ${delay}ms` : `opacity 160ms ease ${hideDelay}ms`,
  });
  return (
    <div
      data-card-origin={card.id}
      className="absolute inset-x-0 top-0 origin-top overflow-hidden rounded-[20px] will-change-transform"
      style={{
        ...style,
        background: colors.background,
        boxShadow: `inset 0 0 0 1px ${colors.edge}, 0 -1px 12px -6px rgba(16,17,48,0.18)`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? `${card.cardName} schermvullend tonen` : `${card.cardName} tonen`}
        className="absolute inset-0 z-0 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
      />
      <div className="pointer-events-none relative px-4 pt-3.5">
        <WalletCardHead card={card} accent={colors.accent} />
      </div>
      {/* Onderste kaart in de stapel: voorbeeld van de code rechtsonder. */}
      <div className="pointer-events-none absolute bottom-4 right-4" style={fade(showPreview, 120)}>
        <CodePreview card={card} className={isQr ? "" : "!w-[132px]"} />
      </div>
      {/* Geopende kaart: scanbare code. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 bottom-4 top-[66px] flex items-center justify-center rounded-[14px] bg-white px-4 py-[18px]",
          isQr ? "[&_svg]:!h-full [&_svg]:!w-auto [&_svg]:aspect-square" : "[&_svg]:!h-full [&_svg]:!w-full",
        )}
        // Openen: meteen zichtbaar (de kaart eronder schuift ervan weg); dichtklappen: pas weg als hij bedekt is.
        style={fade(showCode, 0, DURATION)}
        data-morph={`code-${card.id}`}
        aria-hidden={!showCode}
      >
        <LoyaltyCardDisplay codeType={isQr ? "qr" : "barcode"} codeFormat={card.codeFormat} rawValue={card.rawValue} stretch={!isQr} />
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className="size-5">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

/** Grote, scanbare code in een wit vlak (zonder uitlegtekst). */
function BigCode({ card, qrSize, barHeight }: { card: WalletCard; qrSize: string; barHeight: number }) {
  const isQr = card.codeType === "qr";
  return (
    <div
      data-morph={`code-${card.id}`}
      className="flex w-full items-center justify-center rounded-[28px] bg-white p-[26px] shadow-[0_16px_40px_-16px_rgba(16,17,48,0.25)]"
    >
      {isQr ? (
        <div data-morph-inner className="aspect-square [&_svg]:!size-full" style={{ width: qrSize }}>
          <LoyaltyCardDisplay codeType="qr" codeFormat={card.codeFormat} rawValue={card.rawValue} />
        </div>
      ) : (
        <div className="w-full [&_svg]:!h-full [&_svg]:!w-full" style={{ height: barHeight }}>
          <LoyaltyCardDisplay codeType="barcode" codeFormat={card.codeFormat} rawValue={card.rawValue} stretch />
        </div>
      )}
    </div>
  );
}

const roundGlass =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.75)] text-text-primary backdrop-blur-sm transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50";

/**
 * Veereffect als CSS `linear()`-curve: gedempte veer (ζ≈0.7) met een lichte overshoot van ~4%.
 * Browsers zonder `linear()` krijgen een cubic-bezier met kleine bounce.
 */
const SPRING_EASE: string = (() => {
  const fallback = "cubic-bezier(0.34, 1.28, 0.64, 1)";
  if (typeof window === "undefined" || !window.CSS?.supports?.("animation-timing-function", "linear(0, 1)")) return fallback;
  const zeta = 0.7;
  const omega = 11;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const v = 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    pts.push(v.toFixed(4));
  }
  pts[pts.length - 1] = "1";
  return `linear(${pts.join(", ")})`;
})();
const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Zichtbare kaart in de stapel of het raster waar de weergave uit «groeit». */
function originRect(id: string): DOMRect | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-card-origin="${CSS.escape(id)}"]`);
  for (const el of Array.from(els)) {
    if (el.offsetParent !== null) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
  }
  return null;
}

/** Inhoud (logo, naam, code, knoppen) veert kort na de vorm binnen, licht verspringend. */
function staggerIn(root: HTMLElement, baseDelay: number) {
  root.querySelectorAll<HTMLElement>("[data-viewer-stagger]").forEach((el) => {
    const step = Number(el.dataset.viewerStagger) || 0;
    el.animate(
      [
        { opacity: 0, transform: "translateY(18px) scale(0.96)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 620, delay: baseDelay + step * 55, easing: SPRING_EASE, fill: "backwards" },
    );
  });
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

type MorphPart = { el: HTMLElement; dx: number; dy: number; sx: number; sy: number; inner?: { el: HTMLElement; k: number } };

/**
 * Shared-element morph (mobiel): de kaart groeit tot het volledige scherm, en logo, naam en het
 * codevlak bewegen en schalen van hun plek op de kaart naar hun plek in de schermvullende weergave.
 * De QR-code zelf blijft daarbij vierkant (tegenschaal binnen het witte vlak).
 */
function measureMorph(root: HTMLElement, id: string): { card: DOMRect | null; parts: MorphPart[] } {
  const visibleOutside = (sel: string) =>
    Array.from(document.querySelectorAll<HTMLElement>(sel)).find((el) => !root.contains(el) && el.offsetParent !== null) ?? null;
  const inside = (sel: string) => {
    const page = root.querySelector<HTMLElement>(`[data-viewer-page="${CSS.escape(id)}"]`);
    return page?.querySelector<HTMLElement>(sel) ?? null;
  };
  const parts: MorphPart[] = [];
  for (const key of ["logo", "name", "code"]) {
    const sel = `[data-morph="${key}-${CSS.escape(id)}"]`;
    const src = visibleOutside(sel);
    const dst = inside(sel);
    if (!src || !dst) continue;
    const a = src.getBoundingClientRect();
    const b = dst.getBoundingClientRect();
    if (!a.width || !b.width) continue;
    const part: MorphPart = {
      el: dst,
      dx: a.left + a.width / 2 - (b.left + b.width / 2),
      dy: a.top + a.height / 2 - (b.top + b.height / 2),
      sx: a.width / b.width,
      sy: key === "code" ? a.height / b.height : a.width / b.width,
    };
    if (key === "code") {
      const innerDst = dst.querySelector<HTMLElement>("[data-morph-inner]");
      const srcSvg = src.querySelector("svg")?.getBoundingClientRect();
      if (innerDst && srcSvg?.width) part.inner = { el: innerDst, k: srcSvg.width / innerDst.getBoundingClientRect().width };
    }
    parts.push(part);
  }
  return { card: originRect(id), parts };
}

function applyMorph(root: HTMLElement, card: DOMRect | null, parts: MorphPart[], p: number) {
  if (card) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const q = 1 - p;
    root.style.clipPath = `inset(${card.top * q}px ${(vw - card.right) * q}px ${(vh - card.bottom) * q}px ${card.left * q}px round ${Math.max(0, 20 * q)}px)`;
  }
  for (const part of parts) {
    const sx = lerp(part.sx, 1, p);
    const sy = lerp(part.sy, 1, p);
    part.el.style.transformOrigin = "50% 50%";
    part.el.style.transform = `translate(${part.dx * (1 - p)}px, ${part.dy * (1 - p)}px) scale(${sx}, ${sy})`;
    if (part.inner) {
      const k = lerp(part.inner.k, 1, p);
      part.inner.el.style.transform = `scale(${k / sx}, ${k / sy})`;
    }
  }
}

function clearMorph(root: HTMLElement, parts: MorphPart[]) {
  root.style.clipPath = "";
  for (const part of parts) {
    part.el.style.transform = "";
    part.el.style.transformOrigin = "";
    if (part.inner) part.inner.el.style.transform = "";
  }
}

function runMorph(
  root: HTMLElement,
  card: DOMRect | null,
  parts: MorphPart[],
  { from, to, duration, ease }: { from: number; to: number; duration: number; ease: (t: number) => number },
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    applyMorph(root, card, parts, from);
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      applyMorph(root, card, parts, lerp(from, to, ease(t)));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/**
 * Kaart bekijken (canvas «Kaartmodal C»). Mobiel: schermvullend in de kaartkleur met logo, naam
 * en een grote code; swipe opzij naar de volgende kaart. Desktop: grote modal in de kaartkleur
 * met «Verwijderen» linksboven en sluiten rechtsboven.
 */
export function LoyaltyCardViewer({
  cards,
  openId,
  onClose,
  onSaveDecoded,
  onDelete,
  deletingId,
}: {
  cards: WalletCard[];
  openId: string | null;
  onClose: () => void;
  /** Nieuwe code bewaren na scannen of screenshot (bewerkstand in de weergave zelf). */
  onSaveDecoded: (card: WalletCard, result: Extract<DecodeResult, { ok: true }>) => Promise<void>;
  onDelete: (card: WalletCard) => void;
  deletingId: string | null;
}) {
  const dark = useIsDarkTheme();
  const startIndex = Math.max(0, cards.findIndex((c) => c.id === openId));
  const [index, setIndex] = React.useState(startIndex);
  const pagerRef = React.useRef<HTMLDivElement>(null);
  const mobileRef = React.useRef<HTMLDivElement>(null);
  const desktopRef = React.useRef<HTMLDivElement>(null);
  const scrimRef = React.useRef<HTMLDivElement>(null);
  const closingRef = React.useRef(false);
  const open = openId !== null && cards.some((c) => c.id === openId);
  const indexRef = React.useRef(index);
  indexRef.current = index;
  const current: WalletCard | undefined = cards[Math.min(index, cards.length - 1)];

  // Bewerkstand: potlood toont de knoppen om de code te vervangen, gewoon in deze weergave.
  const [editing, setEditing] = React.useState(false);
  const replace = useLoyaltyCardReplace(
    React.useCallback(async (result) => {
      if (current) await onSaveDecoded(current, result);
    }, [current, onSaveDecoded]),
    React.useCallback(() => setEditing(false), []),
    { cardName: current?.cardName, logoSrc: current?.logoSrc || null },
  );
  const { reset: resetReplace, busy: replaceBusy } = replace;
  React.useEffect(() => {
    if (!open) {
      setEditing(false);
      resetReplace();
    }
  }, [open, resetReplace]);

  React.useLayoutEffect(() => {
    if (!open) return;
    setIndex(startIndex);
    const el = pagerRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
    closingRef.current = false;
    if (!openId || prefersReducedMotion()) return;

    // Openen: de weergave groeit uit de aangetikte kaart (vorm + kleur lopen door) met een lichte veer.
    const from = originRect(openId);
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (!desktop && mobileRef.current) {
      const root = mobileRef.current;
      if (from) {
        const { card, parts } = measureMorph(root, openId);
        applyMorph(root, card, parts, 0);
        // Zelfde duur als sluiten; vertrekt meteen op snelheid (ease-out), zonder trage aanloop.
        void runMorph(root, card, parts, { from: 0, to: 1, duration: 460, ease: easeOutCubic }).then(() => clearMorph(root, parts));
      } else {
        root.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: SPRING_EASE });
      }
      root.querySelectorAll<HTMLElement>("[data-viewer-stagger]").forEach((el) =>
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 300, fill: "backwards" }),
      );
    } else if (desktop && desktopRef.current) {
      const dialog = desktopRef.current;
      const d = dialog.getBoundingClientRect();
      const transformFrom = from
        ? `translate(${from.left + from.width / 2 - (d.left + d.width / 2)}px, ${from.top + from.height / 2 - (d.top + d.height / 2)}px) scale(${from.width / d.width})`
        : "translateY(24px) scale(0.94)";
      dialog.animate([{ transform: transformFrom, opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 600, easing: SPRING_EASE });
      scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
      staggerIn(dialog, 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enkel bij openen naar de gekozen kaart springen
  }, [open, openId]);

  /** Sluiten: terug krimpen naar de kaart in de stapel (of het raster), daarna pas ontkoppelen. */
  const requestClose = React.useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const card = cards[Math.min(indexRef.current, cards.length - 1)];
    if (!card || prefersReducedMotion()) {
      onClose();
      return;
    }
    const to = originRect(card.id);
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    try {
      if (!desktop && mobileRef.current) {
        const root = mobileRef.current;
        if (to) {
          // Terug in de kaart: dezelfde morph achterwaarts, daarna kort vervagen.
          root.querySelectorAll<HTMLElement>("[data-viewer-stagger]").forEach((el) =>
            el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }),
          );
          const { card: rect, parts } = measureMorph(root, card.id);
          // Eindigt exact op de open kaart; meteen daarna schuift de stapel dicht (geen pauze, geen fade).
          await runMorph(root, rect, parts, { from: 1, to: 0, duration: 460, ease: easeInOutCubic });
        } else {
          await root.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(24px)" }], {
            duration: 360,
            easing: EASE_IN_OUT,
            fill: "forwards",
          }).finished;
        }
      } else if (desktop && desktopRef.current) {
        const dialog = desktopRef.current;
        const d = dialog.getBoundingClientRect();
        const transformTo = to
          ? `translate(${to.left + to.width / 2 - (d.left + d.width / 2)}px, ${to.top + to.height / 2 - (d.top + d.height / 2)}px) scale(${to.width / d.width})`
          : "translateY(16px) scale(0.96)";
        scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-in", fill: "forwards" });
        await dialog.animate([{ transform: "none", opacity: 1 }, { transform: transformTo, opacity: 0 }], {
          duration: 320,
          easing: EASE_IN_OUT,
          fill: "forwards",
        }).finished;
      }
    } catch {
      /* animatie onderbroken: gewoon sluiten */
    }
    onClose();
  }, [cards, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || replaceBusy || document.querySelector('[aria-labelledby="confirm-delete-title"]')) return;
      if (editing) setEditing(false);
      else void requestClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, requestClose, replaceBusy, editing]);

  if (!open || !current || typeof document === "undefined") return null;

  const editButtons = (
    <EditActions error={replace.decodeError} onCamera={replace.startCamera} onUpload={replace.startUpload} />
  );
  const editActions = editing ? editButtons : null;

  return ReactDOM.createPortal(
    <>
      {/* Mobiel: schermvullend, horizontaal swipen tussen kaarten. */}
      <div
        ref={mobileRef}
        role="dialog"
        aria-modal="true"
        aria-label={current.cardName}
        className="fixed inset-0 z-[45] bg-[var(--bg-app)] will-change-[clip-path] md:hidden"
      >
        <div
          ref={pagerRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
            if (i !== index) setIndex(i);
          }}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((card) => (
            <ViewerPage key={card.id} card={card} dark={dark} actions={card.id === current.id ? editActions : null} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[calc(16px+env(safe-area-inset-top,0px))]">
          <button type="button" aria-label="Sluiten" data-viewer-stagger="3" onClick={() => void requestClose()} className={cn(roundGlass, "pointer-events-auto")}>
            <CloseIcon />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`${current.cardName} bewerken`}
              aria-pressed={editing}
              onClick={() => setEditing((v) => !v)}
              data-viewer-stagger="3"
              className={cn(
                roundGlass,
                "pointer-events-auto transition-colors",
                editing ? "!bg-[var(--blue-500)] !text-white" : "!text-[var(--blue-500)]",
              )}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              aria-label={`${current.cardName} verwijderen`}
              disabled={deletingId === current.id}
              onClick={() => onDelete(current)}
              data-viewer-stagger="3"
              className={cn(roundGlass, "pointer-events-auto !text-[var(--error-400)]")}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        {cards.length > 1 ? <ViewerDots cards={cards} index={index} dark={dark} /> : null}
      </div>

      {/* Desktop: grote modal in de kaartkleur. */}
      <DesktopViewer
        card={current}
        dark={dark}
        dialogRef={desktopRef}
        scrimRef={scrimRef}
        onClose={() => void requestClose()}
        editing={editing}
        onToggleEdit={() => setEditing((v) => !v)}
        actions={editButtons}
        onDelete={() => onDelete(current)}
        deleting={deletingId === current.id}
      />
      {replace.elements}
    </>,
    document.body,
  );
}

/** Knoppen in de bewerkstand: nieuwe code via camera of screenshot. */
function EditActions({ error, onCamera, onUpload }: { error: string | null; onCamera: () => void; onUpload: () => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 motion-safe:animate-fade-up md:!animate-none">
      {error ? <p className="text-center text-xs text-[var(--error-400)]">{error}</p> : null}
      <Button type="button" variant="primary" onClick={onCamera} className="!max-w-none">
        Scan met camera
      </Button>
      <Button type="button" variant="secondary" onClick={onUpload} className="!max-w-none !bg-white">
        Screenshot opladen
      </Button>
    </div>
  );
}

function ViewerDots({ cards, index, dark }: { cards: WalletCard[]; index: number; dark: boolean }) {
  const accent = cardColors(useLogoTint(cards[index]?.logoSrc ?? ""), dark).accent;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(28px+env(safe-area-inset-bottom,0px))] flex justify-center gap-1.5" aria-hidden>
      {cards.map((card, i) => (
        <span
          key={card.id}
          className="h-1.5 rounded-full transition-[width,background-color] duration-200"
          style={i === index ? { width: 18, background: accent } : { width: 6, background: "rgba(16,17,48,0.15)" }}
        />
      ))}
    </div>
  );
}

function ViewerPage({ card, dark, actions }: { card: WalletCard; dark: boolean; actions: React.ReactNode }) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  return (
    <section
      data-viewer-page={card.id}
      className="flex h-full w-full shrink-0 snap-center flex-col items-center px-5 pt-[calc(88px+env(safe-area-inset-top,0px))]"
      style={{ background: colors.background }}
    >
      <div className="flex flex-col items-center gap-2.5">
        <CardLogo src={card.logoSrc} size={64} morph={`logo-${card.id}`} />
        <h2 data-morph={`name-${card.id}`} className="text-[24px] font-bold leading-8 tracking-[-0.01em] text-text-primary">
          {card.cardName}
        </h2>
      </div>
      <div className="mt-9 w-full">
        <BigCode card={card} qrSize="min(298px, calc(100vw - 92px))" barHeight={150} />
      </div>
      {actions ? <div className="mt-6 w-full">{actions}</div> : null}
    </section>
  );
}

function DesktopViewer({
  card,
  dark,
  dialogRef,
  scrimRef,
  onClose,
  editing,
  onToggleEdit,
  actions,
  onDelete,
  deleting,
}: {
  card: WalletCard;
  dark: boolean;
  dialogRef: React.RefObject<HTMLDivElement>;
  scrimRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  editing: boolean;
  onToggleEdit: () => void;
  actions: React.ReactNode;
  onDelete: () => void;
  deleting: boolean;
}) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  const editAreaRef = React.useRef<HTMLDivElement>(null);
  // Dichtgeklapte knoppen niet focusbaar (React 18 kent `inert` nog niet als prop).
  React.useEffect(() => {
    if (editAreaRef.current) editAreaRef.current.inert = !editing;
  }, [editing]);
  return (
    <div className="fixed inset-0 z-[45] hidden items-center justify-center p-6 md:flex">
      <div ref={scrimRef} aria-hidden className="absolute inset-0 bg-[rgba(16,17,48,0.45)]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={card.cardName}
        className="relative flex w-full max-w-[520px] flex-col items-center overflow-hidden rounded-[32px] bg-[var(--bg-app)] shadow-[0_30px_80px_-20px_rgba(16,17,48,0.45)]"
      >
        <div className="flex w-full flex-col items-center px-7 pb-[26px] pt-[22px]" style={{ background: colors.background }}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleEdit}
                aria-pressed={editing}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  editing
                    ? "bg-[var(--blue-500)] text-white"
                    : "bg-[rgba(255,255,255,0.75)] text-[var(--blue-500)] [@media(hover:hover)]:hover:bg-white",
                )}
              >
                <PencilIcon />
                Bewerken
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[rgba(255,255,255,0.75)] px-3.5 text-sm font-semibold text-[var(--error-400)] transition-colors [@media(hover:hover)]:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
              >
                <TrashIcon />
                {deleting ? "Verwijderen…" : "Verwijderen"}
              </button>
            </div>
            <button type="button" aria-label="Sluiten" onClick={onClose} className={cn(roundGlass, "!size-10 [@media(hover:hover)]:hover:bg-white")}>
              <CloseIcon />
            </button>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2.5" data-viewer-stagger="0">
            <CardLogo src={card.logoSrc} size={60} />
            <h2 className="text-[24px] font-bold leading-8 tracking-[-0.01em] text-text-primary">{card.cardName}</h2>
          </div>
          <div className="mt-6 w-full" data-viewer-stagger="1">
            <BigCode card={card} qrSize="240px" barHeight={154} />
          </div>
          {/* Bewerkstand: het kader groeit vloeiend in hoogte, daarna schuiven de knoppen in. */}
          <div
            className={cn(
              "grid w-full transition-[grid-template-rows] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              editing ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
            ref={editAreaRef}
            aria-hidden={!editing}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  "px-1 pb-1 pt-5 transition-[opacity,transform] motion-reduce:transition-none",
                  editing
                    ? "translate-y-0 opacity-100 delay-[120ms] duration-[360ms] ease-out"
                    : "translate-y-3 opacity-0 duration-150 ease-in",
                )}
              >
                {actions}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Desktop: alle kaarten als bankkaarten in een raster, in de uitgewassen logokleur. */
export function LoyaltyCardGrid({ cards, onOpen }: { cards: WalletCard[]; onOpen: (card: WalletCard) => void }) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-4 p-0 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.id}>
          <GridCard card={card} onOpen={() => onOpen(card)} />
        </li>
      ))}
    </ul>
  );
}

function GridCard({ card, onOpen }: { card: WalletCard; onOpen: () => void }) {
  const dark = useIsDarkTheme();
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  const isQr = card.codeType === "qr";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${card.cardName} tonen`}
      data-card-origin={card.id}
      className="flex aspect-[1.586] w-full flex-col justify-between rounded-[20px] p-4 text-left transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      style={{ background: colors.background, boxShadow: `inset 0 0 0 1px ${colors.edge}` }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <CardLogo src={card.logoSrc} size={36} />
        <span className="min-w-0 flex-1 truncate text-base font-semibold leading-6 text-text-primary">{card.cardName}</span>
      </span>
      {/* Canvas «Kaarten D3»: echte code rechtsonder in een even hoog wit vlak (QR vierkant, barcode breder). */}
      <span className="flex justify-end">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none flex items-center justify-center overflow-hidden rounded-[12px] bg-white",
            isQr ? "size-20 p-2 [&_svg]:!size-full" : "h-20 w-[150px] px-3.5 py-3 [&_svg]:!h-full [&_svg]:!w-full",
          )}
        >
          <LoyaltyCardDisplay codeType={isQr ? "qr" : "barcode"} codeFormat={card.codeFormat} rawValue={card.rawValue} stretch />
        </span>
      </span>
    </button>
  );
}
