"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { MASTER_STORE_OPTIONS } from "@/lib/master-stores";
import { defaultNewListName } from "@/lib/list-default-name";
import { listIsMasterTemplate } from "@/lib/list-master";
import { SwipeToAdd } from "@/components/ui/swipe_to_add";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { useItemPhotoUrl } from "@/lib/item-photos";
import {
  categoryHeadingDisplay,
  orderedCategorySectionTitles,
  resolveItemCategoryFromName,
} from "@/lib/item-ingredient-category";
import { pickListProductIconForNewList } from "@/lib/list-product-icons";

type TemplateItem = {
  id: string;
  name: string;
  quantity: string;
  section: string;
  recipeGroupId?: string;
  recipeName?: string;
  recipeLink?: string;
};

type MasterLoyaltySnapshot = {
  codeType: string;
  codeFormat: string;
  rawValue: string;
  cardName: string;
};

type MasterList = {
  id: string;
  name: string;
  icon: string;
  items: TemplateItem[];
  order: number;
  /** Gekopieerd naar het nieuwe lijstje wanneer aanwezig op de master. */
  loyaltyCard: MasterLoyaltySnapshot | null;
  /** Tweede slot (Lidl) bij combi Lidl/Delhaize-master. */
  loyaltyCardSecondary: MasterLoyaltySnapshot | null;
};

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20.13 6.43411C20.321 6.62511 20.321 6.94211 20.13 7.13311L9.14999 18.1161C9.05399 18.2111 8.92799 18.2591 8.80299 18.2591C8.67599 18.2591 8.54999 18.2111 8.45399 18.1161L3.86999 13.5301C3.67899 13.3401 3.67899 13.0231 3.86999 12.8321C4.06099 12.6411 4.37699 12.6411 4.56799 12.8321L8.80299 17.0671L19.432 6.43411C19.623 6.24211 19.939 6.24211 20.13 6.43411Z"
        fill="currentColor"
      />
    </svg>
  );
}

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

function MinusCircleIcon({ className }: { className?: string }) {
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
      <g transform="translate(2.47 2.47)">
        <path
          fill="currentColor"
          d="M10.05,10.05h-3.08c-.29,0-.52-.23-.52-.52s.23-.52.52-.52h3.08M10.05,9.01h2.04c.29,0,.52.23.52.52s-.23.52-.52.52h-2.04M19.06,9.53c0,5.26-4.27,9.53-9.53,9.53S0,14.78,0,9.53,4.27,0,9.53,0s9.53,4.28,9.53,9.53ZM18.02,9.53c0-4.68-3.81-8.49-8.49-8.49S1.04,4.85,1.04,9.53s3.81,8.49,8.49,8.49,8.49-3.81,8.49-8.49Z"
        />
      </g>
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
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

function StoreLogoSmall({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={16}
      height={16}
      className="size-4 object-contain"
      aria-hidden
    />
  );
}

function SelectableItemCard({
  item,
  addedQuantity,
  displayQuantity,
  photoUrl,
  onAdd,
  onIncrement,
  onDecrement,
  onCancelAdd,
}: {
  item: TemplateItem;
  addedQuantity: number | null;
  displayQuantity: string;
  photoUrl?: string | null;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onCancelAdd: () => void;
}) {
  const isAdded = addedQuantity != null;
  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-md border py-3 pl-4 pr-3 text-left",
        isAdded
          ? "border-[var(--blue-500)] bg-[var(--blue-400)]"
          : "border-[var(--gray-100)] bg-[var(--white)]",
      )}
    >
      {isAdded ? (
        <>
          <button
            type="button"
            onClick={addedQuantity === 1 ? onCancelAdd : onDecrement}
            className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--white)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--blue-400)]"
            aria-label={
              addedQuantity === 1
                ? `Verwijder "${item.name}" uit selectie`
                : `Verminder hoeveelheid voor "${item.name}"`
            }
          >
            {addedQuantity === 1 ? (
              <TrashIcon className="size-6 shrink-0" />
            ) : (
              <MinusCircleIcon className="size-6 shrink-0" />
            )}
          </button>
          <span className="relative flex h-11 w-0 shrink-0 items-center justify-center">
            <span className="absolute left-1/2 top-0 h-11 w-px -translate-x-1/2 bg-[var(--white)]/30" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-center text-base font-medium leading-24 tracking-normal text-[var(--white)]">
              {item.name}
            </p>
            <p className="text-center text-sm font-normal leading-20 tracking-normal text-[var(--white)]">
              {displayQuantity}
            </p>
          </div>
          <span className="relative flex h-11 w-0 shrink-0 items-center justify-center">
            <span className="absolute left-1/2 top-0 h-11 w-px -translate-x-1/2 bg-[var(--white)]/30" />
          </span>
          <button
            type="button"
            onClick={onIncrement}
            className="flex size-8 shrink-0 items-center justify-center rounded-pill p-1 text-[var(--white)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--blue-400)]"
            aria-label={`Verhoog hoeveelheid voor "${item.name}"`}
          >
            <PlusCircleIcon className="size-6 shrink-0" />
          </button>
        </>
      ) : (
        <>
          {photoUrl && (
            <Image
              src={photoUrl}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-[4px] object-contain"
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium leading-24 tracking-normal text-text-primary">
              {item.name}
            </p>
            <p className="text-sm font-normal leading-20 tracking-normal text-[var(--text-tertiary)]">
              {displayQuantity}
            </p>
          </div>
          <span className="relative flex h-11 w-0 shrink-0 items-center justify-center">
            <span className="absolute left-1/2 top-0 h-11 w-px -translate-x-1/2 bg-[var(--gray-100)]" />
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="flex shrink-0 items-center rounded-pill p-1 text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            aria-label={`Voeg "${item.name}" toe`}
          >
            <PlusCircleIcon className="size-6 shrink-0" />
          </button>
        </>
      )}
    </div>
  );
}

export default function SelecteerMasterItemsPage() {
  const router = useRouter();
  const params = useParams<{ masterId: string }>();
  const searchParams = useSearchParams();
  const listName =
    (searchParams.get("naam") ?? "").trim() || defaultNewListName();
  const masterId = decodeURIComponent(String(params.masterId ?? ""));

  const { isLoading: authLoading, user } = db.useAuth();
  const getPhotoUrl = useItemPhotoUrl();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, error, data } = db.useQuery({
    lists: {
      items: {},
      loyaltyCard: {},
      loyaltyCardSecondary: {},
      $: { where: { ownerId } },
    },
  });

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const masterList: MasterList | null = React.useMemo(() => {
    const rawLists = (data?.lists ?? []) as any[];
    const found = rawLists.find(
      (l) =>
        String(l?.id ?? "") === masterId && listIsMasterTemplate(l as any),
    );
    if (!found) return null;
    const items = (found.items ?? [])
      .filter(
        (i: any) =>
          typeof i?.id === "string" &&
          typeof i?.name === "string" &&
          typeof i?.quantity === "string" &&
          typeof i?.section === "string",
      )
      .map((i: any) => ({
        id: String(i.id),
        name: String(i.name),
        quantity: String(i.quantity),
        section: String(i.section),
        recipeGroupId:
          typeof i.recipeGroupId === "string" ? i.recipeGroupId : undefined,
        recipeName: typeof i.recipeName === "string" ? i.recipeName : undefined,
        recipeLink: typeof i.recipeLink === "string" ? i.recipeLink : undefined,
      }));
    const lc = (found as { loyaltyCard?: unknown }).loyaltyCard as
      | Record<string, unknown>
      | null
      | undefined;
    let loyaltyCard: MasterLoyaltySnapshot | null = null;
    if (
      lc &&
      typeof lc.codeType === "string" &&
      typeof lc.rawValue === "string" &&
      lc.rawValue.length > 0
    ) {
      loyaltyCard = {
        codeType: lc.codeType,
        codeFormat: typeof lc.codeFormat === "string" ? lc.codeFormat : "",
        rawValue: lc.rawValue,
        cardName:
          typeof lc.cardName === "string" && lc.cardName.trim().length > 0
            ? lc.cardName
            : String(found.name ?? "Master lijstje"),
      };
    }

    const lc2 = (found as { loyaltyCardSecondary?: unknown })
      .loyaltyCardSecondary as Record<string, unknown> | null | undefined;
    let loyaltyCardSecondary: MasterLoyaltySnapshot | null = null;
    if (
      lc2 &&
      typeof lc2.codeType === "string" &&
      typeof lc2.rawValue === "string" &&
      lc2.rawValue.length > 0
    ) {
      loyaltyCardSecondary = {
        codeType: lc2.codeType,
        codeFormat: typeof lc2.codeFormat === "string" ? lc2.codeFormat : "",
        rawValue: lc2.rawValue,
        cardName:
          typeof lc2.cardName === "string" && lc2.cardName.trim().length > 0
            ? lc2.cardName
            : String(found.name ?? "Master lijstje"),
      };
    }

    return {
      id: String(found.id),
      name: String(found.name ?? "Master lijstje"),
      icon: String(found.icon),
      items,
      order: typeof found.order === "number" ? found.order : 0,
      loyaltyCard,
      loyaltyCardSecondary,
    };
  }, [data?.lists, masterId]);

  const [selectedQuantitiesById, setSelectedQuantitiesById] = React.useState<
    Record<string, number>
  >({});
  const [hiddenItemIds, setHiddenItemIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [removingItemIds, setRemovingItemIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const hideTimeoutRef = React.useRef<Record<string, number>>({});
  const REMOVE_ANIM_MS = 300;
  const ADDED_STATE_MS = 1000;

  const clearHideTimer = React.useCallback((itemId: string) => {
    const t = hideTimeoutRef.current[itemId];
    if (t) {
      window.clearTimeout(t);
      delete hideTimeoutRef.current[itemId];
    }
  }, []);

  React.useEffect(() => {
    return () => {
      Object.values(hideTimeoutRef.current).forEach((t) => window.clearTimeout(t));
      hideTimeoutRef.current = {};
    };
  }, []);

  const parseQuantity = React.useCallback((raw: string) => {
    const match = raw.trim().match(/^(\d+)\s*(.*)$/);
    if (!match) {
      return { amount: 1, unit: raw.trim() };
    }
    return {
      amount: Number(match[1]),
      unit: match[2].trim(),
    };
  }, []);

  const formatQuantity = React.useCallback((amount: number, unit: string) => {
    const normalizedUnit =
      unit === "stuk" || unit === "stuks"
        ? amount === 1
          ? "stuk"
          : "stuks"
        : unit;
    return normalizedUnit ? `${amount} ${normalizedUnit}` : String(amount);
  }, []);

  const getStep = React.useCallback((amount: number) => {
    if (amount <= 0) return 1;
    if (amount % 100 === 0) return 100;
    if (amount % 10 === 0) return 10;
    return 1;
  }, []);

  const scheduleHide = React.useCallback(
    (itemId: string) => {
      clearHideTimer(itemId);
      hideTimeoutRef.current[itemId] = window.setTimeout(() => {
        setRemovingItemIds((prev) => {
          const next = new Set(prev);
          next.add(itemId);
          return next;
        });
        window.setTimeout(() => {
          setHiddenItemIds((prev) => {
            const next = new Set(prev);
            next.add(itemId);
            return next;
          });
          setRemovingItemIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }, REMOVE_ANIM_MS);
      }, ADDED_STATE_MS);
    },
    [clearHideTimer],
  );

  const restoreOriginalState = React.useCallback(
    (itemId: string) => {
      clearHideTimer(itemId);
      setRemovingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setHiddenItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setSelectedQuantitiesById((prev) => {
        if (prev[itemId] == null) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    },
    [clearHideTimer],
  );

  const storeLabel = React.useMemo(() => {
    if (!masterList) return "";
    const logoFile = masterList.icon.split("/").pop() ?? "";
    const store = MASTER_STORE_OPTIONS.find(
      (s) => (s.logoSrc.split("/").pop() ?? "") === logoFile,
    );
    return store?.label ?? "Winkel";
  }, [masterList]);

  const visibleSections = React.useMemo(() => {
    if (!masterList) return [] as { title: string; items: TemplateItem[] }[];
    const grouped = new Map<string, TemplateItem[]>();
    for (const item of masterList.items) {
      if (hiddenItemIds.has(item.id)) continue;
      const category = resolveItemCategoryFromName(item.name);
      const existing = grouped.get(category) ?? [];
      existing.push(item);
      grouped.set(category, existing);
    }
    const orderedTitles = orderedCategorySectionTitles(Array.from(grouped.keys()));
    return orderedTitles.map((title) => ({
      title,
      items: grouped.get(title) ?? [],
    }));
  }, [masterList, hiddenItemIds]);

  const handleAdd = React.useCallback(
    (item: TemplateItem) => {
      if (hiddenItemIds.has(item.id) || removingItemIds.has(item.id)) return;
      const base = parseQuantity(item.quantity).amount;
      setSelectedQuantitiesById((prev) => ({
        ...prev,
        [item.id]: prev[item.id] ?? base,
      }));
      scheduleHide(item.id);
    },
    [hiddenItemIds, parseQuantity, removingItemIds, scheduleHide],
  );

  const handleIncrement = React.useCallback(
    (item: TemplateItem) => {
      const current = selectedQuantitiesById[item.id];
      if (current == null) return;
      const next = current + getStep(current);
      setSelectedQuantitiesById((prev) => ({ ...prev, [item.id]: next }));
      scheduleHide(item.id);
    },
    [getStep, scheduleHide, selectedQuantitiesById],
  );

  const handleDecrement = React.useCallback(
    (item: TemplateItem) => {
      const current = selectedQuantitiesById[item.id];
      if (current == null) return;
      const step = getStep(current);
      const next = Math.max(1, current - step);
      setSelectedQuantitiesById((prev) => ({ ...prev, [item.id]: next }));
      scheduleHide(item.id);
    },
    [getStep, scheduleHide, selectedQuantitiesById],
  );

  const handleDone = React.useCallback(() => {
    if (!user || !masterList) return;
    const selectedItems = masterList.items
      .map((i) => ({
        ...i,
        selectedAmount: selectedQuantitiesById[i.id] ?? null,
      }))
      .filter((i) => i.selectedAmount != null);
    if (selectedItems.length === 0) return;

    const myLists = (data?.lists ?? []) as any[];
    const now = new Date();
    const newId = iid();
    const icon = pickListProductIconForNewList(myLists);
    const order =
      myLists.length > 0
        ? Math.min(
            ...(myLists.map((l) => (typeof l?.order === "number" ? l.order : 0)) as number[]),
          ) - 1
        : 0;

    const txns: Parameters<typeof db.transact>[0] = [
      db.tx.lists[newId].update({
        name: listName,
        date: now.toLocaleDateString("nl-NL"),
        icon,
        masterIcon: masterList.icon,
        /** Zelfde categorievolgorde als deze master bij «per categorie». */
        sourceMasterListId: String(masterList.id),
        order,
        ownerId: user.id,
        isMasterTemplate: false,
      }),
      ...selectedItems.map((item, index) =>
        db.tx.items[iid()]
          .update({
            name: item.name,
            quantity: formatQuantity(
              item.selectedAmount ?? parseQuantity(item.quantity).amount,
              parseQuantity(item.quantity).unit,
            ),
            checked: false,
            section: item.section,
            itemCategory: resolveItemCategoryFromName(item.name),
            order: index,
            recipeGroupId: item.recipeGroupId ?? "",
            recipeName: item.recipeName ?? "",
            recipeLink: item.recipeLink ?? "",
          })
          .link({ list: newId }),
      ),
    ];

    if (masterList.loyaltyCard) {
      const cardId = iid();
      const lc = masterList.loyaltyCard;
      txns.push(
        db.tx.loyaltyCards[cardId].update({
          codeType: lc.codeType,
          codeFormat: lc.codeFormat,
          rawValue: lc.rawValue,
          cardName: lc.cardName,
          createdAtIso: now.toISOString(),
        }),
        db.tx.lists[newId].link({ loyaltyCard: cardId }),
      );
    }

    if (masterList.loyaltyCardSecondary) {
      const cardId2 = iid();
      const lc2 = masterList.loyaltyCardSecondary;
      txns.push(
        db.tx.loyaltyCards[cardId2].update({
          codeType: lc2.codeType,
          codeFormat: lc2.codeFormat,
          rawValue: lc2.rawValue,
          cardName: lc2.cardName,
          createdAtIso: now.toISOString(),
        }),
        db.tx.lists[newId].link({ loyaltyCardSecondary: cardId2 }),
      );
    }

    db.transact(txns);
    router.push(`/lijstje/${newId}`);
  }, [
    data?.lists,
    formatQuantity,
    listName,
    masterList,
    parseQuantity,
    router,
    selectedQuantitiesById,
    user,
  ]);

  if (authLoading || !user || isLoading) {
    return <PageSpinner />;
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

  if (!masterList) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-base text-text-secondary">
          Masterlijst niet gevonden.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-gradient-to-b from-[#e3e4ff] to-[var(--white)]">
      <header className="relative z-[1] flex h-16 shrink-0 bg-[var(--white)] px-4">
        <div className="mx-auto flex w-full max-w-[956px] items-center gap-4">
          <Link
            href={`/nieuw-lijstje/selecteer-master-lijstje?naam=${encodeURIComponent(listName)}`}
            aria-label="Terug naar masterlijsten"
            className="relative z-[1] flex !min-w-0 !w-10 size-10 shrink-0 items-center justify-center p-0 text-[var(--blue-500)] hover:bg-[var(--blue-25)] hover:text-[var(--blue-600)] focus-visible:ring-2 focus-visible:ring-border-focus rounded-md"
          >
            <BackArrowIcon className="size-6 shrink-0" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-medium leading-24 tracking-normal text-text-primary">
            {listName}
          </h1>
          <span className="size-10 shrink-0" aria-hidden />
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8">
        <div className="relative mx-auto flex w-full max-w-[956px] flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-page-title font-bold leading-32 tracking-normal text-text-primary">
                {listName}
              </h2>
              <div className="mt-0.5 flex min-w-0 items-center gap-1">
                <StoreLogoSmall src={masterList.icon} />
                <p className="truncate text-xs font-normal leading-16 tracking-normal text-[var(--text-tertiary)]">
                  {storeLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDone}
              disabled={Object.keys(selectedQuantitiesById).length === 0}
              className={cn(
                "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-sm leading-20 tracking-normal",
                Object.keys(selectedQuantitiesById).length > 0
                  ? "bg-action-primary text-[var(--white)]"
                  : "bg-[var(--blue-25)] text-[var(--blue-300)]",
              )}
            >
              <CheckIcon className="size-6 shrink-0" />
              Gereed
            </button>
          </div>

          <p className="text-base font-light leading-24 tracking-normal text-text-primary">
            Selecteer hieronder de items uit het master lijstje die je wil
            toevoegen aan je weeklijstje.
          </p>

          <div className="flex w-full flex-col gap-6">
            {visibleSections.map((section) => (
              <section key={section.title} className="flex flex-col gap-3">
                <h3 className="text-xs font-medium uppercase tracking-normal text-[var(--blue-900)]">
                  {categoryHeadingDisplay(section.title)}
                </h3>
                <div className="flex w-full flex-col gap-3">
                  {section.items.map((item) => {
                    const isRemoving = removingItemIds.has(item.id);
                    const qty = selectedQuantitiesById[item.id] ?? null;
                    const parsed = parseQuantity(item.quantity);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                          isRemoving ? "max-h-0 opacity-0 mb-0" : "max-h-[200px] opacity-100",
                        )}
                      >
                        <SwipeToDelete
                          onDelete={() => restoreOriginalState(item.id)}
                          disabled={qty == null}
                          deleteActionLabel={`Veeg naar links om "${item.name}" te verwijderen`}
                        >
                          <SwipeToAdd
                            onAdd={() => handleAdd(item)}
                            disabled={qty != null}
                            addActionLabel={`Veeg naar rechts om "${item.name}" toe te voegen`}
                          >
                            <SelectableItemCard
                              item={item}
                              addedQuantity={qty}
                              displayQuantity={
                                qty == null
                                  ? item.quantity
                                  : formatQuantity(qty, parsed.unit)
                              }
                              photoUrl={getPhotoUrl(item.name)}
                              onAdd={() => handleAdd(item)}
                              onIncrement={() => handleIncrement(item)}
                              onDecrement={() => handleDecrement(item)}
                              onCancelAdd={() => restoreOriginalState(item.id)}
                            />
                          </SwipeToAdd>
                        </SwipeToDelete>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="flex w-full justify-center pb-2 pt-1">
            <Button
              type="button"
              variant="primary"
              onClick={handleDone}
              disabled={Object.keys(selectedQuantitiesById).length === 0}
            >
              Gereed
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
