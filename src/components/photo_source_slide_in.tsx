"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { OptionTile } from "@/components/ui/option_tile";

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-7">
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 16l-5-5-8 8" />
    </svg>
  );
}

function MagicWandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-7">
      <path d="M4 20l10-10" />
      <path d="M15 4v2M15 10v2M11 8h2M17 8h2" />
      <path d="M18.5 13.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
    </svg>
  );
}

/**
 * Canvas «18 · Foto wijzigen»: de huidige foto op zijn bord, eronder twee gelijke keuzetegels
 * (uploaden of door AI laten maken).
 */
export function PhotoSourceSlideIn({
  open,
  onClose,
  title,
  currentPhotoSrc,
  onPickFromDevice,
  onGenerateWithAi,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Huidige receptfoto; zonder → geen bord bovenaan. */
  currentPhotoSrc?: string | null;
  onPickFromDevice: () => void;
  onGenerateWithAi: () => void;
}) {
  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={title}
      titleId="photo-source-slide-in-title"
      containerClassName="z-[60]"
      className="md:!max-w-[500px]"
      cancelLabel={null}
    >
      <div className="flex w-full flex-col gap-[18px] pb-6 md:pb-2">
        {currentPhotoSrc ? (
          <span aria-hidden className="mx-auto block size-[116px] overflow-hidden rounded-full bg-[var(--white)] shadow-[0_14px_26px_-14px_rgba(16,17,48,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB */}
            <img src={currentPhotoSrc} alt="" className="size-full scale-[1.08] object-cover" />
          </span>
        ) : null}
        <div className="flex gap-2.5">
          <OptionTile icon={<ImageIcon />} title="Foto uploaden" subtitle="Van je toestel" onClick={onPickFromDevice} />
          <OptionTile icon={<MagicWandIcon />} title="Laat AI maken" subtitle="Een mooie foodfoto" onClick={onGenerateWithAi} />
        </div>
      </div>
    </SlideInModal>
  );
}
