"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
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
 * Nog een tik op de geopende kaart toont hem schermvullend (canvas «Kaartmodal C»);
 * een tik op het stapeltje legt alles terug.
 */
export function LoyaltyWallet({
  cards,
  reducedMotion,
  onOpen,
}: {
  cards: WalletCard[];
  reducedMotion: boolean;
  onOpen: (card: WalletCard) => void;
}) {
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
  const codeH = (card: WalletCard) => Math.max(cardH, card.codeType === "qr" ? 330 : 236);
  const openH = selected ? codeH(selected) : cardH;
  const n = cards.length;
  const pileCount = selected ? n - 1 : 0;
  const height = selected
    ? openH + (pileCount > 0 ? OPEN_GAP + (pileCount - 1) * PILE_STEP + PILE_PEEK : 0)
    : (n - 1) * STRIP + cardH;

  const select = (id: string) => {
    setSelectedId(id);
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
            showCode={isSelected}
            showPreview={!selected && i === n - 1}
            onToggle={() => {
              if (isSelected) {
                // Schermvullend tonen en de stapel meteen terug dichtklappen voor als je terugkomt.
                onOpen(card);
                setSelectedId(null);
              }
              else if (selected) setSelectedId(null);
              else select(card.id);
            }}
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
        className="pointer-events-none absolute inset-x-4 bottom-4 top-[66px] flex items-center justify-center rounded-[14px] bg-white p-4"
        style={fade(showCode, 180)}
        aria-hidden={!showCode}
      >
        {showCode ? (
          <LoyaltyCardDisplay codeType={isQr ? "qr" : "barcode"} codeFormat={card.codeFormat} rawValue={card.rawValue} />
        ) : null}
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
    <div className="flex w-full items-center justify-center rounded-[28px] bg-white p-[26px] shadow-[0_16px_40px_-16px_rgba(16,17,48,0.25)]">
      {isQr ? (
        <div className="aspect-square [&_svg]:!size-full" style={{ width: qrSize }}>
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
 * Kaart bekijken (canvas «Kaartmodal C»). Mobiel: schermvullend in de kaartkleur met logo, naam
 * en een grote code; swipe opzij naar de volgende kaart. Desktop: grote modal in de kaartkleur
 * met «Verwijderen» linksboven en sluiten rechtsboven.
 */
export function LoyaltyCardViewer({
  cards,
  openId,
  onClose,
  onDelete,
  deletingId,
}: {
  cards: WalletCard[];
  openId: string | null;
  onClose: () => void;
  onDelete: (card: WalletCard) => void;
  deletingId: string | null;
}) {
  const dark = useIsDarkTheme();
  const startIndex = Math.max(0, cards.findIndex((c) => c.id === openId));
  const [index, setIndex] = React.useState(startIndex);
  const pagerRef = React.useRef<HTMLDivElement>(null);
  const open = openId !== null && cards.some((c) => c.id === openId);

  React.useLayoutEffect(() => {
    if (!open) return;
    setIndex(startIndex);
    const el = pagerRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enkel bij openen naar de gekozen kaart springen
  }, [open, openId]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[aria-labelledby="confirm-delete-title"]')) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const current = cards[Math.min(index, cards.length - 1)];

  return ReactDOM.createPortal(
    <>
      {/* Mobiel: schermvullend, horizontaal swipen tussen kaarten. */}
      <div role="dialog" aria-modal="true" aria-label={current.cardName} className="fixed inset-0 z-[45] bg-[var(--bg-app)] md:hidden motion-safe:animate-fade-up">
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
            <ViewerPage key={card.id} card={card} dark={dark} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[calc(16px+env(safe-area-inset-top,0px))]">
          <button type="button" aria-label="Sluiten" onClick={onClose} className={cn(roundGlass, "pointer-events-auto")}>
            <CloseIcon />
          </button>
          <button
            type="button"
            aria-label={`${current.cardName} verwijderen`}
            disabled={deletingId === current.id}
            onClick={() => onDelete(current)}
            className={cn(roundGlass, "pointer-events-auto !text-[var(--error-400)]")}
          >
            <TrashIcon />
          </button>
        </div>
        {cards.length > 1 ? <ViewerDots cards={cards} index={index} dark={dark} /> : null}
      </div>

      {/* Desktop: grote modal in de kaartkleur. */}
      <DesktopViewer card={current} dark={dark} onClose={onClose} onDelete={() => onDelete(current)} deleting={deletingId === current.id} />
    </>,
    document.body,
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

function ViewerPage({ card, dark }: { card: WalletCard; dark: boolean }) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  return (
    <section
      className="flex h-full w-full shrink-0 snap-center flex-col items-center px-5 pt-[calc(88px+env(safe-area-inset-top,0px))]"
      style={{ background: colors.background }}
    >
      <div className="flex flex-col items-center gap-2.5">
        <CardLogo src={card.logoSrc} size={64} />
        <h2 className="text-[24px] font-bold leading-8 tracking-[-0.01em] text-text-primary">{card.cardName}</h2>
      </div>
      <div className="mt-9 w-full">
        <BigCode card={card} qrSize="min(298px, calc(100vw - 92px))" barHeight={150} />
      </div>
    </section>
  );
}

function DesktopViewer({
  card,
  dark,
  onClose,
  onDelete,
  deleting,
}: {
  card: WalletCard;
  dark: boolean;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const colors = cardColors(useLogoTint(card.logoSrc), dark);
  return (
    <div className="fixed inset-0 z-[45] hidden items-center justify-center p-6 md:flex">
      <div aria-hidden className="absolute inset-0 bg-[rgba(16,17,48,0.45)]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.cardName}
        className="relative flex w-full max-w-[520px] flex-col items-center overflow-hidden rounded-[32px] bg-[var(--bg-app)] shadow-[0_30px_80px_-20px_rgba(16,17,48,0.45)] motion-safe:animate-fade-up"
      >
        <div className="flex w-full flex-col items-center px-7 pb-[26px] pt-[22px]" style={{ background: colors.background }}>
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[rgba(255,255,255,0.75)] px-3.5 text-sm font-semibold text-[var(--error-400)] transition-colors [@media(hover:hover)]:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
            >
              <TrashIcon />
              {deleting ? "Verwijderen…" : "Verwijderen"}
            </button>
            <button type="button" aria-label="Sluiten" onClick={onClose} className={cn(roundGlass, "!size-10 [@media(hover:hover)]:hover:bg-white")}>
              <CloseIcon />
            </button>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2.5">
            <CardLogo src={card.logoSrc} size={60} />
            <h2 className="text-[24px] font-bold leading-8 tracking-[-0.01em] text-text-primary">{card.cardName}</h2>
          </div>
          <div className="mt-6 w-full">
            <BigCode card={card} qrSize="240px" barHeight={154} />
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
