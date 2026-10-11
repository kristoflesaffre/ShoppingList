"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { FreezeMaskIcon } from "@/components/ui/freeze_mask_icon";

export type RecipeTileState = "default" | "bare" | "editable" | "disabled";
export type RecipeTileSize = "default";

/**
 * Recipe tile (Figma 520:2469).
 * - **default**: witte kaart + schaduw, tekst + potlood (`onEdit`) of sneeuwvlok (`onAddFromFreezer`).
 * - **bare**: zelfde kaart + schaduw, alleen tekst (geen acties).
 * - **editable**: zoals ListCard in bewerkstand: sleepgreep, rond bord, tekst, ronde potlood- en vuilbakknop.
 * - **disabled**: primary/25 achtergrond, gedempte tekst, geen acties.
 */
export interface RecipeTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  recipeName?: React.ReactNode;
  itemCount?: React.ReactNode;
  state?: RecipeTileState;
  size?: RecipeTileSize;
  asChild?: boolean;
  children?: React.ReactNode;
  onEdit?: () => void;
  /**
   * Voegt het recept toe als diepvriesgerecht (geen ingrediënten).
   * Vervangt het potlood in `state="default"` wanneer gezet.
   */
  onAddFromFreezer?: () => void;
  /** Alleen `state="editable"`: verwijderactie. */
  onDelete?: () => void;
  /** Alleen `state="editable"`: dnd-kit `listeners` + `attributes` op de volgorde-knop. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  /** Optionele receptfoto (bijv. data-URL); cirkel links, of in editable-blok na sleep-kolom (Figma 520:2469). */
  photoUrl?: string | null;
  className?: string;
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 min-h-6 min-w-6 shrink-0", className)}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RecipePhotoThumb({
  src,
  isDisabled,
}: {
  src: string;
  isDisabled: boolean;
}) {
  return (
    <span
      className={cn(
        "relative size-12 min-h-12 min-w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border-subtle)]",
        isDisabled && "opacity-[0.3]",
      )}
    >
      {/* data-URL / willekeurige hosts: bewust geen next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        decoding="async"
        loading="lazy"
        className="size-full object-cover"
        aria-hidden
      />
    </span>
  );
}

function RecipeTextBlock({
  recipeName,
  itemCount,
  isDisabled,
}: {
  recipeName: React.ReactNode;
  itemCount?: React.ReactNode;
  isDisabled: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0">
      <span
        className={cn(
          "w-full truncate text-base font-medium leading-24 tracking-normal",
          isDisabled ? "text-[var(--gray-400)]" : "text-text-primary",
        )}
      >
        {recipeName}
      </span>
      {itemCount != null && (
        <span
          className="w-full text-sm font-normal leading-20 tracking-normal text-[var(--gray-400)]"
        >
          {itemCount}
        </span>
      )}
    </div>
  );
}

function PencilButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      type="button"
      aria-label="Recept bewerken"
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-action-primary transition-colors hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
    >
      <PencilIcon />
    </button>
  );
}

function FreezeButton({ onAddFromFreezer }: { onAddFromFreezer: () => void }) {
  return (
    <RoundIconButton
      tone="primary"
      size={28}
      aria-label="Toevoegen als diepvriesgerecht"
      onClick={(e) => {
        e.stopPropagation();
        onAddFromFreezer();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <FreezeMaskIcon className="!size-4" colorClassName="bg-[var(--blue-500)]" />
    </RoundIconButton>
  );
}

const RecipeTile = React.forwardRef<HTMLDivElement, RecipeTileProps>(
  (
    {
      className,
      recipeName = "Recipe name",
      itemCount,
      state = "default",
      size = "default",
      asChild = false,
      children,
      onEdit,
      onAddFromFreezer,
      onDelete,
      dragHandleProps,
      photoUrl,
      ...props
    },
    ref,
  ) => {
    const isDisabled = state === "disabled";
    const isBare = state === "bare";
    const isDefault = state === "default";
    const isEditable = state === "editable";
    const trimmedPhoto =
      typeof photoUrl === "string" && photoUrl.trim().length > 0
        ? photoUrl.trim()
        : null;
    const hasPhoto = trimmedPhoto != null;

    const containerClassName = cn(
      "flex w-full min-w-0 items-center rounded-lg min-h-12",
      isEditable
        ? "gap-3 rounded-[20px] bg-[var(--white)] p-3 shadow-[0_1px_2px_rgba(16,17,48,0.04)]"
        : isDisabled
        ? "gap-3 bg-[var(--blue-25)] py-[var(--space-3)] pl-[var(--space-4)] pr-[var(--space-3)] pointer-events-none"
        : "gap-3 bg-[var(--white)] py-[var(--space-3)] pl-[var(--space-4)] pr-[var(--space-3)] shadow-card",
      !isDisabled &&
        !isEditable &&
        "motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-strong motion-safe:active:scale-[0.98]",
      className,
    );

    const containerProps = {
      ref,
      "aria-disabled": isDisabled || undefined,
      "data-state": state,
      "data-size": size,
      className: containerClassName,
      ...props,
    };

    const textBlock = (
      <RecipeTextBlock
        recipeName={recipeName}
        itemCount={itemCount}
        isDisabled={isDisabled}
      />
    );

    const photoSlot =
      !isEditable && hasPhoto ? (
        <RecipePhotoThumb src={trimmedPhoto} isDisabled={isDisabled} />
      ) : null;

    const defaultContent = (
      <>
        {isDisabled ? (
          <>
            {photoSlot}
            {textBlock}
          </>
        ) : null}

        {isBare ? (
          <>
            {photoSlot}
            {textBlock}
          </>
        ) : null}

        {isDefault ? (
          <>
            {photoSlot}
            {textBlock}
            {onAddFromFreezer != null ? (
              <FreezeButton onAddFromFreezer={onAddFromFreezer} />
            ) : onEdit != null ? (
              <PencilButton onEdit={onEdit} />
            ) : null}
          </>
        ) : null}

        {isEditable ? (
          <>
            <button
              type="button"
              aria-label="Volgorde wijzigen"
              className="-ml-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-[var(--gray-300)] transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] active:cursor-grabbing"
              {...(dragHandleProps ?? {})}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
                <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
                <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
                <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
              </svg>
            </button>
            <span aria-hidden className={cn("relative size-12 shrink-0 overflow-hidden rounded-full", !hasPhoto && "bg-[var(--gray-25)]")}>
              {hasPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL of externe receptfoto
                <img src={trimmedPhoto} alt="" width={48} height={48} decoding="async" loading="lazy" className="size-full scale-[1.08] object-cover" />
              ) : null}
            </span>
            <div className="flex min-w-0 flex-1 flex-col leading-5">
              <span className="truncate text-base font-semibold leading-5 text-text-primary">{recipeName}</span>
              {itemCount != null ? <span className="text-[13px] text-[var(--text-tertiary)]">{itemCount}</span> : null}
            </div>
            {onEdit != null ? (
              <RoundIconButton
                tone="primary"
                size={28}
                aria-label="Recept bewerken"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {RoundIcons.pencil}
              </RoundIconButton>
            ) : null}
            {onDelete != null ? (
              <RoundIconButton
                tone="danger"
                size={28}
                aria-label="Recept verwijderen"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {RoundIcons.trash}
              </RoundIconButton>
            ) : null}
          </>
        ) : null}
      </>
    );

    if (asChild) {
      return <Slot {...containerProps}>{children}</Slot>;
    }
    return <div {...containerProps}>{defaultContent}</div>;
  },
);

RecipeTile.displayName = "RecipeTile";

export { RecipeTile };
