import type * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ListSectionHeaderIcon({
  variant,
  className,
}: {
  variant: "list" | "heart" | "card" | "calendar" | "freeze" | "shopping-bag" | "films";
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

/** Chevron rechts van de sectielink: maakt de navigatie-affordance zichtbaar zonder underline. */
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 shrink-0", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

const sectionActionClass =
  "group inline-flex shrink-0 items-center gap-0.5 rounded-pill py-1 pl-2 pr-1 -mr-1 text-sm font-medium leading-20 tracking-normal text-action-primary no-underline transition-colors [@media(hover:hover)]:hover:bg-action-ghost-hover [@media(hover:hover)]:hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2";

/**
 * Sectiekop voor home-secties (stijl 1 · Helder): sectietitel (18px, sentence case) met
 * optioneel aantal ernaast in gedempte tekst, en rechts «Alles» met chevron (of «Sectie verbergen»).
 *
 * Bewust géén uppercase-eyebrow en geen icoon meer vóór de titel: de titel is het anker,
 * het aantal geeft context zonder extra beeldruis.
 */
export function ListSectionHeader({
  label,
  count,
  showNaarOverzicht,
  naarOverzichtHref = "/lijstjes-beheren/lijstjes",
  onHide,
  action,
}: {
  /** @deprecated Niet meer getoond sinds stijl 1; blijft voor bestaande aanroepen. */
  icon?: "list" | "heart" | "card" | "calendar" | "freeze" | "shopping-bag" | "films";
  /** Zichtbare naam, in sentence case (bv. «Favorieten»). */
  label: string;
  /** Aantal items in de sectie; verborgen bij `undefined` of 0. */
  count?: number;
  showNaarOverzicht: boolean;
  naarOverzichtHref?: string;
  /** When provided, renders "Sectie verbergen" instead of "Alles". */
  onHide?: () => void;
  /** Eigen actie rechts (bv. «Toevoegen»-pil); gaat vóór «Alles». */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-baseline gap-2 text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
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
        <Link
          href={naarOverzichtHref}
          className={sectionActionClass}
          aria-label={`${label}: alles bekijken`}
        >
          Alles
          <ChevronRightIcon className="transition-transform [@media(hover:hover)]:group-hover:translate-x-px" />
        </Link>
      ) : null}
    </div>
  );
}
