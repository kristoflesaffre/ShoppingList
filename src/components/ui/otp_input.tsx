"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  /** Number of digits (default 6). */
  length?: number;
  /** Called with the full code string whenever all digits are filled. */
  onComplete?: (code: string) => void;
  /** Called on every change with the current partial code. */
  onChange?: (code: string) => void;
  disabled?: boolean;
  className?: string;
  /** Auto-focus the first input on mount. */
  autoFocus?: boolean;
}

/**
 * 6-digit one-time-code input. Each digit gets its own box (Figma 506:1537).
 * Supports paste, backspace navigation, and keyboard-only entry.
 */
export function OtpInput({
  length = 6,
  onComplete,
  onChange,
  disabled,
  className,
  autoFocus = true,
}: OtpInputProps) {
  const [values, setValues] = React.useState<string[]>(
    () => Array.from({ length }, () => ""),
  );
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (i: number) => inputsRef.current[i]?.focus();

  React.useEffect(() => {
    if (autoFocus) focusAt(0);
  }, [autoFocus]);

  const updateValues = React.useCallback(
    (next: string[]) => {
      setValues(next);
      const code = next.join("");
      onChange?.(code);
      if (code.length === length && next.every(Boolean)) {
        onComplete?.(code);
      }
    },
    [length, onChange, onComplete],
  );

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[i] = digit;
    updateValues(next);
    if (digit && i < length - 1) focusAt(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (values[i]) {
        const next = [...values];
        next[i] = "";
        updateValues(next);
      } else if (i > 0) {
        focusAt(i - 1);
        const next = [...values];
        next[i - 1] = "";
        updateValues(next);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusAt(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      focusAt(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const next = [...values];
    for (let j = 0; j < pasted.length; j++) {
      next[j] = pasted[j];
    }
    updateValues(next);
    focusAt(Math.min(pasted.length, length - 1));
  };

  return (
    <div className={cn("flex w-full gap-2", className)} onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={values[i]}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "flex h-12 w-0 min-w-0 flex-1 items-center rounded-md border bg-[var(--white)] text-center text-lg font-medium leading-24 text-[var(--text-primary)] transition-colors",
            "border-[var(--border-default)] focus-visible:border-[var(--border-focus)] focus-visible:outline-none",
            "disabled:bg-[var(--blue-25)] disabled:text-[var(--text-disabled)]",
          )}
        />
      ))}
    </div>
  );
}
