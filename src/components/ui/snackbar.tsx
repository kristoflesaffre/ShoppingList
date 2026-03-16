"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type SnackbarState = "default" | "disabled";
export type SnackbarSize = "default";

/**
   * Snackbar: inline notification used for undo-acties (bv. "Zet terug").
 * Default: donkerblauwe balk met bericht links en actie rechts.
 * Disabled: gedimde variant zonder klikbare actie.
 * @param asChild - Wanneer true, worden containerprops op het kind gemerged (Radix Slot).
 */
export interface SnackbarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Hoofdtekst, bv. "‘Wasverzachter’ verwijderd" */
  message?: React.ReactNode;
  /** Label voor de actieknop, bv. "Zet terug" */
  actionLabel?: React.ReactNode;
  /** Wordt aangeroepen wanneer op de actieknop geklikt wordt */
  onAction?: () => void;
  /** Visuele state van de snackbar */
  state?: SnackbarState;
  /** Alleen "default" gedefinieerd voor nu */
  size?: SnackbarSize;
  /** Gebruik Radix Slot voor flexibele compositie */
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const Snackbar = React.forwardRef<HTMLDivElement, SnackbarProps>(
  (
    {
      className,
      message = "‘Wasverzachter’ verwijderd",
      actionLabel = "Zet terug",
      onAction,
      state = "default",
      size = "default",
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = state === "disabled";

    const containerClassName = cn(
      "flex w-full max-w-[374px] items-center gap-3 rounded-md px-3 py-3 shadow-drop text-sm leading-20 tracking-normal",
      isDisabled
        ? "bg-gray-400 text-text-inverse opacity-80 pointer-events-none"
        : "bg-blue-800 text-text-inverse",
      className,
    );

    const containerProps = {
      ref,
      "aria-disabled": isDisabled || undefined,
      "data-state": state,
      "data-size": size,
      className: containerClassName,
      role: "status" as const,
      ...props,
    };

    const defaultContent = (
      <>
        <span className="flex-1 min-w-0 truncate">
          {message}
        </span>

        {actionLabel != null && (
          <button
            type="button"
            onClick={isDisabled ? undefined : onAction}
            disabled={isDisabled}
            className={cn(
              "shrink-0 whitespace-nowrap text-xs font-bold",
              isDisabled
                ? "text-text-disabled"
                : "text-blue-200 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
            )}
          >
            {actionLabel}
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

Snackbar.displayName = "Snackbar";

export { Snackbar };

