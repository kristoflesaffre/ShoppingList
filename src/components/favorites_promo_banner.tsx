"use client";

import * as React from "react";
import Link from "next/link";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { MiniButton } from "@/components/ui/mini_button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "favorites-promo-dismissed";
const FAN_IMAGES = [
  "/images/items/mayonaise_160.webp",
  "/images/items/aardappelen_160.webp",
  "/images/items/tomatenpuree_160.webp",
];

/** Banner pas tonen na mount (localStorage), en nooit meer na sluiten. */
export function useFavoritesPromo(hasFavoriteLists: boolean) {
  const [dismissed, setDismissed] = React.useState(true);
  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  const dismiss = React.useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* negeren */
    }
  }, []);
  return { show: !hasFavoriteLists && !dismissed, dismiss };
}

/** Drie productfoto's in een waaier met een roze hartje — illustratie voor favorieten. */
export function FavoritesFanIllustration({ size = 58 }: { size?: number }) {
  const offsets = [0, 34, 68];
  const rotations = [-10, 0, 10];
  return (
    <div className="relative shrink-0" style={{ width: offsets[2] + size + 14, height: size + 12 }} aria-hidden>
      {FAN_IMAGES.map((src, k) => (
        <span
          key={src}
          className="absolute flex items-center justify-center rounded-[16px] bg-[var(--white)] shadow-[0_6px_14px_-6px_rgba(16,17,48,0.25)]"
          style={{ left: offsets[k], top: k === 1 ? 0 : 6, width: size, height: size, transform: `rotate(${rotations[k]}deg)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={src} alt="" className="object-contain" style={{ width: size * 0.72, height: size * 0.72 }} />
        </span>
      ))}
      <span
        className="absolute flex size-[26px] items-center justify-center rounded-full bg-[#e5487a] shadow-[0_0_0_3px_var(--white)]"
        style={{ left: offsets[2] + size - 14, top: -6 }}
      >
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#fff" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Canvas «05–07 · Lijstjes met favorieten-banner»: legt nieuwe gebruikers uit wat favorieten zijn.
 * Mobiel: illustratie boven de tekst; tablet+: illustratie links.
 */
export function FavoritesPromoBanner({
  onSetUp,
  onDismiss,
  className,
}: {
  onSetUp: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <section
      aria-label="Favorieten"
      className={cn(
        "relative rounded-[20px] bg-[linear-gradient(135deg,#eef0ff_30%,#fbeaf2)] p-4 shadow-[0_1px_2px_rgba(16,17,48,0.04)] md:flex md:items-center md:gap-7 md:py-5 md:pl-6 md:pr-14 [[data-theme=dark]_&]:bg-[linear-gradient(135deg,var(--blue-50),var(--gray-50))]",
        className,
      )}
    >
      <div className="mb-3 md:mb-0">
        <FavoritesFanIllustration />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.04em] text-[var(--blue-500)]">Nieuw · Favorieten</p>
        <h2 className="mt-1 text-lg font-bold leading-[23px] tracking-tight text-[var(--text-primary)]">
          Elke week dezelfde boodschappen?
        </h2>
        <p className="mt-1 text-[13.5px] leading-[19px] text-[var(--text-secondary)]">
          Bewaar wat je vaak koopt per winkel. Daarna maak je je weeklijstje in een paar tikken.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <MiniButton variant="primary" onClick={onSetUp}>
            Favorieten instellen
          </MiniButton>
          <Link
            href="/lijstjes-beheren/favorieten"
            className="text-[13.5px] font-semibold text-[var(--blue-500)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            Hoe werkt het?
          </Link>
        </div>
      </div>
      <RoundIconButton
        tone="neutral"
        size={28}
        aria-label="Banner sluiten"
        onClick={onDismiss}
        className="absolute right-2.5 top-2.5 !bg-[rgba(255,255,255,0.8)]"
      >
        {RoundIcons.close}
      </RoundIconButton>
    </section>
  );
}

const HOW_IT_WORKS = [
  { title: "Kies je winkel", text: "Bv. Lidl / Delhaize of Colruyt" },
  { title: "Duid je vaste producten aan", text: "Melk, brood, fruit … met of zonder foto" },
  { title: "Elke week: «+ Lijstje»", text: "Vink aan wat je nodig hebt en klaar" },
];

/**
 * Canvas «05–07 · Favorieten leeg» (mobiel) en «Favorieten leeg desktop B» (lg+):
 * mobiel = gestapelde kaarten + grote knop; desktop = brede introkaart met knop rechts + 3 stapkaarten naast elkaar.
 */
export function FavoritesEmptyState({ onCreate }: { onCreate: () => void }) {
  const intro =
    "Zet de producten die je elke week koopt in een favorietenlijst. Zo heb je je weeklijstje in een minuut.";
  return (
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-[560px] lg:max-w-none">
      {/* Introkaart */}
      <div className="flex flex-col items-center rounded-[20px] bg-[var(--white)] px-[18px] pb-5 pt-[22px] text-center shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:flex-row lg:gap-8 lg:bg-[linear-gradient(135deg,var(--white)_50%,#f3f2ff)] lg:px-8 lg:py-7 lg:text-left [[data-theme=dark]_&]:lg:bg-[var(--white)]">
        <FavoritesFanIllustration size={64} />
        <div className="lg:min-w-0 lg:flex-1">
          <h2 className="mt-4 text-xl font-bold tracking-tight text-[var(--text-primary)] lg:mt-0 lg:text-[22px]">Nog geen favorieten</h2>
          <p className="mt-1.5 max-w-[290px] text-sm leading-5 text-[var(--text-secondary)] lg:mt-1 lg:max-w-[440px] lg:text-[14.5px] lg:leading-[21px]">
            {intro}
          </p>
        </div>
        <Button variant="primary" className="hidden shrink-0 lg:inline-flex" onClick={onCreate}>
          Maak je eerste favorietenlijst
        </Button>
      </div>

      {/* Stappen: mobiel één kaart met een lijst; desktop drie kaarten naast elkaar */}
      <div className="flex flex-col gap-3.5 rounded-[20px] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:hidden">
        <p className="text-[13px] font-bold text-[var(--text-secondary)]">Zo werkt het</p>
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[13px] font-bold text-[var(--blue-500)]">
                {i + 1}
              </span>
              <span className="leading-[19px]">
                <span className="block text-[15px] font-semibold text-[var(--text-primary)]">{step.title}</span>
                <span className="block text-[13px] text-[var(--text-secondary)]">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="hidden lg:block">
        <p className="mb-2.5 mt-2 text-[13px] font-bold text-[var(--text-secondary)]">Zo werkt het</p>
        <ol className="m-0 grid list-none grid-cols-3 gap-3 p-0">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="rounded-[20px] bg-[var(--white)] p-5 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
              <span className="flex size-[30px] items-center justify-center rounded-full bg-[var(--blue-50)] text-sm font-bold text-[var(--blue-500)]">
                {i + 1}
              </span>
              <span className="mt-3 block text-base font-semibold text-[var(--text-primary)]">{step.title}</span>
              <span className="mt-0.5 block text-[13.5px] text-[var(--text-secondary)]">{step.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <Button variant="primary" className="w-full lg:hidden" onClick={onCreate}>
        Maak je eerste favorietenlijst
      </Button>
    </div>
  );
}
