"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MiniButton } from "@/components/ui/mini_button";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";

/** Figma 1498:13664 / asset in repo onder `public/images/vakantie/`. */
export const LANDAL_PUDDY_IMAGE_SRC = "/images/vakantie/puddy_320.webp";

/** Checkmark – zelfde vorm als `public/icons/checkmark.svg`, kleur via `currentColor`. */
function PuddyCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.1625 5.04856L8.9625 19.4496C8.8475 19.5956 8.6755 19.6866 8.4895 19.6986C8.4765 19.6996 8.4625 19.7006 8.4495 19.7006C8.2775 19.7006 8.1125 19.6326 7.9905 19.5106L3.1905 14.7096C2.9365 14.4556 2.9365 14.0436 3.1905 13.7896C3.4445 13.5356 3.8555 13.5356 4.1095 13.7896L8.3885 18.0696L19.1365 4.25056C19.3575 3.96656 19.7655 3.91756 20.0485 4.13656C20.3325 4.35756 20.3825 4.76556 20.1625 5.04856Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LandalPuddyFeedingCard({
  fedBy,
  onChoosePerson,
  onEdit,
}: {
  fedBy: string;
  onChoosePerson: () => void;
  onEdit: () => void;
}) {
  const hasFedBy = fedBy.length > 0;

  return (
    <section
      className="flex w-full min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--gray-100)] bg-[var(--white)] py-3 pl-4 pr-3"
      aria-label="Puddy voeren"
    >
      <div className="relative size-11 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- statische webp in /public */}
        <img
          src={LANDAL_PUDDY_IMAGE_SRC}
          alt=""
          width={44}
          height={44}
          className={cn("size-full object-cover", hasFedBy && "opacity-60")}
          decoding="async"
        />
      </div>
      <div className="min-w-0 flex-1">
        {hasFedBy ? (
          <>
            <div className="flex min-w-0 items-center gap-1">
              <p className="truncate text-base font-medium leading-6 tracking-normal text-[var(--text-primary)]">
                Puddy eten
              </p>
              <PuddyCheckIcon className="size-6 shrink-0 text-[var(--landal-puddy-check)]" />
            </div>
            <p className="truncate text-sm font-normal leading-5 tracking-normal text-[var(--gray-400)]">
              {fedBy}
            </p>
          </>
        ) : (
          <>
            <p className="truncate text-base font-medium leading-6 tracking-normal text-[var(--text-primary)]">
              Puddy eten geven?
            </p>
            <p className="truncate text-sm font-normal leading-5 tracking-normal text-[var(--gray-400)]">
              Niemand gekozen
            </p>
          </>
        )}
      </div>
      {hasFedBy ? (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-xs font-medium leading-4 tracking-normal text-action-primary no-underline transition-colors hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
        >
          Wijzigen
        </button>
      ) : (
        <MiniButton type="button" variant="primary" onClick={onChoosePerson}>
          Kies persoon
        </MiniButton>
      )}
    </section>
  );
}

export function LandalPuddyFeedSlideIn({
  open,
  onClose,
  name,
  onNameChange,
  onSave,
  onRemoveSavedName,
  savedFedBy,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (v: string) => void;
  onSave: () => void | Promise<void>;
  /** Opgeslagen naam op de lijst; bepaalt of «Naam verwijderen» getoond wordt (Figma 1499:10606). */
  savedFedBy: string;
  onRemoveSavedName: () => void | Promise<void>;
  saving: boolean;
}) {
  const showRemoveSaved = savedFedBy.trim().length > 0;
  return (
    <SlideInModal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Puddy eten geven"
      titleId="landal-puddy-feed-slide-title"
      disableEscapeClose={saving}
      footer={
        <Button
          type="button"
          variant="primary"
          disabled={saving}
          className="max-w-none"
          onClick={() => {
            void Promise.resolve(onSave());
          }}
        >
          Bewaren
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-[var(--radius-md)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LANDAL_PUDDY_IMAGE_SRC}
            alt=""
            width={320}
            height={320}
            className="size-full object-cover"
            decoding="async"
          />
        </div>
        <div className="flex w-full flex-col gap-4">
          <InputField
            id="landal-puddy-fed-by"
            label="Wie geeft Puddy eten?"
            placeholder="Naam"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={saving}
          />
          {showRemoveSaved ? (
            <Button
              type="button"
              variant="tertiary"
              tertiaryTone="danger"
              disabled={saving}
              className="max-w-none"
              onClick={() => {
                void Promise.resolve(onRemoveSavedName());
              }}
            >
              Naam verwijderen
            </Button>
          ) : null}
        </div>
      </div>
    </SlideInModal>
  );
}
