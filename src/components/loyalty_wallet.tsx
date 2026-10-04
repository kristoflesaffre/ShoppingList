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

const LAST_CARD_KEY = "sl-last-loyalty-card";
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

const STRIP_HEIGHT = 64;
const STRIP_OVERLAP = 14;
const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Mobiele wallet (canvas «Kaarten 1b/1c»): de gekozen kaart staat open bovenaan met de code
 * klaar om te scannen; de andere kaarten liggen als gekleurde stroken in een stapel eronder.
 * Een tik op een strook schuift die kaart «uit de stapel» naar boven (FLIP-animatie) terwijl
 * de vorige kaart terugzakt in de stapel en de code openvouwt.
 */
export function LoyaltyWallet({ cards, reducedMotion }: { cards: WalletCard[]; reducedMotion: boolean }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const dark = useIsDarkTheme();
  const nodes = React.useRef(new Map<string, HTMLElement>());
  const before = React.useRef<Map<string, DOMRect> | null>(null);

  // Laatst getoonde kaart onthouden (per toestel).
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LAST_CARD_KEY);
    } catch {
      /* negeren */
    }
    setActiveId((prev) => prev ?? (stored && cards.some((c) => c.id === stored) ? stored : cards[0]?.id ?? null));
  }, [cards]);

  const active = cards.find((c) => c.id === activeId) ?? cards[0];
  const others = cards.filter((c) => c.id !== active?.id);

  const select = (id: string) => {
    if (id === active?.id) return;
    if (!reducedMotion) {
      const rects = new Map<string, DOMRect>();
      nodes.current.forEach((el, key) => rects.set(key, el.getBoundingClientRect()));
      before.current = rects;
    }
    setActiveId(id);
    try {
      window.localStorage.setItem(LAST_CARD_KEY, id);
    } catch {
      /* negeren */
    }
  };

  // FLIP: elke kaart start op haar oude plek en glijdt naar de nieuwe.
  React.useLayoutEffect(() => {
    const prev = before.current;
    if (!prev) return;
    before.current = null;
    nodes.current.forEach((el, key) => {
      const from = prev.get(key);
      if (!from) return;
      const to = el.getBoundingClientRect();
      const dy = from.top - to.top;
      if (Math.abs(dy) < 1) return;
      const isNewActive = key === activeId;
      el.animate(
        [
          { transform: `translateY(${dy}px)${isNewActive ? " scale(0.98)" : ""}` },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: isNewActive ? 520 : 440, easing: SPRING },
      );
    });
  }, [activeId]);

  if (!active) return null;

  const setNode = (id: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <ActiveWalletCard key={active.id} card={active} dark={dark} reducedMotion={reducedMotion} nodeRef={setNode(active.id)} />

      {others.length > 0 ? (
        <>
          <h2 className="px-1 pt-1 text-[13px] font-semibold leading-[18px] text-[var(--text-secondary)]">Andere kaarten</h2>
          <ul className="m-0 list-none p-0">
            {others.map((card, i) => (
              <li
                key={card.id}
                ref={setNode(card.id)}
                className="relative"
                style={{ marginTop: i === 0 ? 0 : -STRIP_OVERLAP, zIndex: i + 1 }}
              >
                <WalletStrip card={card} dark={dark} onSelect={() => select(card.id)} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function WalletStrip({ card, dark, onSelect }: { card: WalletCard; dark: boolean; onSelect: () => void }) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${card.cardName} tonen`}
      className="flex w-full items-start rounded-[20px] px-4 pt-3.5 text-left transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 active:brightness-[0.98]"
      style={{
        height: STRIP_HEIGHT,
        background: colors.background,
        boxShadow: `inset 0 0 0 1px ${colors.edge}, 0 -2px 10px -4px rgba(16,17,48,0.10)`,
      }}
    >
      <WalletCardHead card={card} accent={colors.accent} />
    </button>
  );
}

function ActiveWalletCard({
  card,
  dark,
  reducedMotion,
  nodeRef,
}: {
  card: WalletCard;
  dark: boolean;
  reducedMotion: boolean;
  nodeRef: (el: HTMLElement | null) => void;
}) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  const isQr = card.codeType === "qr";
  return (
    <section
      ref={nodeRef}
      aria-label={`${card.cardName}, klaar om te scannen`}
      className="rounded-[20px] px-4 pb-4 pt-3.5"
      style={{ background: colors.background, boxShadow: `inset 0 0 0 1px ${colors.edge}` }}
    >
      <WalletCardHead card={card} accent={colors.accent} />
      {/* Code vouwt open zodra de kaart bovenaan staat. */}
      <div
        className={cn(
          "mt-4 flex flex-col items-center gap-2.5 rounded-[14px] bg-white px-4 py-[18px]",
          !reducedMotion && "origin-top animate-[wallet-unfold_420ms_cubic-bezier(0.32,0.72,0,1)_80ms_both]",
        )}
      >
        <LoyaltyCardDisplay codeType={isQr ? "qr" : "barcode"} codeFormat={card.codeFormat} rawValue={card.rawValue} />
        <span className="text-[13px] leading-[18px] text-[#6e7381]">
          {isQr ? "Scan de QR-code aan de kassa" : "Toon de barcode aan de kassa"}
        </span>
      </div>
    </section>
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
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${card.cardName} tonen`}
      className="flex aspect-[1.586] w-full flex-col justify-between rounded-[20px] p-4 text-left transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      style={{ background: colors.background, boxShadow: `inset 0 0 0 1px ${colors.edge}` }}
    >
      <span className="flex items-start justify-between">
        <CardLogo src={card.logoSrc} size={40} />
        <span style={{ color: colors.accent }} className="flex">
          <CodeTypeIcon codeType={card.codeType} />
        </span>
      </span>
      <span className="truncate text-base font-semibold leading-6 text-text-primary">{card.cardName}</span>
    </button>
  );
}
