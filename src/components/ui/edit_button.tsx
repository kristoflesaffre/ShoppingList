"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export type EditButtonVariant = "active" | "inactive";
export type EditButtonSize = "default";

/**
 * Edit button: icon + label. Variant "inactive" = pencil + "Wijzigen"; "active" = check + "Gereed".
 * @param asChild - When true, merges props onto the single child (Radix Slot)
 */
export interface EditButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** "inactive" = pencil + Wijzigen (white/outline); "active" = check + Gereed (filled) */
  variant?: EditButtonVariant;
  size?: EditButtonSize;
  disabled?: boolean;
  /** Render as child element (Radix Slot); child receives merged props and styles */
  asChild?: boolean;
  /** Override label when variant is inactive (default: "Wijzigen") */
  labelInactive?: React.ReactNode;
  /** Override label when variant is active (default: "Gereed") */
  labelActive?: React.ReactNode;
  /**
   * When asChild is true, the single child element (e.g. <a>) to merge props and styles onto.
   * Ignored when asChild is false.
   */
  children?: React.ReactNode;
}

const EditButton = React.forwardRef<HTMLButtonElement, EditButtonProps>(
  (
    {
      className,
      variant = "inactive",
      size = "default",
      disabled = false,
      asChild = false,
      labelInactive = "Wijzigen",
      labelActive = "Gereed",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base =
      "inline-flex items-center justify-center gap-1 font-normal text-sm leading-20 tracking-normal whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:shrink-0";

    const sizeStyles: Record<EditButtonSize, string> = {
      default: "py-1 px-2 rounded-pill",
    };

    const variantStyles: Record<
      EditButtonVariant,
      { default: string; disabled: string }
    > = {
      inactive: {
        default:
          "bg-[var(--action-secondary-bg)] border border-[var(--action-secondary-border)] text-[var(--action-secondary-foreground)] hover:bg-[var(--action-ghost-hover)]",
        disabled:
          "border border-[var(--blue-200)] text-[var(--blue-300)] bg-[var(--blue-25)]",
      },
      active: {
        default:
          "bg-[var(--action-primary)] text-[var(--action-primary-foreground)] hover:bg-[var(--action-primary-hover)]",
        disabled: "bg-[var(--blue-25)] text-[var(--blue-300)]",
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

    const content = (
      <>
        {variant === "active" ? (
          <CheckIcon className="size-6" />
        ) : (
          <PencilIcon className="size-6" />
        )}
        <span>{variant === "active" ? labelActive : labelInactive}</span>
      </>
    );

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
        {isSlot ? props.children : content}
      </Comp>
    );
  }
);

EditButton.displayName = "EditButton";

export { EditButton };
