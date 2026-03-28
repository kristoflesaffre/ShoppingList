"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Lijstjes-tab: `public/icons/list.svg` via mask; `bg-current` volgt tab `text-*` (primary 500 / 300). */
function ListIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: "url(/icons/list.svg)",
        maskImage: "url(/icons/list.svg)",
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1C12.5523 1 13 1.44772 13 2V11H22C22.5523 11 23 11.4477 23 12C23 12.5523 22.5523 13 22 13H13V22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22V13H2C1.44772 13 1 12.5523 1 12C1 11.4477 1.44772 11 2 11H11V2C11 1.44772 11.4477 1 12 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export interface AppBottomNavProps {
  /** Actieve tab – Figma bottom nav 672:2703 */
  active: "lijstjes" | "profiel";
  /** Data-URL of URL voor profieltab; null = placeholder icoon */
  profileAvatarUrl: string | null;
  /**
   * Voornaam onder de avatar in de profieltab (Figma 760:3415).
   * Leeg/ontbrekend → label "Profiel" (legacy accounts).
   */
  profileFirstName?: string | null;
  onLijstjes: () => void;
  onProfiel: () => void;
  /** Alleen startscherm: FAB “nieuw lijstje” */
  onFabClick?: () => void;
}

/**
 * Vaste bottom navigation (Lijstjes / Profiel), optioneel midden-FAB.
 * Figma: afgeronde bovenkant, schaduw, safe-area onderaan.
 */
export function AppBottomNav({
  active,
  profileAvatarUrl,
  profileFirstName,
  onLijstjes,
  onProfiel,
  onFabClick,
}: AppBottomNavProps) {
  const showFab = typeof onFabClick === "function";
  const trimmedName = profileFirstName?.trim() ?? "";
  const profileTabLabel = trimmedName.length > 0 ? trimmedName : "Profiel";
  /** Zelfde lay-out als met FAB: plus staat absolute en telt niet mee in flex; justify-around zou tabs naar het midden trekken. */
  const navItemLayout =
    "mx-auto flex min-h-[40px] w-full max-w-[390px] items-center justify-center gap-[149px] px-6 py-1";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[24px] bg-[var(--white)] pt-2 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.13)]",
        "pb-[calc(8px+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <nav className={cn("relative", navItemLayout)} aria-label="Hoofdnavigatie">
        <button
          type="button"
          onClick={onLijstjes}
          className={cn(
            "flex w-[41px] shrink-0 flex-col items-center gap-1",
            active === "lijstjes"
              ? "text-[var(--blue-500)]"
              : "text-[var(--blue-300)]",
          )}
        >
          <ListIcon className="size-6" />
          <span className="text-xs font-normal leading-4 tracking-normal">
            Lijstjes
          </span>
        </button>

        {showFab ? (
          <button
            type="button"
            onClick={onFabClick}
            aria-label="Nieuw lijstje"
            className="absolute left-1/2 top-[-22px] flex size-[72px] -translate-x-1/2 items-center justify-center rounded-full border-[5px] border-[var(--blue-200)] bg-[var(--blue-500)] text-[var(--white)] shadow-[var(--shadow-drop)] transition-[border-width,color] duration-150 ease-out hover:bg-[var(--blue-600)] active:border-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          >
            <PlusIcon className="size-6" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onProfiel}
          aria-label={
            trimmedName.length > 0 ? `Profiel, ${trimmedName}` : "Profiel"
          }
          aria-current={active === "profiel" ? "page" : undefined}
          className={cn(
            "flex min-w-[41px] max-w-[104px] shrink-0 flex-col items-center gap-1",
            active === "profiel"
              ? "text-[var(--blue-500)]"
              : "text-[var(--blue-300)]",
          )}
        >
          <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-[var(--gray-100)] ring-1 ring-[var(--gray-100)]">
            {profileAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data-URL uit profiel
              <img
                src={profileAvatarUrl}
                alt=""
                width={24}
                height={24}
                className="size-full object-cover"
              />
            ) : (
              <AvatarIcon className="size-6 text-[var(--blue-300)]" />
            )}
          </span>
          <span
            className="w-full truncate text-center text-xs font-normal leading-4 tracking-normal"
            title={trimmedName.length > 0 ? trimmedName : undefined}
          >
            {profileTabLabel}
          </span>
        </button>
      </nav>
    </div>
  );
}
