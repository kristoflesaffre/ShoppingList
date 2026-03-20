"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type RecipeTileState = "default" | "disabled";
export type RecipeTileSize = "default";

/**
 * Recipe tile: displays a recipe with name and item count.
 * Default state shows an edit (pencil) action; disabled state is muted with no actions.
 * @param asChild - When true, merges container props onto the single child (Radix Slot)
 */
export interface RecipeTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Recipe name (e.g. "Pasta bolognese") */
  recipeName?: React.ReactNode;
  /** Item count label (e.g. "5 items") */
  itemCount?: React.ReactNode;
  /** "default" = interactive with edit action; "disabled" = muted, no actions */
  state?: RecipeTileState;
  /** Only "default" is defined */
  size?: RecipeTileSize;
  /** When true, merges container props onto the single child via Radix Slot */
  asChild?: boolean;
  children?: React.ReactNode;
  /** Called when the pencil (edit) button is clicked */
  onEdit?: () => void;
  className?: string;
}

/** Edit icon – zelfde geometrie als public/icons/pencil.svg, exact 24×24 px. */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-[24px] min-h-[24px] min-w-[24px] shrink-0", className)}
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
      ...props
    },
    ref,
  ) => {
    const isDisabled = state === "disabled";

    const containerClassName = cn(
      "flex w-full min-w-0 items-center gap-3 rounded-md py-3 pl-4 pr-3",
      isDisabled
        ? "bg-blue-25 pointer-events-none"
        : "bg-background-elevated shadow-drop",
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

    const defaultContent = (
      <>
        <div className="min-w-0 flex-1 flex flex-col">
          <span
            className={cn(
              "truncate font-medium text-base leading-24 tracking-normal w-full",
              isDisabled ? "text-gray-400" : "text-text-primary",
            )}
          >
            {recipeName}
          </span>
          {itemCount != null && (
            <span className="font-normal text-sm leading-20 tracking-normal text-gray-400 w-full">
              {itemCount}
            </span>
          )}
        </div>

        {!isDisabled && onEdit != null && (
          <button
            type="button"
            aria-label="Recept bewerken"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex size-10 shrink-0 items-center justify-center rounded-pill p-0 text-action-primary transition-colors hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
          >
            <PencilIcon />
          </button>
        )}
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
