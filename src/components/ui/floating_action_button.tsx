"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

function PlusIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export type FloatingActionButtonSize = "default";

/**
 * Floating action button: circular button with plus icon. Single variant, supports default and disabled states.
 * @param asChild - When true, merges props onto the single child (Radix Slot)
 */
export interface FloatingActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Button size (padding); only "default" is defined */
  size?: FloatingActionButtonSize;
  disabled?: boolean;
  /** Render as child element (Radix Slot); child receives merged props and styles */
  asChild?: boolean;
  /**
   * When asChild is true, the single child element (e.g. <a>) to merge props and styles onto.
   * Ignored when asChild is false.
   */
  children?: React.ReactNode;
  /** Optioneel label dat vanaf desktop vóór het plusicoon verschijnt. */
  desktopLabel?: string;
  /** Schakel de zwevende schaduw en hover-glow uit. */
  elevated?: boolean;
}

const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(
  (
    {
      className,
      size = "default",
      disabled = false,
      asChild = false,
      desktopLabel,
      elevated = true,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base =
      "inline-flex items-center justify-center rounded-full transition-[background-color,box-shadow,transform] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:shrink-0 motion-safe:active:scale-90 group/fab";

    const sizeStyles: Record<FloatingActionButtonSize, string> = {
      default: "p-4",
    };

    /* Gekleurde schaduw (blue-500-tint): de FAB is de enige zwevende primaire actie en mag “gloeien”. */
    const defaultStyles = cn(
      "bg-[var(--blue-500)] text-[var(--white)] [@media(hover:hover)]:hover:bg-[var(--blue-600)]",
      elevated
        ? "shadow-fab [@media(hover:hover)]:hover:shadow-raised"
        : "shadow-none",
    );
    const disabledStyles =
      "bg-[var(--blue-25)] text-[var(--blue-300)] shadow-none";

    const stateStyle = disabled ? disabledStyles : defaultStyles;

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
        {desktopLabel ? (
          <span className="hidden text-sm font-semibold leading-5 lg:inline">
            {desktopLabel}
          </span>
        ) : null}
        <PlusIcon className="size-6 motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-strong motion-safe:group-active/fab:rotate-90" />
      </>
    );

    return (
      <Comp
        ref={ref}
        type={isSlot ? undefined : (props.type ?? "button")}
        className={cn(base, sizeStyles[size], stateStyle, className)}
        disabled={isSlot ? undefined : disabled}
        data-size={size}
        data-disabled={disabled || undefined}
        aria-label={props["aria-label"] ?? "Toevoegen"}
        {...slotProps}
        {...props}
      >
        {isSlot ? props.children : content}
      </Comp>
    );
  }
);

FloatingActionButton.displayName = "FloatingActionButton";

export { FloatingActionButton };
