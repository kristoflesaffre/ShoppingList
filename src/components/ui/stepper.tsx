"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

function MinusIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
    </svg>
  );
}

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

export type StepperVariant = "0" | "1 or more";
export type StepperSize = "default";

/**
 * Stepper: label + horizontal bar with decrement, value display, and increment.
 * Variant is derived from value: "0" when value === min, "1 or more" when value > min.
 * @param asChild - When true, merges bar props onto the single child (Radix Slot); child replaces the default bar
 */
export interface StepperProps {
  /** Optional label above the stepper bar */
  label?: React.ReactNode;
  /** Current value (controlled) */
  value?: number;
  /** Initial value when uncontrolled */
  defaultValue?: number;
  /** Called when value changes */
  onValueChange?: (value: number) => void;
  /** Minimum value (default 0) */
  min?: number;
  /** Maximum value (optional) */
  max?: number;
  /** Disable the whole stepper */
  disabled?: boolean;
  /** Bar size; only "default" is defined */
  size?: StepperSize;
  /** When true, the single child replaces the default bar and receives merged bar props */
  asChild?: boolean;
  /** When asChild, the single child element (e.g. div) to merge bar props onto */
  children?: React.ReactNode;
  className?: string;
}

const labelBase =
  "text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]";

const barBase =
  "group flex h-12 w-full min-w-[280px] items-center justify-center gap-3 rounded-md border border-[var(--border-default)] bg-[var(--white)] px-3 transition-colors focus-within:outline-none focus-within:border-[var(--border-focus)] data-[disabled]:border-[var(--border-subtle)] data-[disabled]:bg-[var(--blue-25)]";

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      className,
      label,
      value: valueProp,
      defaultValue = 0,
      onValueChange,
      min = 0,
      max,
      disabled = false,
      size = "default",
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
      Math.max(min, defaultValue)
    );
    const isControlled = valueProp !== undefined;
    const value = isControlled ? Math.max(min, valueProp) : uncontrolledValue;

    React.useEffect(() => {
      if (!isControlled) {
        setUncontrolledValue((prev) => Math.max(min, defaultValue));
      }
    }, [isControlled, min, defaultValue]);

    const atMin = value <= min;
    const atMax = max !== undefined && value >= max;
    const variant: StepperVariant = value <= min ? "0" : "1 or more";

    const labelId = React.useId();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [inputStr, setInputStr] = React.useState<string | null>(null);
    const isEditing = inputStr !== null;
    const displayValue = isEditing ? inputStr : String(value);

    const commitInput = React.useCallback(
      (raw: string) => {
        setInputStr(null);
        const parsed = parseInt(raw, 10);
        if (Number.isNaN(parsed) || raw.trim() === "") {
          if (!isControlled) setUncontrolledValue(value);
          return;
        }
        const clamped = Math.max(min, max !== undefined ? Math.min(max, parsed) : parsed);
        if (!isControlled) setUncontrolledValue(clamped);
        onValueChange?.(clamped);
      },
      [isControlled, min, max, value, onValueChange]
    );

    const handleInputFocus = () => {
      setInputStr(String(value));
    };

    React.useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === "" || /^\d+$/.test(v)) setInputStr(v);
    };

    const handleInputBlur = () => {
      commitInput(displayValue);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    const handleDecrement = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (disabled || atMin) return;
      const next = Math.max(min, value - 1);
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    const handleIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (disabled || atMax) return;
      const next = max !== undefined ? Math.min(max, value + 1) : value + 1;
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    const barClassName = cn(barBase, className);
    const barProps = {
      ref,
      className: barClassName,
      "aria-labelledby": label != null ? labelId : undefined,
      "data-variant": variant,
      "data-size": size,
      "data-disabled": disabled ? true : undefined,
      role: "group",
      ...props,
    };

    const defaultBar = (
      <>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || atMin}
          aria-label="Decrease"
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 disabled:pointer-events-none [&_svg]:shrink-0",
            disabled || atMin
              ? "text-[var(--gray-200)]"
              : "text-[var(--action-primary)] hover:text-[var(--action-primary-hover)]"
          )}
        >
          <MinusIcon className="size-6" />
        </button>
        <div
          className="h-8 w-px shrink-0 bg-[var(--border-default)] group-data-[disabled]:bg-[var(--border-subtle)]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Aantal"
          value={displayValue}
          onFocus={handleInputFocus}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          className={cn(
            "flex flex-1 min-w-0 w-full bg-transparent text-center text-base leading-24 tracking-normal text-[var(--text-primary)] outline-none placeholder:text-[var(--text-placeholder)] group-data-[disabled]:text-[var(--text-disabled)] disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
        />
        <div
          className="h-8 w-px shrink-0 bg-[var(--border-default)] group-data-[disabled]:bg-[var(--border-subtle)]"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || atMax}
          aria-label="Increase"
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 disabled:pointer-events-none [&_svg]:shrink-0",
            disabled || atMax
              ? "text-[var(--gray-200)]"
              : "text-[var(--action-primary)] hover:text-[var(--action-primary-hover)]"
          )}
        >
          <PlusIcon className="size-6" />
        </button>
      </>
    );

    return (
      <div className="flex w-full flex-col gap-2">
        {label != null && (
          <label id={labelId} className={labelBase}>
            {label}
          </label>
        )}
        {asChild ? (
          <Slot {...barProps}>{children}</Slot>
        ) : (
          <div {...barProps}>{defaultBar}</div>
        )}
      </div>
    );
  }
);

Stepper.displayName = "Stepper";

export { Stepper };
