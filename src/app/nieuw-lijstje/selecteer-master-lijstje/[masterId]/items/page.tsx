"use client";

import * as React from "react";
import { isoToListDate } from "@/lib/list-date";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { CategoryCard } from "@/components/ui/category_card";
import { CountStepper } from "@/components/ui/count_stepper";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import {
  MASTER_STORE_OPTIONS,
  listIconIsLidlDelhaizeCombo,
  masterStoreLabelFromListIcon,
} from "@/lib/master-stores";
import { defaultNewListName } from "@/lib/list-default-name";
import { listIsMasterTemplate } from "@/lib/list-master";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { getVisibleShoppingOwnerIds } from "@/lib/shopping-share";
import {
  categoryHeadingDisplay,
  groupMeatSubtypes,
  orderedCategorySectionTitles,
  resolveItemCategoryFromName,
} from "@/lib/item-ingredient-category";
import { pickListProductIconForNewList } from "@/lib/list-product-icons";
import { DoneButton } from "@/components/ui/title_edit_button";
import { ListSuggestions, type Suggestion } from "@/app/lijstje/[id]/list_suggestions";
import { categoryColor } from "@/app/lijstje/[id]/list_cards_view";

type TemplateItem = {
  id: string;
  name: string;
  quantity: string;
  section: string;
  order?: number;
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

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  store?: string | null;
  ownerId?: string | null;
  order?: number | null;
};

type PrevListItem = {
  id: string;
  name: string;
  quantity: string;
  section: string;
};

type ProfileRow = {
  instantUserId?: string | null;
  firstName?: string | null;
  avatarUrl?: string | null;
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

function StoreLogoSmall({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG/PNG uit /public: stabiel op iOS
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      className="size-4 object-contain"
      aria-hidden
      decoding="async"
    />
  );
}

/** Bij 0 een zachte plus; daarna de gedeelde lijst-stepper (design system). */
function CountControl({
  name,
  count,
  onAdd,
  onChange,
}: {
  name: string;
  count: number;
  onAdd: () => void;
  onChange: (next: number) => void;
}) {
  if (count === 0) {
    return (
      <RoundIconButton tone="primary" size={32} onClick={onAdd} aria-label={`Voeg "${name}" toe`}>
        {RoundIcons.plus}
      </RoundIconButton>
    );
  }
  return <CountStepper name={name} value={count} onChange={onChange} />;
}

function FavoriteRow({
  item,
  count,
  displayQuantity,
  photoUrl,
  first,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  item: TemplateItem;
  count: number;
  displayQuantity: string;
  photoUrl?: string | null;
  first: boolean;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const added = count > 0;
  return (
    <li className={cn("flex items-center gap-3 px-1 py-[9px]", !first && "border-t border-[var(--border-subtle)]")}>
      <span
        className={cn(
          "flex size-[42px] shrink-0 items-center justify-center rounded-[12px] transition-colors",
          added ? "bg-[var(--blue-25)]" : "bg-[var(--gray-25)]",
        )}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokale item-webp
          <img src={photoUrl} alt="" width={34} height={34} className="size-[34px] object-contain" aria-hidden decoding="async" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1 leading-[19px]">
        <span className={cn("block truncate text-[15px] text-text-primary", added ? "font-semibold" : "font-medium")}>
          {item.name}
        </span>
        <span className={cn("block truncate text-[13px]", added ? "font-semibold text-[var(--blue-500)]" : "text-[var(--text-tertiary)]")}>
          {displayQuantity}
        </span>
      </span>
      <CountControl
        name={item.name}
        count={count}
        onAdd={onAdd}
        onChange={(next) => (next > count ? onIncrement() : onDecrement())}
      />
    </li>
  );
}

export default function SelecteerMasterItemsPage() {
  const router = useRouter();
  const params = useParams<{ masterId: string }>();
  const searchParams = useSearchParams();
  const listName =
    (searchParams.get("naam") ?? "").trim() || defaultNewListName();
  /** Geplande winkeldag (ISO) uit de startpagina; standaard vandaag. */
  const plannedDateIso = (searchParams.get("datum") ?? "").trim();
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
    shoppingItems: {},
    shoppingShares: {
      memberships: {},
      $: { where: { ownerId } },
    },
    shoppingShareMembers: {
      shoppingShare: { memberships: {} },
      $: { where: { instantUserId: ownerId } },
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
        order: typeof i.order === "number" ? i.order : undefined,
        recipeGroupId:
          typeof i.recipeGroupId === "string" ? i.recipeGroupId : undefined,
        recipeName: typeof i.recipeName === "string" ? i.recipeName : undefined,
        recipeLink: typeof i.recipeLink === "string" ? i.recipeLink : undefined,
      }))
      .sort((a: TemplateItem, b: TemplateItem) => (a.order ?? 0) - (b.order ?? 0));
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
            : String(found.name ?? "Favorieten lijstje"),
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
            : String(found.name ?? "Favorieten lijstje"),
      };
    }

    return {
      id: String(found.id),
      name: String(found.name ?? "Favorieten lijstje"),
      icon: String(found.icon),
      items,
      order: typeof found.order === "number" ? found.order : 0,
      loyaltyCard,
      loyaltyCardSecondary,
    };
  }, [data?.lists, masterId]);

  /** Aantal keer dat een favoriet op het lijstje komt (canvas «favorieten 1b: aantallen»). */
  const [countsById, setCountsById] = React.useState<Record<string, number>>({});
  const [selectedTeKopenItemIds, setSelectedTeKopenItemIds] = React.useState<
    Set<string>
  >(() => new Set());
  const [hiddenTeKopenItemIds, setHiddenTeKopenItemIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [selectedPrevItemIds, setSelectedPrevItemIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [hiddenPrevItemIds, setHiddenPrevItemIds] = React.useState<Set<string>>(
    () => new Set(),
  );

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

  /** «3 stuk» × 2 → «6 stuks»; bij één keer blijft de hoeveelheid van de favoriet staan. */
  const quantityForCount = React.useCallback(
    (raw: string, count: number) => {
      if (count <= 1) return raw;
      const { amount, unit } = parseQuantity(raw);
      return formatQuantity(amount * count, unit);
    },
    [formatQuantity, parseQuantity],
  );

  const storeLabel = React.useMemo(() => {
    if (!masterList) return "";
    const logoFile = masterList.icon.split("/").pop() ?? "";
    const store = MASTER_STORE_OPTIONS.find(
      (s) => (s.logoSrc.split("/").pop() ?? "") === logoFile,
    );
    return store?.label ?? "Winkel";
  }, [masterList]);

  const teKopenStoreLabels = React.useMemo(() => {
    if (!masterList) return [] as string[];
    if (listIconIsLidlDelhaizeCombo(masterList.icon)) {
      return ["Lidl", "Delhaize", "Lidl / Delhaize"];
    }
    const label = masterStoreLabelFromListIcon(masterList.icon);
    return label ? [label] : [];
  }, [masterList]);

  const visibleShoppingOwnerIds = React.useMemo(() => {
    if (!user?.id) return new Set<string>();
    return getVisibleShoppingOwnerIds({
      userId: user.id,
      ownedShares: (data as { shoppingShares?: unknown[] } | undefined)
        ?.shoppingShares as Parameters<typeof getVisibleShoppingOwnerIds>[0]["ownedShares"],
      joinedMemberships: (data as { shoppingShareMembers?: unknown[] } | undefined)
        ?.shoppingShareMembers as Parameters<typeof getVisibleShoppingOwnerIds>[0]["joinedMemberships"],
    });
  }, [data, user?.id]);

  const otherShoppingOwnerIds = React.useMemo(() => {
    if (!user?.id) return [] as string[];
    return Array.from(visibleShoppingOwnerIds).filter((id) => id !== user.id);
  }, [user?.id, visibleShoppingOwnerIds]);

  const { data: shoppingProfilesData } = db.useQuery(
    !authLoading && user
      ? {
          profiles: {
            $: {
              where:
                otherShoppingOwnerIds.length > 0
                  ? {
                      or: otherShoppingOwnerIds.map((id) => ({
                        instantUserId: id,
                      })),
                    }
                  : { instantUserId: "__master_te_kopen_profiles_none__" },
            },
          },
        }
      : null,
  );

  const shoppingFirstNameByUserId = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of (shoppingProfilesData?.profiles ?? []) as ProfileRow[]) {
      const uid = p.instantUserId;
      const firstName = p.firstName?.trim();
      if (uid && firstName) m.set(uid, firstName);
    }
    return m;
  }, [shoppingProfilesData?.profiles]);

  const teKopenItems = React.useMemo(() => {
    if (teKopenStoreLabels.length === 0) return [] as ShoppingItem[];
    const allowedStores = new Set(teKopenStoreLabels);
    return ((data?.shoppingItems ?? []) as ShoppingItem[])
      .filter(
        (item) =>
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.quantity === "string" &&
          typeof item.ownerId === "string" &&
          visibleShoppingOwnerIds.has(item.ownerId) &&
          typeof item.store === "string" &&
          allowedStores.has(item.store) &&
          !hiddenTeKopenItemIds.has(item.id),
      )
      .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  }, [
    data?.shoppingItems,
    hiddenTeKopenItemIds,
    teKopenStoreLabels,
    visibleShoppingOwnerIds,
  ]);

  const prevList = React.useMemo(() => {
    if (!masterId) return null;
    const rawLists = (data?.lists ?? []) as any[];
    const candidates = rawLists.filter(
      (l: any) =>
        String(l?.sourceMasterListId ?? "") === masterId &&
        !listIsMasterTemplate(l as any),
    );
    if (candidates.length === 0) return null;
    candidates.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    return candidates[0] as any;
  }, [data?.lists, masterId]);

  const prevListItems = React.useMemo((): PrevListItem[] => {
    if (!prevList) return [];
    const teKopenNames = new Set(teKopenItems.map((i) => i.name.trim().toLowerCase()));
    const raw = (prevList.items ?? []) as any[];
    return raw
      .filter(
        (i: any) =>
          typeof i?.id === "string" &&
          typeof i?.name === "string" &&
          typeof i?.quantity === "string" &&
          i?.checked === false &&
          !hiddenPrevItemIds.has(String(i.id)) &&
          !teKopenNames.has(String(i.name).trim().toLowerCase()),
      )
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((i: any) => ({
        id: String(i.id),
        name: String(i.name),
        quantity: String(i.quantity),
        section: typeof i.section === "string" ? i.section : "Algemeen",
      }));
  }, [prevList, hiddenPrevItemIds, teKopenItems]);

  const addedPrevNames = React.useMemo(() => {
    if (!prevList || selectedPrevItemIds.size === 0) return new Set<string>();
    const raw = (prevList.items ?? []) as any[];
    const names = new Set<string>();
    for (const i of raw) {
      if (
        typeof i?.id === "string" &&
        selectedPrevItemIds.has(String(i.id)) &&
        typeof i?.name === "string"
      ) {
        names.add(String(i.name).trim().toLowerCase());
      }
    }
    return names;
  }, [prevList, selectedPrevItemIds]);

  const visibleSections = React.useMemo(() => {
    if (!masterList) return [] as { title: string; items: TemplateItem[] }[];
    const teKopenNames = new Set(
      teKopenItems.map((i) => i.name.trim().toLowerCase()),
    );
    const grouped = new Map<string, TemplateItem[]>();
    for (const item of masterList.items) {
      if (teKopenNames.has(item.name.trim().toLowerCase())) continue;
      if (addedPrevNames.has(item.name.trim().toLowerCase())) continue;
      const category = resolveItemCategoryFromName(item.name);
      const existing = grouped.get(category) ?? [];
      existing.push(item);
      grouped.set(category, existing);
    }
    const orderedTitles = orderedCategorySectionTitles(Array.from(grouped.keys()));
    return orderedTitles.map((title) => ({
      title,
      // Vlees: alle kip samen, dan kalkoen, rund, varken, … (zelfde categorie).
      items: groupMeatSubtypes(title, grouped.get(title) ?? [], (i) => i.name),
    }));
  }, [masterList, teKopenItems, addedPrevNames]);

  const selectedItemCount =
    Object.keys(countsById).length +
    selectedTeKopenItemIds.size +
    selectedPrevItemIds.size;

  const setCount = React.useCallback((itemId: string, count: number) => {
    setCountsById((prev) => {
      const next = { ...prev };
      if (count <= 0) delete next[itemId];
      else next[itemId] = count;
      return next;
    });
  }, []);

  const teKopenSuggestions = React.useMemo(
    (): Suggestion[] =>
      teKopenItems
        .filter((item) => !selectedTeKopenItemIds.has(item.id))
        .map((item) => {
          const owner = item.ownerId ?? "";
          const by =
            user?.id && owner && owner !== user.id
              ? shoppingFirstNameByUserId.get(owner) ?? "deelnemer"
              : null;
          return {
            key: `tk:${item.id}`,
            name: item.name,
            quantity: item.quantity,
            photo: getPhotoUrl(item.name) ?? null,
            meta: by ? `door ${by}` : undefined,
          };
        }),
    [getPhotoUrl, selectedTeKopenItemIds, shoppingFirstNameByUserId, teKopenItems, user?.id],
  );

  const prevSuggestions = React.useMemo(
    (): Suggestion[] =>
      prevListItems
        .filter((item) => !selectedPrevItemIds.has(item.id))
        .map((item) => ({
          key: `vl:${item.id}`,
          name: item.name,
          quantity: item.quantity,
          photo: getPhotoUrl(item.name) ?? null,
        })),
    [getPhotoUrl, prevListItems, selectedPrevItemIds],
  );

  const addToSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, ids: string[]) =>
    setter((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

  const handleSuggestionAdd = React.useCallback((s: Suggestion) => {
    const id = s.key.slice(3);
    addToSet(s.key.startsWith("tk:") ? setSelectedTeKopenItemIds : setSelectedPrevItemIds, [id]);
  }, []);

  /** Vuilbakje: enkel verbergen voor dit nieuwe lijstje, niets wordt gewist. */
  const handleSuggestionDismiss = React.useCallback((s: Suggestion) => {
    const id = s.key.slice(3);
    addToSet(s.key.startsWith("tk:") ? setHiddenTeKopenItemIds : setHiddenPrevItemIds, [id]);
  }, []);

  const handleSuggestionAddAll = React.useCallback(() => {
    addToSet(setSelectedTeKopenItemIds, teKopenSuggestions.map((s) => s.key.slice(3)));
    addToSet(setSelectedPrevItemIds, prevSuggestions.map((s) => s.key.slice(3)));
  }, [prevSuggestions, teKopenSuggestions]);

  const handleDone = React.useCallback(() => {
    if (!user || !masterList) return;
    const selectedTeKopenItems = ((data?.shoppingItems ?? []) as ShoppingItem[])
      .filter((i) => selectedTeKopenItemIds.has(i.id));
    const selectedItems = masterList.items
      .map((i) => ({
        ...i,
        count: countsById[i.id] ?? 0,
      }))
      .filter((i) => i.count > 0);
    const selectedPrevItems = prevList
      ? ((prevList.items ?? []) as any[])
          .filter((i: any) => typeof i?.id === "string" && selectedPrevItemIds.has(String(i.id)))
          .map((i: any) => ({
            name: String(i.name),
            quantity: String(i.quantity),
            section: typeof i.section === "string" ? i.section : "Algemeen",
          }))
      : [];
    if (
      selectedItems.length === 0 &&
      selectedTeKopenItems.length === 0 &&
      selectedPrevItems.length === 0
    ) return;

    const myLists = (data?.lists ?? []) as any[];
    const now = new Date();
    const newId = iid();
    const icon = pickListProductIconForNewList(myLists, listName);
    const order =
      myLists.length > 0
        ? Math.min(
            ...(myLists.map((l) => (typeof l?.order === "number" ? l.order : 0)) as number[]),
          ) - 1
        : 0;

    const txns: Parameters<typeof db.transact>[0] = [
      db.tx.lists[newId].update({
        name: listName,
        date: /^\d{4}-\d{2}-\d{2}$/.test(plannedDateIso)
          ? isoToListDate(plannedDateIso)
          : now.toLocaleDateString("nl-NL"),
        icon,
        masterIcon: masterList.icon,
        /** Zelfde categorievolgorde als deze master bij «per categorie». */
        sourceMasterListId: String(masterList.id),
        order,
        ownerId: user.id,
        isMasterTemplate: false,
      }),
      ...selectedTeKopenItems.map((item, index) =>
        db.tx.items[iid()]
          .update({
            name: item.name,
            quantity: item.quantity,
            checked: false,
            section: "Algemeen",
            itemCategory: resolveItemCategoryFromName(item.name),
            order: index,
          })
          .link({ list: newId }),
      ),
      ...selectedPrevItems.map((item, index) =>
        db.tx.items[iid()]
          .update({
            name: item.name,
            quantity: item.quantity,
            checked: false,
            section: item.section,
            itemCategory: resolveItemCategoryFromName(item.name),
            order: selectedTeKopenItems.length + index,
          })
          .link({ list: newId }),
      ),
      ...selectedItems.map((item, index) =>
        db.tx.items[iid()]
          .update({
            name: item.name,
            quantity: quantityForCount(item.quantity, item.count),
            checked: false,
            section: item.section,
            itemCategory: resolveItemCategoryFromName(item.name),
            order: selectedTeKopenItems.length + selectedPrevItems.length + index,
            recipeGroupId: item.recipeGroupId ?? "",
            recipeName: item.recipeName ?? "",
            recipeLink: item.recipeLink ?? "",
          })
          .link({ list: newId }),
      ),
      ...selectedTeKopenItems.map((item) => db.tx.shoppingItems[item.id].delete()),
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
    plannedDateIso,
    data?.shoppingItems,
    countsById,
    listName,
    masterList,
    prevList,
    quantityForCount,
    router,
    selectedPrevItemIds,
    selectedTeKopenItemIds,
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
          Favorietenlijst niet gevonden.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[var(--bg-app)]">
      <div className="fixed inset-x-0 top-0 z-20 bg-[var(--white)] pt-[env(safe-area-inset-top,0px)]">
        <header className="flex h-16 px-4">
          <div className="mx-auto flex w-full max-w-[956px] items-center gap-4">
            <Link
              href={`/nieuw-lijstje/selecteer-master-lijstje?naam=${encodeURIComponent(listName)}`}
              aria-label="Terug naar favorietenlijsten"
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
      </div>

      <div className="relative flex-1 bg-[var(--bg-app)] px-4 pb-[calc(112px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+16px+env(safe-area-inset-top,0px))] lg:pb-12">
        <div className="relative mx-auto flex w-full max-w-[956px] flex-col gap-[14px] lg:gap-[18px]">
          <div className="min-w-0">
            <h2 className="truncate text-page-title font-bold leading-32 tracking-normal text-text-primary lg:text-[34px] lg:leading-[40px]">
              {listName}
            </h2>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <StoreLogoSmall src={masterList.icon} />
              <p className="truncate text-[13px] leading-4 text-[var(--text-secondary)]">{storeLabel}</p>
            </div>
          </div>

          {teKopenSuggestions.length + prevSuggestions.length > 0 ? (
            <div className="w-full">
              <ListSuggestions
                teKopen={teKopenSuggestions}
                previous={prevSuggestions}
                previousLabel={prevList ? String(prevList.name ?? "") || null : null}
                onAdd={handleSuggestionAdd}
                onAddAll={handleSuggestionAddAll}
                onDismiss={handleSuggestionDismiss}
              />
            </div>
          ) : null}

          {/* Mobiel één kolom, desktop drie (canvas «favorieten 1b: aantallen»). */}
          <div className="lg:columns-3 lg:gap-4">
            {visibleSections.map((section) => {
              const title = categoryHeadingDisplay(section.title);
              const onList = section.items.filter((i) => (countsById[i.id] ?? 0) > 0).length;
              return (
                <CategoryCard
                  key={section.title}
                  className="mb-3 lg:mb-4"
                  rgb={categoryColor(title)}
                  title={title}
                  action={
                    onList > 0 ? (
                      <span className="shrink-0 rounded-pill bg-[var(--white)] px-[9px] py-[3px] text-xs font-bold text-[var(--blue-500)]">
                        {onList} op lijstje
                      </span>
                    ) : null
                  }
                >
                  <ul className="px-2.5 pb-1 pt-0.5">
                    {section.items.map((item, k) => {
                      const count = countsById[item.id] ?? 0;
                      return (
                        <FavoriteRow
                          key={item.id}
                          item={item}
                          count={count}
                          first={k === 0}
                          displayQuantity={quantityForCount(item.quantity, count)}
                          photoUrl={getPhotoUrl(item.name)}
                          onAdd={() => setCount(item.id, 1)}
                          onIncrement={() => setCount(item.id, count + 1)}
                          onDecrement={() => setCount(item.id, count - 1)}
                        />
                      );
                    })}
                  </ul>
                </CategoryCard>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zwevende «Gereed»-balk, zodat je niet terug naar boven hoeft te scrollen. */}
      {selectedItemCount > 0 ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 lg:hidden">
            <div aria-hidden className="h-[120px] bg-gradient-to-b from-transparent to-[var(--bg-app)] to-45%" />
            <div className="pointer-events-auto absolute inset-x-4 bottom-[calc(26px+env(safe-area-inset-bottom,0px))] flex items-center gap-3 rounded-pill bg-[var(--white)] py-[7px] pl-4 pr-[7px] shadow-[0_10px_30px_-10px_rgba(16,17,48,0.35),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[13px] font-bold tabular-nums text-[var(--blue-500)]">
                {selectedItemCount}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">
                <b className="font-semibold text-text-primary">{selectedItemCount === 1 ? "item" : "items"}</b> toegevoegd
              </span>
              <DoneButton
                onClick={handleDone}
                className="h-[42px] px-5 text-[15px] shadow-[0_6px_16px_-6px_rgba(79,85,241,0.6)]"
              />
            </div>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 hidden lg:block">
            <div className="mx-auto flex w-full max-w-[956px] justify-end">
              <div className="pointer-events-auto flex items-center gap-3 rounded-pill bg-[var(--white)] py-[7px] pl-4 pr-[7px] shadow-[0_10px_30px_-10px_rgba(16,17,48,0.28),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[13px] font-bold tabular-nums text-[var(--blue-500)]">
                  {selectedItemCount}
                </span>
                <span className="whitespace-nowrap text-sm text-[var(--text-secondary)]">
                  <b className="font-semibold text-text-primary">{selectedItemCount === 1 ? "item" : "items"}</b> toegevoegd
                </span>
                <DoneButton onClick={handleDone} className="h-[42px] px-5 text-[15px]" />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
