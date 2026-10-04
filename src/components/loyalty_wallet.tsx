"use client";

import * as React from "react";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
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

function useIsDarkTheme(): boolean {
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

function CardLogo({ src, size }: { src: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
    <img src={src} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />
  );
}

/** Kop van een walletkaart: logo, naam en het type code. */
function WalletCardHead({ card, accent }: { card: WalletCard; accent: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <CardLogo src={card.logoSrc} size={36} />
      <span className="min-w-0 flex-1 truncate text-base font-semibold leading-6 text-text-primary">{card.cardName}</span>
      <span style={{ color: accent }} className="flex">
        <CodeTypeIcon codeType={card.codeType} />
      </span>
    </span>
  );
}

/** Zichtbare kop van elke kaart in de stapel (Apple Wallet). */
const STRIP = 58;
/** Afstand tussen de kaarten in de opgeschoven stapel onder een geopende kaart. */
const PILE_STEP = 9;
const PILE_PEEK = 72;
const OPEN_GAP = 18;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DURATION = 520;

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
 * Tik op de geopende kaart of op het stapeltje om alles terug te leggen.
 */
export function LoyaltyWallet({ cards, reducedMotion }: { cards: WalletCard[]; reducedMotion: boolean }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
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
  const selected = cards.find((c) => c.id === selectedId) ?? null;
  const openH = selected ? Math.max(cardH, selected.codeType === "qr" ? 330 : 236) : cardH;
  const n = cards.length;
  const pileCount = selected ? n - 1 : 0;
  const height = selected
    ? openH + (pileCount > 0 ? OPEN_GAP + (pileCount - 1) * PILE_STEP + PILE_PEEK : 0)
    : (n - 1) * STRIP + cardH;

  const toggle = (id: string) => {
    setSelectedId((cur) => (cur === id ? null : id));
    const el = rootRef.current;
    if (el && el.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 72, behavior: reducedMotion ? "auto" : "smooth" });
    }
  };

  const transition = reducedMotion
    ? "none"
    : `transform ${DURATION}ms ${EASE}, height ${DURATION}ms ${EASE}, box-shadow ${DURATION}ms ${EASE}`;

  let pileIndex = 0;
  return (
    <div
      ref={rootRef}
      className="relative"
      style={{ height, transition: reducedMotion ? "none" : `height ${DURATION}ms ${EASE}` }}
    >
      {cards.map((card, i) => {
        const isSelected = card.id === selectedId;
        let y: number;
        let scale = 1;
        let h = cardH;
        if (!selected) {
          y = i * STRIP;
        } else if (isSelected) {
          y = 0;
          h = openH;
        } else {
          const j = pileIndex++;
          y = openH + OPEN_GAP + j * PILE_STEP;
          scale = 1 - Math.min(0.06, (pileCount - 1 - j) * 0.012);
        }
        return (
          <WalletCardView
            key={card.id}
            card={card}
            dark={dark}
            open={isSelected}
            showPreview={!selected && i === n - 1}
            onToggle={() => (selected && !isSelected ? setSelectedId(null) : toggle(card.id))}
            style={{
              height: h,
              transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
              zIndex: isSelected ? n + 1 : i + 1,
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
  showPreview,
  onToggle,
  style,
  reducedMotion,
}: {
  card: WalletCard;
  dark: boolean;
  open: boolean;
  showPreview: boolean;
  onToggle: () => void;
  style: React.CSSProperties;
  reducedMotion: boolean;
}) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  const isQr = card.codeType === "qr";
  const fade = (visible: boolean, delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: reducedMotion ? "none" : `opacity 260ms ease ${visible ? delay : 0}ms`,
  });
  return (
    <div
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
        aria-label={open ? `${card.cardName} sluiten` : `${card.cardName} tonen`}
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
        className="pointer-events-none absolute inset-x-4 bottom-4 top-[66px] flex flex-col items-center justify-center gap-2.5 rounded-[14px] bg-white px-4 py-4"
        style={fade(open, 180)}
        aria-hidden={!open}
      >
        {open ? (
          <>
            <LoyaltyCardDisplay codeType={isQr ? "qr" : "barcode"} codeFormat={card.codeFormat} rawValue={card.rawValue} />
            <span className="text-[13px] leading-[18px] text-[#6e7381]">
              {isQr ? "Scan de QR-code aan de kassa" : "Toon de barcode aan de kassa"}
            </span>
          </>
        ) : null}
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
      className="flex aspect-[1.45] w-full flex-col justify-between gap-3 rounded-[20px] p-4 text-left transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      style={{ background: colors.background, boxShadow: `inset 0 0 0 1px ${colors.edge}` }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <CardLogo src={card.logoSrc} size={36} />
        <span className="min-w-0 flex-1 truncate text-base font-semibold leading-6 text-text-primary">{card.cardName}</span>
      </span>
      {/* Echte code als voorbeeld: QR klein links, barcode over de volle breedte. */}
      <span className={cn("flex", isQr ? "justify-start" : "")}>
        <CodePreview card={card} className={isQr ? "!size-[72px]" : "!h-[52px]"} />
      </span>
    </button>
  );
}
