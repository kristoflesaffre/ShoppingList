"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ToggleButtonVariant = "active" | "inactive";
export type ToggleButtonSize = "default";

/**
 * Toggle button: chip-style button with label. Variant "inactive" = subtle fill; "active" = bordered fill.
 * @param asChild - When true, merges props onto the single child (Radix Slot)
 */
export interface ToggleButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** "inactive" = subtle bg + blue text; "active" = blue-100 bg + border + semibold */
  variant?: ToggleButtonVariant;
  size?: ToggleButtonSize;
  /** Render as child element (Radix Slot); child receives merged props and styles */
  asChild?: boolean;
  /**
   * When asChild is true, the single child element (e.g. <a>) to merge props and styles onto.
   * Ignored when asChild is false.
   */
  children?: React.ReactNode;
}

const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(
  (
    {
      className,
      variant = "inactive",
      size = "default",
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base =
      "inline-flex items-center justify-center text-sm leading-20 tracking-normal whitespace-nowrap rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 [&_svg]:shrink-0";

    const sizeStyles: Record<ToggleButtonSize, string> = {
      default: "py-2 px-3",
    };

    const variantStyles: Record<ToggleButtonVariant, string> = {
      inactive:
        "bg-[var(--blue-25)] text-[var(--text-link)] font-normal hover:bg-[var(--blue-50)]",
      active:
        "bg-[var(--blue-100)] border border-[var(--action-primary)] text-[var(--action-primary)] font-semibold",
    };

    const isSlot = asChild;

    return (
      <Comp
        ref={ref}
        type={isSlot ? undefined : (props.type ?? "button")}
        className={cn(base, sizeStyles[size], variantStyles[variant], className)}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

ToggleButton.displayName = "ToggleButton";

export { ToggleButton };
