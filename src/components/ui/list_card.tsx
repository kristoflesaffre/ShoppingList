"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { parseCalendarWeekListTitle } from "@/lib/list-default-name";
import { cn } from "@/lib/utils";

export type ListCardSize = "default";
export type ListCardState = "default" | "editable";
/** `default` | `shared` (Figma 762:3452) | `master` (Figma 1148:8292 – favorietenlijst + plus) | `from-master`. */
export type ListCardDisplayVariant = "default" | "shared" | "master" | "from-master";

/**
 * List card: displays a list summary (icon, name, item count). Used on Home for list overview.
 * States: default (display only), editable (reorder handle + dividers + delete button).
 * @param asChild - When true, merges container props onto the single child (Radix Slot)
 */
export interface ListCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** List title (e.g. "Boodschappen") */
  listName?: React.ReactNode;
  /** Optional item count label (e.g. "6 items") */
  itemCount?: React.ReactNode;
  /** Left-side icon (e.g. emoji or image), 48×48 area */
  icon?: React.ReactNode;
  /** "default" = display only; "editable" = show reorder and delete actions */
  state?: ListCardState;
  /**
   * “shared”: subtitel één grijze stijl, bv. “17 producten - met Chloé” (Figma 762:3452).
   * “master” = favorietenlijst: zelfde tegel als 9010, grijze telling, plus rechts (Figma 1148:8292).
   * “from-master”: tile volgens Figma 1148:9010 — titelregel, ondertitel itemtelling, winkelicoontje 16px rechts.
   */
  displayVariant?: ListCardDisplayVariant;
  /** Logo-URL('s) voor winkel; bij `from-master` rechts in de tegel (Figma 1148:9010). */
  storeLogos?: string[];
  /** Voornaam voor het gedeeld-met-label; bij ontbreken: “deelnemer”. */
  sharedWithFirstName?: string;
  /** Only "default" is defined (gap-3; padding via containerBase). */
  size?: ListCardSize;
  /** When true, the single child replaces the default card content and receives merged container props */
  asChild?: boolean;
  /** When asChild, the single child element to merge onto */
  children?: React.ReactNode;
  /** Called when the reorder/drag handle is activated (editable state) */
  onReorder?: () => void;
  /** Called when the delete button is clicked (editable state) */
  onDelete?: () => void;
  /** Called when the plus-circle actie wordt geklikt (`displayVariant="master"`) */
  onMasterAdd?: () => void;
  /** Props for drag handle (listeners + attributes from useSortable). When set, reorder uses drag instead of onClick. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  className?: string;
}

/** Reorder/drag handle – public/icons/move_item.svg; Figma 1148:9681 = 24×24 in handle cell. */
function ReorderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.062 8.19952C18.062 7.90252 18.303 7.66152 18.6 7.66152H25.5C25.797 7.66152 26.038 7.90252 26.038 8.19952C26.038 8.49652 25.797 8.73752 25.5 8.73752H18.6C18.303 8.73752 18.062 8.49652 18.062 8.19952ZM25.5 13.7615H18.6C18.303 13.7615 18.062 14.0025 18.062 14.2995C18.062 14.5965 18.303 14.8375 18.6 14.8375H25.5C25.797 14.8375 26.038 14.5965 26.038 14.2995C26.038 14.0025 25.797 13.7615 25.5 13.7615ZM25.5 19.7615H18.6C18.303 19.7615 18.062 20.0025 18.062 20.2995C18.062 20.5965 18.303 20.8375 18.6 20.8375H25.5C25.797 20.8375 26.038 20.5965 26.038 20.2995C26.038 20.0025 25.797 19.7615 25.5 19.7615ZM12.075 16.5145C11.862 16.3075 11.522 16.3115 11.315 16.5255C11.108 16.7385 11.113 17.0785 11.326 17.2855L13.874 19.7615H12.6C9.53304 19.7615 7.03804 17.2665 7.03804 14.1995C7.03804 11.0805 9.48104 8.63752 12.6 8.63752H15.2C15.497 8.63752 15.738 8.39652 15.738 8.09952C15.738 7.80252 15.497 7.56152 15.2 7.56152H12.6C8.87804 7.56152 5.96204 10.4775 5.96204 14.1995C5.96204 17.8595 8.94004 20.8375 12.6 20.8375H13.928L11.414 23.4255C11.207 23.6385 11.212 23.9795 11.425 24.1865C11.529 24.2885 11.664 24.3385 11.8 24.3385C11.94 24.3385 12.08 24.2835 12.186 24.1755L15.586 20.6755C15.793 20.4625 15.788 20.1215 15.575 19.9145L12.075 16.5145Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/plus-circle.svg – 24×24, kleur via currentColor. */
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15.079 11.9997C15.079 12.2867 14.847 12.5197 14.559 12.5197H12.519V14.5607C12.519 14.8477 12.286 15.0807 11.999 15.0807C11.712 15.0807 11.479 14.8487 11.479 14.5607V12.5197H9.43997C9.15297 12.5197 8.91997 12.2867 8.91997 11.9997C8.91997 11.7127 9.15297 11.4797 9.43997 11.4797H11.48V9.43973C11.48 9.15273 11.713 8.91973 12 8.91973C12.287 8.91973 12.52 9.15273 12.52 9.43973V11.4797H14.56C14.847 11.4797 15.079 11.7127 15.079 11.9997ZM21.529 11.9997C21.529 17.2547 17.255 21.5287 12 21.5287C6.74497 21.5287 2.46997 17.2547 2.46997 11.9997C2.46997 6.74473 6.74497 2.46973 12 2.46973C17.255 2.46973 21.529 6.74473 21.529 11.9997ZM20.49 11.9997C20.49 7.31873 16.681 3.50973 12 3.50973C7.31897 3.50973 3.50997 7.31873 3.50997 11.9997C3.50997 16.6817 7.31897 20.4897 12 20.4897C16.681 20.4897 20.49 16.6817 20.49 11.9997Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Delete/trash – public/icons/recycle_bin.svg 24×24; Figma 1148:9681 action-func-bin. */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.938 9.5933V19.2223C18.938 19.7893 18.717 20.3243 18.317 20.7253C17.916 21.1253 17.381 21.3463 16.814 21.3463H7.18595C6.61795 21.3463 6.08395 21.1253 5.68395 20.7253C5.28295 20.3233 5.06095 19.7893 5.06095 19.2223V9.5933C5.06095 9.3063 5.29395 9.0733 5.58095 9.0733C5.86795 9.0733 6.10095 9.3063 6.10095 9.5933V19.2223C6.10095 19.5073 6.21695 19.7873 6.41895 19.9893C6.62395 20.1943 6.89595 20.3073 7.18595 20.3073H16.815C17.105 20.3073 17.377 20.1943 17.582 19.9893C17.787 19.7853 17.9 19.5123 17.9 19.2223V9.5933C17.9 9.3063 18.132 9.0733 18.42 9.0733C18.708 9.0733 18.938 9.3063 18.938 9.5933ZM21.346 6.3843C21.346 6.6713 21.114 6.9043 20.826 6.9043H3.17295C2.88595 6.9043 2.65295 6.6713 2.65295 6.3843C2.65295 6.0973 2.88595 5.8643 3.17295 5.8643H8.26995V3.1743C8.26995 2.8873 8.50295 2.6543 8.78995 2.6543H15.209C15.496 2.6543 15.729 2.8873 15.729 3.1743V5.8643H20.826C21.113 5.8643 21.346 6.0973 21.346 6.3843ZM9.31095 5.8643H14.691V3.6943H9.31095V5.8643ZM14.659 16.8143V12.0003C14.659 11.7133 14.427 11.4803 14.139 11.4803C13.851 11.4803 13.619 11.7133 13.619 12.0003V16.8143C13.619 17.1013 13.851 17.3343 14.139 17.3343C14.427 17.3343 14.659 17.1023 14.659 16.8143ZM10.38 16.8143V12.0003C10.38 11.7133 10.147 11.4803 9.85995 11.4803C9.57295 11.4803 9.33995 11.7133 9.33995 12.0003V16.8143C9.33995 17.1013 9.57295 17.3343 9.85995 17.3343C10.147 17.3343 10.38 17.1023 10.38 16.8143Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Maandtitel + optionele week-badge wanneer de naam het patroon van `defaultNewListName` volgt. */
function ListCardTitleWithOptionalBadge({
  listName,
  className,
}: {
  listName: React.ReactNode;
  className?: string;
}) {
  const titleClass = cn(
    "min-w-0 truncate text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]",
    className,
  );
  const plain =
    typeof listName === "string" || typeof listName === "number"
      ? String(listName)
      : null;
  if (plain == null) {
    return <span className={titleClass}>{listName}</span>;
  }
  const { displayName, weekBadge } = parseCalendarWeekListTitle(plain);
  return (
    <>
      <span className={titleClass}>{displayName}</span>
      {weekBadge != null ? (
        <span
          className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--blue-200)] text-[10px] font-semibold leading-none text-white"
          aria-hidden
        >
          {weekBadge}
        </span>
      ) : null}
    </>
  );
}

/**
 * Figma 1148:8298 — hart vóór «n favorieten»; vulling = Neutrals 100 (`--gray-100`).
 * Mask op `heart_filled.svg` zodat de kleur uit tokens komt (SVG is zwart ingekleurd).
 */
function FavoriteListSubtitleHeartIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-4 shrink-0 bg-[var(--gray-100)]",
        className,
      )}
      style={{
        WebkitMaskImage: 'url("/icons/heart_filled.svg")',
        maskImage: 'url("/icons/heart_filled.svg")',
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

/**
 * Figma 494:2412 — compacte tegel (shared / master).
 * Figma 1148:9681 — bewerkmodus: zelfde gap/px als 9010 (`gap-3` = 12px, `p-3` = 12px), rij `items-center`.
 */
const containerBaseCompact =
  "flex w-full min-w-0 items-center gap-3 rounded-md border border-[var(--gray-100)] bg-[var(--white)] p-[var(--space-3)]";

/**
 * Figma 1148:9010 — List card: gap scale/12, px/py sp-12, rd-8, bd-1 gray-100, wit;
 * `items-end` voor uitlijning icoon / tekst / winkelmerk.
 */
const containerBaseFigma9010 =
  "flex w-full min-w-0 items-end gap-3 rounded-md border border-[var(--gray-100)] bg-[var(--white)] p-[var(--space-3)]";

const sizeStyles: Record<ListCardSize, string> = {
  default: "gap-3",
};

/** Figma 1148:9681 — verticale lijn 1px × 40px (hoogte rij met 40px-icoon). */
function EditableDivider() {
  return (
    <span
      className="relative flex h-10 w-0 min-w-0 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span
        className="absolute left-1/2 top-0 h-10 w-px -translate-x-1/2 bg-[var(--gray-100)]"
        aria-hidden="true"
      />
    </span>
  );
}

/** Duration for ListCard state transition (content slide + fade). */
const ANIM_DURATION_MS = 120;

/** Wrapper for editable left/right sections: animates width then opacity (enter) or opacity then width (exit). */
function EditableSection({
  isEditable,
  children,
  className,
}: {
  isEditable: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 overflow-hidden",
        "transition-[width,opacity] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        isEditable
          ? "w-11 opacity-100"
          : "w-0 opacity-0 pointer-events-none",
        isEditable
          ? "duration-[var(--list-card-duration)] [transition-delay:0ms,var(--list-card-duration)]"
          : "duration-[var(--list-card-duration)] [transition-delay:var(--list-card-duration),0ms]",
        className
      )}
      style={
        {
          "--list-card-duration": `${ANIM_DURATION_MS}ms`,
        } as React.CSSProperties
      }
      aria-hidden={!isEditable}
    >
      {children}
    </div>
  );
}

const ListCard = React.forwardRef<HTMLDivElement, ListCardProps>(
  (
    {
      className,
      listName = "List name",
      itemCount,
      icon,
      state = "default",
      displayVariant = "default",
      sharedWithFirstName,
      storeLogos,
      size = "default",
      asChild = false,
      children,
      onReorder,
      onDelete,
      onMasterAdd,
      dragHandleProps,
      ...props
    },
    ref
  ) => {
    const isEditable = state === "editable";
    const isMaster = displayVariant === "master";
    const isFromMaster = displayVariant === "from-master";
    /** Stilstaande tegel zoals Figma 1148:9010 (+ master / favorieten: 1148:8292). */
    const useFigma9010Tile =
      !isEditable &&
      (displayVariant === "default" ||
        displayVariant === "from-master" ||
        displayVariant === "shared" ||
        displayVariant === "master");

    const containerClassName = cn(
      useFigma9010Tile
        ? containerBaseFigma9010
        : cn(containerBaseCompact, sizeStyles[size]),
      className,
    );

    const containerProps = {
      ref,
      "data-size": size,
      "data-state": state,
      "data-display-variant": displayVariant,
      className: containerClassName,
      ...props,
    };

    const handleButtonProps = dragHandleProps ?? (onReorder ? { onClick: onReorder } : {});

    const defaultContent = (
      <>
        <EditableSection
          isEditable={isEditable}
          className={!isEditable ? "hidden" : undefined}
        >
          <button
            type="button"
            aria-label="Reorder list"
            className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full p-1 text-action-primary transition-colors hover:bg-[var(--blue-25)] hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 active:cursor-grabbing"
            {...handleButtonProps}
          >
            <ReorderIcon />
          </button>
          <EditableDivider />
        </EditableSection>
        {isEditable ? (
          <div className="flex min-w-0 flex-1 items-end gap-3">
            {icon != null ? (
              <span
                className="flex size-10 shrink-0 items-center justify-center overflow-hidden bg-[var(--white)] [&_img]:h-8 [&_img]:w-8 [&_img]:max-h-none [&_img]:max-w-none [&_img]:object-contain"
                aria-hidden="true"
              >
                {icon}
              </span>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-0">
              <div className="flex min-w-0 items-center gap-1">
                <ListCardTitleWithOptionalBadge listName={listName} />
              </div>
              {!useFigma9010Tile && (
                <>
                  {itemCount != null &&
                    (isMaster ? (
                      <span className="flex min-w-0 items-center gap-1 font-normal text-xs leading-16 tracking-normal text-[var(--gray-400)]">
                        <FavoriteListSubtitleHeartIcon />
                        <span className="min-w-0 truncate">{itemCount}</span>
                      </span>
                    ) : displayVariant === "shared" ? (
                      <span className="block min-w-0 truncate font-normal text-xs leading-16 tracking-normal text-[var(--gray-400)]">
                        {itemCount}
                        {" - met "}
                        {sharedWithFirstName?.trim() || "deelnemer"}
                      </span>
                    ) : (
                      <span className="font-normal text-xs leading-16 tracking-normal text-[var(--gray-400)]">
                        {itemCount}
                      </span>
                    ))}
                </>
              )}
            </div>
            {storeLogos && storeLogos.length > 0 ? (
              <div className="flex shrink-0 flex-col justify-end pb-px">
                {storeLogos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 shrink-0 object-contain"
                    aria-hidden
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {icon != null && (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center overflow-hidden bg-[var(--white)]",
                  useFigma9010Tile
                    ? "size-10 [&_img]:h-8 [&_img]:w-8 [&_img]:max-h-none [&_img]:max-w-none [&_img]:object-contain"
                    : "size-12 text-[2rem] leading-none",
                )}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0">
              {useFigma9010Tile ? (
                <>
                  <div className="flex min-w-0 items-center gap-1">
                    <ListCardTitleWithOptionalBadge listName={listName} />
                  </div>
                  {displayVariant === "shared" ? (
                    itemCount != null ? (
                      <p className="w-full truncate text-xs font-normal leading-16 tracking-normal text-[var(--gray-400)]">
                        {itemCount}
                        {" - met "}
                        {sharedWithFirstName?.trim() || "deelnemer"}
                      </p>
                    ) : null
                  ) : displayVariant === "master" && itemCount != null ? (
                    <p className="flex w-full min-w-0 items-center gap-1 truncate text-xs font-normal leading-16 tracking-normal text-[var(--gray-400)]">
                      <FavoriteListSubtitleHeartIcon />
                      <span className="min-w-0 truncate">{itemCount}</span>
                    </p>
                  ) : itemCount != null ? (
                    <p className="w-full truncate text-xs font-normal leading-16 tracking-normal text-[var(--gray-400)]">
                      {itemCount}
                    </p>
                  ) : null}
                </>
              ) : isFromMaster && storeLogos && storeLogos.length > 0 ? (
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <ListCardTitleWithOptionalBadge listName={listName} />
                  </div>
                  <div className="flex shrink-0 items-center">
                    {storeLogos.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="" width={24} height={24} className="size-6 shrink-0 object-contain" aria-hidden />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-1">
                  <ListCardTitleWithOptionalBadge listName={listName} />
                </div>
              )}
              {!useFigma9010Tile && (
                <>
                  {itemCount != null &&
                    (isMaster ? (
                      <span className="flex min-w-0 items-center gap-1 font-normal text-xs leading-16 tracking-normal text-[var(--gray-400)]">
                        <FavoriteListSubtitleHeartIcon />
                        <span className="min-w-0 truncate">{itemCount}</span>
                      </span>
                    ) : displayVariant === "shared" ? (
                      <span className="block min-w-0 truncate font-normal text-xs leading-16 tracking-normal text-[var(--gray-400)]">
                        {itemCount}
                        {" - met "}
                        {sharedWithFirstName?.trim() || "deelnemer"}
                      </span>
                    ) : (
                      <span className="font-normal text-xs leading-16 tracking-normal text-[var(--blue-500)]">
                        {itemCount}
                      </span>
                    ))}
                </>
              )}
            </div>
          </>
        )}
        {useFigma9010Tile ? (
          isFromMaster && storeLogos && storeLogos.length > 0 ? (
            <div className="flex shrink-0 flex-col justify-end gap-0.5 self-end pb-px">
              {storeLogos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  width={16}
                  height={16}
                  className="size-4 shrink-0 object-contain"
                  aria-hidden
                />
              ))}
            </div>
          ) : isMaster && onMasterAdd ? (
            <div className="flex shrink-0 flex-col justify-end gap-0.5 self-end pb-px">
              <button
                type="button"
                aria-label="Weeklijstje van favoriet toevoegen"
                onClick={(e) => {
                  e.stopPropagation();
                  onMasterAdd();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-action-primary transition-colors hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                <PlusCircleIcon />
              </button>
            </div>
          ) : null
        ) : null}
        {(!isMaster || isEditable) && (
          <EditableSection
            isEditable={isEditable}
            className={!isEditable ? "hidden" : undefined}
          >
            <EditableDivider />
            <button
              type="button"
              aria-label="Delete list"
              onClick={onDelete}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-1 text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <TrashIcon />
            </button>
          </EditableSection>
        )}
      </>
    );

    if (asChild) {
      return <Slot {...containerProps}>{children}</Slot>;
    }

    return <div {...containerProps}>{defaultContent}</div>;
  }
);

ListCard.displayName = "ListCard";

export { ListCard };
