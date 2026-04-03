"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ListCardSize = "default";
export type ListCardState = "default" | "editable";
/** `default` | `shared` (Figma 762:3452) | `master` (Figma 773:4183 – divider + plus-circle). */
export type ListCardDisplayVariant = "default" | "shared" | "master" | "from-master";

/**
 * List card: displays a list summary (icon, name, date, item count). Used on Home for list overview.
 * States: default (display only), editable (reorder handle + dividers + delete button).
 * @param asChild - When true, merges container props onto the single child (Radix Slot)
 */
export interface ListCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** List title (e.g. "Boodschappen") */
  listName?: React.ReactNode;
  /** Optional date string (e.g. "25-04-2026") */
  date?: React.ReactNode;
  /** Optional item count label (e.g. "6 items") */
  itemCount?: React.ReactNode;
  /** Left-side icon (e.g. emoji or image), 48×48 area */
  icon?: React.ReactNode;
  /** "default" = display only; "editable" = show reorder and delete actions */
  state?: ListCardState;
  /**
   * “shared” toont itemtelling in primary-kleur + grijs “(gedeeld met …)” (Figma 762:3452).
   * “master” toont alleen titel + itemtelling in primary, scheiding en plus-actie (Figma 773:4183).
   * “from-master” toont winkellogo-badges rechtsboven naast de lijstnaam (Figma 927:7808).
   */
  displayVariant?: ListCardDisplayVariant;
  /** Logo-URL's (1-2) voor winkelbadges; alleen getoond bij `displayVariant=”from-master”`. */
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

/** Reorder/drag handle – public/icons/move_item.svg, 32×32, color via currentColor. */
function ReorderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-8 shrink-0", className)}
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

/** Delete/trash – public/icons/recycle_bin.svg, 32×32, color via currentColor. */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-8 shrink-0", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.938 13.5933V23.2223C22.938 23.7893 22.717 24.3243 22.317 24.7253C21.916 25.1253 21.381 25.3463 20.814 25.3463H11.186C10.618 25.3463 10.084 25.1253 9.68395 24.7253C9.28295 24.3233 9.06095 23.7893 9.06095 23.2223V13.5933C9.06095 13.3063 9.29395 13.0733 9.58095 13.0733C9.86795 13.0733 10.101 13.3063 10.101 13.5933V23.2223C10.101 23.5073 10.217 23.7873 10.419 23.9893C10.624 24.1943 10.896 24.3073 11.186 24.3073H20.815C21.105 24.3073 21.377 24.1943 21.582 23.9893C21.787 23.7853 21.9 23.5123 21.9 23.2223V13.5933C21.9 13.3063 22.132 13.0733 22.42 13.0733C22.708 13.0733 22.938 13.3063 22.938 13.5933ZM25.346 10.3843C25.346 10.6713 25.114 10.9043 24.826 10.9043H7.17295C6.88595 10.9043 6.65295 10.6713 6.65295 10.3843C6.65295 10.0973 6.88595 9.8643 7.17295 9.8643H12.27V7.1743C12.27 6.8873 12.503 6.6543 12.79 6.6543H19.209C19.496 6.6543 19.729 6.8873 19.729 7.1743V9.8643H24.826C25.113 9.8643 25.346 10.0973 25.346 10.3843ZM13.311 9.8643H18.691V7.6943H13.311V9.8643ZM18.659 20.8143V16.0003C18.659 15.7133 18.427 15.4803 18.139 15.4803C17.851 15.4803 17.619 15.7133 17.619 16.0003V20.8143C17.619 21.1013 17.851 21.3343 18.139 21.3343C18.427 21.3343 18.659 21.1023 18.659 20.8143ZM14.38 20.8143V16.0003C14.38 15.7133 14.147 15.4803 13.86 15.4803C13.573 15.4803 13.34 15.7133 13.34 16.0003V20.8143C13.34 21.1013 13.573 21.3343 13.86 21.3343C14.147 21.3343 14.38 21.1023 14.38 20.8143Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Figma 494:2412: bg white, border bd-1 gray-100, rounded rd-8; horizontale gap scale/12 (12px) tussen zichtbare kolommen; pl/pr sp-12 = 12px (--space-3). */
const containerBase =
  "flex w-full min-w-0 items-center gap-3 rounded-md border border-[var(--gray-100)] bg-[var(--white)] py-3 pl-[var(--space-3)] pr-[var(--space-3)]";

const sizeStyles: Record<ListCardSize, string> = {
  default: "gap-3",
};

/** Figma: divider wrapper h-60 w-0 shrink-0; line 1px × 60px, neutrals/100. */
function EditableDivider() {
  return (
    <span
      className="relative flex h-[60px] w-0 min-w-0 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span
        className="absolute left-1/2 top-0 h-[60px] w-px -translate-x-1/2 bg-[var(--gray-100)]"
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
      date,
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

    const containerClassName = cn(
      containerBase,
      sizeStyles[size],
      className
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
            className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-pill p-1 text-[var(--blue-500)] transition-colors hover:bg-[var(--blue-25)] hover:text-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 active:cursor-grabbing"
            {...handleButtonProps}
          >
            <ReorderIcon />
          </button>
          <EditableDivider />
        </EditableSection>
        {icon != null && (
          <span
            className="flex size-12 shrink-0 items-center justify-center overflow-hidden text-[2rem] leading-none"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1 flex flex-col gap-0">
          {isFromMaster && storeLogos && storeLogos.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-medium text-base leading-24 tracking-normal text-[var(--text-primary)]">
                {listName}
              </span>
              <div className="flex shrink-0 items-center">
                {storeLogos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" width={24} height={24} className="size-6 shrink-0 object-contain" aria-hidden />
                ))}
              </div>
            </div>
          ) : (
            <span className="truncate font-medium text-base leading-24 tracking-normal text-[var(--text-primary)]">
              {listName}
            </span>
          )}
          {date != null && !isMaster && (
            <span className="font-normal text-sm leading-20 tracking-normal text-[var(--gray-400)]">
              {date}
            </span>
          )}
          {itemCount != null &&
            (isMaster ? (
              <span className="font-normal text-xs leading-16 tracking-normal text-action-primary">
                {itemCount}
              </span>
            ) : displayVariant === "shared" ? (
              <span className="block min-w-0 font-normal text-xs leading-16 tracking-normal">
                <span className="text-[var(--blue-500)]">{itemCount}</span>
                <span className="text-[var(--gray-400)]">
                  {" "}
                  (gedeeld met{" "}
                  {sharedWithFirstName?.trim() || "deelnemer"})
                </span>
              </span>
            ) : (
              <span className="font-normal text-xs leading-16 tracking-normal text-[var(--blue-500)]">
                {itemCount}
              </span>
            ))}
        </div>
        {isMaster && !isEditable ? (
          /** Zelfde wrapper als delete-kolom (`EditableSection` + `isEditable`) zodat divider en uitlijning 1:1 matchen. */
          <EditableSection isEditable>
            <EditableDivider />
            <button
              type="button"
              aria-label="Items van masterlijst toevoegen"
              onClick={(e) => {
                e.stopPropagation();
                onMasterAdd?.();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-action-primary transition-colors hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none"
              disabled={!onMasterAdd}
            >
              <PlusCircleIcon />
            </button>
          </EditableSection>
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
              className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
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
