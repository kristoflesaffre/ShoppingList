"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Toegankelijke naam als er geen zichtbaar label aan gekoppeld is. */
  "aria-label"?: string;
}

/**
 * Design system «Schakelaar»: aan/uit voor een instelling die meteen geldt (geen bewaarknop).
 * 46×28, aan = primair blauw, uit = lichtgrijs. Voor keuzes uit een lijst → Checkbox / ChoiceRow.
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, disabled, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-[46px] shrink-0 items-center rounded-full transition-colors duration-fast ease-out-strong",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[var(--action-primary)]" : "bg-[var(--gray-100)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] size-[22px] rounded-full bg-[var(--white)] shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] duration-fast ease-out-strong",
          checked ? "left-[21px]" : "left-[3px]",
        )}
      />
    </button>
  );
});
