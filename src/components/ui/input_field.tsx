"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type InputFieldSize = "default";

/**
 * Input field: label + text input. Variants (without/with content) are driven by the input value.
 * States: default, disabled, focus (styled via :focus-visible).
 * @param asChild - When true, merges input props and styles onto the single child (e.g. <input />) via Radix Slot
 */
export interface InputFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "size" | "children"
  > {
  /** Optional label above the input */
  label?: React.ReactNode;
  /** Input size; only "default" is defined */
  size?: InputFieldSize;
  /** When true, the single child (input element) receives merged props and styles */
  asChild?: boolean;
  /** When asChild is true, the single child element (e.g. <input />) to merge onto */
  children?: React.ReactNode;
}

/* Design system «Invoerveld»: grijs vlak zonder rand (radius 16), zoals zoekveld en stepper.
   Focus: wit vlak met lavendel rand. */
const inputBase =
  "flex h-12 w-full items-center rounded-[16px] bg-[var(--gray-25)] px-4 text-[15px] leading-24 tracking-normal text-[var(--text-primary)] transition-[background-color,box-shadow] duration-fast ease-out-strong placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:bg-[var(--white)] focus-visible:shadow-[inset_0_0_0_1.5px_var(--blue-300)] disabled:pointer-events-none disabled:opacity-60 disabled:text-[var(--text-disabled)]";

const inputDefaultBorder = "";

const labelBase =
  "text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]";

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      className,
      label,
      size = "default",
      asChild = false,
      children,
      id: idProp,
      disabled,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;

    const sizeStyles: Record<InputFieldSize, string> = {
      default: "h-12 px-4",
    };

    const inputClassName = cn(
      inputBase,
      inputDefaultBorder,
      sizeStyles[size],
      className
    );

    const inputProps = {
      id,
      ref,
      disabled,
      "aria-disabled": disabled,
      className: inputClassName,
      "data-size": size,
      "data-disabled": disabled ?? undefined,
      ...props,
      ...(value !== undefined && { value }),
      ...(defaultValue !== undefined && { defaultValue }),
    };

    return (
      <div className="flex w-full flex-col gap-2">
        {label != null && (
          <label htmlFor={id} className={labelBase}>
            {label}
          </label>
        )}
        {asChild ? (
          <Slot {...inputProps}>{children}</Slot>
        ) : (
          <input {...inputProps} />
        )}
      </div>
    );
  }
);

InputField.displayName = "InputField";

export { InputField };
