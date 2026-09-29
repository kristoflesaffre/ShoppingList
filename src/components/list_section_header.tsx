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
 * Sectiekop voor home-secties: sectietitel (18px, sentence case) met accenticoon
 * en optionele actie rechts («Naar overzicht» met chevron, of «Sectie verbergen»).
 *
 * Bewust géén uppercase-eyebrow: de titel is het anker van de sectie en moet
 * dezelfde typografische rang hebben als de andere sectietitels in de app.
 */
export function ListSectionHeader({
  icon,
  label,
  showNaarOverzicht,
  naarOverzichtHref = "/lijstjes-beheren/lijstjes",
  onHide,
}: {
  icon: "list" | "heart" | "card" | "calendar" | "freeze" | "shopping-bag" | "films";
  /** Zichtbare naam, in sentence case (bv. «Favorieten lijstjes»). */
  label: string;
  showNaarOverzicht: boolean;
  naarOverzichtHref?: string;
  /** When provided, renders "Sectie verbergen" instead of "Naar overzicht". */
  onHide?: () => void;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
        <span className="flex size-5 shrink-0 items-center justify-center text-[var(--blue-500)]">
          <ListSectionHeaderIcon variant={icon} className="size-[18px]" />
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </h2>
      {onHide ? (
        <button type="button" onClick={onHide} className={sectionActionClass}>
          Sectie verbergen
        </button>
      ) : showNaarOverzicht ? (
        <Link
          href={naarOverzichtHref}
          className={sectionActionClass}
          aria-label={`${label}: naar overzicht`}
        >
          Naar overzicht
          <ChevronRightIcon className="transition-transform [@media(hover:hover)]:group-hover:translate-x-px" />
        </Link>
      ) : null}
    </div>
  );
}
