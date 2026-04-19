import Link from "next/link";
import { cn } from "@/lib/utils";

function ListSectionHeaderIcon({
  variant,
  className,
}: {
  variant: "list" | "heart" | "card" | "calendar" | "freeze";
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
            : "/icons/heart.svg";
  return (
    <span
      className={cn("inline-block size-4 shrink-0 bg-[var(--blue-900)]", className)}
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

/**
 * Sectiekop voor home-lijsten (Figma 1148:8252): klein icoon, label in caps, optionele link «Naar overzicht» zonder underline.
 */
export function ListSectionHeader({
  icon,
  label,
  showNaarOverzicht,
  naarOverzichtHref = "/lijstjes-beheren/lijstjes",
}: {
  icon: "list" | "heart" | "card" | "calendar" | "freeze";
  /** Zichtbare naam; wordt in hoofdletters getoond (`uppercase`). */
  label: string;
  showNaarOverzicht: boolean;
  naarOverzichtHref?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase leading-16 tracking-[0.04em] text-[var(--blue-900)]">
        <ListSectionHeaderIcon variant={icon} />
        <span className="min-w-0 truncate">{label}</span>
      </h2>
      {showNaarOverzicht ? (
        <Link
          href={naarOverzichtHref}
          className="shrink-0 text-sm font-medium leading-20 text-action-primary no-underline transition-colors [@media(hover:hover)]:hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          Naar overzicht
        </Link>
      ) : null}
    </div>
  );
}
