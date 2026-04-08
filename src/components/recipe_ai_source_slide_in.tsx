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

function IconPhotoUpload() {
  return <MaskIcon maskUrl="/icons/image.svg" ariaLabel="Foto opladen" />;
}

function IconLinkShare() {
  return <MaskIcon maskUrl="/icons/link.svg" ariaLabel="Link delen" />;
}

export function RecipeAiSourceSlideIn({
  open,
  onClose,
  onPickPhotos,
  onUseLink,
}: {
  open: boolean;
  onClose: () => void;
  onPickPhotos: () => void;
  onUseLink: () => void;
}) {
  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Toevoegen met AI"
      titleId="recipe-ai-source-slide-title"
      containerClassName="z-[70]"
      className="pb-0"
    >
      <div className="flex w-full flex-col gap-4 px-4">
        <button
          type="button"
          onClick={onPickPhotos}
          className="w-full bg-transparent p-0 text-left"
        >
          <SelectTile
            title="Foto('s) opladen"
            subtitle="Upload van je toestel"
            icon={<IconPhotoUpload />}
          />
        </button>

        <button
          type="button"
          onClick={onUseLink}
          className="w-full bg-transparent p-0 text-left"
        >
          <SelectTile
            title="Link delen"
            subtitle="Plak een receptlink"
            icon={<IconLinkShare />}
          />
        </button>
      </div>
    </SlideInModal>
  );
}
