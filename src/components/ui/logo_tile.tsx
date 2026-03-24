"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type LogoTileVariant = "default";
export type LogoTileSize = "default";
export type LogoTileState = "default" | "disabled";

/**
 * Logo tile: merklogo met korte naam (Figma 791:3292).
 * Vaste breedte 82px (5.125rem): 48px logo + horizontale padding `sp-12` (12px).
 * Default = wit (`--bg-elevated`), `--shadow-drop`, label `--text-primary`; disabled = `--blue-25`, geen schaduw, label `--gray-400`, logo `opacity-50`.
 *
 * @param asChild — `true`: containerprops (ref, className, data-*) worden op het ene child gezet (Radix Slot).
 */
export interface LogoTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  variant?: LogoTileVariant;
  size?: LogoTileSize;
  state?: LogoTileState;
  /** Logo-slot (48×48 gebied, Figma); genegeerd wanneer `asChild` true is. */
  logo?: React.ReactNode;
  /** Label onder het logo; genegeerd wanneer `asChild` true is. */
  label?: React.ReactNode;
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const LogoTile = React.forwardRef<HTMLDivElement, LogoTileProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      state = "default",
      logo,
      label = "Label",
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = state === "disabled";

    const containerClassName = cn(
      "flex w-[5.125rem] shrink-0 flex-col items-center gap-2 rounded-md p-3 tracking-normal",
      isDisabled
        ? "bg-blue-25 pointer-events-none shadow-none"
        : "bg-background-elevated shadow-drop",
      className,
    );

    const containerProps = {
      ref,
      "aria-disabled": isDisabled || undefined,
      "data-variant": variant,
      "data-size": size,
      "data-state": state,
      className: containerClassName,
      ...props,
    };

    if (asChild) {
      return <Slot {...containerProps}>{children}</Slot>;
    }

    return (
      <div {...containerProps}>
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center overflow-hidden",
            isDisabled && "opacity-50",
          )}
        >
          {logo}
        </span>
        <span
          className={cn(
            "w-full min-w-0 shrink-0 text-center text-sm font-medium leading-20",
            isDisabled ? "text-gray-400" : "text-text-primary",
          )}
        >
          {label}
        </span>
      </div>
    );
  },
);

LogoTile.displayName = "LogoTile";

export { LogoTile };
