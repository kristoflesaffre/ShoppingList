"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Checkbox } from "./checkbox";

export type ItemCardVariant =
  | "default"
  | "gotten-by-you"
  | "gotten-by-other"
  | "master"
  | "added";
export type ItemCardState = "default" | "shared" | "editable";
export type ItemCardSize = "default";
/** `bare` = alleen titel + hoeveelheid, border, geen checkbox/acties (Figma 797:4486). */
export type ItemCardPresentation = "default" | "bare";
/** `grid` = compacte tegelweergave voor gewone lijstjes. */
export type ItemCardDensity = "default" | "grid";

/** Realtime “ik haal dit” / “ander haalt dit” voor gedeelde lijsten (InstantDB). */
export type ItemCardSyncListClaim = {
  /** Wie het item claimt; `null` = niet geclaimd. */
  claimedByUserId: string | null;
  currentUserId: string;
  onClaimChange: (userId: string | null) => void;
  /** Avatar voor gotten-by-other (bijv. <img> met profielfoto). */
  otherClaimerAvatar?: React.ReactNode;
  /** Tekst naast hoeveelheid bij gotten-by-other. */
  otherClaimerLabel?: string;
};

/**
 * Item card: single list item with checkbox, name, quantity, and variant-specific actions.
 * Variants: default, gotten-by-you, gotten-by-other, master (797:4807), added (797:5139 – primary-400, minus/plus, witte tekst).
 * Checked state via checked/defaultChecked + onCheckedChange (niet van toepassing op `variant="master"`-layout).
 * States: default (zonder claim-icoon), shared (met claim-icoon), editable.
 * Presentation `bare`: statische kaart (wit, rand neutrals/100, pl-16/pr-12/py-12) zonder checkbox, claim of rechterkolom.
 * Optionele **thumbnail** (Figma `with photo`, node 923:7766): alleen zichtbaar als `itemThumbnail` gezet is
 * en niet in `state="editable"`, `presentation="bare"`, of variant `master` / `added`.
 * @param asChild - When true, merges container props onto the single child (Radix Slot)
 */
export interface ItemCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Item name (e.g. "Melk") */
  itemName?: React.ReactNode;
  /** Quantity or description (e.g. "2 stuks") */
  quantity?: React.ReactNode;
  /** For gotten-by-you: e.g. "jij haalt dit". For gotten-by-other: e.g. "Anne haalt dit". */
  claimedByLabel?: React.ReactNode;
  /** Avatar for gotten-by-other (e.g. <img> or Next Image), 32×32 */
  avatar?: React.ReactNode;
  /** Controlled checked (obtained). Use with onCheckedChange. */
  checked?: boolean;
  /** Default checked when uncontrolled */
  defaultChecked?: boolean;
  /** Called when checkbox checked state changes */
  onCheckedChange?: (checked: boolean) => void;
  variant?: ItemCardVariant;
  state?: ItemCardState;
  /** Alleen inhoudelijke layout; bij `bare` worden variant/state UI (checkbox, editable, claim) genegeerd. */
  presentation?: ItemCardPresentation;
  size?: ItemCardSize;
  asChild?: boolean;
  children?: React.ReactNode;
  onClaim?: () => void;
  onReorder?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Props for drag handle (listeners + attributes from useSortable). When set, reorder uses drag instead of onClick. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  /** Gezet op lijst-detail: claim wordt gesynchroniseerd via InstantDB. */
  syncListClaim?: ItemCardSyncListClaim;
  /** Bij `variant="master"`: plus-actie (items van master toevoegen). */
  onMasterAdd?: () => void;
  /** Bij `variant="added"`: linkerknop (min); bv. hoeveelheid omlaag of regel verwijderen. */
  onAddedDecrement?: () => void;
  /** Bij `variant="added"`: rechterknop (plus); bv. hoeveelheid omhoog. */
  onAddedIncrement?: () => void;
  /**
   * Vierkante productfoto 44×44 (Figma 923:7726). Alleen gerenderd als truthy;
   * nooit in editable / bare / master / added.
   */
  itemThumbnail?: React.ReactNode;
  density?: ItemCardDensity;
  className?: string;
  /**
   * Toegevoegd vanuit diepvriesvoorraad (Figma 1195:10755).
   * Niet-klikbaar: sneeuwvlok-icoon links, foto op 20% opacity, doorgestreepte grijze tekst, geen acties.
   */
  isFromStock?: boolean;
}

/** Sneeuwvlok-icoon voor "uit voorraad"-items (Figma icons/freeze, 24×24). */
function FreezeIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0 size-6 bg-[var(--blue-500)]", className)}
      style={{
        WebkitMaskImage: "url(/icons/freeze.svg)",
        maskImage: "url(/icons/freeze.svg)",
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

/** Claim icon – public/icons/hand.svg, 24×24, uses currentColor for default (blue-300) and gotten-by-you (white). */
function HandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 shrink-0", className)}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M17 11.1667V7C17 6.55798 16.8244 6.13405 16.5119 5.82149C16.1993 5.50893 15.7754 5.33334 15.3334 5.33334C14.8913 5.33334 14.4674 5.50893 14.1548 5.82149C13.8423 6.13405 13.6667 6.55798 13.6667 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.6666 10.3333V5.33333C13.6666 4.8913 13.4911 4.46738 13.1785 4.15482C12.8659 3.84226 12.442 3.66666 12 3.66666C11.558 3.66666 11.134 3.84226 10.8215 4.15482C10.5089 4.46738 10.3333 4.8913 10.3333 5.33333V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.3333 10.75V7C10.3333 6.55798 10.1577 6.13405 9.84518 5.82149C9.53262 5.50893 9.10869 5.33334 8.66667 5.33334C8.22464 5.33334 7.80072 5.50893 7.48816 5.82149C7.17559 6.13405 7 6.55798 7 7V13.6667"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8.66667C17 8.22464 17.1756 7.80072 17.4881 7.48816C17.8007 7.17559 18.2246 7 18.6667 7C19.1087 7 19.5326 7.17559 19.8452 7.48816C20.1577 7.80072 20.3333 8.22464 20.3333 8.66667V13.6667C20.3333 15.4348 19.6309 17.1305 18.3807 18.3807C17.1305 19.631 15.4348 20.3333 13.6667 20.3333H12C9.66665 20.3333 8.24998 19.6167 7.00832 18.3833L4.00832 15.3833C3.7216 15.0658 3.56797 14.6501 3.57925 14.2225C3.59054 13.7948 3.76586 13.3878 4.06892 13.0858C4.37198 12.7838 4.77957 12.6099 5.20729 12.6002C5.63502 12.5904 6.05012 12.7455 6.36665 13.0333L7.83332 14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Reorder – public/icons/move_item.svg, 32×32. */
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

/** Edit icon – public/icons/pencil.svg, 32×32, currentColor for blue in editable state. */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-8 shrink-0", className)}
      width={24}
      height={24}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M7.17663 23.8235C7.03379 23.6807 6.97224 23.4751 7.01172 23.2777L7.94074 18.633C7.96397 18.5157 8.02087 18.4089 8.10564 18.323L19.2539 7.17679C19.4896 6.94107 19.8728 6.94107 20.1086 7.17679L23.8246 10.8926C23.9361 11.0064 24 11.1596 24 11.3199C24 11.4801 23.9361 11.6334 23.8246 11.7472L21.0376 14.534L12.6764 22.8934C12.5905 22.9782 12.4836 23.0362 12.3664 23.0594L7.72126 23.9884C7.68178 23.9965 7.6423 24 7.60281 24C7.44488 23.9988 7.29043 23.9361 7.17663 23.8235ZM17.7465 10.3909L20.6091 13.2533L22.5426 11.3199L19.6801 8.45757L17.7465 10.3909ZM8.37274 22.6263L11.9506 21.911L19.7544 14.1079L16.893 11.2456L9.08808 19.0499L8.37274 22.6263Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Zelfde pad als `public/icons/minus-circle.svg`, gecentreerd in 24×24 zoals plus
 * (19.06→24 inset ≈ 2.47), anders oogt de cirkel groter dan `PlusCircleIcon`.
 */
function MinusCircleIcon({ className }: { className?: string }) {
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
      <g transform="translate(2.47 2.47)">
        <path
          fill="currentColor"
          d="M10.05,10.05h-3.08c-.29,0-.52-.23-.52-.52s.23-.52.52-.52h3.08M10.05,9.01h2.04c.29,0,.52.23.52.52s-.23.52-.52.52h-2.04M19.06,9.53c0,5.26-4.27,9.53-9.53,9.53S0,14.78,0,9.53,4.27,0,9.53,0s9.53,4.28,9.53,9.53ZM18.02,9.53c0-4.68-3.81-8.49-8.49-8.49S1.04,4.85,1.04,9.53s3.81,8.49,8.49,8.49,8.49-3.81,8.49-8.49Z"
        />
      </g>
    </svg>
  );
}

/** Zelfde geometry als `public/icons/plus-circle.svg` – 24×24, `currentColor`. */
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

/** Figma 508:1729: gap-12, pl-16 pr-12 py-12, rounded rd-8. Min-height keeps card height stable when checked (divider + claim hidden). */
const containerBase =
  "flex w-full min-w-0 min-h-[68px] items-center gap-3 rounded-md py-3 pl-4 pr-3";
const gridTileThumbClass =
  "relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] [&_img]:pointer-events-none [&_img]:size-full [&_img]:object-cover";
const gridTileFallbackClass =
  "relative flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--gray-25)] p-[10px]";

/** Duration for ItemCard state transition. Identical to ListCard. */
const ANIM_DURATION_MS = 120;

/**
 * Right-side section: width animates (text moves), content fades only.
 * Icons/dividers fade; only the text block moves during transition.
 */
function AnimatedRightSection({
  isVisible,
  children,
  className,
  widthClass = "w-11",
}: {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
  widthClass?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-[44px] shrink-0 items-center gap-3 overflow-hidden",
        "transition-[width] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        isVisible ? widthClass : "w-0 pointer-events-none",
        "duration-[var(--item-card-duration)]",
        className
      )}
      style={
        {
          "--item-card-duration": `${ANIM_DURATION_MS}ms`,
        } as React.CSSProperties
      }
      aria-hidden={!isVisible}
    >
      {children}
    </div>
  );
}

/**
 * Left icon area: checkbox = 24px (size-6), reorder = 44px (w-11).
 * Checkbox mode: 24px + 12px gap = 12px tussen checkbox en text.
 */
function LeftIconArea({
  isCheckboxVisible,
  isReorderVisible,
  checkbox,
  reorderContent,
}: {
  isCheckboxVisible: boolean;
  isReorderVisible: boolean;
  checkbox: React.ReactNode;
  reorderContent: React.ReactNode;
}) {
  const widthClass = isCheckboxVisible ? "w-6" : "w-11";
  return (
    <div
      className={cn("relative flex shrink-0 items-center", widthClass)}
      style={
        {
          "--item-card-duration": `${ANIM_DURATION_MS}ms`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "absolute inset-0 flex items-center",
          "transition-opacity [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] duration-[var(--item-card-duration)]",
          isCheckboxVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!isCheckboxVisible}
      >
        {checkbox}
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center gap-3",
          "transition-opacity [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] duration-[var(--item-card-duration)]",
          isReorderVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!isReorderVisible}
      >
        {reorderContent}
      </div>
      {/* Spacer for fixed width */}
      <div className={cn("shrink-0", isCheckboxVisible ? "w-6" : "w-11")} aria-hidden="true" />
    </div>
  );
}

/** Figma neutrals/100: vertical divider, same color in all states. */
function ItemDivider() {
  return (
    <span
      className="relative flex h-[44px] w-0 min-w-0 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span
        className="absolute left-1/2 top-0 h-[44px] w-px -translate-x-1/2 bg-[var(--gray-100)]"
        aria-hidden="true"
      />
    </span>
  );
}

/** Verticale scheidlijn voor `variant="added"`: wit op primary-400 (Figma 797:5139). */
function AddedItemDivider() {
  return (
    <span
      className="relative flex h-[44px] w-0 min-w-0 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span
        className="absolute left-1/2 top-0 h-[44px] w-px -translate-x-1/2 bg-[var(--white)]"
        aria-hidden="true"
      />
    </span>
  );
}

const ItemCard = React.forwardRef<HTMLDivElement, ItemCardProps>(
  (
    {
      className,
      itemName = "Item name",
      quantity,
      claimedByLabel,
      avatar,
      checked,
      defaultChecked,
      onCheckedChange,
      variant = "default",
      state = "default",
      presentation = "default",
      size = "default",
      asChild = false,
      children,
      onClaim,
      onReorder,
      onEdit,
      onDelete,
      dragHandleProps,
      syncListClaim,
      onMasterAdd,
      onAddedDecrement,
      onAddedIncrement,
      itemThumbnail,
      density = "default",
      isFromStock = false,
      style: incomingStyle,
      ...restProps
    },
    ref,
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(
      checked ?? defaultChecked ?? false,
    );
    const [claimedByMe, setClaimedByMe] = React.useState(
      variant === "gotten-by-you",
    );

    // Sync when parent updates the controlled `checked` prop.
    React.useEffect(() => {
      if (checked !== undefined) setInternalChecked(checked);
    }, [checked]);

    const isChecked = internalChecked;

    const handleCheckedChange = React.useCallback(
      (value: boolean) => {
        setInternalChecked(value);
        onCheckedChange?.(value);
      },
      [onCheckedChange],
    );

    const isBare = presentation === "bare";
    const isEditable = state === "editable";
    const isShared = state === "shared";
    const useSyncClaim = syncListClaim != null;
    const remoteClaimedBy = syncListClaim?.claimedByUserId ?? null;

    // effectiveVariant: met syncListClaim vanaf InstantDB; anders interne claim (Storybook / recepten).
    // Afgevinkt = default (doorstreept); `master` / `added` blijven vast voor hun layout.
    const effectiveVariant: ItemCardVariant =
      variant === "master"
        ? "master"
        : variant === "added"
          ? "added"
          : isChecked
            ? "default"
            : useSyncClaim
            ? !remoteClaimedBy
              ? "default"
              : remoteClaimedBy === syncListClaim!.currentUserId
                ? "gotten-by-you"
                : "gotten-by-other"
            : claimedByMe && variant === "default"
              ? "gotten-by-you"
              : variant;
    const isGottenByYou = effectiveVariant === "gotten-by-you";
    const isGottenByOther = effectiveVariant === "gotten-by-other";
    const effectiveClaimedByLabel =
      claimedByLabel ??
      (useSyncClaim
        ? isGottenByYou
          ? "jij haalt dit"
          : isGottenByOther
            ? (syncListClaim!.otherClaimerLabel ?? "Deelnemer haalt dit")
            : null
        : claimedByMe
          ? "jij haalt dit"
          : null);
    const showCheckbox =
      !isBare &&
      !isEditable &&
      (effectiveVariant === "default" ||
        effectiveVariant === "gotten-by-you" ||
        effectiveVariant === "gotten-by-other");
    const showClaimButton =
      !isBare &&
      !isEditable &&
      isShared &&
      (effectiveVariant === "default" || isGottenByYou);
    const showContentBlock =
      isBare ||
      effectiveVariant === "master" ||
      effectiveVariant === "added" ||
      effectiveVariant === "default" ||
      isGottenByYou ||
      isEditable ||
      (isGottenByOther && !isEditable);

    const isMasterLayout =
      variant === "master" && !isEditable && !isBare;

    const isAddedLayout =
      variant === "added" && !isEditable && !isBare;
    const gridDensity =
      density === "grid" &&
      !isBare &&
      !isMasterLayout &&
      !isAddedLayout;
    const gridEditable = gridDensity && isEditable;

    const showItemThumbnail =
      itemThumbnail != null &&
      !isEditable &&
      !isMasterLayout &&
      !isAddedLayout;
    const gridShowThumbnail =
      itemThumbnail != null && !isMasterLayout && !isAddedLayout;

    /**
     * gotten-by-you: 1px border primary 500 op de buitenrand (zelfde box als default gray border —
     * geen inset + transparante border: dat gaf een witte ring tussen rand en blauwe lijn).
     * Drop shadow alleen via inline style (Tailwind shadow-[] is onbetrouwbaar met var).
     */
    const showGottenByYouChrome = !isBare && isGottenByYou && !isGottenByOther;
    const containerClassName = isBare
      ? cn(
          "flex w-full min-w-0 items-center rounded-md border border-[var(--gray-100)] bg-[var(--white)] py-3 pl-4 pr-3",
          showItemThumbnail && "gap-3",
          className,
        )
      : isAddedLayout
        ? cn(
            /* Figma 797:5139: gap-12 + padding sp-12 rondom (niet pl-16/pr-12 van default item) */
            "flex w-full min-w-0 min-h-[68px] items-center gap-3 rounded-md bg-[var(--blue-400)] p-3",
            className,
          )
        : cn(
            containerBase,
            gridDensity &&
              cn(
                "!min-h-0 justify-center p-3 rounded-[var(--radius-md)]",
                isEditable ? "h-auto min-h-[168px]" : "h-[140px]",
              ),
            gridEditable && "bg-[var(--white)] shadow-drop",
            gridDensity && !gridEditable && !isGottenByOther && !isChecked && "shadow-drop",
            isGottenByOther &&
              !gridEditable &&
              "border border-[var(--gray-100)] bg-[var(--blue-25)]",
            (!isGottenByOther || gridEditable) && "bg-[var(--white)]",
            !gridDensity &&
              !isGottenByOther &&
              !isGottenByYou &&
              "border border-[var(--gray-100)]",
            !gridDensity && showGottenByYouChrome && "border border-[var(--blue-500)]",
            gridDensity && !gridEditable && isGottenByYou && "border-2 border-[var(--blue-500)]",
            className,
          );

    const containerStyle: React.CSSProperties = {
      ...(incomingStyle && typeof incomingStyle === "object" ? incomingStyle : {}),
      ...(showGottenByYouChrome ? { boxShadow: "var(--shadow-drop)" } : {}),
    };

    const containerProps = {
      ref,
      "data-variant": variant,
      "data-state": state,
      "data-presentation": presentation,
      "data-size": size,
      className: containerClassName,
      style: containerStyle,
      ...restProps,
    };

    const textContent = (
      <>
        <span
          className={cn(
            "truncate font-medium text-base leading-24 tracking-normal w-full",
            isChecked && "line-through text-[var(--gray-400)]",
            !isChecked && "text-[var(--text-primary)]",
          )}
        >
          {itemName}
        </span>
        {quantity != null && (
          <span
            className={cn(
              "font-normal text-sm leading-20 tracking-normal text-[var(--gray-400)] w-full",
              isChecked && "line-through",
            )}
          >
            {quantity}
          </span>
        )}
      </>
    );

    const addedTextContent = (
      <>
        <span className="w-full truncate text-center font-medium text-base leading-24 tracking-normal text-[var(--text-inverse)]">
          {itemName}
        </span>
        {quantity != null && (
          <span className="w-full text-center font-normal text-sm leading-20 tracking-normal text-[var(--text-inverse)]">
            {quantity}
          </span>
        )}
      </>
    );

    const handleLeftClick = React.useCallback(
      () => {
        if (isGottenByOther) return;
        handleCheckedChange(!isChecked);
      },
      [isChecked, handleCheckedChange, isGottenByOther],
    );

    const isLeftClickable =
      !isBare && !isEditable && showCheckbox && !isGottenByOther;

    const defaultContent = isBare ? (
      <>
        {showItemThumbnail && (
          <div className="relative size-11 shrink-0 overflow-hidden rounded-[var(--radius-md)] [&_img]:pointer-events-none [&_img]:size-full [&_img]:object-cover">
            {itemThumbnail}
          </div>
        )}
        <div className="min-w-0 flex flex-1 flex-col gap-0">{textContent}</div>
      </>
    ) : isMasterLayout ? (
      <>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex flex-1 flex-col gap-0">{textContent}</div>
        </div>
        <div className="flex w-11 shrink-0 items-center gap-3">
          <ItemDivider />
          <button
            type="button"
            aria-label="Item van favorietenlijst toevoegen"
            onClick={(e) => {
              e.stopPropagation();
              onMasterAdd?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-action-primary transition-colors hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            disabled={!onMasterAdd}
          >
            <PlusCircleIcon />
          </button>
        </div>
      </>
    ) : isAddedLayout ? (
      <>
        {/*
         * Figma 797:5139: icon-hulpzone p-4 (4px) + 24px glyph = 32px – zelfde hit area als master plus-knop (size-8 + p-1).
         * Geen w-11: dat is voor reorder/handle-kolom elders, niet voor dit icoon-slot.
         */}
        <button
          type="button"
          aria-label="Hoeveelheid verminderen"
          onClick={(e) => {
            e.stopPropagation();
            onAddedDecrement?.();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--text-inverse)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--blue-400)] disabled:pointer-events-none disabled:opacity-50"
          disabled={!onAddedDecrement}
        >
          <MinusCircleIcon />
        </button>
        <AddedItemDivider />
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0 text-center">
          {addedTextContent}
        </div>
        <AddedItemDivider />
        <button
          type="button"
          aria-label="Hoeveelheid verhogen"
          onClick={(e) => {
            e.stopPropagation();
            onAddedIncrement?.();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--text-inverse)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--blue-400)] disabled:pointer-events-none disabled:opacity-50"
          disabled={!onAddedIncrement}
        >
          <PlusCircleIcon />
        </button>
      </>
    ) : gridDensity ? (
      <div
        className={cn(
          "relative flex min-h-[116px] min-w-0 flex-1 flex-col items-center gap-2",
          isLeftClickable && "cursor-pointer",
        )}
        onClick={isLeftClickable ? handleLeftClick : undefined}
        role={isLeftClickable ? "button" : undefined}
        tabIndex={isLeftClickable ? 0 : undefined}
        onKeyDown={
          isLeftClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleLeftClick();
                }
              }
            : undefined
        }
        aria-label={
          isLeftClickable
            ? (typeof itemName === "string"
                ? `Markeer "${itemName}" als gehaald`
                : "Markeer als gehaald")
            : undefined
        }
      >
        {!isEditable && (
          <div className="absolute inset-x-0 top-0 z-[1] flex items-start justify-between">
            <div className="flex h-8 w-8 items-start justify-start">
              {showCheckbox ? (
                <span onClick={(e) => e.stopPropagation()} className="contents">
                  <Checkbox
                    size="default"
                    checked={isChecked}
                    onCheckedChange={handleCheckedChange}
                    disabled={isGottenByOther}
                    className="shrink-0 rounded-[4px] border-[1.3px]"
                    aria-label={
                      typeof itemName === "string"
                        ? `Markeer "${itemName}" als gehaald`
                        : "Markeer als gehaald"
                    }
                  />
                </span>
              ) : (
                <span className="size-6" aria-hidden />
              )}
            </div>
            <div className="flex h-8 w-8 items-start justify-end">
              {showClaimButton && effectiveVariant === "default" && !isChecked ? (
                <button
                  type="button"
                  aria-label="Claim item"
                  data-item-hand
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (useSyncClaim) {
                      syncListClaim!.onClaimChange(syncListClaim!.currentUserId);
                    } else {
                      setClaimedByMe(true);
                      onClaim?.();
                    }
                  }}
                  className="relative flex size-8 shrink-0 items-start justify-end bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                >
                  <span className="absolute right-0 top-0 flex size-6 items-center justify-center rounded-[4px] bg-[var(--blue-50)] text-[var(--blue-300)]">
                    <HandIcon className="size-5" />
                  </span>
                </button>
              ) : showClaimButton && isGottenByYou ? (
                <button
                  type="button"
                  aria-label="Unclaim item"
                  data-item-hand
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (useSyncClaim) {
                      syncListClaim!.onClaimChange(null);
                    } else {
                      setClaimedByMe(false);
                      onClaim?.();
                    }
                  }}
                  className="relative flex size-8 shrink-0 items-start justify-end bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                >
                  <span className="absolute right-0 top-0 flex size-6 items-center justify-center rounded-[4px] bg-[var(--blue-500)] text-[var(--white)]">
                    <HandIcon className="size-5" />
                  </span>
                </button>
              ) : isGottenByOther ? (
                <span
                  className="relative flex size-8 shrink-0 items-start justify-end"
                  aria-hidden="true"
                >
                  <span className="absolute right-0 top-0 flex size-6 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)]">
                    {useSyncClaim ? syncListClaim!.otherClaimerAvatar : avatar}
                  </span>
                </span>
              ) : (
                <span className="size-8" aria-hidden />
              )}
            </div>
          </div>
        )}

        {gridShowThumbnail ? (
          <div className={cn(gridTileThumbClass, isChecked && "opacity-20")}>
            {itemThumbnail}
          </div>
        ) : (
          <div className={gridTileFallbackClass} aria-hidden>
            <span
              className="pointer-events-none inline-block size-12 bg-[var(--gray-200)]"
              style={{
                WebkitMaskImage: 'url("/icons/shopping_bag.svg")',
                maskImage: 'url("/icons/shopping_bag.svg")',
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </div>
        )}

        {isEditable ? (
          <div className="flex w-full flex-col items-start gap-0">
            <span className="w-full truncate text-center text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
              {itemName}
            </span>
            <div className="flex h-11 w-full items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Reorder item"
                {...(dragHandleProps ?? (onReorder ? { onClick: onReorder } : {}))}
                className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--blue-500)] transition-colors hover:text-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 active:cursor-grabbing"
              >
                <ReorderIcon className="size-6" />
              </button>
              <span className="h-6 w-px shrink-0 bg-[var(--gray-100)]" aria-hidden />
              <button
                type="button"
                aria-label="Edit item"
                onClick={onEdit}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] transition-colors hover:text-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                <PencilIcon className="size-6" />
              </button>
              <span className="h-6 w-px shrink-0 bg-[var(--gray-100)]" aria-hidden />
              <button
                type="button"
                aria-label="Delete item"
                onClick={onDelete}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--error-600)] transition-colors hover:text-[var(--error-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                <TrashIcon className="size-6" />
              </button>
            </div>
          </div>
        ) : showContentBlock && (
          <div className="flex h-[44px] w-full flex-col items-center text-center">
            {effectiveVariant === "default" && !isEditable && (
              <>
                <span
                  className={cn(
                    "w-full truncate text-base font-medium leading-24 tracking-normal",
                    isChecked && "line-through text-[var(--gray-400)]",
                    !isChecked && "text-[var(--text-primary)]",
                  )}
                >
                  {itemName}
                </span>
                {quantity != null && (
                  <span
                    className={cn(
                      "w-full text-sm font-normal leading-20 tracking-normal text-[var(--gray-400)]",
                      isChecked && "line-through",
                    )}
                  >
                    {quantity}
                  </span>
                )}
              </>
            )}
            {isGottenByYou && (
              <>
                <span className="w-full truncate text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
                  {itemName}
                </span>
                <span className="w-full truncate text-sm font-normal leading-20 text-[var(--blue-500)]">
                  {effectiveClaimedByLabel}
                </span>
              </>
            )}
            {isGottenByOther && !isEditable && (
              <>
                <span className="w-full truncate text-base font-medium leading-24 text-[var(--gray-400)]">
                  {itemName}
                </span>
                {effectiveClaimedByLabel != null && (
                  <span className="w-full truncate text-sm font-normal leading-20 text-[var(--blue-500)]">
                    {effectiveClaimedByLabel}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    ) : (
      <>
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-[12px]",
            isLeftClickable && "cursor-pointer",
          )}
          onClick={isLeftClickable ? handleLeftClick : undefined}
          role={isLeftClickable ? "button" : undefined}
          tabIndex={isLeftClickable ? 0 : undefined}
          onKeyDown={
            isLeftClickable
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLeftClick();
                  }
                }
              : undefined
          }
          aria-label={
            isLeftClickable
              ? (typeof itemName === "string"
                  ? `Markeer "${itemName}" als gehaald`
                  : "Markeer als gehaald")
              : undefined
          }
        >
          <LeftIconArea
            isCheckboxVisible={!isEditable && showCheckbox}
            isReorderVisible={isEditable}
            checkbox={
              <span onClick={(e) => e.stopPropagation()} className="contents">
                <Checkbox
                  size="default"
                  checked={isChecked}
                  onCheckedChange={handleCheckedChange}
                  disabled={isGottenByOther}
                  className="shrink-0"
                  aria-label={
                    typeof itemName === "string"
                      ? `Markeer "${itemName}" als gehaald`
                      : "Markeer als gehaald"
                  }
                />
              </span>
            }
            reorderContent={
              <>
                <button
                  type="button"
                  aria-label="Reorder item"
                  {...(dragHandleProps ?? (onReorder ? { onClick: onReorder } : {}))}
                  className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-pill p-1 text-[var(--blue-500)] transition-colors hover:bg-[var(--blue-25)] hover:text-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 active:cursor-grabbing"
                >
                  <ReorderIcon />
                </button>
                <ItemDivider />
              </>
            }
          />

          {showItemThumbnail ? (
            <div
              className={cn(
                "relative size-11 shrink-0 overflow-hidden rounded-[var(--radius-md)] [&_img]:pointer-events-none [&_img]:size-full [&_img]:object-cover",
                isChecked && "opacity-20",
              )}
            >
              {itemThumbnail}
            </div>
          ) : null}

          {showContentBlock && (
            <div className="min-w-0 flex flex-1 flex-col gap-0">
              {effectiveVariant === "default" &&
                !isEditable &&
                textContent}
              {isGottenByYou && (
                <>
                  <span className="truncate font-medium text-base leading-24 tracking-normal text-[var(--text-primary)] w-full">
                    {itemName}
                  </span>
                  <span className="flex items-center gap-1 font-normal text-sm leading-20 text-[var(--gray-400)]">
                    {quantity != null && <>{quantity}</>}
                    {quantity != null && effectiveClaimedByLabel != null && " - "}
                    {effectiveClaimedByLabel != null && (
                      <span className="font-medium text-xs leading-16 text-[var(--blue-500)]">
                        {effectiveClaimedByLabel}
                      </span>
                    )}
                  </span>
                </>
              )}
              {isEditable && textContent}
              {isGottenByOther && !isEditable && (
                <>
                  <span className="truncate font-medium text-base leading-24 text-[var(--gray-400)] w-full">
                    {itemName}
                  </span>
                  {effectiveClaimedByLabel != null && (
                    <span className="flex items-center gap-1 font-normal text-sm leading-20 text-[var(--gray-400)]">
                      {quantity != null && <>{quantity}</>}
                      {quantity != null && " - "}
                      <span className="font-medium text-xs leading-16 text-[var(--blue-500)]">
                        {effectiveClaimedByLabel}
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <AnimatedRightSection
          isVisible={
            isEditable ||
            (isShared && effectiveVariant === "default" && !isChecked) ||
            isGottenByYou ||
            isGottenByOther
          }
          widthClass={
            isEditable
              ? "w-24"
              : (isShared && effectiveVariant === "default" && !isChecked) ||
                  isGottenByYou ||
                  isGottenByOther
                ? "w-11"
                : "w-0"
          }
        >
          <div
            className={cn(
              "absolute inset-0 flex items-center gap-3",
              "transition-opacity [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] duration-[var(--item-card-duration)]",
              !isEditable &&
              ((isShared && effectiveVariant === "default" && !isChecked) ||
                isGottenByYou ||
                isGottenByOther)
                ? "opacity-100"
                : "opacity-0 pointer-events-none",
              "min-w-0"
            )}
            style={
              {
                "--item-card-duration": `${ANIM_DURATION_MS}ms`,
              } as React.CSSProperties
            }
            aria-hidden={isEditable}
          >
            {!isEditable && !isChecked && <ItemDivider />}
            {showClaimButton &&
              effectiveVariant === "default" &&
              !isChecked && (
                <button
                  type="button"
                  aria-label="Claim item"
                  data-item-hand
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (useSyncClaim) {
                      syncListClaim!.onClaimChange(syncListClaim!.currentUserId);
                    } else {
                      setClaimedByMe(true);
                      onClaim?.();
                    }
                  }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--blue-500)] transition-colors hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                >
                  <HandIcon />
                </button>
              )}
            {showClaimButton && isGottenByYou && (
              <button
                type="button"
                aria-label="Unclaim item"
                data-item-hand
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (useSyncClaim) {
                    syncListClaim!.onClaimChange(null);
                  } else {
                    setClaimedByMe(false);
                    onClaim?.();
                  }
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)]"
              >
                <HandIcon />
              </button>
            )}
            {isGottenByOther && (
              <span
                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
                aria-hidden="true"
              >
                {useSyncClaim
                  ? syncListClaim!.otherClaimerAvatar
                  : avatar}
              </span>
            )}
          </div>
          <div
            className={cn(
              "absolute inset-0 flex items-center gap-3",
              "transition-opacity [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] duration-[var(--item-card-duration)]",
              isEditable ? "opacity-100" : "opacity-0 pointer-events-none",
              "min-w-0"
            )}
            style={
              {
                "--item-card-duration": `${ANIM_DURATION_MS}ms`,
              } as React.CSSProperties
            }
            aria-hidden={!isEditable}
          >
            <button
              type="button"
              aria-label="Edit item"
              onClick={onEdit}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex size-10 shrink-0 items-center justify-center rounded-pill text-[var(--blue-500)] transition-colors hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <PencilIcon />
            </button>
            <ItemDivider />
            <button
              type="button"
              aria-label="Delete item"
              onClick={onDelete}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--error-400)] transition-colors hover:bg-[var(--error-25)] hover:text-[var(--error-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <TrashIcon />
            </button>
          </div>
        </AnimatedRightSection>
      </>
    );

    // "Uit voorraad"-weergave (Figma 1195:10755): niet-klikbaar, sneeuwvlok links,
    // foto op 20% opacity, doorgestreepte grijze tekst, geen acties rechts.
    if (isFromStock) {
      return (
        <div
          ref={ref}
          data-variant="from-stock"
          className={cn(containerBase, "border border-[var(--gray-100)] bg-[var(--white)]", className)}
          style={incomingStyle}
          aria-label={typeof itemName === "string" ? itemName : undefined}
          {...restProps}
        >
          {/* Sneeuwvlok i.p.v. checkbox */}
          <FreezeIcon className="shrink-0" />

          {/* Thumbnail – 44×44, 20% opacity */}
          {itemThumbnail != null && (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-[var(--radius-md)] opacity-20 [&_img]:pointer-events-none [&_img]:size-full [&_img]:object-cover">
              {itemThumbnail}
            </div>
          )}

          {/* Tekst – doorgestreept, grijs */}
          <div className="min-w-0 flex flex-1 flex-col gap-0">
            <span className="truncate font-medium text-base leading-24 tracking-normal w-full line-through text-[var(--gray-400)]">
              {itemName}
            </span>
            {quantity != null && (
              <span className="font-normal text-sm leading-20 tracking-normal text-[var(--gray-400)] w-full line-through">
                {quantity}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (asChild) {
      return <Slot {...containerProps}>{children}</Slot>;
    }
    return <div {...containerProps}>{defaultContent}</div>;
  },
);

ItemCard.displayName = "ItemCard";

export { ItemCard };
