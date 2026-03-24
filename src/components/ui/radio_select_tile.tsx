"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { RadioButton, type RadioButtonState, type RadioButtonVariant } from "./radio_button";
import { SelectTile, type SelectTileProps } from "./select_tile";

export type RadioSelectTileVariant = RadioButtonVariant;
export type RadioSelectTileSize = "default";
export type RadioSelectTileState = RadioButtonState;

/**
 * RadioSelectTile combineert RadioButton + SelectTile (Figma 771:3060).
 * Gebruik `variant` voor selected/unselected en `state` voor default/disabled.
 * Met `asChild` worden de wrapper-props via Radix Slot op een enkel child gezet.
 */
export interface RadioSelectTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  variant?: RadioSelectTileVariant;
  size?: RadioSelectTileSize;
  state?: RadioSelectTileState;
  title?: SelectTileProps["title"];
  subtitle?: SelectTileProps["subtitle"];
  icon?: SelectTileProps["icon"];
  asChild?: boolean;
  children?: React.ReactNode;
}

const RadioSelectTile = React.forwardRef<HTMLDivElement, RadioSelectTileProps>(
  (
    {
      className,
      variant = "unselected",
      size = "default",
      state = "default",
      title = "Title",
      subtitle = "Subtitle",
      icon,
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = state === "disabled";
    const Comp = asChild ? Slot : "div";

    const wrapperClassName = cn(
      "flex w-full min-w-0 items-center gap-3",
      isDisabled && "pointer-events-none",
      className,
    );

    const wrapperProps = {
      ref,
      "aria-disabled": isDisabled || undefined,
      "data-variant": variant,
      "data-size": size,
      "data-state": state,
      className: wrapperClassName,
      ...props,
    };

    if (asChild) {
      return <Comp {...wrapperProps}>{children}</Comp>;
    }

    return (
      <Comp {...wrapperProps}>
        <RadioButton
          variant={variant}
          state={state}
          size={size}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none shrink-0"
        />
        <SelectTile
          className="flex-1"
          variant="default"
          size="default"
          state={isDisabled ? "disabled" : "default"}
          title={title}
          subtitle={subtitle}
          icon={icon}
        />
      </Comp>
    );
  },
);

RadioSelectTile.displayName = "RadioSelectTile";

export { RadioSelectTile };
