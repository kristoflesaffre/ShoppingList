"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/** Pencil icon – public/icons/pencil.svg, 24×24, currentColor. */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Checkmark icon – public/icons/checkmark.svg, 24×24, currentColor. */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.1625 5.04856L8.9625 19.4496C8.8475 19.5956 8.6755 19.6866 8.4895 19.6986C8.4765 19.6996 8.4625 19.7006 8.4495 19.7006C8.2775 19.7006 8.1125 19.6326 7.9905 19.5106L3.1905 14.7096C2.9365 14.4556 2.9365 14.0436 3.1905 13.7896C3.4445 13.5356 3.8555 13.5356 4.1095 13.7896L8.3885 18.0696L19.1365 4.25056C19.3575 3.96656 19.7655 3.91756 20.0485 4.13656C20.3325 4.35756 20.3825 4.76556 20.1625 5.04856Z"
        fill="currentColor"
      />
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
      "inline-flex items-center justify-center gap-1 font-normal text-sm leading-20 tracking-normal whitespace-nowrap transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:shrink-0 active:scale-95";

    const sizeStyles: Record<EditButtonSize, string> = {
      default: "py-1 px-2 rounded-pill",
    };

    const variantStyles: Record<
      EditButtonVariant,
      { default: string; disabled: string }
    > = {
      inactive: {
        default:
          "bg-[var(--action-secondary-bg)] text-[var(--action-secondary-foreground)] hover:bg-[var(--action-ghost-hover)]",
        disabled:
          "text-[var(--blue-300)] bg-[var(--blue-25)]",
      },
      active: {
        default:
          "bg-[var(--blue-500)] text-[var(--white)] hover:bg-[var(--blue-600)]",
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

    const buttonElement = (
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

    /* Wrapper met key={variant} triggert schaalanimatie bij variant switch */
    return (
      <span
        key={variant}
        className="inline-flex animate-edit-button-scale"
      >
        {buttonElement}
      </span>
    );
  }
);

EditButton.displayName = "EditButton";

export { EditButton };
