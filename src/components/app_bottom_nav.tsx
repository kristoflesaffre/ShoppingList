"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** List icon – public/icons/list.svg pattern */
function ListIcon({ className }: { className?: string }) {
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
        d="M9.19998 2.1H2.59998C2.32398 2.1 2.09998 2.324 2.09998 2.6V9.16C2.09998 9.436 2.32398 9.66 2.59998 9.66H9.19998C9.47598 9.66 9.69998 9.436 9.69998 9.16V2.6C9.69998 2.323 9.47698 2.1 9.19998 2.1ZM8.69998 8.66H3.09998V3.1H8.69998V8.66ZM9.19998 14.3H2.59998C2.32398 14.3 2.09998 14.524 2.09998 14.8V21.36C2.09998 21.636 2.32398 21.86 2.59998 21.86H9.19998C9.47598 21.86 9.69998 21.636 9.69998 21.36V14.8C9.69998 14.523 9.47698 14.3 9.19998 14.3ZM8.69998 20.859H3.09998V15.3H8.69998V20.859ZM13.4 3.6C13.4 3.324 13.624 3.1 13.9 3.1H21.4C21.676 3.1 21.9 3.324 21.9 3.6C21.9 3.876 21.676 4.1 21.4 4.1H13.9C13.624 4.1 13.4 3.876 13.4 3.6ZM21.9 8.3C21.9 8.576 21.676 8.8 21.4 8.8H13.9C13.624 8.8 13.4 8.576 13.4 8.3C13.4 8.024 13.624 7.8 13.9 7.8H21.4C21.677 7.8 21.9 8.023 21.9 8.3ZM21.9 15.7C21.9 15.976 21.676 16.2 21.4 16.2H13.9C13.624 16.2 13.4 15.976 13.4 15.7C13.4 15.424 13.624 15.2 13.9 15.2H21.4C21.677 16.2 21.9 15.424 21.9 15.7ZM21.9 20.399C21.9 20.675 21.676 20.899 21.4 20.899H13.9C13.624 20.899 13.4 20.675 13.4 20.399C13.4 20.123 13.624 19.899 13.9 19.899H21.4C21.677 19.899 21.9 20.123 21.9 20.399Z"
        fill="currentColor"
      />
    </svg>
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
    "mx-auto flex h-12 w-full max-w-[390px] items-center justify-center gap-[149px] px-6";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[30px] bg-[var(--white)] pt-3 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.13)]",
        "pb-[calc(33px+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <nav className={cn("relative", navItemLayout)} aria-label="Hoofdnavigatie">
        <button
          type="button"
          onClick={onLijstjes}
          className={cn(
            "flex w-[41px] shrink-0 flex-col items-center gap-3",
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
            className="absolute left-1/2 top-[-28px] flex size-[84px] -translate-x-1/2 items-center justify-center rounded-full border-[6px] border-[var(--blue-200)] bg-[var(--blue-500)] text-[var(--white)] shadow-[var(--shadow-drop)] transition-[border-width,color] duration-150 ease-out hover:bg-[var(--blue-600)] active:border-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
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
            "flex min-w-[41px] max-w-[104px] shrink-0 flex-col items-center gap-3",
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
