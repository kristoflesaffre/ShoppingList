"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type MiniButtonVariant = "primary" | "secondary";
export type MiniButtonSize = "default";

/**
 * Mini button: compact pill button with label. Supports primary (filled) and secondary (outline) variants.
 * @param asChild - When true, merges props onto the single child (Radix Slot)
 */
export interface MiniButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** "primary" = filled; "secondary" = outline */
  variant?: MiniButtonVariant;
  size?: MiniButtonSize;
  disabled?: boolean;
  /** Render as child element (Radix Slot); child receives merged props and styles */
  asChild?: boolean;
  /**
   * When asChild is true, the single child element (e.g. <a>) to merge props and styles onto.
   * Ignored when asChild is false.
   */
  children?: React.ReactNode;
}

const MiniButton = React.forwardRef<HTMLButtonElement, MiniButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      disabled = false,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base =
      "inline-flex items-center justify-center font-medium text-xs leading-16 tracking-normal whitespace-nowrap rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none";

    const sizeStyles: Record<MiniButtonSize, string> = {
      default: "py-1 px-4",
    };

    const variantStyles: Record<
      MiniButtonVariant,
      { default: string; disabled: string }
    > = {
      primary: {
        default:
          "bg-[var(--action-primary)] text-[var(--action-primary-foreground)] hover:bg-[var(--action-primary-hover)]",
        disabled: "bg-[var(--blue-25)] text-[var(--blue-300)]",
      },
      secondary: {
        default:
          "bg-[var(--action-secondary-bg)] border border-[var(--action-secondary-border)] text-[var(--action-secondary-foreground)] hover:bg-[var(--action-ghost-hover)]",
        disabled:
          "border border-[var(--blue-200)] text-[var(--blue-300)] bg-[var(--action-secondary-bg)]",
      },
    };

    const state = disabled ? "disabled" : "default";
    const variantStyle = variantStyles[variant][state];

    const isSlot = asChild;
    const slotProps =
      isSlot && disabled
        ? {
            "aria-disabled": true as const,
            style: { pointerEvents: "none" as const },
          }
        : {};

    return (
      <Comp
        ref={ref}
        type={isSlot ? undefined : (props.type ?? "button")}
        className={cn(base, sizeStyles[size], variantStyle, className)}
        disabled={isSlot ? undefined : disabled}
        data-variant={variant}
        data-size={size}
        data-disabled={disabled || undefined}
        {...slotProps}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

MiniButton.displayName = "MiniButton";

export { MiniButton };
