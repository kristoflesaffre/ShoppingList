"use client";

import * as React from "react";
import { PageBackButton } from "@/components/ui/page_back_button";
import { DoneButton, TitleEditButton } from "@/components/ui/title_edit_button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { id as instantId } from "@instantdb/react";
import { db } from "@/lib/db";
import { cn, isIPhoneDevice } from "@/lib/utils";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { Snackbar } from "@/components/ui/snackbar";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { APP_FAB_BOTTOM_NO_NAV_CLASS, APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { primeKeyboard } from "@/lib/keyboard_focus";
import { AddShoppingItemSlideIn } from "@/components/add_shopping_item_slide_in";
import {
  TE_KOPEN_STORE_OPTIONS,
  findTeKopenStoreByLabelOrSlug,
} from "@/lib/master-stores";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { MiniButton } from "@/components/ui/mini_button";
import { CategoryCard } from "@/components/ui/category_card";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { SearchBar } from "@/components/ui/search_bar";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { teKopenMonogramStyle, teKopenStoreGradient, teKopenStoreRgb } from "@/lib/te-kopen-style";
import { StoreOrderPanel, loadStoreOrder, applySavedStoreOrder } from "@/app/te-kopen/store_order_panel";
import { getVisibleShoppingOwnerIds } from "@/lib/shopping-share";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";

const ShareListModal = dynamic(
  () => import("@/components/share_list_modal").then((m) => m.ShareListModal),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  store?: string | null;
  checked: boolean;
  order: number;
  ownerId?: string | null;
};

type ShoppingShare = {
  id: string;
  ownerId?: string | null;
  shareToken?: string | null;
  memberships?: { id?: string; instantUserId?: string | null }[] | null;
};

type ProfileRow = {
  instantUserId?: string | null;
  firstName?: string | null;
  avatarUrl?: string | null;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
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

function ChevronRightIcon() {
  return (
    <span
      aria-hidden
      className="inline-block size-6 shrink-0 bg-[var(--action-primary)]"
      style={{
        WebkitMaskImage: "url(/icons/chevron.svg)",
        maskImage: "url(/icons/chevron.svg)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        transform: "rotate(-90deg)",
      }}
    />
  );
}

// ─── Winkelkaart ──────────────────────────────────────────────────────────────

type AddedBy = { firstName: string; avatarUrl?: string | null };

/** Canvas «01 · Te kopen — voorstel»: rij met foto of monogram, naam, aantal en wie het toevoegde. */
function ShoppingRow({
  item,
  isEditing,
  addedBy,
  onEdit,
  onDelete,
}: {
  item: ShoppingItem;
  isEditing: boolean;
  addedBy?: AddedBy | null;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}) {
  const getPhoto = useItemPhotoUrl(160);
  const photoSrc = getPhoto(item.name);

  const content = (
    <>
      {photoSrc ? (
        <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--gray-25)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={photoSrc} alt="" width={34} height={34} className="size-[34px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
        </span>
      ) : (
        <span
          className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold"
          style={teKopenMonogramStyle(item.name)}
          aria-hidden
        >
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-[19px]">
        <span className="block truncate text-[15px] font-medium text-text-primary first-letter:uppercase">{item.name}</span>
        <span className="flex min-w-0 items-center gap-[5px] text-[13px] text-[var(--text-tertiary)]">
          <span className="shrink-0">{item.quantity}</span>
          {addedBy ? (
            <>
              <span aria-hidden>·</span>
              <span className="flex size-[15px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--secondary-100)] text-[8px] font-bold text-[var(--secondary-800)]" aria-hidden>
                {addedBy.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- profielfoto (data-URL)
                  <img src={addedBy.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  addedBy.firstName.charAt(0).toUpperCase()
                )}
              </span>
              <span className="truncate">door {addedBy.firstName}</span>
            </>
          ) : null}
        </span>
      </span>
    </>
  );

  if (isEditing) {
    return (
      <div className="flex w-full items-center gap-3 px-1 py-[9px]">
        {content}
        <RoundIconButton tone="danger" size={28} onClick={() => onDelete(item.id)} aria-label={`${item.name} verwijderen`}>
          {RoundIcons.trash}
        </RoundIconButton>
      </div>
    );
  }

  return (
    <SwipeToDelete onDelete={() => onDelete(item.id)} deleteActionLabel={`Veeg naar links om "${item.name}" te verwijderen`}>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex w-full items-center gap-3 bg-[var(--white)] px-1 py-[9px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
      >
        {content}
      </button>
    </SwipeToDelete>
  );
}

/** Winkel als CategoryCard: logo (of bolletje voor Algemeen) · naam · aantal · plus. */
function StoreCard({
  store,
  items,
  isEditing,
  addedByFor,
  onAdd,
  onEdit,
  onDelete,
}: {
  store: string | null;
  items: ShoppingItem[];
  isEditing: boolean;
  addedByFor: (item: ShoppingItem) => AddedBy | null;
  onAdd: () => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}) {
  const storeInfo = store ? findTeKopenStoreByLabelOrSlug(store) : null;
  const rgb = teKopenStoreRgb(store);
  const title = store ?? "Algemeen";

  return (
    <CategoryCard
      className="mb-3 lg:mb-4"
      rgb={rgb}
      gradient={teKopenStoreGradient(store)}
      header={
        <>
          {storeInfo ? (
            // eslint-disable-next-line @next/next/no-img-element -- winkellogo uit /public/logos
            <img src={storeInfo.logoSrc} alt="" width={22} height={22} className="size-[22px] shrink-0 object-contain" />
          ) : (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `rgb(${rgb.join(",")})` }} aria-hidden />
          )}
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{title}</h2>
          <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--text-secondary)]">{items.length}</span>
          {!isEditing ? (
            <RoundIconButton tone="onColor" size={28} onClick={onAdd} aria-label={`Product toevoegen aan ${title}`}>
              {RoundIcons.plus}
            </RoundIconButton>
          ) : null}
        </>
      }
    >
      <ul className="px-2.5 pb-1 pt-0.5">
        {items.map((item, k) => (
          <li key={item.id} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
            <ShoppingRow item={item} isEditing={isEditing} addedBy={addedByFor(item)} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </CategoryCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeKopenPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [addOpen, setAddOpen] = React.useState(false);
  const [preselectedStore, setPreselectedStore] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<ShoppingItem | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  /** Large-title-patroon (zoals favorieten): compacte titel pas zodra de grote titel wegscrolt. */
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } =
    useLargeTitleCollapse<HTMLHeadingElement>(64);
  const [isStoreOrderMode, setIsStoreOrderMode] = React.useState(false);
  const [storeOrder, setStoreOrder] = React.useState<string[] | null>(() => loadStoreOrder());
  const [lastDeletedItem, setLastDeletedItem] = React.useState<ShoppingItem | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [localShareToken, setLocalShareToken] = React.useState<string | null>(null);

  const { data, isLoading: dataLoading } = db.useQuery(
    user
      ? {
          shoppingItems: {},
          shoppingShares: {
            memberships: {},
            $: { where: { ownerId: user.id } },
          },
          shoppingShareMembers: {
            shoppingShare: { memberships: {} },
            $: { where: { instantUserId: user.id } },
          },
        }
      : null,
  );

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeletedItem(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  const ownedShoppingShare = ((data?.shoppingShares ?? []) as ShoppingShare[])[0] ?? null;
  const visibleShoppingOwnerIds = getVisibleShoppingOwnerIds({
    userId: user?.id,
    ownedShares: data?.shoppingShares as ShoppingShare[] | undefined,
    joinedMemberships: data?.shoppingShareMembers as
      | { shoppingShare?: ShoppingShare | null }[]
      | undefined,
  });
  const otherShoppingOwnerIds = React.useMemo(() => {
    if (!user?.id) return [];
    return Array.from(visibleShoppingOwnerIds).filter((id) => id !== user.id);
  }, [user?.id, visibleShoppingOwnerIds]);
  const shoppingProfilesQuery = React.useMemo(
    () => ({
      profiles: {
        $: {
          where:
            otherShoppingOwnerIds.length > 0
              ? {
                  or: otherShoppingOwnerIds.map((id) => ({
                    instantUserId: id,
                  })),
                }
              : { instantUserId: "__te_kopen_profiles_none__" },
        },
      },
    }),
    [otherShoppingOwnerIds],
  );
  const { data: shoppingProfilesData } = db.useQuery(
    shoppingProfilesQuery as unknown as Parameters<typeof db.useQuery>[0],
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

  const shoppingAvatarByUserId = React.useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of (shoppingProfilesData?.profiles ?? []) as ProfileRow[]) {
      const uid = p.instantUserId;
      if (!uid) continue;
      const url = p.avatarUrl?.trim();
      m.set(uid, url && url.length > 0 ? url : null);
    }
    return m;
  }, [shoppingProfilesData?.profiles]);

  const allItems: ShoppingItem[] = ((data?.shoppingItems ?? []) as ShoppingItem[])
    .filter((item) => item.ownerId != null && visibleShoppingOwnerIds.has(item.ownerId))
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

  // Group by store (null = geen winkel, represented as "" in storeOrder)
  const storeGroups = new Map<string | null, ShoppingItem[]>();
  const query = searchQuery.trim().toLowerCase();
  const visibleItems = query ? allItems.filter((i) => i.name.toLowerCase().includes(query)) : allItems;
  for (const item of visibleItems) {
    const key = item.store ?? null;
    if (!storeGroups.has(key)) storeGroups.set(key, []);
    storeGroups.get(key)!.push(item);
  }

  // Build the ordered list of store keys ("" for null/Algemeen), applying custom order if saved
  const rawStoreKeys = Array.from(storeGroups.keys()).map((k) => k ?? "");
  const defaultOrder = rawStoreKeys.slice().sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    const ia = TE_KOPEN_STORE_OPTIONS.findIndex((s) => s.label === a);
    const ib = TE_KOPEN_STORE_OPTIONS.findIndex((s) => s.label === b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "nl");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const orderedStoreKeys = applySavedStoreOrder(defaultOrder, storeOrder);
  const sortedGroups: [string | null, ShoppingItem[]][] = orderedStoreKeys.map((key) => [
    key === "" ? null : key,
    storeGroups.get(key === "" ? null : key) ?? [],
  ]);

  async function handleAdd(name: string, quantity: string, store: string | null) {
    if (!user) return;
    if (editingItem) {
      await db.transact(
        db.tx.shoppingItems[editingItem.id].update({ name, quantity, store: store ?? null }),
      );
      return;
    }
    const maxOrder = allItems.reduce((max, i) => Math.max(max, i.order ?? 0), 0);
    await db.transact(
      db.tx.shoppingItems[instantId()].update({
        name,
        quantity,
        ...(store ? { store } : {}),
        checked: false,
        order: maxOrder + 1,
        ownerId: user.id,
      }),
    );
  }

  async function handleDelete(id: string) {
    const item = allItems.find((i) => i.id === id);
    if (!item) return;
    await db.transact(db.tx.shoppingItems[id].delete());
    setLastDeletedItem(item);
    setSnackbarMessage(`'${item.name}' verwijderd`);
  }

  function handleUndo() {
    if (!lastDeletedItem) return;
    const item = lastDeletedItem;
    if (!user) return;
    void db.transact(
      db.tx.shoppingItems[item.id].update({
        name: item.name,
        quantity: item.quantity,
        ...(item.store ? { store: item.store } : {}),
        checked: item.checked,
        order: item.order,
        ownerId: item.ownerId ?? user.id,
      }),
    );
    setLastDeletedItem(null);
    setSnackbarMessage(null);
  }

  function openAddForStore(store: string | null) {
    setEditingItem(null);
    setPreselectedStore(store);
    primeKeyboard();
    setAddOpen(true);
  }

  const ensureShareToken = React.useCallback(async () => {
    if (!user) return null;
    const existingToken = ownedShoppingShare?.shareToken ?? localShareToken;
    if (existingToken) return existingToken;

    const token = crypto.randomUUID();
    if (ownedShoppingShare?.id) {
      await db.transact(db.tx.shoppingShares[ownedShoppingShare.id].update({ shareToken: token }));
    } else {
      await db.transact(
        db.tx.shoppingShares[instantId()].update({
          ownerId: user.id,
          shareToken: token,
        }),
      );
    }
    setLocalShareToken(token);
    return token;
  }, [user, ownedShoppingShare?.id, ownedShoppingShare?.shareToken, localShareToken]);

  const handleShareInvitePress = React.useCallback(async () => {
    if (!user) return;

    const canNativeShare =
      isIPhoneDevice() &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function";

    if (canNativeShare) {
      try {
        const token = await ensureShareToken();
        if (!token || typeof window === "undefined") return;
        const url = `${window.location.origin}/deel/te-kopen/${encodeURIComponent(token)}`;
        await navigator.share({
          title: "Lijstje delen",
          text: "Schrijf mee op dit lijstje:",
          url,
        });
        setSettingsOpen(false);
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === "AbortError") return;
        setShareModalOpen(true);
      }
      return;
    }

    await ensureShareToken();
    setShareModalOpen(true);
  }, [user, ensureShareToken]);

  const shareUrl = React.useMemo(() => {
    const tok = ownedShoppingShare?.shareToken ?? localShareToken;
    if (!tok || typeof window === "undefined") return "";
    return `${window.location.origin}/deel/te-kopen/${encodeURIComponent(tok)}`;
  }, [ownedShoppingShare?.shareToken, localShareToken]);

  if (authLoading || dataLoading) return <PageSpinner />;
  if (!user) {
    router.replace("/auth");
    return null;
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col">

      {/* Fixed header */}
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] lg:hidden pt-[env(safe-area-inset-top,0px)] transition-shadow duration-200",
          isLargeTitleCollapsed || isStoreOrderMode ? "shadow-[0_1px_0_var(--border-subtle)]" : "shadow-none",
        )}
      >
        <div className="flex justify-center px-4">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.push("/")}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p
              className={cn(
                "min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]",
                "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
                isLargeTitleCollapsed ? "translate-y-0 opacity-100" : "opacity-0 motion-safe:translate-y-1",
              )}
              aria-hidden={!isLargeTitleCollapsed}
            >
              {isStoreOrderMode ? "Volgorde winkels" : "Te kopen"}
            </p>
            <button
              type="button"
              aria-label="Instellingen"
              onClick={() => setSettingsOpen(true)}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/dots.svg" className="size-6 bg-current" />
            </button>
          </header>
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "relative z-10 flex flex-1 justify-center px-4",
          "pb-[calc(88px+env(safe-area-inset-bottom,0px))]",
          "pt-[calc(64px+32px+env(safe-area-inset-top,0px))] lg:pt-[calc(40px+env(safe-area-inset-top,0px))]",
        )}
      >
        <div className="flex w-full max-w-[956px] flex-col gap-6">
          {/* Page heading — canvas «01 · Te kopen — voorstel» */}
          <div className="flex w-full min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PageBackButton href="/" label="Terug naar de startpagina" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <h1 ref={largeTitleRef} className="min-w-0 truncate text-page-title font-bold leading-32 tracking-tight text-[var(--text-primary)]">
                  {isStoreOrderMode ? "Volgorde winkels" : "Te kopen"}
                </h1>
                {!isEditing && !isStoreOrderMode && allItems.length > 0 && (
                  <TitleEditButton onClick={() => setIsEditing(true)} />
                )}
              </div>
              {!isStoreOrderMode && allItems.length > 0 ? (
                <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
                  {allItems.length} {allItems.length === 1 ? "product" : "producten"} · voor je volgende lijstje
                </p>
              ) : null}
            </div>
            </div>
            {isStoreOrderMode ? (
              <DoneButton onClick={() => setIsStoreOrderMode(false)} />
            ) : isEditing ? (
              <DoneButton onClick={() => setIsEditing(false)} />
            ) : allItems.length > 0 ? (
              <RoundIconButton
                tone={searchOpen ? "primary" : "surface"}
                size={36}
                onClick={() => {
                  setSearchOpen((v) => !v);
                  setSearchQuery("");
                }}
                aria-label={searchOpen ? "Zoeken sluiten" : "Zoeken in te kopen"}
                aria-pressed={searchOpen}
              >
                {RoundIcons.search}
              </RoundIconButton>
            ) : null}
            {!isEditing && !isStoreOrderMode ? (
              /* Desktop: «⋯» uit de topbalk staat naast de titel (canvas «Terugnavigatie A»). */
              <RoundIconButton tone="surface" size={36} className="hidden lg:flex" aria-label="Instellingen" onClick={() => setSettingsOpen(true)}>
                {RoundIcons.more}
              </RoundIconButton>
            ) : null}
          </div>

          {isEditing && !isStoreOrderMode && sortedGroups.length > 1 ? (
            <MiniButton variant="secondary" className="self-start" onClick={() => setIsStoreOrderMode(true)}>
              Volgorde winkels wijzigen
            </MiniButton>
          ) : null}

          {searchOpen && !isEditing && !isStoreOrderMode && allItems.length > 0 ? (
            <SearchBar value={searchQuery} onValueChange={setSearchQuery} placeholder="Zoeken in te kopen…" />
          ) : null}

          {isStoreOrderMode ? (
            <StoreOrderPanel
              storeKeys={orderedStoreKeys}
              onChange={(next) => setStoreOrder(next)}
            />
          ) : allItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ui/kopen_320.webp"
                alt=""
                width={96}
                height={96}
                className="size-24 object-contain"
                aria-hidden
              />
              <p className="text-base font-medium leading-6 text-[var(--gray-500)]">
                Je hebt geen producten om te kopen
              </p>
              <MiniButton variant="primary" onClick={() => { primeKeyboard(); setEditingItem(null); setPreselectedStore(null); setAddOpen(true); }}>
                Voeg product toe
              </MiniButton>
            </div>
          ) : (
            <div className="lg:columns-3 lg:gap-4">
              {sortedGroups.length === 0 ? (
                <p className="py-8 text-center text-[15px] text-[var(--text-tertiary)]">
                  Geen producten gevonden voor «{searchQuery.trim()}».
                </p>
              ) : null}
              {sortedGroups.map(([store, items]) => (
                <StoreCard
                  key={store ?? "__algemeen"}
                  store={store}
                  items={items}
                  isEditing={isEditing}
                  addedByFor={(item) =>
                    item.ownerId && item.ownerId !== user.id
                      ? {
                          firstName: shoppingFirstNameByUserId.get(item.ownerId) ?? "deelnemer",
                          avatarUrl: shoppingAvatarByUserId.get(item.ownerId),
                        }
                      : null
                  }
                  onAdd={() => openAddForStore(store)}
                  onEdit={(item) => {
                    setEditingItem(item);
                    setAddOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
              {!isEditing ? (
                <p className="mt-1 text-center text-[12.5px] text-[var(--text-tertiary)] lg:hidden">
                  Tik om te wijzigen · veeg naar links om te verwijderen
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Snackbar */}
      {snackbarMessage && (
        <div className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS} role="region" aria-label="Melding">
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndo}
          />
        </div>
      )}

      {/* FAB — verborgen in bewerkmodus, lege staat en wanneer snackbar zichtbaar is */}
      {!isEditing && !snackbarMessage && allItems.length > 0 && (
        <div className={cn("pointer-events-none fixed inset-x-0 z-20", APP_FAB_BOTTOM_NO_NAV_CLASS)}>
          <div className="px-4">
            <div className="mx-auto flex w-full max-w-[956px] justify-end">
              <FloatingActionButton
                aria-label="Product toevoegen"
                className="pointer-events-auto"
                onClick={() => { primeKeyboard(); setEditingItem(null); setPreselectedStore(null); setAddOpen(true); }}
              />
            </div>
          </div>
        </div>
      )}

      <AddShoppingItemSlideIn
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        initialStore={preselectedStore}
        editItem={editingItem}
      />

      <SlideInModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Instellingen"
        titleId="te-kopen-settings-title"
        containerClassName="z-[55]"
        bodyClassName="px-[var(--space-4)] pb-[45px] pt-[var(--space-6)]"
      >
        <button
          type="button"
          onClick={() => void handleShareInvitePress()}
          className="flex w-full items-center gap-4 py-3 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="flex-1 text-base font-medium leading-6 text-[var(--text-primary)]">
            Lijstje delen
          </span>
          <ChevronRightIcon />
        </button>
      </SlideInModal>

      <ShareListModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        urlReady={Boolean(shareUrl)}
      />
    </div>
  );
}
