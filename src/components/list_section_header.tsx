import type * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ListSectionHeaderIcon({
  variant,
  className,
}: {
  variant: "list" | "heart" | "card" | "calendar" | "freeze" | "shopping-bag" | "films" | "bulb";
  className?: string;
}) {
  const src =
    variant === "list"
      ? "/icons/list.svg"
      : variant === "card"
        ? "/icons/card.svg"
        : variant === "calendar"
          ? "/icons/calendar.svg"
          : variant === "freeze"
            ? "/icons/freeze.svg"
            : variant === "shopping-bag"
              ? "/icons/shopping_bag.svg"
              : variant === "films"
                ? "/icons/films.svg"
                : variant === "bulb"
                  ? "/icons/bulb.svg"
                  : "/icons/heart.svg";
  return (
    <span
      className={cn("inline-block shrink-0 bg-current", className ?? "size-4")}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

const sectionActionClass =
  "inline-flex shrink-0 items-center rounded-pill px-2 py-1 -mr-1 text-[15px] font-semibold leading-5 tracking-normal text-action-primary no-underline transition-colors [@media(hover:hover)]:hover:bg-action-ghost-hover [@media(hover:hover)]:hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2";

/**
 * «Toon alle» als zacht drukvlak (canvas «Toon alle» K3): lichtgrijze pil (zelfde grijs als de weergaveschakelaar) met een kaartstapel-icoon, het
 * aantal en een chevron. Zonder aantal: icoon en chevron. `external` opent in een nieuw tabblad.
 */
export function OverviewPill({
  href,
  count,
  ariaLabel,
  external = false,
}: {
  href: string;
  count?: number;
  ariaLabel: string;
  external?: boolean;
}) {
  const className =
    "-mr-0.5 inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-pill bg-[var(--gray-50)] pl-[11px] pr-[9px] text-[15.5px] font-extrabold leading-5 tabular-nums text-[var(--text-primary)] no-underline transition-[background-color,transform] duration-fast motion-safe:active:scale-95 [@media(hover:hover)]:hover:bg-[var(--gray-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2";
  const inner = (
    <>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[17px] shrink-0">
        <rect x="7" y="3.5" width="13.5" height="13.5" rx="2.6" />
        <path d="M3.5 7.5v10a3 3 0 0 0 3 3h10" />
      </svg>
      {count ? <span>{count}</span> : null}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[13px] shrink-0 text-[var(--text-secondary)]">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} aria-label={ariaLabel} className={className}>
      {inner}
    </Link>
  );
}

/**
 * Sectiekop voor home-secties (stijl 1 · Helder): sectietitel (18px, sentence case) met
 * optioneel aantal ernaast in gedempte tekst, en rechts een tekstlink zonder icoon
 * (of «Sectie verbergen»).
 *
 * Bewust géén uppercase-eyebrow en geen icoon meer vóór de titel: de titel is het anker,
 * het aantal geeft context zonder extra beeldruis.
 */
export function ListSectionHeader({
  label,
  count,
  showNaarOverzicht,
  naarOverzichtHref = "/lijstjes-beheren/lijstjes",
  overzichtLabel = "Alles",
  overzichtCount,
  onHide,
  action,
  extra,
}: {
  /** @deprecated Niet meer getoond sinds stijl 1; blijft voor bestaande aanroepen. */
  icon?: "list" | "heart" | "card" | "calendar" | "freeze" | "shopping-bag" | "films" | "bulb";
  /** Zichtbare naam, in sentence case (bv. «Favorieten»). */
  label: string;
  /** Aantal items in de sectie; verborgen bij `undefined` of 0. */
  count?: number;
  showNaarOverzicht: boolean;
  naarOverzichtHref?: string;
  /** Toegankelijke naam van de overzichtsknop (niet meer zichtbaar sinds K3). */
  overzichtLabel?: string;
  /** Aantal in de overzichtsknop (K3), bv. alle 81 lijstjes. */
  overzichtCount?: number;
  /** When provided, renders "Sectie verbergen" instead of "Alles". */
  onHide?: () => void;
  /** Eigen actie rechts (bv. «Toevoegen»-pil); gaat vóór «Alles». */
  action?: React.ReactNode;
  /** Extra bediening links naast «Alles» (bv. carrouselpijlen op desktop); de link blijft staan. */
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-baseline gap-2 text-[22px] font-bold leading-7 tracking-[-0.01em] text-[var(--text-primary)]">
        <span className="min-w-0 truncate">{label}</span>
        {count ? (
          <span className="shrink-0 text-sm font-medium leading-20 tracking-normal text-[var(--text-secondary)] tabular-nums">
            {count}
          </span>
        ) : null}
      </h2>
      {action ? (
        action
      ) : onHide ? (
        <button type="button" onClick={onHide} className={sectionActionClass}>
          Sectie verbergen
        </button>
      ) : showNaarOverzicht ? (
        <div className="flex shrink-0 items-center gap-3">
          {extra}
          <OverviewPill
            href={naarOverzichtHref}
            count={overzichtCount}
            ariaLabel={`${label}: ${overzichtLabel.toLowerCase()}${overzichtCount ? ` (${overzichtCount})` : ""}`}
          />
        </div>
      ) : null}
    </div>
  );
}
