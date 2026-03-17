"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "default";

/**
 * Button props. Extends native button attributes.
 * @param asChild - When true, merges props onto the single child (Radix Slot); use e.g. <Button asChild><a href="...">Link</a></Button>
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Render as child element (Radix Slot); child receives merged props and styles */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      disabled = false,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base =
      "inline-flex max-w-[280px] min-w-0 items-center justify-center overflow-hidden font-medium text-base leading-24 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none";

    const sizeStyles = {
      default: "py-2 px-4 rounded-[var(--radius-pill)]",
    };

    const variantStyles: Record<
      ButtonVariant,
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
      tertiary: {
        default:
          "bg-transparent text-[var(--text-link)] underline hover:text-[var(--action-primary-hover)]",
        disabled: "text-[var(--blue-300)] no-underline bg-transparent",
      },
    };

    const state = disabled ? "disabled" : "default";
    const variantStyle = variantStyles[variant][state];

    const isSlot = asChild;
    const slotProps = isSlot && disabled
      ? { "aria-disabled": true as const, style: { pointerEvents: "none" as const } }
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
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
