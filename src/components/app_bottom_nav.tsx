"use client";

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
    /* Inline i.p.v. card_filled.svg: die heeft een vaste kleur (#4F55F1) en volgt het thema niet. */
    return (
      <svg
        className={cn("pointer-events-none shrink-0", className)}
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M20 5H4C2.89543 5 2 5.89543 2 7V17C2 18.1046 2.89543 19 4 19H20C21.1046 19 22 18.1046 22 17V7C22 5.89543 21.1046 5 20 5Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path d="M2 10H22" stroke="var(--white)" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M6 15.5H10" stroke="var(--white)" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
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

const APP_BOTTOM_NAV_INDEX: Record<AppBottomNavTab, number> = {
  lijstjes: 0,
  klantenkaarten: 1,
  kalender: 2,
  recepten: 3,
  profiel: 4,
};

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
  const activeIndex = APP_BOTTOM_NAV_INDEX[active];

  const tabClass =
    "relative z-[1] flex h-14 min-w-0 w-full flex-col items-center justify-center gap-1 rounded-full px-1 no-underline transition-[color,transform] duration-base ease-out-strong motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]";
  const iconWrapClass = "flex size-6 shrink-0 items-center justify-center";
  const labelClass = "text-[11px] leading-[14px] tracking-normal";

  return (
    /* De balk zakt deels in de iOS safe area, zoals native navigatie, zonder de tappunten te verkleinen. */
    <div
      className="pointer-events-none fixed inset-x-3 z-20 flex justify-center"
      style={{
        bottom: "max(12px, calc(env(safe-area-inset-bottom, 0px) - 10px))",
      }}
    >
      <nav
        className="pointer-events-auto relative isolate grid h-[68px] w-full max-w-[420px] grid-cols-5 items-center overflow-hidden rounded-full px-1.5 py-1.5 shadow-nav-floating"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--white) 92%, transparent)",
          WebkitBackdropFilter: "blur(24px) saturate(1.15)",
          backdropFilter: "blur(24px) saturate(1.15)",
        }}
        aria-label="Hoofdnavigatie"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 left-1.5 -z-0 rounded-full motion-safe:transition-transform motion-safe:duration-[220ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            width: "calc((100% - 12px) / 5)",
            transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
            backgroundColor:
              "color-mix(in srgb, var(--bg-app) 78%, transparent)",
            WebkitBackdropFilter: "blur(14px)",
            backdropFilter: "blur(14px)",
          }}
        />

        <div className="flex min-w-0 justify-center">
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
            <span className={iconWrapClass}>
              <ListIcon className="size-6" filled={active === "lijstjes"} />
            </span>
            <span className={labelClass}>Lijstjes</span>
          </Link>
        </div>

        <div className="flex min-w-0 justify-center">
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
            <span className={iconWrapClass}>
              <KaartenIcon className="size-6" filled={active === "klantenkaarten"} />
            </span>
            <span className={labelClass}>Kaarten</span>
          </Link>
        </div>

        <div className="flex min-w-0 justify-center">
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
            <span className={iconWrapClass}>
              <KalenderIcon className="size-6" filled={active === "kalender"} />
            </span>
            <span className={labelClass}>Kalender</span>
          </Link>
        </div>

        <div className="flex min-w-0 justify-center">
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
            <span className={iconWrapClass}>
              <ReceptenIcon
                className="size-6"
                filled={active === "recepten"}
              />
            </span>
            <span className={labelClass}>Recepten</span>
          </Link>
        </div>

        <div className="flex min-w-0 justify-center">
          <Link
            href="/profiel"
            aria-label={
              trimmedName.length > 0 ? `Profiel, ${trimmedName}` : "Profiel"
            }
            aria-current={active === "profiel" ? "page" : undefined}
            className={cn(
              tabClass,
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
              className={cn("w-full truncate text-center", labelClass)}
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
