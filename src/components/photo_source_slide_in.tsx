"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { SelectTile } from "@/components/ui/select_tile";

function MaskIcon({
  maskUrl,
  ariaLabel,
}: {
  maskUrl: string;
  ariaLabel: string;
}) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="inline-block size-10 shrink-0 bg-[var(--action-primary)]"
      style={{
        WebkitMaskImage: `url("${maskUrl}")`,
        maskImage: `url("${maskUrl}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

function IconImageUpload() {
  return (
    <MaskIcon
      maskUrl="/icons/icons/image.svg"
      ariaLabel="Foto uploaden"
    />
  );
}

function IconImageAi() {
  return <MaskIcon maskUrl="/icons/icons/image_ai.svg" ariaLabel="AI" />;
}

export function PhotoSourceSlideIn({
  open,
  onClose,
  title,
  onPickFromDevice,
  onGenerateWithAi,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
      className="pb-0"
    >
      <div className="flex w-full flex-col gap-4 px-4">
        <button
          type="button"
          onClick={onPickFromDevice}
          className="w-full bg-transparent p-0 text-left"
        >
          <SelectTile
            title="Foto uploaden"
            subtitle="Van je toestel"
            icon={<IconImageUpload />}
          />
        </button>

        <button
          type="button"
          onClick={onGenerateWithAi}
          className="w-full bg-transparent p-0 text-left"
        >
          <SelectTile
            title="Genereren met AI"
            subtitle="Binnenkort beschikbaar"
            icon={<IconImageAi />}
          />
        </button>
      </div>
    </SlideInModal>
  );
}

