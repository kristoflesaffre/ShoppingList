"use client";

import { SlideInModal } from "@/components/ui/slide_in_modal";
import { FoodImageGenerator } from "@/components/food-image-generator";
import type { FoodImageGenerationResult } from "@/components/food-image-generator";

export type { FoodImageGenerationResult } from "@/components/food-image-generator";

export function FoodImageGeneratorSlideIn({
  open,
  onClose,
  onBack,
  ownerId,
  initialDishName = "",
  initialDishDescription = "",
  onGenerationComplete,
}: {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  ownerId: string;
  initialDishName?: string;
  initialDishDescription?: string;
  onGenerationComplete: (result: FoodImageGenerationResult) => Promise<void>;
}) {
  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      onBack={onBack}
      title="Food image genereren"
      titleId="food-image-generator-slide-in-title"
      containerClassName="z-[70]"
      className="pb-0"
    >
      <div className="flex w-full flex-col gap-4 px-4 pb-6">
        <p className="text-sm leading-20 text-[var(--text-secondary)]">
          Genereer een consistente top-down food image. Na generatie wordt de
          foto automatisch op je recept gezet.
        </p>
        <FoodImageGenerator
          ownerId={ownerId}
          initialDishName={initialDishName}
          initialDishDescription={initialDishDescription}
          embedMode
          onGenerationComplete={onGenerationComplete}
        />
      </div>
    </SlideInModal>
  );
}
