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

/** Edit icon – public/icons/pencil.svg, 24×24, currentColor. */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      width={24}
      height={24}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M7.17663 23.8235C7.03379 23.6807 6.97224 23.4751 7.01172 23.2777L7.94074 18.633C7.96397 18.5157 8.02087 18.4089 8.10564 18.323L19.2539 7.17679C19.4896 6.94107 19.8728 6.94107 20.1086 7.17679L23.8246 10.8926C23.9361 11.0064 24 11.1596 24 11.3199C24 11.4801 23.9361 11.6334 23.8246 11.7472L21.0376 14.534L12.6764 22.8934C12.5905 22.9782 12.4836 23.0362 12.3664 23.0594L7.72126 23.9884C7.68178 23.9965 7.6423 24 7.60281 24C7.44488 23.9988 7.29043 23.9361 7.17663 23.8235ZM17.7465 10.3909L20.6091 13.2533L22.5426 11.3199L19.6801 8.45757L17.7465 10.3909ZM8.37274 22.6263L11.9506 21.911L19.7544 14.1079L16.893 11.2456L9.08808 19.0499L8.37274 22.6263Z"
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

        {!isDisabled && (
          <button
            type="button"
            aria-label="Edit recipe"
            onClick={onEdit}
            className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-action-primary transition-colors hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
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
