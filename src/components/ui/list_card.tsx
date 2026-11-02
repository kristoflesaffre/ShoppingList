"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { parseCalendarWeekListTitle } from "@/lib/list-default-name";
import { cn } from "@/lib/utils";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";

export type ListCardSize = "default";
export type ListCardState = "default" | "editable";
/** `default` | `shared` (Figma 762:3452) | `master` (Figma 1148:8292 – favorietenlijst + plus) | `from-master`. */
export type ListCardDisplayVariant = "default" | "shared" | "master" | "from-master";

/**
 * Design system «Lijstkaart»: lijstje of favorietenlijst als witte kaart.
 * default: tegel · titel · subtitel · pijltje (of «+ Lijstje» bij een favorietenlijst).
 * editable: sleepgreep links, rode ronde vuilbak rechts.
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
  /**
   * Favorietenlijst als productwaaier: tot 3 productfoto's op een verloop; leeg = gestippelde waaier.
   * Zonder deze prop (of in bewerkmodus) blijft het de witte kaart.
   */
  previewPhotos?: string[];
  /** CSS-achtergrond van de productwaaier-kaart, bv. `storeGradientFromLogo(logo)`. */
  fanBackground?: string;
  /** Props for drag handle (listeners + attributes from useSortable). When set, reorder uses drag instead of onClick. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  className?: string;
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
          className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-pill bg-[var(--blue-50)] px-[5px] text-[11px] font-bold leading-none text-[var(--blue-500)] tabular-nums"
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

/** Design system «Lijstkaart»: witte kaart (radius 20), tegel 48 · titel · subtitel · actie rechts. */
const containerBase =
  "flex w-full min-w-0 items-center gap-3 rounded-[20px] bg-[var(--white)] p-3 shadow-[0_1px_2px_rgba(16,17,48,0.04)]";

const fanCardBase =
  "flex h-[122px] w-full min-w-0 items-center gap-1.5 rounded-[20px] py-3 pl-3 pr-2.5 shadow-[0_1px_2px_rgba(16,17,48,0.04)] md:h-32 md:gap-2 md:py-3.5 md:pl-3.5 md:pr-3";

/** Achterste foto's eerst; de laatste ligt vooraan in het midden. */
const FAN_SLOTS = [
  "left-0.5 top-[22px] -rotate-[10deg] md:top-5",
  "left-[66px] top-6 rotate-[9deg] md:left-20 md:top-[22px]",
  "left-[34px] top-3.5 -rotate-1 md:left-[42px] md:top-3",
];

function fanSlotsFor(count: number) {
  if (count === 1) return [FAN_SLOTS[2]];
  if (count === 2) return [FAN_SLOTS[0], FAN_SLOTS[1]];
  return FAN_SLOTS;
}

const fanTileBase = "absolute size-14 rounded-[14px] md:size-[66px] md:rounded-2xl";

function ProductFan({ photos }: { photos: string[] }) {
  return (
    <div
      className={cn("relative h-[92px] w-[124px] shrink-0 md:h-[100px] md:w-[150px]", photos.length === 0 && "opacity-55")}
      aria-hidden
    >
      {photos.length === 0
        ? FAN_SLOTS.map((slot) => (
            <span
              key={slot}
              className={cn(fanTileBase, slot, "border-[1.5px] border-dashed border-[var(--gray-300)] bg-[var(--white)]")}
            />
          ))
        : photos.slice(0, 3).map((src, i) => (
            <span
              key={src}
              className={cn(
                fanTileBase,
                fanSlotsFor(photos.length)[i],
                "flex items-center justify-center bg-[var(--white)] shadow-[0_2px_4px_rgba(16,17,48,0.06),0_10px_24px_-6px_rgba(16,17,48,0.14)]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale productfoto */}
              <img src={src} alt="" width={54} height={54} decoding="async" className="size-[46px] object-contain md:size-[54px]" />
            </span>
          ))}
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px] shrink-0 text-[var(--gray-300)]">
      <path d="M9 6l6 6-6 6" />
    </svg>
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
      previewPhotos,
      fanBackground,
      dragHandleProps,
      style,
      ...props
    },
    ref
  ) => {
    const isEditable = state === "editable";
    const isMaster = displayVariant === "master";
    const showFan = isMaster && !isEditable && previewPhotos != null;

    const containerProps = {
      ref,
      "data-size": size,
      "data-state": state,
      "data-display-variant": displayVariant,
      className: cn(
        showFan ? fanCardBase : containerBase,
        !isEditable &&
          "motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-strong motion-safe:active:scale-[0.98]",
        className,
      ),
      style: showFan ? { background: fanBackground ?? "var(--gradient-store-default)", ...style } : style,
      ...props,
    };

    const handleButtonProps = dragHandleProps ?? (onReorder ? { onClick: onReorder } : {});

    const subtitle =
      itemCount == null ? null : isMaster ? (
        <span className="flex min-w-0 items-center gap-[5px]">
          <FavoriteListSubtitleHeartIcon className="!size-[13px] !bg-[var(--gray-300)]" />
          <span className="min-w-0 truncate">{itemCount}</span>
        </span>
      ) : displayVariant === "shared" ? (
        <span className="block min-w-0 truncate">
          {itemCount} · met {sharedWithFirstName?.trim() || "deelnemer"}
        </span>
      ) : (
        <span className="flex min-w-0 items-center gap-[5px]">
          {storeLogos?.slice(0, 2).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- winkellogo
            <img key={i} src={src} alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" aria-hidden />
          ))}
          <span className="min-w-0 truncate">{itemCount}</span>
        </span>
      );

    const defaultContent = (
      <>
        {isEditable ? (
          <button
            type="button"
            aria-label="Lijstje verslepen"
            className="-ml-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-[var(--gray-300)] transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] active:cursor-grabbing"
            {...handleButtonProps}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
              <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
              <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
              <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
            </svg>
          </button>
        ) : null}
        {icon != null ? (
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] [&_img]:size-9 [&_img]:max-h-none [&_img]:max-w-none [&_img]:object-contain",
              isMaster ? "bg-[var(--gray-25)] [&_img]:size-[34px]" : "bg-[var(--blue-25)]",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col leading-5">
          <div className="flex min-w-0 items-center gap-1">
            <ListCardTitleWithOptionalBadge listName={listName} className="!text-base !font-semibold !leading-5" />
          </div>
          {subtitle ? <div className="text-[13px] text-[var(--text-tertiary)]">{subtitle}</div> : null}
        </div>
        {isEditable ? (
          onDelete ? (
            <RoundIconButton
              tone="danger"
              size={28}
              aria-label="Lijstje verwijderen"
              onClick={onDelete}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {RoundIcons.trash}
            </RoundIconButton>
          ) : null
        ) : isMaster && onMasterAdd ? (
          <button
            type="button"
            aria-label="Nieuw lijstje uit deze favorieten"
            onClick={(e) => {
              e.stopPropagation();
              onMasterAdd();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex h-[34px] shrink-0 items-center gap-1 rounded-pill bg-[var(--blue-50)] px-3 text-[13.5px] font-bold text-[var(--blue-500)] transition-colors hover:bg-[var(--blue-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Lijstje
          </button>
        ) : (
          <ChevronRightIcon />
        )}
      </>
    );

    if (asChild) {
      return <Slot {...containerProps}>{children}</Slot>;
    }

    if (showFan) {
      return (
        <div {...containerProps}>
          <div className="flex h-full min-w-0 flex-1 flex-col items-start justify-between">
            <div className="flex w-full min-w-0 items-center gap-2.5">
              {icon != null ? (
                <span
                  className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.12)] md:size-[42px] [&_img]:size-[27px] [&_img]:max-h-none [&_img]:max-w-none [&_img]:object-contain md:[&_img]:size-7"
                  aria-hidden="true"
                >
                  {icon}
                </span>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold leading-5 text-[var(--text-primary)] md:text-base md:leading-[21px]">
                  {listName}
                </span>
                {itemCount != null ? (
                  <span className="truncate text-[13px] leading-[18px] text-[var(--text-secondary)]">{itemCount}</span>
                ) : null}
              </div>
            </div>
            {onMasterAdd ? (
              <button
                type="button"
                aria-label="Nieuw lijstje uit deze favorieten"
                onClick={(e) => {
                  e.stopPropagation();
                  onMasterAdd();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-pill bg-[var(--white)] pl-2.5 pr-3 text-[13.5px] font-bold text-[var(--blue-500)] transition-colors hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] md:pl-3 md:pr-3.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Lijstje
              </button>
            ) : null}
          </div>
          <ProductFan photos={previewPhotos} />
        </div>
      );
    }

    return <div {...containerProps}>{defaultContent}</div>;
  }
);

ListCard.displayName = "ListCard";

export { ListCard };
