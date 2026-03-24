"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type RadioButtonVariant = "selected" | "unselected";
export type RadioButtonSize = "default";
export type RadioButtonState = "default" | "disabled";

/**
 * RadioButton visual primitive (Figma 770:3320).
 * - `variant`: selected / unselected
 * - `state`: default / disabled
 * - `asChild`: merge styles and behavior onto a single child via Radix Slot
 */
export interface RadioButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: RadioButtonVariant;
  size?: RadioButtonSize;
  state?: RadioButtonState;
  asChild?: boolean;
  /**
   * Optional custom selected indicator content.
   * By default a circular fill is rendered when `variant="selected"`.
   */
  children?: React.ReactNode;
}

const RadioButton = React.forwardRef<HTMLButtonElement, RadioButtonProps>(
  (
    {
      className,
      variant = "unselected",
      size = "default",
      state = "default",
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || state === "disabled";
    const isSelected = variant === "selected";
    const isSlot = asChild;

    const baseStyles =
      "inline-flex shrink-0 items-center justify-center rounded-full border border-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2";

    const sizeStyles: Record<RadioButtonSize, string> = {
      default: "size-6",
    };

    const stateStyles = isDisabled
      ? isSelected
        ? "border-blue-200 bg-white text-blue-200"
        : "border-blue-100 bg-blue-25 text-blue-100"
      : isSelected
        ? "border-action-primary bg-white text-action-primary"
        : "border-blue-200 bg-white text-blue-200";

    return (
      <Comp
        ref={ref}
        type={isSlot ? undefined : (props.type ?? "button")}
        role="radio"
        aria-checked={isSelected}
        aria-disabled={isDisabled || undefined}
        disabled={isSlot ? undefined : isDisabled}
        data-variant={variant}
        data-size={size}
        data-state={state}
        className={cn(
          baseStyles,
          sizeStyles[size],
          stateStyles,
          isDisabled && "pointer-events-none",
          className,
        )}
        {...props}
      >
        {isSelected ? (
          children ?? (
            <span
              className={cn(
                "size-4 rounded-full border border-1",
                isDisabled
                  ? "border-blue-100 bg-blue-200"
                  : "border-blue-100 bg-action-primary",
              )}
              aria-hidden="true"
            />
          )
        ) : null}
      </Comp>
    );
  },
);

RadioButton.displayName = "RadioButton";

export { RadioButton };
