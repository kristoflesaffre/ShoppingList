"use client";

import * as React from "react";
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
import { AddShoppingItemSlideIn } from "@/components/add_shopping_item_slide_in";
import {
  TE_KOPEN_STORE_OPTIONS,
  findTeKopenStoreByLabelOrSlug,
} from "@/lib/master-stores";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { MiniButton } from "@/components/ui/mini_button";
import { PlusCircleMaskIcon } from "@/components/ui/plus_circle_mask_icon";
import { StoreOrderPanel, loadStoreOrder, applySavedStoreOrder } from "@/app/te-kopen/store_order_panel";
import { getVisibleShoppingOwnerIds } from "@/lib/shopping-share";

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

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z"
        fill="currentColor"
      />
    </svg>
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

// ─── Item card ────────────────────────────────────────────────────────────────

function ShoppingItemCard({
  item,
  isEditing,
  addedBy,
  onDelete,
}: {
  item: ShoppingItem;
  isEditing: boolean;
  /** Figma 1477:11019 — «1 stuk - door Chloé» + 16px avatar, alles neutraal 400. */
  addedBy?: { firstName: string; avatarUrl?: string | null } | null;
  onDelete: (id: string) => void;
}) {
  const getPhoto = useItemPhotoUrl(160);
  const photoSrc = getPhoto(item.name);

  return (
    <div className="flex h-16 w-full items-end gap-3 rounded-[var(--radius-md)] border border-[var(--gray-100)] bg-white px-3 py-3">
      {photoSrc ? (
        <img
          src={photoSrc}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 object-cover"
        />
      ) : (
        <div className="size-10 shrink-0 bg-[var(--gray-50)]" aria-hidden />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-medium leading-6 text-[var(--text-primary)]">
          {item.name}
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate text-xs font-normal leading-4 tracking-normal text-[var(--gray-400)]">
            {addedBy
              ? `${item.quantity} - door ${addedBy.firstName}`
              : item.quantity}
          </span>
          {addedBy?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- profiel-data-URL
            <img
              src={addedBy.avatarUrl}
              alt=""
              width={16}
              height={16}
              className="size-4 shrink-0 rounded-full object-cover"
            />
          ) : null}
        </div>
      </div>
      {isEditing && (
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          aria-label={`${item.name} verwijderen`}
          className="flex size-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <MaskIcon src="/icons/recycle_bin.svg" className="size-6 bg-[var(--error-600)]" />
        </button>
      )}
    </div>
  );
}

// ─── Store section header ─────────────────────────────────────────────────────

function StoreSectionHeader({
  store,
  onAdd,
  isEditing,
  showReorder,
  onReorder,
}: {
  store: string | null;
  onAdd: () => void;
  isEditing: boolean;
  showReorder: boolean;
  onReorder: () => void;
}) {
  const storeInfo = store
    ? findTeKopenStoreByLabelOrSlug(store)
    : null;

  return (
    <div className="flex items-center gap-3">
      {storeInfo ? (
        <img
          src={storeInfo.logoSrc}
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0 object-contain"
        />
      ) : (
        <div className="size-6 shrink-0" aria-hidden />
      )}
      <p className="min-w-0 flex-1 text-lg font-bold leading-6 text-[var(--primary-900)]">
        {store ?? "Algemeen"}
      </p>
      {isEditing && showReorder ? (
        <button
          type="button"
          onClick={onReorder}
          className="shrink-0 text-sm font-normal leading-5 text-[var(--blue-500)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          Volgorde wijzigen
        </button>
      ) : !isEditing ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Product toevoegen aan ${store ?? "Algemeen"}`}
          className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <PlusCircleMaskIcon />
        </button>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeKopenPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [addOpen, setAddOpen] = React.useState(false);
  const [preselectedStore, setPreselectedStore] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
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
  for (const item of allItems) {
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
    setPreselectedStore(store);
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
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      {/* Fixed header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
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
            <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
              Te kopen
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
          "pt-[calc(64px+32px+env(safe-area-inset-top,0px))]",
        )}
      >
        <div className="flex w-full max-w-[956px] flex-col gap-6">
          {/* Page heading */}
          <div className="flex min-h-9 w-full min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h1 className="min-w-0 truncate text-2xl font-bold leading-8 tracking-normal text-[var(--text-primary)]">
                {isStoreOrderMode ? "Volgorde winkels" : "Te kopen"}
              </h1>
              {!isEditing && !isStoreOrderMode && allItems.length > 0 && (
                <button
                  type="button"
                  aria-label="Bewerken"
                  onClick={() => setIsEditing(true)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <PencilIcon className="size-6" />
                </button>
              )}
            </div>
            {isStoreOrderMode && (
              <button
                type="button"
                onClick={() => setIsStoreOrderMode(false)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--blue-500)] px-2 py-1 text-sm font-normal leading-5 text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <MaskIcon src="/icons/checkmark.svg" className="size-5 bg-white" />
                Gereed
              </button>
            )}
            {isEditing && !isStoreOrderMode && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--blue-500)] px-2 py-1 text-sm font-normal leading-5 text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <MaskIcon src="/icons/checkmark.svg" className="size-5 bg-white" />
                Gereed
              </button>
            )}
          </div>

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
              <p className="text-base font-medium leading-6 text-[#707784]">
                Je hebt geen producten om te kopen
              </p>
              <MiniButton variant="primary" onClick={() => { setPreselectedStore(null); setAddOpen(true); }}>
                Voeg product toe
              </MiniButton>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {sortedGroups.map(([store, items]) => (
                <div key={store ?? "__algemeen"} className="flex flex-col gap-4">
                  <StoreSectionHeader
                    store={store}
                    onAdd={() => openAddForStore(store)}
                    isEditing={isEditing}
                    showReorder={sortedGroups.length > 1}
                    onReorder={() => setIsStoreOrderMode(true)}
                  />
                  <div className="flex flex-col gap-3">
                    {items.map((item: ShoppingItem) => (
                      <ShoppingItemCard
                        key={item.id}
                        item={item}
                        isEditing={isEditing}
                        addedBy={
                          item.ownerId && item.ownerId !== user.id
                            ? {
                                firstName:
                                  shoppingFirstNameByUserId.get(item.ownerId) ??
                                  "deelnemer",
                                avatarUrl: shoppingAvatarByUserId.get(
                                  item.ownerId,
                                ),
                              }
                            : null
                        }
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
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
                onClick={() => { setPreselectedStore(null); setAddOpen(true); }}
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
