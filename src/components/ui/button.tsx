"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "default";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
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
      "inline-flex items-center justify-center font-medium text-base leading-6 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none";

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

    return (
      <Comp
        ref={ref}
        className={cn(base, sizeStyles[size], variantStyle, className)}
        disabled={disabled}
        data-variant={variant}
        data-size={size}
        data-disabled={disabled || undefined}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
