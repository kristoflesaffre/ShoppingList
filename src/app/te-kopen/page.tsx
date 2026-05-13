"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as instantId } from "@instantdb/react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { Snackbar } from "@/components/ui/snackbar";
import { APP_FAB_BOTTOM_NO_NAV_CLASS, APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { AddShoppingItemSlideIn } from "@/components/add_shopping_item_slide_in";
import { MASTER_STORE_OPTIONS } from "@/lib/master-stores";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { MiniButton } from "@/components/ui/mini_button";
import { StoreOrderPanel, loadStoreOrder, applySavedStoreOrder } from "@/app/te-kopen/store_order_panel";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  store?: string | null;
  checked: boolean;
  order: number;
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

function PlusCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="var(--blue-500)" strokeWidth="1.25" />
      <path d="M12 8V16M8 12H16" stroke="var(--blue-500)" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
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

// ─── Item card ────────────────────────────────────────────────────────────────

function ShoppingItemCard({
  item,
  isEditing,
  onDelete,
}: {
  item: ShoppingItem;
  isEditing: boolean;
  onDelete: (id: string) => void;
}) {
  const getPhoto = useItemPhotoUrl(160);
  const photoSrc = getPhoto(item.name);

  return (
    <div className="flex h-16 w-full items-end gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-white px-3 py-3">
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
        <span className="text-xs leading-4 text-[var(--text-tertiary)]">
          {item.quantity}
        </span>
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
}: {
  store: string | null;
  onAdd: () => void;
}) {
  const storeInfo = store
    ? MASTER_STORE_OPTIONS.find(
        (s) => s.label === store || s.slug === store,
      )
    : null;

  return (
    <div className="flex items-center gap-3 pr-4">
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
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Product toevoegen aan ${store ?? "Algemeen"}`}
        className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <PlusCircleIcon />
      </button>
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

  const { data, isLoading: dataLoading } = db.useQuery(
    user ? { shoppingItems: {} } : null,
  );

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeletedItem(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  if (authLoading || dataLoading) return <PageSpinner />;
  if (!user) {
    router.replace("/auth");
    return null;
  }

  const allItems: ShoppingItem[] = ((data?.shoppingItems ?? []) as ShoppingItem[])
    .filter((item) => (item as unknown as { ownerId?: string }).ownerId === user.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
    const ia = MASTER_STORE_OPTIONS.findIndex((s) => s.label === a);
    const ib = MASTER_STORE_OPTIONS.findIndex((s) => s.label === b);
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
        ownerId: user.id,
      }),
    );
    setLastDeletedItem(null);
    setSnackbarMessage(null);
  }

  function openAddForStore(store: string | null) {
    setPreselectedStore(store);
    setAddOpen(true);
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
            <div className="size-6 shrink-0" aria-hidden />
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
                  />
                  <div className="flex flex-col gap-3">
                    {items.map((item: ShoppingItem) => (
                      <ShoppingItemCard
                        key={item.id}
                        item={item}
                        isEditing={isEditing}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {isEditing && sortedGroups.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsStoreOrderMode(true)}
                  className="self-start text-sm font-normal leading-5 text-[var(--blue-500)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  Volgorde winkels wijzigen
                </button>
              )}
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
    </div>
  );
}
