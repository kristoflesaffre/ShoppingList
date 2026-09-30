"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Vinkje dat zichzelf “tekent”: `pathLength=1` + dasharray 1 → dashoffset animeert 1 → 0.
 * De Indicator mount pas bij checked, dus de animatie start precies op het afvinken.
 */
function CheckIcon({
  className,
  draw,
}: {
  className?: string;
  /** Alleen bij een echte gebruikersactie tekenen — niet bij mount van reeds afgevinkte items. */
  draw: boolean;
}) {
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
      <path
        d="M20 6 9 17l-5-5"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={0}
        className={cn(
          draw && "motion-safe:animate-check-draw motion-safe:[animation-delay:40ms]",
        )}
      />
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
      checked,
      ...props
    },
    ref
  ) => {
    /**
     * “Net afgevinkt” → pop + vinkje tekenen. Gedetecteerd op de overgang van de
     * `checked`-prop (false → true) zodat ook een tik op de hele rij (buiten de box) telt.
     * Bewust niet op mount: een lijst met 30 afgevinkte items mag niet collectief poppen.
     */
    const [justChecked, setJustChecked] = React.useState(false);
    const prevCheckedRef = React.useRef<CheckboxPrimitive.CheckedState | undefined>(undefined);
    React.useEffect(() => {
      const prev = prevCheckedRef.current;
      prevCheckedRef.current = checked;
      if (prev === undefined || prev === checked) return;
      if (checked !== true) {
        setJustChecked(false);
        return;
      }
      setJustChecked(true);
      const t = window.setTimeout(() => setJustChecked(false), 320);
      return () => window.clearTimeout(t);
    }, [checked]);

    const indicatorContent = asChild ? (
      <Slot>{children}</Slot>
    ) : (
      <CheckIcon className="size-4 text-current" draw={justChecked} />
    );

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        data-size={size}
        data-just-checked={justChecked || undefined}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-sm border transition-[background-color,border-color,transform] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none",
          "motion-safe:active:scale-90 motion-safe:data-[just-checked]:animate-pop",
          "size-6",
          /* Unselected default */
          "border-[var(--blue-300)] bg-[var(--white)]",
          /* Unselected disabled */
          "data-[disabled]:border-[var(--blue-100)] data-[disabled]:bg-[var(--blue-25)] disabled:border-[var(--blue-100)] disabled:bg-[var(--blue-25)]",
          /* Selected default */
          "data-[state=checked]:border-[var(--action-primary)] data-[state=checked]:bg-[var(--action-primary)] data-[state=checked]:text-[var(--action-primary-foreground)]",
          /* Selected disabled — primary/100 bg, white checkmark (Figma 3:424) */
          "data-[state=checked][data-disabled]:border-[var(--blue-100)] data-[state=checked][data-disabled]:bg-[var(--blue-100)] data-[state=checked][data-disabled]:text-white data-[state=checked]:disabled:border-[var(--blue-100)] data-[state=checked]:disabled:bg-[var(--blue-100)] data-[state=checked]:disabled:text-white",
          className
        )}
        disabled={disabled}
        checked={checked}
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
