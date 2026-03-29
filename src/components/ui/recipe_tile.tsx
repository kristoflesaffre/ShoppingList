"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type RecipeTileState = "default" | "bare" | "editable" | "disabled";
export type RecipeTileSize = "default";

/**
 * Recipe tile (Figma 520:2469).
 * - **default**: witte kaart + schaduw, tekst + potlood (indien `onEdit`).
 * - **bare**: zelfde kaart + schaduw, alleen tekst (geen acties).
 * - **editable**: kaart + schaduw, volgorde-greep | scheiding | tekst + potlood | scheiding | prullenbak.
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
  /** Alleen `state="editable"`: verwijderactie. */
  onDelete?: () => void;
  /** Alleen `state="editable"`: dnd-kit `listeners` + `attributes` op de volgorde-knop. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
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

/** Zelfde icoon als ListCard – viewBox 32×32, schaal naar 24px i.p.v. 32. */
function ReorderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.062 8.19952C18.062 7.90252 18.303 7.66152 18.6 7.66152H25.5C25.797 7.66152 26.038 7.90252 26.038 8.19952C26.038 8.49652 25.797 8.73752 25.5 8.73752H18.6C18.303 8.73752 18.062 8.49652 18.062 8.19952ZM25.5 13.7615H18.6C18.303 13.7615 18.062 14.0025 18.062 14.2995C18.062 14.5965 18.303 14.8375 18.6 14.8375H25.5C25.797 14.8375 26.038 14.5965 26.038 14.2995C26.038 14.0025 25.797 13.7615 25.5 13.7615ZM25.5 19.7615H18.6C18.303 19.7615 18.062 20.0025 18.062 20.2995C18.062 20.5965 18.303 20.8375 18.6 20.8375H25.5C25.797 20.8375 26.038 20.5965 26.038 20.2995C26.038 20.0025 25.797 19.7615 25.5 19.7615ZM12.075 16.5145C11.862 16.3075 11.522 16.3115 11.315 16.5255C11.108 16.7385 11.113 17.0785 11.326 17.2855L13.874 19.7615H12.6C9.53304 19.7615 7.03804 17.2665 7.03804 14.1995C7.03804 11.0805 9.48104 8.63752 12.6 8.63752H15.2C15.497 8.63752 15.738 8.39652 15.738 8.09952C15.738 7.80252 15.497 7.56152 15.2 7.56152H12.6C8.87804 7.56152 5.96204 10.4775 5.96204 14.1995C5.96204 17.8595 8.94004 20.8375 12.6 20.8375H13.928L11.414 23.4255C11.207 23.6385 11.212 23.9795 11.425 24.1865C11.529 24.2885 11.664 24.3385 11.8 24.3385C11.94 24.3385 12.08 24.2835 12.186 24.1755L15.586 20.6755C15.793 20.4625 15.788 20.1215 15.575 19.9145L12.075 16.5145Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.938 13.5933V23.2223C22.938 23.7893 22.717 24.3243 22.317 24.7253C21.916 25.1253 21.381 25.3463 20.814 25.3463H11.186C10.618 25.3463 10.084 25.1253 9.68395 24.7253C9.28295 24.3233 9.06095 23.7893 9.06095 23.2223V13.5933C9.06095 13.3063 9.29395 13.0733 9.58095 13.0733C9.86795 13.0733 10.101 13.3063 10.101 13.5933V23.2223C10.101 23.5073 10.217 23.7873 10.419 23.9893C10.624 24.1943 10.896 24.3073 11.186 24.3073H20.815C21.105 24.3073 21.377 24.1943 21.582 23.9893C21.787 23.7853 21.9 23.5123 21.9 23.2223V13.5933C21.9 13.3063 22.132 13.0733 22.42 13.0733C22.708 13.0733 22.938 13.3063 22.938 13.5933ZM25.346 10.3843C25.346 10.6713 25.114 10.9043 24.826 10.9043H7.17295C6.88595 10.9043 6.65295 10.6713 6.65295 10.3843C6.65295 10.0973 6.88595 9.8643 7.17295 9.8643H12.27V7.1743C12.27 6.8873 12.503 6.6543 12.79 6.6543H19.209C19.496 6.6543 19.729 6.8873 19.729 7.1743V9.8643H24.826C25.113 9.8643 25.346 10.0973 25.346 10.3843ZM13.311 9.8643H18.691V7.6943H13.311V9.8643ZM18.659 20.8143V16.0003C18.659 15.7133 18.427 15.4803 18.139 15.4803C17.851 15.4803 17.619 15.7133 17.619 16.0003V20.8143C17.619 21.1013 17.851 21.3343 18.139 21.3343C18.427 21.3343 18.659 21.1023 18.659 20.8143ZM14.38 20.8143V16.0003C14.38 15.7133 14.147 15.4803 13.86 15.4803C13.573 15.4803 13.34 15.7133 13.34 16.0003V20.8143C13.34 21.1013 13.573 21.3343 13.86 21.3343C14.147 21.3343 14.38 21.1023 14.38 20.8143Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Figma editable: verticale lijn ~44px hoog, neutrals/100. */
function EditableDivider() {
  return (
    <span
      className="relative flex h-11 w-0 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span className="absolute left-1/2 top-0 h-11 w-px -translate-x-1/2 bg-[var(--gray-100)]" />
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
      onDelete,
      dragHandleProps,
      ...props
    },
    ref,
  ) => {
    const isDisabled = state === "disabled";
    const isBare = state === "bare";
    const isDefault = state === "default";
    const isEditable = state === "editable";

    const containerClassName = cn(
      "flex w-full min-w-0 items-center rounded-md",
      isDisabled
        ? "gap-3 bg-[var(--blue-25)] py-[var(--space-3)] pl-[var(--space-4)] pr-[var(--space-3)] pointer-events-none"
        : "gap-3 bg-[var(--white)] py-[var(--space-3)] pl-[var(--space-4)] pr-[var(--space-3)] shadow-drop",
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

    const defaultContent = (
      <>
        {isDisabled ? textBlock : null}

        {isBare ? textBlock : null}

        {isDefault ? (
          <>
            {textBlock}
            {onEdit != null ? <PencilButton onEdit={onEdit} /> : null}
          </>
        ) : null}

        {isEditable ? (
          <>
            <button
              type="button"
              aria-label="Volgorde wijzigen"
              className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-pill p-1 text-[var(--blue-500)] transition-colors hover:bg-[var(--blue-25)] hover:text-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 active:cursor-grabbing"
              {...(dragHandleProps ?? {})}
            >
              <ReorderIcon />
            </button>
            <EditableDivider />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {textBlock}
              {onEdit != null ? <PencilButton onEdit={onEdit} /> : null}
            </div>
            <EditableDivider />
            <button
              type="button"
              aria-label="Recept verwijderen"
              disabled={onDelete == null}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
            >
              <TrashIcon />
            </button>
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
