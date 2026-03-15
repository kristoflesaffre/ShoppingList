"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export type CheckboxSize = "default";

/**
 * Checkbox: selected (checked) and unselected (unchecked) variants, default and disabled states.
 * Built on Radix UI Checkbox. Use asChild on the indicator to render custom content when checked.
 */
export interface CheckboxProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    "children"
  > {
  /** Size of the checkbox (only "default" is defined; 24×24) */
  size?: CheckboxSize;
  /** When true, the single child (Indicator content) is merged onto via Radix Slot */
  asChild?: boolean;
  /** Default content when checked (checkmark). When asChild, the child receives merged props. */
  children?: React.ReactNode;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    {
      className,
      size = "default",
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const indicatorContent = asChild ? (
      <Slot>{children}</Slot>
    ) : (
      <CheckIcon className="size-4 text-current" />
    );

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        data-size={size}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none",
          "size-6",
          /* Unselected default */
          "border-[var(--blue-300)] bg-[var(--white)]",
          /* Unselected disabled */
          "data-[disabled]:border-[var(--blue-100)] data-[disabled]:bg-[var(--blue-25)] disabled:border-[var(--blue-100)] disabled:bg-[var(--blue-25)]",
          /* Selected default */
          "data-[state=checked]:border-[var(--action-primary)] data-[state=checked]:bg-[var(--action-primary)] data-[state=checked]:text-[var(--action-primary-foreground)]",
          /* Selected disabled */
          "data-[state=checked][data-disabled]:border-[var(--blue-100)] data-[state=checked][data-disabled]:bg-[var(--blue-100)] data-[state=checked][data-disabled]:text-[var(--blue-300)] data-[state=checked]:disabled:border-[var(--blue-100)] data-[state=checked]:disabled:bg-[var(--blue-100)] data-[state=checked]:disabled:text-[var(--blue-300)]",
          className
        )}
        disabled={disabled}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center size-full">
          {indicatorContent}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
