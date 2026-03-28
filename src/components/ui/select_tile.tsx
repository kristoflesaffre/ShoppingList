"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type SelectTileVariant = "default";
export type SelectTileSize = "default";
export type SelectTileState = "default" | "disabled";

/**
 * Select tile: optioneel icoon + titel + ondertitel in een kaart (Figma 764:5251).
 * Default = witte achtergrond met schaduw; disabled = primary-25 vlak, geen schaduw, lagere contrasten.
 *
 * @param asChild — `true`: containerprops (ref, className, data-*) worden op het ene child gezet (Radix Slot); je vult zelf de inhoud.
 */
export interface SelectTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** Hoofdregel (bijv. type lijst) */
  title?: React.ReactNode;
  /** Secundaire regel (bijv. korte beschrijving) */
  subtitle?: React.ReactNode;
  /** Linker icoon; standaard list-icoon (public/icons/list.svg) */
  icon?: React.ReactNode;
  /** Alleen `default` in het design system */
  variant?: SelectTileVariant;
  /** Visuele interactiestatus */
  state?: SelectTileState;
  /** Alleen `default` */
  size?: SelectTileSize;
  /** Radix Slot: ene child krijgt de buitenste tile-styling */
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const LIST_SVG_MASK = "/icons/list.svg";

/** List-icoon uit `public/icons/list.svg` via mask (zelfde patroon als home slide-in opties). */
function SelectTileDefaultIcon({ disabled }: { disabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-10 shrink-0",
        disabled ? "bg-[var(--blue-300)]" : "bg-action-primary",
      )}
      style={{
        WebkitMaskImage: `url("${LIST_SVG_MASK}")`,
        maskImage: `url("${LIST_SVG_MASK}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

const SelectTile = React.forwardRef<HTMLDivElement, SelectTileProps>(
  (
    {
      className,
      title = "Title",
      subtitle,
      icon,
      variant = "default",
      state = "default",
      size = "default",
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = state === "disabled";

    const containerClassName = cn(
      "flex w-full min-w-0 items-center gap-3 rounded-md py-3 pl-4 pr-3 tracking-normal",
      isDisabled
        ? "bg-blue-25 pointer-events-none shadow-none"
        : "bg-background-elevated shadow-drop",
      className,
    );

    const containerProps = {
      ref,
      "aria-disabled": isDisabled || undefined,
      "data-variant": variant,
      "data-state": state,
      "data-size": size,
      className: containerClassName,
      ...props,
    };

    const iconNode = icon ?? <SelectTileDefaultIcon disabled={isDisabled} />;

    const defaultContent = (
      <>
        {iconNode}
        <div className="min-w-0 flex-1 flex flex-col gap-0">
          <span
            className={cn(
              "w-full truncate font-medium text-base leading-24",
              isDisabled ? "text-gray-400" : "text-text-primary",
            )}
          >
            {title}
          </span>
          {subtitle != null && subtitle !== "" ? (
            <span
              className={cn(
                "w-full truncate font-normal text-sm leading-20",
                isDisabled ? "text-gray-200" : "text-gray-400",
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
      </>
    );

    if (asChild) {
      return <Slot {...containerProps}>{children}</Slot>;
    }

    return <div {...containerProps}>{defaultContent}</div>;
  },
);

SelectTile.displayName = "SelectTile";

export { SelectTile };
