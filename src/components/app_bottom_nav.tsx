"use client";

import * as React from "react";
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

export interface AppBottomNavProps {
  /** Actieve tab – Figma 854:7039 */
  active: "lijstjes" | "recepten" | "profiel";
  /** Data-URL of URL voor profieltab; null = placeholder icoon */
  profileAvatarUrl: string | null;
  /**
   * Voornaam onder de avatar in de profieltab (Figma 760:3415).
   * Leeg/ontbrekend → label "Profiel" (legacy accounts).
   */
  profileFirstName?: string | null;
  onLijstjes: () => void;
  onRecepten: () => void;
  onProfiel: () => void;
}

/**
 * Vaste bottom navigation: Lijstjes, Recepten, Profiel (Figma 854:7039).
 */
export function AppBottomNav({
  active,
  profileAvatarUrl,
  profileFirstName,
  onLijstjes,
  onRecepten,
  onProfiel,
}: AppBottomNavProps) {
  const trimmedName = profileFirstName?.trim() ?? "";
  const profileTabLabel = trimmedName.length > 0 ? trimmedName : "Profiel";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[24px] bg-[var(--white)] pt-2 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.13)]",
        "pb-[calc(8px+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <nav
        className="mx-auto grid min-h-[40px] w-full max-w-[390px] grid-cols-3 items-center px-4 py-1"
        aria-label="Hoofdnavigatie"
      >
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLijstjes}
            aria-current={active === "lijstjes" ? "page" : undefined}
            className={cn(
              "flex w-[41px] shrink-0 flex-col items-center gap-1",
              active === "lijstjes"
                ? "text-[var(--blue-500)]"
                : "text-[var(--gray-500)]",
            )}
          >
            <ListIcon className="size-6" filled={active === "lijstjes"} />
            <span className="text-xs font-normal leading-4 tracking-normal">
              Lijstjes
            </span>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onRecepten}
            aria-current={active === "recepten" ? "page" : undefined}
            className={cn(
              "flex w-[41px] shrink-0 flex-col items-center gap-1",
              active === "recepten"
                ? "text-[var(--blue-500)]"
                : "text-[var(--gray-500)]",
            )}
          >
            <ReceptenIcon
              className="size-6"
              filled={active === "recepten"}
            />
            <span className="text-xs font-normal leading-4 tracking-normal">
              Recepten
            </span>
          </button>
        </div>

        <div className="flex justify-center">
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
                : "text-[var(--gray-500)]",
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
              className="w-full truncate text-center text-xs font-normal leading-4 tracking-normal"
              title={trimmedName.length > 0 ? trimmedName : undefined}
            >
              {profileTabLabel}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
