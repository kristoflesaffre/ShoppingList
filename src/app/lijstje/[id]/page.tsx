"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { id as iid } from "@instantdb/react";
import {
  LoyaltyCardSwipeShell,
  type LoyaltySwipePane,
} from "@/components/loyalty_card_swipe_shell";
import { Button } from "@/components/ui/button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { InputField } from "@/components/ui/input_field";
import { ItemCard } from "@/components/ui/item_card";
import { MiniButton } from "@/components/ui/mini_button";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { SearchBar } from "@/components/ui/search_bar";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { SelectTile } from "@/components/ui/select_tile";
import { Snackbar } from "@/components/ui/snackbar";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { decodeLoyaltyCard } from "@/lib/decode_loyalty_card";
import { db } from "@/lib/db";
import {
  APP_FAB_BOTTOM_NO_NAV_CLASS,
  APP_FAB_INNER_PX4_CLASS,
  APP_SNACKBAR_NO_NAV_FIXTURE_CLASS,
} from "@/lib/app-layout";
import { useItemPhotoUrl } from "@/lib/item-photos";
import type { DecodeResult } from "@/lib/loyalty_card";
import {
  MASTER_STORE_OPTIONS,
  LOYALTY_COMBO_PRIMARY_LOGO_SRC,
  LOYALTY_COMBO_SECONDARY_LOGO_SRC,
  listIconIsLidlDelhaizeCombo,
  masterStoreLabelFromListIcon,
} from "@/lib/master-stores";
import { listIsMasterTemplate } from "@/lib/list-master";
import {
  type RecipeIngredient,
  type SavedRecipe,
} from "@/lib/recipe_library";
import { cn, isIPhoneDevice } from "@/lib/utils";
import type { ListItem } from "./new_item_modal";

const RecipeIngredientSortableList = dynamic(
  () =>
    import("@/app/recepten/recipe_ingredient_sortable_list").then(
      (m) => m.RecipeIngredientSortableList,
    ),
  { ssr: false },
);
const RecipeIngredientFormSlideIn = dynamic(
  () =>
    import("@/components/recipe_ingredient_form_slide_in").then(
      (m) => m.RecipeIngredientFormSlideIn,
    ),
  { ssr: false },
);
const LoyaltyCardScanResultSlideIn = dynamic(
  () =>
    import("@/components/loyalty_card_scan_result_slide_in").then(
      (m) => m.LoyaltyCardScanResultSlideIn,
    ),
  { ssr: false },
);
const LoyaltyCardDisplay = dynamic(
  () =>
    import("@/components/loyalty_card_display").then(
      (m) => m.LoyaltyCardDisplay,
    ),
  { ssr: false },
);
const CameraBarcodeScannerSlideIn = dynamic(
  () =>
    import("@/components/camera_barcode_scanner_slide_in").then(
      (m) => m.CameraBarcodeScannerSlideIn,
    ),
  { ssr: false },
);
const ShareListModal = dynamic(
  () => import("@/components/share_list_modal").then((m) => m.ShareListModal),
  { ssr: false },
);

/** Profiel van een andere claimer: avatar + voornaam op itemkaart. */
type ClaimerProfileInfo = { avatarUrl?: string; firstName?: string };

function otherClaimerDisplayLabel(
  claimerUserId: string | null | undefined,
  storedDisplayName: string | null | undefined,
  claimProfileByUserId: Map<string, ClaimerProfileInfo>,
): string {
  const stored = storedDisplayName?.trim();
  if (stored) return `${stored} haalt dit`;
  if (!claimerUserId) return "Deelnemer haalt dit";
  const fn = claimProfileByUserId.get(claimerUserId)?.firstName?.trim();
  return fn ? `${fn} haalt dit` : "Deelnemer haalt dit";
}

/** Alleen voornaam uit profiel (registratie); geen afleiding uit e-mail. */
function claimDisplayNameFromProfileOnly(
  firstName: string | null | undefined,
): string {
  return firstName?.trim() ?? "";
}

function readClaimedByDisplayNameFromInstantRow(
  it: Record<string, unknown>,
): string | undefined {
  const raw = it.claimedByDisplayName ?? it.claimed_by_display_name;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

type SectionItemsChunk =
  | { type: "plain"; items: ListItem[] }
  | {
      type: "recipe";
      groupId: string;
      recipeName: string;
      recipeLink?: string;
      items: ListItem[];
    };

/** Groepeert opeenvolgende receptregels met dezelfde recipeGroupId. */
function chunkSectionItems(sectionItems: ListItem[]): SectionItemsChunk[] {
  const chunks: SectionItemsChunk[] = [];
  for (const item of sectionItems) {
    const gid = item.recipeGroupId;
    const title = item.recipeName;
    if (gid && title) {
      const last = chunks[chunks.length - 1];
      if (last?.type === "recipe" && last.groupId === gid) {
        last.items.push(item);
      } else {
        chunks.push({
          type: "recipe",
          groupId: gid,
          recipeName: title,
          recipeLink: item.recipeLink,
          items: [item],
        });
      }
    } else {
      const last = chunks[chunks.length - 1];
      if (last?.type === "plain") {
        last.items.push(item);
      } else {
        chunks.push({ type: "plain", items: [item] });
      }
    }
  }
  return chunks;
}

const SECTION_ORDER = [
  "Algemeen",
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
] as const;

const WEEK_DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"] as const;

/** Bouwt de dagvolgorde op startend vanaf de eerstvolgende dag (morgen-first). */
function buildDaySectionOrder(): readonly string[] {
  // getDay(): 0=zo,1=ma,…,6=za → omrekenen naar ma=0…zo=6
  const todayIdx = (new Date().getDay() + 6) % 7;
  const nextIdx = (todayIdx + 1) % 7;
  const rotatedDays = [...WEEK_DAYS.slice(nextIdx), ...WEEK_DAYS.slice(0, nextIdx)];
  return ["Algemeen", ...rotatedDays];
}


/** public/icons/arrow.svg – terugpijl */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/add_person.svg */
function PersonAddIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M19.4 17.5C19.4 17.7205 19.221 17.9 19 17.9H17.9V19C17.9 19.2205 17.721 19.4 17.5 19.4C17.279 19.4 17.1 19.221 17.1 19V17.9H16C15.7795 17.9 15.6 17.721 15.6 17.5C15.6 17.279 15.779 17.1 16 17.1H17.1V16C17.1 15.7795 17.279 15.6 17.5 15.6C17.721 15.6 17.9 15.779 17.9 16V17.1H19C19.2205 17.1 19.4 17.2795 19.4 17.5ZM21.9 17.5C21.9 19.9265 19.9265 21.9 17.5 21.9C15.0735 21.9 13.1 19.9265 13.1 17.5C13.1 15.0735 15.0735 13.1 17.5 13.1C19.9265 13.1 21.9 15.0735 21.9 17.5ZM21.1 17.5C21.1 15.515 19.485 13.9 17.5 13.9C15.515 13.9 13.9 15.515 13.9 17.5C13.9 19.485 15.515 21.1 17.5 21.1C19.485 21.1 21.1 19.485 21.1 17.5ZM8.01199 10.878C7.10749 9.9775 6.60599 8.7785 6.59999 7.502V6.58C6.68349 5.334 7.21999 4.204 8.11199 3.37C9.00399 2.536 10.168 2.0765 11.3895 2.0765C12.611 2.0765 13.775 2.5355 14.667 3.37C15.56 4.2045 16.0965 5.335 16.178 6.553L16.179 7.47C16.1625 8.746 15.6595 9.942 14.763 10.843C13.8655 11.7435 12.6715 12.252 11.4015 12.275C11.3995 12.275 11.397 12.275 11.3945 12.275C10.118 12.275 8.91649 11.779 8.01199 10.878ZM7.39999 7.5C7.40499 8.562 7.82299 9.561 8.57649 10.3115C9.32949 11.061 10.329 11.4745 11.3915 11.4755C12.4515 11.4555 13.4475 11.0305 14.1965 10.279C14.9455 9.5265 15.3655 8.527 15.3795 7.4655V6.5805C15.312 5.592 14.865 4.6505 14.121 3.955C13.377 3.2595 12.407 2.877 11.3895 2.877C10.372 2.877 9.40149 3.26 8.65849 3.955C7.91499 4.65 7.46749 5.5915 7.39899 6.6075L7.39999 7.5ZM3.52399 16.773C3.86699 16.3175 4.35649 15.9785 4.90349 15.819C6.96549 15.209 9.09949 14.9 11.2495 14.9C11.283 14.9 11.325 14.911 11.35 14.9C11.57 14.9 11.749 14.7225 11.75 14.502C11.751 14.281 11.573 14.101 11.352 14.1C9.08849 14.0655 6.84449 14.41 4.67799 15.051C3.96799 15.2585 3.33099 15.699 2.88499 16.2915C2.43999 16.884 2.19299 17.6175 2.19049 18.3595V21.5C2.19049 21.7205 2.36949 21.9 2.59049 21.9H11.35C11.571 21.9 11.75 21.721 11.75 21.5C11.75 21.279 11.571 21.1 11.35 21.1H2.98999V18.361C2.99199 17.792 3.18199 17.228 3.52399 16.773Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/dots.svg */
function MoreDotsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14.1 12C14.1 13.16 13.16 14.1 12 14.1C10.84 14.1 9.9 13.16 9.9 12C9.9 10.84 10.84 9.9 12 9.9C13.16 9.9 14.1 10.84 14.1 12ZM4.6 9.9C3.44 9.9 2.5 10.84 2.5 12C2.5 13.16 3.44 14.1 4.6 14.1C5.76 14.1 6.7 13.16 6.7 12C6.7 10.84 5.76 9.9 4.6 9.9ZM19.4 9.9C18.24 9.9 17.3 10.84 17.3 12C17.3 13.16 18.24 14.1 19.4 14.1C20.56 14.1 21.5 13.16 21.5 12C21.5 10.84 20.56 9.9 19.4 9.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Placeholder in 16px-avatar (Figma 762:3479 – gedeeld-detail). */
function SharePartyAvatarPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.41 11.6263C14.7921 11.6263 16.7231 9.69525 16.7231 7.31316C16.7231 4.93107 14.7921 3 12.41 3C10.0279 3 8.0968 4.93107 8.0968 7.31316C8.0968 9.69525 10.0279 11.6263 12.41 11.6263Z" />
      <path d="M19.82 20.2526C19.82 16.9143 16.4989 14.2142 12.41 14.2142C8.32113 14.2142 5 16.9143 5 20.2526" />
    </svg>
  );
}

/** public/icons/recycle_bin.svg */
function RecycleBinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.938 9.5933V19.2223C18.938 19.7893 18.717 20.3243 18.317 20.7253C17.916 21.1253 17.381 21.3463 16.814 21.3463H7.18595C6.61795 21.3463 6.08395 21.1253 5.68395 20.7253C5.28295 20.3233 5.06095 19.7893 5.06095 19.2223V9.5933C5.06095 9.3063 5.29395 9.0733 5.58095 9.0733C5.86795 9.0733 6.10095 9.3063 6.10095 9.5933V19.2223C6.10095 19.5073 6.21695 19.7873 6.41895 19.9893C6.62395 20.1943 6.89595 20.3073 7.18595 20.3073H16.815C17.105 20.3073 17.377 20.1943 17.582 19.9893C17.787 19.7853 17.9 19.5123 17.9 19.2223V9.5933C17.9 9.3063 18.132 9.0733 18.42 9.0733C18.708 9.0733 18.938 9.3063 18.938 9.5933ZM21.346 6.3843C21.346 6.6713 21.114 6.9043 20.826 6.9043H3.17295C2.88595 6.9043 2.65295 6.6713 2.65295 6.3843C2.65295 6.0973 2.88595 5.8643 3.17295 5.8643H8.26995V3.1743C8.26995 2.8873 8.50295 2.6543 8.78995 2.6543H15.209C15.496 2.6543 15.729 2.8873 15.729 3.1743V5.8643H20.826C21.113 5.8643 21.346 6.0973 21.346 6.3843ZM9.31095 5.8643H14.691V3.6943H9.31095V5.8643ZM14.659 16.8143V12.0003C14.659 11.7133 14.427 11.4803 14.139 11.4803C13.851 11.4803 13.619 11.7133 13.619 12.0003V16.8143C13.619 17.1013 14.427 17.3343 14.139 17.3343C14.427 17.3343 14.659 17.1023 14.659 16.8143ZM10.38 16.8143V12.0003C10.38 11.7133 10.147 11.4803 9.85995 11.4803C9.57295 11.4803 9.33995 11.7133 9.33995 12.0003V16.8143C9.33995 17.1013 9.57295 17.3343 9.85995 17.3343C10.147 17.3343 10.38 17.1023 10.38 16.8143Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/plus-circle.svg */
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
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

/** `public/icons/toggle_*.svg` als monochrome mask met primary kleur. */
function ToggleViewIcon({
  src,
  active,
  className,
}: {
  src: string;
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-5 shrink-0 bg-action-primary",
        !active && "opacity-[0.42]",
        className,
      )}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
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

/** public/icons/chef_hat.svg */
function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5.34143 11.5837L5.70893 11.7136V19.4895C5.70893 20.2672 6.33937 20.8976 7.11706 20.8976H16.8829C17.6606 20.8976 18.2911 20.2672 18.2911 19.4895V11.7136L18.6586 11.5837C19.9895 11.1133 20.8976 9.85088 20.8976 8.41597C20.8976 6.56102 19.3939 5.05729 17.539 5.05729C17.0447 5.05729 16.5665 5.16379 16.1286 5.36671L15.6218 5.60161L15.3937 5.09162C14.857 3.89141 13.6635 3.10236 12.3258 3.10236C10.8882 3.10236 9.6239 4.01399 9.15561 5.34857L8.91989 6.02031L8.32859 5.62389C7.78034 5.25634 7.13623 5.05729 6.46104 5.05729C4.60609 5.05729 3.10236 6.56102 3.10236 8.41597C3.10236 9.85088 4.01051 11.1133 5.34143 11.5837ZM4.60657 12.4745C3.04098 11.7591 2 10.1865 2 8.41597C2 5.9522 3.99727 3.95493 6.46104 3.95493C7.13357 3.95493 7.78465 4.10438 8.37573 4.38565C9.13338 2.94401 10.6397 2 12.3258 2C13.9218 2 15.3634 2.84594 16.1566 4.17339C16.5985 4.02947 17.0638 3.95493 17.539 3.95493C20.0027 3.95493 22 5.9522 22 8.41597C22 10.1865 20.959 11.7591 19.3934 12.4745V19.4895C19.3934 20.876 18.2694 22 16.8829 22H7.11706C5.73055 22 4.60657 20.876 4.60657 19.4895V12.4745Z"
        fill="currentColor"
      />
      <path
        d="M4.93225 19.0676V17.9653H19.0675V19.0676H4.93225Z"
        fill="currentColor"
      />
      <path
        d="M8.19061 13.3034C8.19061 12.999 8.43738 12.7522 8.74179 12.7522C9.0462 12.7522 9.29297 12.999 9.29297 13.3034V15.2583C9.29297 15.5627 9.0462 15.8095 8.74179 15.8095C8.43738 15.8095 8.19061 15.5627 8.19061 15.2583V13.3034Z"
        fill="currentColor"
      />
      <path
        d="M11.449 13.9549C11.449 13.6505 11.6958 13.4037 12.0002 13.4037C12.3046 13.4037 12.5514 13.6505 12.5514 13.9549V15.9098C12.5514 16.2142 12.3046 16.461 12.0002 16.461C11.6958 16.461 11.449 16.2142 11.449 15.9098V13.9549Z"
        fill="currentColor"
      />
      <path
        d="M14.7072 13.3034C14.7072 12.999 14.9539 12.7522 15.2583 12.7522C15.5627 12.7522 15.8095 12.999 15.8095 13.3034V15.2583C15.8095 15.5627 15.5627 15.8095 15.2583 15.8095C14.9539 15.8095 14.7072 15.5627 14.7072 15.2583V13.3034Z"
        fill="currentColor"
      />
    </svg>
  );
}

const NewItemModal = dynamic(
  () => import("./new_item_modal").then((m) => m.NewItemModal),
  { ssr: false },
);

/** Maakt ingevoerde recept-URL bruikbaar als href (o.a. zonder https://). */
function hrefFromRecipeLink(raw: string): string {
  const t = raw.trim();
  if (!t) return "#";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^mailto:/i.test(t) || /^tel:/i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  return `https://${t}`;
}

/**
 * Receptkop op de lijst – Figma "Weeklijstje - met recept" (134:767);
 * in wijzig-modus: prullenbak i.p.v. link (Figma 390:2210).
 */
function RecipeGroupHeader({
  id,
  recipeName,
  recipeLink,
  isEditMode,
  onDeleteRecipeGroup,
}: {
  id: string;
  recipeName: string;
  recipeLink?: string;
  isEditMode: boolean;
  onDeleteRecipeGroup?: () => void;
}) {
  const linkTrimmed = recipeLink?.trim() ?? "";
  const hasLink = linkTrimmed.length > 0;

  return (
    <div
      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--blue-200)] px-4 py-3"
      style={{
        background:
          "linear-gradient(90deg, var(--blue-25) 0%, var(--white) 35%, var(--white) 65%, var(--blue-25) 100%)",
      }}
    >
      <div className="flex size-6 shrink-0 items-center justify-center">
        <ChefHatIcon className="size-5 shrink-0 text-[var(--blue-500)]" />
      </div>
      <h4
        id={id}
        className="min-w-0 flex-1 text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]"
      >
        {recipeName}
      </h4>
      {isEditMode && onDeleteRecipeGroup ? (
        <button
          type="button"
          aria-label={`Recept ${recipeName} en alle bijbehorende items verwijderen`}
          onClick={onDeleteRecipeGroup}
          className="flex size-6 shrink-0 items-center justify-center text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <RecycleBinIcon className="size-6 shrink-0" />
        </button>
      ) : hasLink ? (
        <a
          href={hrefFromRecipeLink(linkTrimmed)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-normal leading-20 tracking-normal text-action-primary underline decoration-action-primary underline-offset-2 transition-colors hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          Recept
        </a>
      ) : (
        <span className="shrink-0 text-sm font-normal leading-20 tracking-normal text-[var(--text-tertiary)]">
          Recept
        </span>
      )}
    </div>
  );
}

/** Renders sortable item cards; must be inside DndContext for drag state. */
function SortableItemItems({
  sections,
  isEditMode,
  listViewMode,
  isMasterList,
  isSharedList,
  getPhotoUrl,
  removingId,
  removingSectionTitle,
  addingId,
  addingIdExpanded,
  onCheckedChange,
  onRemoteClaimChange,
  onDelete,
  onDeleteSection,
  onDeleteRecipeGroup,
  onEdit,
  onAddToSection,
  currentUserId,
  claimProfileByUserId,
}: {
  sections: { title: string; items: ListItem[] }[];
  isEditMode: boolean;
  listViewMode: "list" | "grid";
  isMasterList: boolean;
  isSharedList: boolean;
  getPhotoUrl?: (name: string) => string | null;
  removingId: string | null;
  removingSectionTitle: string | null;
  addingId: string | null;
  addingIdExpanded: boolean;
  onCheckedChange: (id: string, checked: boolean) => void;
  onRemoteClaimChange: (itemId: string, claimUserId: string | null) => void;
  onDelete: (id: string) => void;
  onDeleteSection: (sectionTitle: string) => void;
  onDeleteRecipeGroup: (groupId: string) => void;
  onEdit: (item: ListItem) => void;
  onAddToSection: (sectionTitle: string) => void;
  currentUserId: string;
  claimProfileByUserId: Map<string, ClaimerProfileInfo>;
}) {
  const { active } = useDndContext();
  const isDndActive = active != null;

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => {
        const isSectionRemoving = removingSectionTitle === section.title;
        return (
        <section
          key={section.title}
          aria-label={section.title}
          className={cn(
            "transition-[max-height,opacity] duration-200",
            "[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
            isSectionRemoving
              ? "overflow-hidden"
              : listViewMode === "grid"
                ? "overflow-visible"
                : "overflow-hidden",
            isSectionRemoving ? "max-h-0 opacity-0" : "max-h-[999999px] opacity-100"
          )}
        >
          <div className="mb-4 flex items-center gap-3 pr-4">
            <h3 className="flex-1 text-section-title font-bold leading-24 tracking-normal text-[var(--blue-900)]">
              {section.title}
            </h3>
            {isEditMode ? (
              <button
                type="button"
                aria-label={`Sectie ${section.title} verwijderen`}
                onClick={() => onDeleteSection(section.title)}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <RecycleBinIcon />
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Item toevoegen aan ${section.title}`}
                onClick={() => onAddToSection(section.title)}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <PlusCircleIcon />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {chunkSectionItems(section.items).map((chunk, chunkIndex) => {
              if (chunk.type === "plain") {
                return (
                  <div
                    key={`plain-${section.title}-${chunkIndex}-${chunk.items[0]?.id ?? "e"}`}
                    className={cn(
                      listViewMode === "grid" ? "grid grid-cols-2 gap-4 lg:grid-cols-4" : "flex flex-col gap-3",
                    )}
                  >
                    {chunk.items.map((item) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        isEditMode={isEditMode}
                        listViewMode={listViewMode}
                        isDndActive={isDndActive}
                        isMasterList={isMasterList}
                        isSharedList={isSharedList}
                        getPhotoUrl={getPhotoUrl}
                        removingId={removingId}
                        addingId={addingId}
                        addingIdExpanded={addingIdExpanded}
                        onCheckedChange={onCheckedChange}
                        onRemoteClaimChange={onRemoteClaimChange}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        currentUserId={currentUserId}
                        claimProfileByUserId={claimProfileByUserId}
                      />
                    ))}
                  </div>
                );
              }

              const headingId = `recipe-heading-${chunk.groupId}`;
              return (
                <div
                  key={chunk.groupId}
                  role="group"
                  aria-labelledby={headingId}
                  className="flex flex-col gap-2"
                >
                  <RecipeGroupHeader
                    id={headingId}
                    recipeName={chunk.recipeName}
                    recipeLink={chunk.recipeLink}
                    isEditMode={isEditMode}
                    onDeleteRecipeGroup={
                      isEditMode
                        ? () => onDeleteRecipeGroup(chunk.groupId)
                        : undefined
                    }
                  />
                  <div
                    className={cn(
                      listViewMode === "grid"
                        ? "grid grid-cols-2 gap-4 pl-0 lg:grid-cols-4"
                        : "flex flex-col gap-2 pl-2",
                    )}
                  >
                    {chunk.items.map((item) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        isEditMode={isEditMode}
                        listViewMode={listViewMode}
                        isDndActive={isDndActive}
                        isMasterList={isMasterList}
                        isSharedList={isSharedList}
                        getPhotoUrl={getPhotoUrl}
                        removingId={removingId}
                        addingId={addingId}
                        addingIdExpanded={addingIdExpanded}
                        onCheckedChange={onCheckedChange}
                        onRemoteClaimChange={onRemoteClaimChange}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        currentUserId={currentUserId}
                        claimProfileByUserId={claimProfileByUserId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        );
      })}
    </div>
  );
}

function SortableItemRow({
  item,
  isEditMode,
  listViewMode,
  isDndActive,
  isMasterList,
  isSharedList,
  getPhotoUrl,
  removingId,
  addingId,
  addingIdExpanded,
  onCheckedChange,
  onRemoteClaimChange,
  onDelete,
  onEdit,
  currentUserId,
  claimProfileByUserId,
}: {
  item: ListItem;
  isEditMode: boolean;
  listViewMode: "list" | "grid";
  isDndActive: boolean;
  isMasterList: boolean;
  isSharedList: boolean;
  getPhotoUrl?: (name: string) => string | null;
  removingId: string | null;
  addingId: string | null;
  addingIdExpanded: boolean;
  onCheckedChange: (id: string, checked: boolean) => void;
  onRemoteClaimChange: (itemId: string, claimUserId: string | null) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ListItem) => void;
  currentUserId: string;
  claimProfileByUserId: Map<string, ClaimerProfileInfo>;
}) {
  const isRemoving = removingId === item.id;
  const isAdding = addingId === item.id;
  const isAddingCollapsed = isAdding && !addingIdExpanded;
  const isAnimating = isRemoving || isAddingCollapsed;
  const wrapperClass = isDndActive
    ? ""
    : cn(
        listViewMode === "grid"
          ? "transition-[max-height,opacity,margin] duration-300 ease-out"
          : "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
        /* Ruime max voor lange namen / grotere tekst; collapse-animatie blijft werken */
        isAnimating ? "max-h-0 opacity-0" : "max-h-[1200px] opacity-100",
      );

  return (
    <div className={wrapperClass}>
      <SortableItemCard
        item={item}
        isEditMode={isEditMode}
        listViewMode={listViewMode}
        isMasterList={isMasterList}
        isSharedList={isSharedList}
        getPhotoUrl={getPhotoUrl}
        onCheckedChange={(checked) => onCheckedChange(item.id, checked)}
        onRemoteClaimChange={(claimUserId) =>
          onRemoteClaimChange(item.id, claimUserId)
        }
        onDelete={() => onDelete(item.id)}
        onEdit={() => onEdit(item)}
        currentUserId={currentUserId}
        claimProfileByUserId={claimProfileByUserId}
      />
    </div>
  );
}

function SortableItemCard({
  item,
  isEditMode,
  listViewMode,
  isMasterList,
  isSharedList,
  getPhotoUrl,
  onCheckedChange,
  onRemoteClaimChange,
  onDelete,
  onEdit,
  currentUserId,
  claimProfileByUserId,
}: {
  item: ListItem;
  isEditMode: boolean;
  listViewMode: "list" | "grid";
  isMasterList: boolean;
  isSharedList: boolean;
  getPhotoUrl?: (name: string) => string | null;
  onCheckedChange: (checked: boolean) => void;
  onRemoteClaimChange: (claimUserId: string | null) => void;
  onDelete: () => void;
  onEdit: () => void;
  currentUserId: string;
  claimProfileByUserId: Map<string, ClaimerProfileInfo>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]"
      )}
    >
      <SwipeToDelete
        onDelete={!isEditMode && !isMasterList && listViewMode !== "grid" ? onDelete : undefined}
        deleteActionLabel="Item verwijderen"
      >
        <ItemCard
          itemName={item.name}
          quantity={item.quantity}
          checked={item.checked}
          onCheckedChange={onCheckedChange}
          presentation={isMasterList && !isEditMode ? "bare" : "default"}
          state={isEditMode ? "editable" : (isSharedList ? "shared" : "default")}
          density={listViewMode === "grid" ? "grid" : "default"}
          itemThumbnail={(() => {
            const photoUrl = getPhotoUrl?.(item.name);
            if (!photoUrl) return undefined;
            return (
              <Image
                src={photoUrl}
                alt=""
                width={listViewMode === "grid" ? 64 : 44}
                height={listViewMode === "grid" ? 64 : 44}
                className="size-full object-cover"
              />
            );
          })()}
          onDelete={isEditMode ? onDelete : undefined}
          onEdit={isEditMode ? onEdit : undefined}
          dragHandleProps={
            isEditMode
              ? { ...attributes, ...listeners }
              : undefined
          }
          syncListClaim={{
            claimedByUserId: item.claimedByInstantUserId ?? null,
            currentUserId,
            onClaimChange: onRemoteClaimChange,
            otherClaimerLabel: otherClaimerDisplayLabel(
              item.claimedByInstantUserId ?? null,
              item.claimedByDisplayName ?? null,
              claimProfileByUserId,
            ),
            otherClaimerAvatar: (() => {
              const oid = item.claimedByInstantUserId;
              if (!oid || oid === currentUserId) return undefined;
              const url = claimProfileByUserId.get(oid)?.avatarUrl;
              if (!url) return undefined;
              return (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL profiel
                <img
                  src={url}
                  alt=""
                  width={32}
                  height={32}
                  className="size-full object-cover"
                />
              );
            })(),
          }}
        />
      </SwipeToDelete>
    </div>
  );
}

/** Zelfde idee als /deel/[token]: nooit `id: undefined` in InstaQL — dat kan eindeloos laden geven. */
const LIJSTJE_QUERY_PLACEHOLDER_ID = "__lijst_detail_missing_route_id__";

function resolvedRouteListId(
  propsId: string | undefined,
  paramFromHook: string | string[] | undefined,
): string | null {
  if (typeof paramFromHook === "string" && paramFromHook.length > 0) {
    return paramFromHook;
  }
  if (
    Array.isArray(paramFromHook) &&
    typeof paramFromHook[0] === "string" &&
    paramFromHook[0].length > 0
  ) {
    return paramFromHook[0];
  }
  if (typeof propsId === "string" && propsId.length > 0) return propsId;
  return null;
}

export default function ListDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const routeParams = useParams();
  const getPhotoUrl = useItemPhotoUrl();
  const { isLoading: authLoading, user } = db.useAuth();
  const routeListId = resolvedRouteListId(params.id, routeParams?.id);
  const listQueryId = routeListId ?? LIJSTJE_QUERY_PLACEHOLDER_ID;
  const listId = routeListId ?? "";

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const listDetailQuery = React.useMemo(
    () => ({
      lists: {
        items: {},
        memberships: {},
        loyaltyCard: {},
        loyaltyCardSecondary: {},
        $: { where: { id: listQueryId } },
      },
    }),
    [listQueryId],
  );

  const { isLoading, error, data } = db.useQuery(listDetailQuery);

  const myProfileQueryId = user?.id ?? "__my_profile_none__";
  const { data: myProfileData } = db.useQuery({
    profiles: {
      $: { where: { instantUserId: myProfileQueryId } },
    },
  });
  const myFirstName = React.useMemo(() => {
    const raw = myProfileData?.profiles?.[0]?.firstName;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  }, [myProfileData?.profiles]);

  const myFirstNameRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    myFirstNameRef.current = myFirstName;
  }, [myFirstName]);

  const listData = data?.lists?.[0];

  const canAccess = React.useMemo(() => {
    if (!listData || !user) return false;
    if (listData.ownerId === user.id) return true;
    return (listData.memberships ?? []).some(
      (m) => m.instantUserId === user.id,
    );
  }, [listData, user]);

  const isListOwner = React.useMemo(
    () => !!(listData && user && listData.ownerId === user.id),
    [listData, user],
  );

  /** Andere partij op dit lijstje: eigenaar (als jij deelnemer bent) of eerste deelnemer (als jij eigenaar bent). Figma 762:3479. */
  const shareDetailOtherUserId = React.useMemo(() => {
    if (!listData || !user?.id) return null;
    const ownerId = listData.ownerId;
    if (!ownerId) return null;
    if (ownerId === user.id) {
      const memberIds = (listData.memberships ?? [])
        .map((m) => m.instantUserId)
        .filter((id): id is string => !!id && id !== user.id);
      return memberIds[0] ?? null;
    }
    return ownerId;
  }, [listData, user?.id]);

  /** `with` = jij bent eigenaar → “Gedeeld met …”; `by` = jij bent deelnemer → “Gedeeld door …”. */
  const shareDetailLabelKind = React.useMemo((): "with" | "by" | null => {
    if (!listData || !user?.id || !shareDetailOtherUserId) return null;
    return listData.ownerId === user.id ? "with" : "by";
  }, [listData, user?.id, shareDetailOtherUserId]);

  const sharePartyProfileQuery = React.useMemo(
    () => ({
      profiles: {
        $: {
          where: shareDetailOtherUserId
            ? { instantUserId: shareDetailOtherUserId }
            : { instantUserId: "__list_detail_no_share_profile__" },
        },
      },
    }),
    [shareDetailOtherUserId],
  );

  const { data: sharePartyProfileData } = db.useQuery(
    sharePartyProfileQuery as unknown as Parameters<typeof db.useQuery>[0],
  );

  const sharePartyProfile = sharePartyProfileData?.profiles?.[0];
  const sharePartyFirstName = React.useMemo(() => {
    const raw = sharePartyProfile?.firstName;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  }, [sharePartyProfile?.firstName]);
  const sharePartyAvatarUrl = sharePartyProfile?.avatarUrl ?? null;

  const showSharedDetailRow = shareDetailLabelKind != null;

  React.useEffect(() => {
    if (authLoading || !user || isLoading) return;
    if (!listData || !canAccess) router.replace("/");
  }, [authLoading, user, isLoading, listData, canAccess, router]);
  const listName = listData?.name ?? "Lijstje";
  const listIcon = listData?.icon ?? "";
  /** Logo van de master-winkel (opgeslagen bij aanmaken vanuit master; fallback = listIcon voor oude lijstjes). */
  const masterIcon: string = (listData as Record<string, unknown>)?.masterIcon as string || listIcon;
  const isMasterList = listIsMasterTemplate(
    listData as { isMasterTemplate?: boolean; icon?: string; name?: string },
  );
  const masterStoreLabel = React.useMemo(() => {
    if (!isMasterList) return "";
    const logoFile = listIcon.split("/").pop() ?? "";
    const match =
      MASTER_STORE_OPTIONS.find((s) => {
        const storeLogoFile = s.logoSrc.split("/").pop() ?? "";
        return storeLogoFile.length > 0 && storeLogoFile === logoFile;
      }) ?? null;
    return match?.label ?? "";
  }, [isMasterList, listIcon]);

  /** Zelfde als home-migratie: bookmark naar master opent detail zonder home. */
  React.useEffect(() => {
    if (!isListOwner || !listId || !listData || !isMasterList) return;
    const label = masterStoreLabelFromListIcon(listIcon);
    if (!label) return;
    const current = String(listData.name ?? "").trim();
    if (current === label) return;
    void db.transact(db.tx.lists[listId].update({ name: label }));
  }, [isListOwner, listId, listData, isMasterList, listIcon]);

  const items: ListItem[] = React.useMemo(() => {
    if (!listData?.items) return [];
    return [...listData.items]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((it) => {
        const row = it as unknown as Record<string, unknown>;
        return {
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          checked: it.checked,
          section: it.section,
          claimedByInstantUserId: it.claimedByInstantUserId || undefined,
          claimedByDisplayName: readClaimedByDisplayNameFromInstantRow(row),
          recipeGroupId: it.recipeGroupId || undefined,
          recipeName: it.recipeName || undefined,
          recipeLink: it.recipeLink || undefined,
        };
      });
  }, [listData]);

  /**
   * Items die jij claimt: `claimedByDisplayName` gelijk houden aan profiel-voornaam.
   * Vult lege waarden (trage profiel-query) en corrigeert oude e-mail-gebaseerde teksten.
   */
  React.useEffect(() => {
    if (!user?.id) return;
    const resolved = claimDisplayNameFromProfileOnly(myFirstName);
    if (!resolved) return;
    const mine = items.filter(
      (i) =>
        i.claimedByInstantUserId === user.id &&
        i.claimedByDisplayName?.trim() !== resolved,
    );
    if (mine.length === 0) return;
    void db.transact(
      mine.map((i) =>
        db.tx.items[i.id].update({ claimedByDisplayName: resolved }),
      ),
    );
  }, [user?.id, myFirstName, items]);

  const claimerIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const it of items) {
      const c = it.claimedByInstantUserId;
      if (c && user?.id && c !== user.id) ids.add(c);
    }
    return Array.from(ids);
  }, [items, user?.id]);

  const claimersProfileQuery = React.useMemo(() => {
    if (claimerIds.length === 0) {
      return {
        profiles: {
          $: { where: { instantUserId: "__claimers_none__" } },
        },
      };
    }
    return {
      profiles: {
        $: {
          where: {
            or: claimerIds.map((id) => ({ instantUserId: id })),
          },
        },
      },
    };
  }, [claimerIds]);

  const { data: claimerProfileData } = db.useQuery(
    claimersProfileQuery as unknown as Parameters<typeof db.useQuery>[0],
  );

  const claimProfileByUserId = React.useMemo(() => {
    const m = new Map<string, ClaimerProfileInfo>();
    for (const p of claimerProfileData?.profiles ?? []) {
      if (p.instantUserId) {
        const raw = p.firstName;
        const firstName =
          typeof raw === "string" && raw.trim().length > 0
            ? raw.trim()
            : undefined;
        m.set(p.instantUserId, {
          avatarUrl: p.avatarUrl ?? undefined,
          firstName,
        });
      }
    }
    return m;
  }, [claimerProfileData?.profiles]);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [listLayoutMode, setListLayoutMode] = React.useState<"list" | "grid">("list");
  const [isListLayoutHydrated, setIsListLayoutHydrated] = React.useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ListItem | null>(null);
  const [initialSection, setInitialSection] = React.useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(
    null
  );
  const [lastDeleted, setLastDeleted] = React.useState<{
    item: ListItem;
    index: number;
  } | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [removingSectionTitle, setRemovingSectionTitle] = React.useState<
    string | null
  >(null);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addingIdExpanded, setAddingIdExpanded] = React.useState(false);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [loyaltyCardSlideOpen, setLoyaltyCardSlideOpen] = React.useState(false);
  const [loyaltyCardViewSlideOpen, setLoyaltyCardViewSlideOpen] = React.useState(false);
  const [loyaltyCardScanResultOpen, setLoyaltyCardScanResultOpen] = React.useState(false);
  const [loyaltyCameraScanOpen, setLoyaltyCameraScanOpen] = React.useState(false);
  const [loyaltyDecodeResult, setLoyaltyDecodeResult] = React.useState<Extract<DecodeResult, { ok: true }> | null>(null);
  const [loyaltyDecodeError, setLoyaltyDecodeError] = React.useState<string | null>(null);
  const [loyaltySaving, setLoyaltySaving] = React.useState(false);
  const [loyaltyPanel, setLoyaltyPanel] = React.useState<"list" | "loyalty">("list");
  /** Bij combi Lidl/Delhaize: welk slot koppelen/hernieuwen (primary = Delhaize). */
  const [loyaltySlot, setLoyaltySlot] = React.useState<"delhaize" | "lidl">(
    "delhaize",
  );
  const [loyaltyViewSlot, setLoyaltyViewSlot] = React.useState<
    "delhaize" | "lidl"
  >("delhaize");
  const loyaltyCardPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const existingLoyaltyCard = data?.lists?.[0]?.loyaltyCard ?? null;
  const existingLoyaltyCardSecondary =
    data?.lists?.[0]?.loyaltyCardSecondary ?? null;
  const isLidlDelhaizeList =
    listIconIsLidlDelhaizeCombo(masterIcon) ||
    // Retroactieve detectie voor lijstjes aangemaakt vóór masterIcon werd opgeslagen:
    // een secondary loyalty card kan alleen bestaan op een Lidl/Delhaize-combinatielijst.
    (!isMasterList && existingLoyaltyCardSecondary !== null);
  const { data: recipeData } = db.useQuery({
    recipes: { ingredients: {} },
  });

  const savedRecipes: SavedRecipe[] = React.useMemo(() => {
    if (!recipeData?.recipes) return [];
    return [...recipeData.recipes]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((r) => ({
        id: r.id,
        name: r.name,
        link: r.link,
        steps: r.steps ?? "",
        persons: r.persons,
        photoUrl: r.photoUrl ?? null,
        ingredients: [...(r.ingredients ?? [])]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((ing) => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
          })),
      }));
  }, [recipeData]);

  const removeTimeoutRef = React.useRef<number | NodeJS.Timeout | null>(null);

  const DELETE_ANIMATION_MS = 300;
  const ADD_ANIMATION_MS = 300;

  React.useEffect(() => {
    if (!addingId) return;
    setAddingIdExpanded(false);
    const rafId = requestAnimationFrame(() => {
      setAddingIdExpanded(true);
    });
    const timeoutId = window.setTimeout(() => {
      setAddingId(null);
      setAddingIdExpanded(false);
    }, ADD_ANIMATION_MS);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [addingId]);

  React.useEffect(() => {
    return () => {
      if (removeTimeoutRef.current) clearTimeout(removeTimeoutRef.current);
    };
  }, []);

  const handleOpenNewItemModal = React.useCallback(() => {
    setEditingItem(null);
    setInitialSection(null);
    setIsNewItemOpen(true);
  }, []);

  /** Eerste keer delen (slide-in): genereer unieke shareToken op de lijst. */
  React.useEffect(() => {
    if (!shareModalOpen || !isListOwner || !listId || !user) return;
    if (listData?.shareToken) return;
    const t = crypto.randomUUID();
    void db.transact(db.tx.lists[listId].update({ shareToken: t }));
  }, [shareModalOpen, isListOwner, listId, user, listData?.shareToken]);

  const handleShareInvitePress = React.useCallback(async () => {
    if (!isListOwner || !listId || !user) return;

    const canNativeShare =
      isIPhoneDevice() &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function";

    const ensureShareToken = async (): Promise<string | null> => {
      if (listData?.shareToken) return listData.shareToken;
      const t = crypto.randomUUID();
      await db.transact(db.tx.lists[listId].update({ shareToken: t }));
      return t;
    };

    if (canNativeShare) {
      try {
        const token = await ensureShareToken();
        if (!token || typeof window === "undefined") return;
        const url = `${window.location.origin}/deel/${encodeURIComponent(token)}`;
        await navigator.share({
          title: "Lijstje delen",
          text: "Schrijf mee op dit lijstje:",
          url,
        });
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === "AbortError") return;
        setShareModalOpen(true);
      }
      return;
    }

    setShareModalOpen(true);
  }, [isListOwner, listId, user, listData?.shareToken]);

  const shareUrl = React.useMemo(() => {
    const tok = listData?.shareToken;
    if (!tok || typeof window === "undefined") return "";
    return `${window.location.origin}/deel/${encodeURIComponent(tok)}`;
  }, [listData?.shareToken]);

  const handleSaveRecipeToLibrary = React.useCallback(
    (recipe: SavedRecipe) => {
      const isNew = !savedRecipes.some((r) => r.id === recipe.id);
      const recipeId = isNew ? iid() : recipe.id;

      const existingIngredientIds = isNew
        ? []
        : (recipeData?.recipes
            ?.find((r) => r.id === recipe.id)
            ?.ingredients?.map((i) => i.id) ?? []);

      const newIngIds = new Set(recipe.ingredients.map((i) => i.id));
      const toDeleteIngIds = existingIngredientIds.filter(
        (eid) => !newIngIds.has(eid),
      );

      const allRecipes = recipeData?.recipes ?? [];
      const existingRecipeRow = allRecipes.find((r) => r.id === recipe.id);
      const existingOrder = existingRecipeRow?.order ?? 0;
      const newOrder =
        allRecipes.length > 0
          ? Math.min(...allRecipes.map((r) => r.order ?? 0)) - 1
          : 0;

      const photoPatch =
        !isNew && existingRecipeRow?.photoUrl
          ? { photoUrl: existingRecipeRow.photoUrl }
          : {};

      const txns = [
        db.tx.recipes[recipeId].update({
          name: recipe.name,
          link: recipe.link,
          persons: recipe.persons,
          order: isNew ? newOrder : existingOrder,
          ...photoPatch,
        }),
        ...recipe.ingredients.map((ing, i) => {
          const ingId = isNew || !existingIngredientIds.includes(ing.id)
            ? iid()
            : ing.id;
          return db.tx.recipeIngredients[ingId]
            .update({
              name: ing.name,
              quantity: ing.quantity,
              order: i,
            })
            .link({ recipe: recipeId });
        }),
        ...toDeleteIngIds.map((ingId) =>
          db.tx.recipeIngredients[ingId].delete(),
        ),
      ];
      db.transact(txns as Parameters<typeof db.transact>[0]);
    },
    [savedRecipes, recipeData],
  );

  const handleAddItemsFromRecipe = React.useCallback(
    (templateItems: ListItem[]) => {
      if (templateItems.length > 0) {
        const section = templateItems[0].section;
        const sectionStart = items.findIndex((i) => i.section === section);

        const newItems = templateItems.map((t) => ({ ...t, id: iid() }));
        let newArray: ListItem[];
        if (sectionStart === -1) {
          newArray = [...items, ...newItems];
        } else {
          newArray = [
            ...items.slice(0, sectionStart),
            ...newItems,
            ...items.slice(sectionStart),
          ];
        }

        const newIds = new Set(newItems.map((n) => n.id));
        const txns = [
          ...newItems.map((item, _i) =>
            db.tx.items[item.id]
              .update({
                name: item.name,
                quantity: item.quantity,
                checked: false,
                section: item.section,
                order: newArray.findIndex((a) => a.id === item.id),
                recipeGroupId: item.recipeGroupId ?? "",
                recipeName: item.recipeName ?? "",
                recipeLink: item.recipeLink ?? "",
              })
              .link({ list: listId }),
          ),
          ...newArray
            .filter((a) => !newIds.has(a.id))
            .map((a) =>
              db.tx.items[a.id].update({
                order: newArray.findIndex((x) => x.id === a.id),
              }),
            ),
        ];
        db.transact(txns as Parameters<typeof db.transact>[0]);
        setAddingId(newItems[newItems.length - 1].id);
      }
      setIsNewItemOpen(false);
      setEditingItem(null);
      setInitialSection(null);
    },
    [items, listId],
  );

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeleted(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  const handleCheckedChange = React.useCallback(
    (itemId: string, checked: boolean) => {
      if (checked) {
        const row = items.find((i) => i.id === itemId);
        /** Geen `null` in één `update()` met checked — kan in InstantDB verkeerd op gelinkte items landen. */
        if (row?.claimedByInstantUserId) {
          db.transact([
            db.tx.items[itemId].update({ checked: true }),
            db.tx.items[itemId].merge({
              claimedByInstantUserId: null,
              claimedByDisplayName: null,
            } as never),
          ]);
        } else {
          db.transact(db.tx.items[itemId].update({ checked: true }));
        }
      } else {
        db.transact(db.tx.items[itemId].update({ checked: false }));
      }
    },
    [items],
  );

  const handleRemoteClaimChange = React.useCallback(
    (itemId: string, nextClaimUserId: string | null) => {
      if (!user) return;
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      if (nextClaimUserId !== null && nextClaimUserId !== user.id) return;
      if (
        nextClaimUserId === null &&
        item.claimedByInstantUserId !== user.id
      ) {
        return;
      }
      if (nextClaimUserId === null) {
        db.transact(
          db.tx.items[itemId].merge({
            claimedByInstantUserId: null,
            claimedByDisplayName: null,
          } as never),
        );
      } else {
        const displayName = claimDisplayNameFromProfileOnly(
          myFirstNameRef.current,
        );
        db.transact(
          db.tx.items[itemId].update({
            claimedByInstantUserId: nextClaimUserId,
            /** Denormalized: alleen registratie-voornaam; leeg tot profiel geladen (backfill-effect vult bij). */
            claimedByDisplayName: displayName,
          }),
        );
      }
    },
    [items, user],
  );

  const handleDeleteItem = React.useCallback(
    (itemId: string) => {
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
        removeTimeoutRef.current = null;
      }
      setRemovingId(itemId);
      removeTimeoutRef.current = window.setTimeout(() => {
        removeTimeoutRef.current = null;
        const index = items.findIndex((i) => i.id === itemId);
        const item = items[index];
        if (!item) {
          setRemovingId(null);
          return;
        }
        db.transact(db.tx.items[itemId].delete());
        setLastDeleted({ item, index });
        setSnackbarMessage(`'${item.name}' verwijderd`);
        setRemovingId(null);
      }, DELETE_ANIMATION_MS);
    },
    [items],
  );

  const SECTION_DELETE_ANIMATION_MS = 200;

  const handleDeleteSection = React.useCallback(
    (sectionTitle: string) => {
      setRemovingSectionTitle(sectionTitle);
      window.setTimeout(() => {
        const toDelete = items.filter((i) => i.section === sectionTitle);
        if (toDelete.length > 0) {
          db.transact(
            toDelete.map((i) => db.tx.items[i.id].delete()) as Parameters<
              typeof db.transact
            >[0],
          );
        }
        setRemovingSectionTitle(null);
      }, SECTION_DELETE_ANIMATION_MS);
    },
    [items],
  );

  const handleDeleteRecipeGroup = React.useCallback(
    (groupId: string) => {
      const toDelete = items.filter((i) => i.recipeGroupId === groupId);
      if (toDelete.length > 0) {
        db.transact(
          toDelete.map((i) => db.tx.items[i.id].delete()) as Parameters<
            typeof db.transact
          >[0],
        );
      }
    },
    [items],
  );

  const handleUndoDelete = React.useCallback(() => {
    if (!lastDeleted) return;
    const { item, index } = lastDeleted;
    const restoredId = iid();
    const restoredItem: ListItem = { ...item, id: restoredId };
    const newArray = [...items];
    newArray.splice(index, 0, restoredItem);
    const txns = [
      db.tx.items[restoredId]
        .update({
          name: restoredItem.name,
          quantity: restoredItem.quantity,
          checked: restoredItem.checked,
          section: restoredItem.section,
          order: index,
          recipeGroupId: restoredItem.recipeGroupId ?? "",
          recipeName: restoredItem.recipeName ?? "",
          recipeLink: restoredItem.recipeLink ?? "",
          ...(restoredItem.claimedByInstantUserId
            ? {
                claimedByInstantUserId: restoredItem.claimedByInstantUserId,
                ...(restoredItem.claimedByDisplayName
                  ? { claimedByDisplayName: restoredItem.claimedByDisplayName }
                  : {}),
              }
            : {}),
        })
        .link({ list: listId }),
      ...newArray
        .filter((a) => a.id !== restoredId)
        .map((a, i) =>
          db.tx.items[a.id].update({
            order: newArray.findIndex((x) => x.id === a.id),
          }),
        ),
    ];
    db.transact(txns as Parameters<typeof db.transact>[0]);
    setLastDeleted(null);
    setSnackbarMessage(null);
  }, [lastDeleted, items, listId]);

  const handleAddNewItem = React.useCallback(
    (newItem: { name: string; quantity: string; section: string }) => {
      const newId = iid();
      const item: ListItem = {
        id: newId,
        name: newItem.name,
        quantity: newItem.quantity,
        checked: false,
        section: newItem.section,
      };

      let newArray: ListItem[];
      if (initialSection) {
        const firstIndex = items.findIndex(
          (i) => i.section === newItem.section,
        );
        if (firstIndex === -1) {
          newArray = [...items, item];
        } else {
          newArray = [
            ...items.slice(0, firstIndex),
            item,
            ...items.slice(firstIndex),
          ];
        }
      } else {
        newArray = [...items, item];
      }

      const idx = newArray.findIndex((a) => a.id === newId);
      const txns = [
        db.tx.items[newId]
          .update({
            name: newItem.name,
            quantity: newItem.quantity,
            checked: false,
            section: newItem.section,
            order: idx,
          })
          .link({ list: listId }),
        ...newArray
          .filter((a) => a.id !== newId)
          .map((a) =>
            db.tx.items[a.id].update({
              order: newArray.findIndex((x) => x.id === a.id),
            }),
          ),
      ];
      db.transact(txns as Parameters<typeof db.transact>[0]);
      setAddingId(newId);
      setIsNewItemOpen(false);
    },
    [initialSection, items, listId],
  );

  const handleSaveEditedItem = React.useCallback((updatedItem: ListItem) => {
    db.transact(
      db.tx.items[updatedItem.id].update({
        name: updatedItem.name,
        quantity: updatedItem.quantity,
        section: updatedItem.section,
      }),
    );
    setEditingItem(null);
  }, []);

  const sections = React.useMemo(() => {
    const grouped = new Map<string, ListItem[]>();
    for (const item of items) {
      const existing = grouped.get(item.section) ?? [];
      existing.push(item);
      grouped.set(item.section, existing);
    }
    const order = buildDaySectionOrder();
    return order.filter((s) => grouped.has(s)).map((s) => ({
      title: s,
      items: grouped.get(s)!,
    }));
  }, [items]);

  const hasItems = items.length > 0;
  const isMasterEmpty = isMasterList && !hasItems;

  const showListDetailHeader =
    hasItems || showSharedDetailRow || isMasterEmpty;
  const listViewMode: "list" | "grid" = listLayoutMode;

  React.useEffect(() => {
    if (!listId) return;
    setIsListLayoutHydrated(false);
    try {
      const saved = window.localStorage.getItem(`list-view-mode:${listId}`);
      if (saved === "list" || saved === "grid") {
        setListLayoutMode(saved);
      } else {
        setListLayoutMode("list");
      }
    } catch {
      setListLayoutMode("list");
    } finally {
      setIsListLayoutHydrated(true);
    }
  }, [listId]);

  React.useEffect(() => {
    if (!listId || !isListLayoutHydrated) return;
    try {
      window.localStorage.setItem(`list-view-mode:${listId}`, listLayoutMode);
    } catch {
      // no-op: storage unavailable (private mode / blocked)
    }
  }, [listId, listLayoutMode, isListLayoutHydrated]);

  const handleReorderItems = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const movedId = String(active.id);
      const oldIndex = items.findIndex((i) => i.id === movedId);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(items, oldIndex, newIndex);
      const txns = reordered.map((item, i) =>
        item.id === movedId
          ? db.tx.items[item.id].update({
              order: i,
              recipeGroupId: "",
              recipeName: "",
              recipeLink: "",
            })
          : db.tx.items[item.id].update({ order: i }),
      );
      db.transact(txns as Parameters<typeof db.transact>[0]);
    },
    [items],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loyaltySwipePanes = React.useMemo((): LoyaltySwipePane[] => {
    const panes: LoyaltySwipePane[] = [];
    if (isLidlDelhaizeList) {
      if (
        existingLoyaltyCard &&
        typeof existingLoyaltyCard.rawValue === "string" &&
        existingLoyaltyCard.rawValue.length > 0
      ) {
        panes.push({
          heading: "Klantenkaart Delhaize",
          codeType: existingLoyaltyCard.codeType as "qr" | "barcode",
          codeFormat: String(existingLoyaltyCard.codeFormat ?? ""),
          rawValue: existingLoyaltyCard.rawValue,
          footerLogoSrc: LOYALTY_COMBO_PRIMARY_LOGO_SRC,
          pillTabLabel: "Delhaize",
        });
      }
      if (
        existingLoyaltyCardSecondary &&
        typeof existingLoyaltyCardSecondary.rawValue === "string" &&
        existingLoyaltyCardSecondary.rawValue.length > 0
      ) {
        panes.push({
          heading: "Klantenkaart Lidl",
          codeType: existingLoyaltyCardSecondary.codeType as "qr" | "barcode",
          codeFormat: String(existingLoyaltyCardSecondary.codeFormat ?? ""),
          rawValue: existingLoyaltyCardSecondary.rawValue,
          footerLogoSrc: LOYALTY_COMBO_SECONDARY_LOGO_SRC,
          pillTabLabel: "Lidl",
        });
      }
    } else if (
      existingLoyaltyCard &&
      typeof existingLoyaltyCard.rawValue === "string" &&
      existingLoyaltyCard.rawValue.length > 0
    ) {
      // masterIcon bevat het winkellogo (nieuwe lijstjes) of valt terug op listIcon (oude lijstjes).
      // Gebruik enkel als het een erkend winkellogo is — nooit een voedselpictogram tonen.
      const storeLogoSrc = masterStoreLabelFromListIcon(masterIcon) ? masterIcon : "";
      const label = masterStoreLabelFromListIcon(masterIcon) || masterStoreLabelFromListIcon(listIcon);
      panes.push({
        heading: label ? `Klantenkaart ${label}` : "Klantenkaart",
        codeType: existingLoyaltyCard.codeType as "qr" | "barcode",
        codeFormat: String(existingLoyaltyCard.codeFormat ?? ""),
        rawValue: existingLoyaltyCard.rawValue,
        footerLogoSrc: storeLogoSrc,
      });
    }
    return panes;
  }, [
    isLidlDelhaizeList,
    listIcon,
    existingLoyaltyCard,
    existingLoyaltyCardSecondary,
  ]);

  const showLoyaltySwipe = !isMasterList && loyaltySwipePanes.length > 0;
  /** Alleen op masterlijsten (Figma): koppel-/wijzig-rijen; gewone lijstjes enkel swipe-naar-QR. */
  const showLoyaltyLinkRows = isMasterList;
  const hideFabOnLoyaltyPanel = showLoyaltySwipe && loyaltyPanel === "loyalty";

  if (authLoading || !user || isLoading) {
    return <PageSpinner surface="white" />;
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-base text-[var(--error-600)]">
          Er ging iets mis: {error.message}
        </p>
      </div>
    );
  }

  const mainSurfaceClassName = cn(
    "pb-[calc(243px+env(safe-area-inset-bottom,0px))]",
    !showLoyaltySwipe &&
      "mt-[calc(56px+env(safe-area-inset-top,0px))]",
    isMasterList ? "pt-8" : "pt-4",
  );

  const listAppHeader = (
      <div className="fixed top-0 left-0 right-0 z-10 w-full bg-[var(--white)] pt-[env(safe-area-inset-top,0px)]">
        <header className="relative mx-auto flex h-14 max-w-[956px] items-center px-4">
          <Link
            href="/"
            aria-label="Terug naar lijstjes"
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <BackArrowIcon />
          </Link>
          <h1 className="pointer-events-none absolute inset-x-0 truncate px-24 text-center text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
            {listName}
          </h1>
          <div className="flex-1" />
          {isListOwner ? (
            <button
              type="button"
              aria-label="Lijstje delen"
              onClick={() => void handleShareInvitePress()}
              className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <PersonAddIcon />
            </button>
          ) : (
            <span className="size-6 shrink-0" aria-hidden />
          )}
          <div className="w-4 shrink-0" aria-hidden />
          <button
            type="button"
            aria-label="Meer opties"
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <MoreDotsIcon />
          </button>
        </header>
      </div>
  );

  const listMain = (
      <main
        className={mainSurfaceClassName}
      >
        {/* Geen extra gradient: zelfde principe als gewone lijstdetail — alleen body::before (globals.css). */}
        <div className="mx-auto flex w-full max-w-[956px] flex-col gap-6 px-4">
          {showListDetailHeader ? (
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 flex flex-col gap-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-page-title font-bold leading-32 tracking-normal text-[var(--text-primary)]">
                    {listName}
                  </h2>
                  {!isMasterEmpty ? (
                    <button
                      type="button"
                      aria-label={isEditMode ? "Stop bewerken" : "Bewerken"}
                      onClick={() => setIsEditMode((p) => !p)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z" fill="currentColor"/>
                      </svg>
                    </button>
                  ) : null}
                </div>
                {isMasterList && masterStoreLabel ? (
                  <div className="mt-0 flex w-full items-center justify-start gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- store-SVG uit /public/logos */}
                    <img
                      src={listIcon}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 object-contain"
                    />
                    <p className="text-sm font-normal leading-20 tracking-normal text-[var(--text-tertiary)]">
                      {masterStoreLabel}
                    </p>
                  </div>
                ) : null}
                {showSharedDetailRow ? (
                  <div className="mt-1 flex min-w-0 items-center gap-1">
                    <span className="relative size-4 shrink-0 overflow-hidden rounded-full bg-[var(--gray-100)] ring-1 ring-[var(--gray-100)]">
                      {sharePartyAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- data-URL uit profiel
                        <img
                          src={sharePartyAvatarUrl}
                          alt=""
                          width={16}
                          height={16}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <SharePartyAvatarPlaceholder className="text-[var(--blue-300)]" />
                        </span>
                      )}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs font-normal leading-4 tracking-normal text-[var(--gray-400)]">
                      {shareDetailLabelKind === "with"
                        ? `Gedeeld met ${sharePartyFirstName || "deelnemer"}`
                        : `Gedeeld door ${sharePartyFirstName || "eigenaar"}`}
                    </p>
                  </div>
                ) : null}
              </div>
              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="h-9 shrink-0 rounded-pill bg-[var(--blue-500)] px-4 text-sm font-medium leading-20 text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  Gereed
                </button>
              ) : hasItems ? (
                <div
                  className="box-border flex h-9 shrink-0 items-stretch overflow-hidden rounded-[4px] border border-[var(--gray-100)] bg-[var(--white)]"
                  role="group"
                  aria-label="Weergave"
                >
                  <button
                    type="button"
                    aria-label="Lijstweergave"
                    aria-pressed={listLayoutMode === "list"}
                    onClick={() => setListLayoutMode("list")}
                    className={cn(
                      "flex w-9 items-center justify-center p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-inset",
                      listLayoutMode === "list"
                        ? "bg-[var(--white)]"
                        : "bg-[var(--blue-25)]",
                    )}
                  >
                    <ToggleViewIcon
                      src="/icons/toggle_list.svg"
                      active={listLayoutMode === "list"}
                      className="size-6"
                    />
                  </button>
                  <div className="h-8 w-px shrink-0 bg-[var(--gray-100)]" aria-hidden />
                  <button
                    type="button"
                    aria-label="Tegelweergave"
                    aria-pressed={listLayoutMode === "grid"}
                    onClick={() => setListLayoutMode("grid")}
                    className={cn(
                      "flex w-9 items-center justify-center p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-inset",
                      listLayoutMode === "grid"
                        ? "bg-[var(--blue-25)]"
                        : "bg-[var(--white)]",
                    )}
                  >
                    <ToggleViewIcon
                      src="/icons/toggle_grid.svg"
                      active={listLayoutMode === "grid"}
                      className="size-6"
                    />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {showLoyaltyLinkRows ? (
            isLidlDelhaizeList ? (
              <div className="flex w-full flex-col gap-3">
                {existingLoyaltyCard ? (
                  <div className="flex w-full items-center gap-3 rounded-md border border-[var(--gray-100)] border-solid bg-[var(--white)] py-3 pl-4 pr-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- store-logo uit /public/logos */}
                    <img
                      src={LOYALTY_COMBO_PRIMARY_LOGO_SRC}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 shrink-0 object-contain"
                    />
                    <p className="min-w-0 flex-1 text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                      Klantenkaart gekoppeld
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoyaltyViewSlot("delhaize");
                        setLoyaltyCardViewSlideOpen(true);
                      }}
                      className="shrink-0 text-sm font-normal leading-20 tracking-normal text-action-primary underline decoration-action-primary underline-offset-2 transition-colors hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLoyaltySlot("delhaize");
                      setLoyaltyCardSlideOpen(true);
                    }}
                    aria-label="Klantenkaart Delhaize koppelen"
                    className="flex w-full items-center gap-3 rounded-md border border-dashed border-[var(--blue-500)] bg-[var(--white)] py-3 pl-4 pr-3 text-left transition-colors hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- store-logo uit /public/logos */}
                    <img
                      src={LOYALTY_COMBO_PRIMARY_LOGO_SRC}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 shrink-0 object-contain"
                    />
                    <p className="min-w-0 flex-1 text-sm font-normal leading-20 tracking-normal text-action-primary">
                      Klantenkaart koppelen
                    </p>
                    <span
                      aria-hidden="true"
                      className="inline-block size-6 shrink-0 bg-[var(--blue-500)]"
                      style={{
                        WebkitMaskImage: 'url("/icons/qr.svg")',
                        maskImage: 'url("/icons/qr.svg")',
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                      }}
                    />
                  </button>
                )}
                {existingLoyaltyCardSecondary ? (
                  <div className="flex w-full items-center gap-3 rounded-md border border-[var(--gray-100)] border-solid bg-[var(--white)] py-3 pl-4 pr-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- store-logo uit /public/logos */}
                    <img
                      src={LOYALTY_COMBO_SECONDARY_LOGO_SRC}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 shrink-0 object-contain"
                    />
                    <p className="min-w-0 flex-1 text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                      Klantenkaart gekoppeld
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoyaltyViewSlot("lidl");
                        setLoyaltyCardViewSlideOpen(true);
                      }}
                      className="shrink-0 text-sm font-normal leading-20 tracking-normal text-action-primary underline decoration-action-primary underline-offset-2 transition-colors hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLoyaltySlot("lidl");
                      setLoyaltyCardSlideOpen(true);
                    }}
                    aria-label="Klantenkaart Lidl koppelen"
                    className="flex w-full items-center gap-3 rounded-md border border-dashed border-[var(--blue-500)] bg-[var(--white)] py-3 pl-4 pr-3 text-left transition-colors hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- store-logo uit /public/logos */}
                    <img
                      src={LOYALTY_COMBO_SECONDARY_LOGO_SRC}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 shrink-0 object-contain"
                    />
                    <p className="min-w-0 flex-1 text-sm font-normal leading-20 tracking-normal text-action-primary">
                      Klantenkaart koppelen
                    </p>
                    <span
                      aria-hidden="true"
                      className="inline-block size-6 shrink-0 bg-[var(--blue-500)]"
                      style={{
                        WebkitMaskImage: 'url("/icons/qr.svg")',
                        maskImage: 'url("/icons/qr.svg")',
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                      }}
                    />
                  </button>
                )}
              </div>
            ) : isMasterList ? (
              existingLoyaltyCard ? (
                <div className="flex w-full items-center gap-3 rounded-md border border-[var(--gray-100)] border-solid bg-[var(--white)] py-3 pl-4 pr-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- store-logo uit /public/logos */}
                  <img
                    src={listIcon}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 shrink-0 object-contain"
                  />
                  <p className="min-w-0 flex-1 text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
                    Klantenkaart gekoppeld
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoyaltyViewSlot("delhaize");
                      setLoyaltyCardViewSlideOpen(true);
                    }}
                    className="shrink-0 text-sm font-normal leading-20 tracking-normal text-action-primary underline decoration-action-primary underline-offset-2 transition-colors hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                  >
                    Wijzigen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLoyaltySlot("delhaize");
                    setLoyaltyCardSlideOpen(true);
                  }}
                  aria-label="Klantenkaart koppelen"
                  className="flex w-full items-center gap-3 rounded-md border border-dashed border-[var(--blue-500)] bg-[var(--white)] py-3 pl-4 pr-3 text-left transition-colors hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- store-logo uit /public/logos */}
                  <img
                    src={listIcon}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 shrink-0 object-contain"
                  />
                  <p className="min-w-0 flex-1 text-sm font-normal leading-20 tracking-normal text-action-primary">
                    Klantenkaart koppelen
                  </p>
                  <span
                    aria-hidden="true"
                    className="inline-block size-6 shrink-0 bg-[var(--blue-500)]"
                    style={{
                      WebkitMaskImage: 'url("/icons/qr.svg")',
                      maskImage: 'url("/icons/qr.svg")',
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                    }}
                  />
                </button>
              )
            ) : null
          ) : null}

          {!hasItems ? (
            isMasterEmpty ? (
              <section
                className="flex min-h-[calc(100dvh-7rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex-col items-center justify-center gap-6 px-0 pb-8"
                aria-label="Lege masterlijst"
              >
                <div className="flex w-full max-w-[358px] flex-col items-center gap-6">
                  <div className="relative size-24 shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element -- store-SVG uit /public/logos */}
                    <img
                      src={listIcon}
                      alt=""
                      width={96}
                      height={96}
                      className="size-full object-contain"
                    />
                  </div>
                  <p className="w-full text-center text-base font-medium leading-24 tracking-normal text-[var(--gray-500)]">
                    Geen items in je lijstje
                  </p>
                  <MiniButton
                    type="button"
                    variant="primary"
                    aria-label="Item toevoegen"
                    onClick={handleOpenNewItemModal}
                  >
                    Voeg item toe
                  </MiniButton>
                </div>
              </section>
            ) : (
              <section
                className={cn(
                  "flex min-h-[calc(100dvh-7rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex-col items-center justify-center gap-6",
                  showListDetailHeader ? "pt-8" : "pt-32",
                )}
                aria-label="Lege staat"
              >
                <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                  Geen items in je lijstje
                </p>
                <MiniButton
                  type="button"
                  variant="primary"
                  aria-label="Item toevoegen"
                  onClick={handleOpenNewItemModal}
                >
                  Voeg item toe
                </MiniButton>
              </section>
            )
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleReorderItems}
              modifiers={listViewMode === "grid" ? [] : [restrictToVerticalAxis]}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={listViewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
              >
                <SortableItemItems
                  sections={sections}
                  isEditMode={isEditMode}
                  listViewMode={listViewMode}
                  isMasterList={isMasterList}
                  isSharedList={showSharedDetailRow}
                  getPhotoUrl={getPhotoUrl}
                  removingId={removingId}
                  removingSectionTitle={removingSectionTitle}
                  addingId={addingId}
                  addingIdExpanded={addingIdExpanded}
                  onCheckedChange={handleCheckedChange}
                  onRemoteClaimChange={handleRemoteClaimChange}
                  onDelete={handleDeleteItem}
                  onDeleteSection={handleDeleteSection}
                  onDeleteRecipeGroup={handleDeleteRecipeGroup}
                  onEdit={(item) => {
                    setEditingItem(item);
                  }}
                  onAddToSection={(sectionTitle) => {
                    setInitialSection(sectionTitle);
                    setEditingItem(null);
                    setIsNewItemOpen(true);
                  }}
                  currentUserId={user.id}
                  claimProfileByUserId={claimProfileByUserId}
                />
              </SortableContext>
            </DndContext>
          )}
        </div>
      </main>
  );

  const listBottomChrome = (
    <>
      {snackbarMessage && (
        <div
          className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS}
          role="region"
          aria-label="Melding"
        >
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDelete}
          />
        </div>
      )}

      {!isMasterEmpty && !hideFabOnLoyaltyPanel && !snackbarMessage ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-20",
            APP_FAB_BOTTOM_NO_NAV_CLASS,
          )}
        >
          <div className={APP_FAB_INNER_PX4_CLASS}>
            <FloatingActionButton
              aria-label="Item toevoegen"
              className="pointer-events-auto"
              onClick={handleOpenNewItemModal}
            />
          </div>
        </div>
      ) : null}
    </>
  );

  const listModals = (
    <>
      <NewItemModal
        open={isNewItemOpen || editingItem != null}
        onClose={() => {
          setIsNewItemOpen(false);
          setEditingItem(null);
          setInitialSection(null);
        }}
        onAdd={handleAddNewItem}
        editingItem={editingItem}
        onSave={handleSaveEditedItem}
        initialSection={initialSection}
        storedRecipes={savedRecipes}
        onSaveRecipeToLibrary={handleSaveRecipeToLibrary}
        onApplyRecipeToList={handleAddItemsFromRecipe}
        isMasterList={isMasterList}
      />

      <ShareListModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        urlReady={Boolean(listData?.shareToken && shareUrl)}
      />

      <input
        ref={loyaltyCardPhotoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          setLoyaltyDecodeError(null);
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const result = await decodeLoyaltyCard(dataUrl);
            if (!result.ok) {
              setLoyaltyDecodeError(result.error);
              return;
            }
            setLoyaltyDecodeResult(result);
            setLoyaltyCardScanResultOpen(true);
          };
          reader.readAsDataURL(file);
        }}
      />

      <SlideInModal
        open={loyaltyCardSlideOpen}
        onClose={() => setLoyaltyCardSlideOpen(false)}
        title="Klantenkaart koppelen"
        titleId="loyalty-card-slide-title"
        disableEscapeClose={loyaltyCardScanResultOpen || loyaltyCameraScanOpen}
        footer={
          loyaltyDecodeError ? (
            <p className="text-center text-xs text-[var(--color-error,#ef4444)]">
              {loyaltyDecodeError}
            </p>
          ) : null
        }
      >
        <div className="flex w-full flex-col gap-4 px-4">
          <button
            type="button"
            onClick={() => {
              setLoyaltyDecodeError(null);
              setLoyaltyCameraScanOpen(true);
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Scan met camera"
              subtitle="Richt je camera op de code"
              icon={
                <span
                  role="img"
                  aria-label="Camera"
                  className="inline-block size-10 shrink-0 bg-[var(--action-primary)]"
                  style={{
                    WebkitMaskImage: 'url("/icons/camera.svg")',
                    maskImage: 'url("/icons/camera.svg")',
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                />
              }
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setLoyaltyDecodeError(null);
              loyaltyCardPhotoInputRef.current?.click();
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Screenshot toevoegen"
              subtitle="Upload een afbeelding"
              icon={
                <span
                  role="img"
                  aria-label="QR-code"
                  className="inline-block size-10 shrink-0 bg-[var(--action-primary)]"
                  style={{
                    WebkitMaskImage: 'url("/icons/qr.svg")',
                    maskImage: 'url("/icons/qr.svg")',
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                />
              }
            />
          </button>
        </div>
      </SlideInModal>

      <CameraBarcodeScannerSlideIn
        open={loyaltyCameraScanOpen}
        onClose={() => setLoyaltyCameraScanOpen(false)}
        onDecoded={(result) => {
          setLoyaltyCameraScanOpen(false);
          setLoyaltyDecodeResult(result);
          setLoyaltyCardScanResultOpen(true);
        }}
      />

      <SlideInModal
        open={loyaltyCardViewSlideOpen}
        onClose={() => setLoyaltyCardViewSlideOpen(false)}
        title="Klantenkaart"
        titleId="loyalty-card-view-slide-title"
        disableEscapeClose={loyaltyCardScanResultOpen || loyaltyCameraScanOpen}
        footer={
          <div className="flex w-full flex-col items-center gap-3">
            {loyaltyDecodeError ? (
              <p className="text-center text-xs text-[var(--color-error,#ef4444)]">
                {loyaltyDecodeError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setLoyaltyDecodeError(null);
                setLoyaltySlot(loyaltyViewSlot);
                setLoyaltyCameraScanOpen(true);
              }}
            >
              Scan met camera
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setLoyaltyDecodeError(null);
                setLoyaltySlot(loyaltyViewSlot);
                loyaltyCardPhotoInputRef.current?.click();
              }}
            >
              Screenshot opladen
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-6 px-4">
          {(() => {
            const cardForView =
              isLidlDelhaizeList && loyaltyViewSlot === "lidl"
                ? existingLoyaltyCardSecondary
                : existingLoyaltyCard;
            const viewLogoSrc = isLidlDelhaizeList
              ? loyaltyViewSlot === "lidl"
                ? LOYALTY_COMBO_SECONDARY_LOGO_SRC
                : LOYALTY_COMBO_PRIMARY_LOGO_SRC
              : masterStoreLabelFromListIcon(masterIcon)
                ? masterIcon
                : "";
            return cardForView ? (
              <>
                <div className="flex items-center justify-center rounded-xl bg-white p-4 shadow-sm">
                  <LoyaltyCardDisplay
                    codeType={cardForView.codeType as "qr" | "barcode"}
                    codeFormat={cardForView.codeFormat}
                    rawValue={cardForView.rawValue}
                  />
                </div>
                {viewLogoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
                  <img
                    src={viewLogoSrc}
                    alt=""
                    width={64}
                    height={64}
                    className="pointer-events-none size-16 shrink-0 object-contain"
                  />
                ) : null}
              </>
            ) : null;
          })()}
        </div>
      </SlideInModal>

      <LoyaltyCardScanResultSlideIn
        open={loyaltyCardScanResultOpen}
        onClose={() => setLoyaltyCardScanResultOpen(false)}
        onBack={() => setLoyaltyCardScanResultOpen(false)}
        decodeResult={loyaltyDecodeResult}
        saving={loyaltySaving}
        onSave={async () => {
          if (!loyaltyDecodeResult || !listId) return;
          setLoyaltySaving(true);
          try {
            const cardId = iid();
            const linkSecondary =
              isLidlDelhaizeList && loyaltySlot === "lidl";
            const existingForSlot = linkSecondary
              ? existingLoyaltyCardSecondary
              : existingLoyaltyCard;
            await db.transact([
              ...(existingForSlot
                ? [db.tx.loyaltyCards[existingForSlot.id].delete()]
                : []),
              db.tx.loyaltyCards[cardId].update({
                codeType: loyaltyDecodeResult.codeType,
                codeFormat: loyaltyDecodeResult.codeFormat,
                rawValue: loyaltyDecodeResult.rawValue,
                cardName: listData?.name ?? "",
                createdAtIso: new Date().toISOString(),
              }),
              linkSecondary
                ? db.tx.lists[listId].link({ loyaltyCardSecondary: cardId })
                : db.tx.lists[listId].link({ loyaltyCard: cardId }),
            ]);
            setLoyaltyCardScanResultOpen(false);
            setLoyaltyCardSlideOpen(false);
            setLoyaltyCardViewSlideOpen(false);
          } finally {
            setLoyaltySaving(false);
          }
        }}
      />
    </>
  );

  const listDetailRoot = (
    <div className="relative w-full min-h-dvh">
      {listAppHeader}
      {listMain}
      {listBottomChrome}
      {listModals}
    </div>
  );

  if (showLoyaltySwipe) {
    return (
      <>
        <LoyaltyCardSwipeShell
          appHeader={listAppHeader}
          bottomChrome={listBottomChrome}
          loyaltyPanes={loyaltySwipePanes}
          onPanelChange={setLoyaltyPanel}
        >
          {listMain}
        </LoyaltyCardSwipeShell>
        {listModals}
      </>
    );
  }

  return listDetailRoot;
}
