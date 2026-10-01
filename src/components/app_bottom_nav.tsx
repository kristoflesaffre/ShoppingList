"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mask-iconen: `bg-current` volgt tab `text-*` (primary 500 actief, neutrals 500 inactief → `--gray-500`). */
function MaskNavIcon({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
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

function ListIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <MaskNavIcon
      src={filled ? "/icons/list_filled.svg" : "/icons/list.svg"}
      className={className}
    />
  );
}

function ReceptenIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <MaskNavIcon
      src={filled ? "/icons/chef_hat_filled.svg" : "/icons/chef_hat.svg"}
      className={className}
    />
  );
}

/** Zelfde beeldvlak als `calendar.svg` (24×24; inhoud ~17×17,84 volgens clip). */
const CAL_OUTLINE_VB = 24;
const CAL_FILLED_W = 19.5;
const CAL_FILLED_H = 20.5;
/** Matcht `calendar.svg` clipPath (16,9698 × 17,84). */
const CAL_CONTENT_W = 16.9698;
const CAL_CONTENT_H = 17.84;
const CAL_FILLED_SCALE = Math.min(
  CAL_CONTENT_W / CAL_FILLED_W,
  CAL_CONTENT_H / CAL_FILLED_H,
);
const CAL_FILLED_TX =
  (CAL_OUTLINE_VB - CAL_FILLED_W * CAL_FILLED_SCALE) / 2;
const CAL_FILLED_TY =
  (CAL_OUTLINE_VB - CAL_FILLED_H * CAL_FILLED_SCALE) / 2;

/**
 * Gevulde kalender: géén mask — anders worden witte details niet getoond (mask = één kleur).
 * Zelfde viewBox 24×24 + schaal als outline zodat beide even groot ogen in de tab.
 */
function CalendarFilledIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox={`0 0 ${CAL_OUTLINE_VB} ${CAL_OUTLINE_VB}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g
        transform={`translate(${CAL_FILLED_TX} ${CAL_FILLED_TY}) scale(${CAL_FILLED_SCALE})`}
      >
        <path
          d="M5.75.75v4"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path
          d="M13.75.75v4"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <rect
          x={0.75}
          y={2.75}
          width={18}
          height={17}
          rx={3}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <path
          d="M0 8.25H19.49"
          stroke="var(--white)"
          strokeWidth={1.5}
        />
        <circle cx={5.75} cy={12.25} r={1} fill="var(--white)" />
        <circle cx={9.75} cy={12.25} r={1} fill="var(--white)" />
        <circle cx={13.75} cy={12.25} r={1} fill="var(--white)" />
        <circle cx={5.75} cy={16.25} r={1} fill="var(--white)" />
        <circle cx={9.75} cy={16.25} r={1} fill="var(--white)" />
      </g>
    </svg>
  );
}

function KalenderIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  if (filled) {
    return <CalendarFilledIcon className={className} />;
  }
  return <MaskNavIcon src="/icons/calendar.svg" className={className} />;
}

function AvatarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.41 11.6263C14.7921 11.6263 16.7231 9.69525 16.7231 7.31316C16.7231 4.93107 14.7921 3 12.41 3C10.0279 3 8.0968 4.93107 8.0968 7.31316C8.0968 9.69525 10.0279 11.6263 12.41 11.6263Z" />
      <path d="M19.82 20.2526C19.82 16.9143 16.4989 14.2142 12.41 14.2142C8.32113 14.2142 5 16.9143 5 20.2526" />
    </svg>
  );
}

function KaartenIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  if (filled) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- statisch SVG-icoon uit /public/icons
      <img
        src="/icons/card_filled.svg"
        alt=""
        width={24}
        height={24}
        className={cn("pointer-events-none shrink-0", className)}
        aria-hidden
      />
    );
  }
  return <MaskNavIcon src="/icons/card.svg" className={className} />;
}

type AppBottomNavTab =
  | "lijstjes"
  | "recepten"
  | "kalender"
  | "klantenkaarten"
  | "profiel";

/** Kolomvolgorde in de nav — bepaalt de positie van de schuivende indicator. */
const NAV_ORDER: readonly AppBottomNavTab[] = [
  "lijstjes",
  "klantenkaarten",
  "kalender",
  "recepten",
  "profiel",
];

export interface AppBottomNavProps {
  /** Actieve tab – Figma 854:7039 */
  active: AppBottomNavTab;
  /** Data-URL of URL voor profieltab; null = placeholder icoon */
  profileAvatarUrl: string | null;
  /**
   * Voornaam onder de avatar in de profieltab (Figma 760:3415).
   * Leeg/ontbrekend → label "Profiel" (legacy accounts).
   */
  profileFirstName?: string | null;
}

/**
 * Vaste bottom navigation: Lijstjes, Recepten, Profiel (Figma 854:7039).
 */
export function AppBottomNav({
  active,
  profileAvatarUrl,
  profileFirstName,
}: AppBottomNavProps) {
  const trimmedName = profileFirstName?.trim() ?? "";
  const profileTabLabel = trimmedName.length > 0 ? trimmedName : "Profiel";

  const tabClass =
    "relative z-[1] flex w-[41px] shrink-0 flex-col items-center gap-1 rounded-md no-underline transition-[color,transform] duration-base ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

  const activeIndex = NAV_ORDER.indexOf(active);

  /* Icoon “popt” alleen bij een tabwissel, niet bij de eerste mount (Emil: geen animatie zonder aanleiding). */
  const hasSwitchedRef = React.useRef(false);
  const prevActiveRef = React.useRef(active);
  if (prevActiveRef.current !== active) {
    prevActiveRef.current = active;
    hasSwitchedRef.current = true;
  }
  const iconWrapClass = (tab: AppBottomNavProps["active"]) =>
    cn(
      "flex size-6 items-center justify-center",
      tab === active && hasSwitchedRef.current && "motion-safe:animate-pop",
    );

  return (
    /* Zwevende tabbalk (stijl 3, lichte variant): losgekoppeld van de rand, volgt het thema via --white. */
    <div
      className={cn(
        "pointer-events-none fixed inset-x-3 z-20 flex justify-center",
        "bottom-[calc(12px+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <nav
        className="pointer-events-auto relative grid min-h-[60px] w-full max-w-[420px] grid-cols-5 items-center rounded-[24px] bg-[var(--white)] px-2 py-2 shadow-nav-floating"
        aria-label="Hoofdnavigatie"
      >
        {/* Schuivende actieve-indicator: zachte pill achter het icoon, glijdt tussen de 5 kolommen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-2 right-2 grid grid-cols-5"
        >
          <span
            className={cn(
              "col-start-1 col-end-2 flex justify-center pt-0",
              "motion-safe:transition-transform motion-safe:duration-slow motion-safe:ease-in-out-strong",
            )}
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="mt-0 h-8 w-12 rounded-pill bg-[var(--blue-25)]" />
          </span>
        </span>

        <div className="flex justify-center">
          <Link
            href="/"
            aria-current={active === "lijstjes" ? "page" : undefined}
            className={cn(
              tabClass,
              active === "lijstjes"
                ? "font-semibold text-[var(--blue-500)]"
                : "font-normal text-[var(--gray-500)]",
            )}
          >
            <span className={iconWrapClass("lijstjes")}>
              <ListIcon className="size-6" filled={active === "lijstjes"} />
            </span>
            <span className="text-xs leading-4 tracking-normal">
              Lijstjes
            </span>
          </Link>
        </div>

        <div className="flex justify-center">
          <Link
            href="/klantenkaarten"
            aria-current={active === "klantenkaarten" ? "page" : undefined}
            className={cn(
              tabClass,
              active === "klantenkaarten"
                ? "font-semibold text-[var(--blue-500)]"
                : "font-normal text-[var(--gray-500)]",
            )}
          >
            <span className={iconWrapClass("klantenkaarten")}>
              <KaartenIcon className="size-6" filled={active === "klantenkaarten"} />
            </span>
            <span className="text-xs leading-4 tracking-normal">
              Kaarten
            </span>
          </Link>
        </div>

        <div className="flex justify-center">
          <Link
            href="/kalender"
            aria-current={active === "kalender" ? "page" : undefined}
            className={cn(
              tabClass,
              active === "kalender"
                ? "font-semibold text-[var(--blue-500)]"
                : "font-normal text-[var(--gray-500)]",
            )}
          >
            <span className={iconWrapClass("kalender")}>
              <KalenderIcon className="size-6" filled={active === "kalender"} />
            </span>
            <span className="text-xs leading-4 tracking-normal">
              Kalender
            </span>
          </Link>
        </div>

        <div className="flex justify-center">
          <Link
            href="/recepten"
            aria-current={active === "recepten" ? "page" : undefined}
            className={cn(
              tabClass,
              active === "recepten"
                ? "font-semibold text-[var(--blue-500)]"
                : "font-normal text-[var(--gray-500)]",
            )}
          >
            <span className={iconWrapClass("recepten")}>
              <ReceptenIcon
                className="size-6"
                filled={active === "recepten"}
              />
            </span>
            <span className="text-xs leading-4 tracking-normal">
              Recepten
            </span>
          </Link>
        </div>

        <div className="flex justify-center">
          <Link
            href="/profiel"
            aria-label={
              trimmedName.length > 0 ? `Profiel, ${trimmedName}` : "Profiel"
            }
            aria-current={active === "profiel" ? "page" : undefined}
            className={cn(
              "relative z-[1] flex min-w-[41px] max-w-[104px] shrink-0 flex-col items-center gap-1 no-underline transition-[color,transform] duration-base ease-out-strong motion-safe:active:scale-95",
              active === "profiel"
                ? "font-semibold text-[var(--blue-500)]"
                : "font-normal text-[var(--gray-500)]",
            )}
          >
            <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-[var(--gray-100)]">
              {profileAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL uit profiel
                <img
                  src={profileAvatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="size-full object-cover"
                />
              ) : active === "profiel" ? (
                <span className="flex size-full items-center justify-center">
                  <MaskNavIcon
                    src="/icons/avatar_filled.svg"
                    className="size-6"
                  />
                </span>
              ) : (
                <span className="flex size-full items-center justify-center">
                  <AvatarIcon className="size-6" />
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-full",
                  active === "profiel"
                    ? "shadow-[inset_0_0_0_1px_var(--blue-500)]"
                    : "shadow-[inset_0_0_0_1px_var(--gray-500)]",
                )}
              />
            </span>
            <span
              className="w-full truncate text-center text-xs leading-4 tracking-normal"
              title={trimmedName.length > 0 ? trimmedName : undefined}
            >
              {profileTabLabel}
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
