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

/** List-icoon – zelfde pad als `public/icons/list.svg`, 40×40 (Figma select tile). */
function SelectTileDefaultIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-10 shrink-0", className)}
      width={40}
      height={40}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9.19998 2.1H2.59998C2.32398 2.1 2.09998 2.324 2.09998 2.6V9.16C2.09998 9.436 2.32398 9.66 2.59998 9.66H9.19998C9.47598 9.66 9.69998 9.436 9.69998 9.16V2.6C9.69998 2.323 9.47698 2.1 9.19998 2.1ZM8.69998 8.66H3.09998V3.1H8.69998V8.66ZM9.19998 14.3H2.59998C2.32398 14.3 2.09998 14.524 2.09998 14.8V21.36C2.09998 21.636 2.32398 21.86 2.59998 21.86H9.19998C9.47598 21.86 9.69998 21.636 9.69998 21.36V14.8C9.69998 14.523 9.47698 14.3 9.19998 14.3ZM8.69998 20.859H3.09998V15.3H8.69998V20.859ZM13.4 3.6C13.4 3.324 13.624 3.1 13.9 3.1H21.4C21.676 3.1 21.9 3.324 21.9 3.6C21.9 3.876 21.676 4.1 21.4 4.1H13.9C13.624 4.1 13.4 3.876 13.4 3.6ZM21.9 8.3C21.9 8.576 21.676 8.8 21.4 8.8H13.9C13.624 8.8 13.4 8.576 13.4 8.3C13.4 8.024 13.624 7.8 13.9 7.8H21.4C21.677 7.8 21.9 8.023 21.9 8.3ZM21.9 15.7C21.9 15.976 21.676 16.2 21.4 16.2H13.9C13.624 16.2 13.4 15.976 13.4 15.7C13.4 15.424 13.624 15.2 13.9 15.2H21.4C21.677 15.2 21.9 15.424 21.9 15.7ZM21.9 20.399C21.9 20.675 21.676 20.899 21.4 20.899H13.9C13.624 20.899 13.4 20.675 13.4 20.399C13.4 20.123 13.624 19.899 13.9 19.899H21.4C21.677 19.899 21.9 20.123 21.9 20.399Z"
        fill="currentColor"
      />
    </svg>
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

    const iconNode = icon ?? (
      <SelectTileDefaultIcon
        className={cn(isDisabled ? "text-blue-300" : "text-action-primary")}
      />
    );

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
