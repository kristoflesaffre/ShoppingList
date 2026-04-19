"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MiniButton } from "@/components/ui/mini_button";
import { db } from "@/lib/db";
import { id as instantId } from "@instantdb/react";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { NewFreezerItemModal } from "./new_freezer_item_modal";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MaskIcon({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
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

/** Zelfde patroon als recepten: mask-icon op `public/icons/toggle_*.svg`. */
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
        "inline-block size-6 shrink-0 bg-action-primary",
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

const FREEZER_VIEW_STORAGE_KEY = "diepvriesvoorraad:viewMode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FreezerItem {
  id: string;
  type: string;
  name: string;
  quantityPerPackage: number;
  unit: string;
  packages: number;
  ownerId?: string;
  recipeId?: string;
  recipePhotoUrl?: string;
  recipePersons?: number;
  order?: number;
}

// ─── Grid tile — bekijk: Figma 1178:8427; bewerken: 1178:8623 (“Logo tile”) ───
// https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=1178-8427
// https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=1178-8623
// Bekijk: foto → 32px telling → titel/ondertitel (gap 8). Bewerk: foto → rij bin|telling|plus (gap 16) → titel/ondertitel — geen border boven de knoppen.

function FreezerItemGridCard({
  item,
  isEditing,
  onIncrement,
  onDecrement,
  onDelete,
}: {
  item: FreezerItem;
  isEditing: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onDelete: () => void;
}) {
  const personsCount = item.recipePersons ?? item.quantityPerPackage;
  const subtitle =
    item.type === "gerecht"
      ? personsCount === 1
        ? "1 persoon"
        : `${personsCount} personen`
      : `${item.quantityPerPackage} ${item.unit}`;

  const textBlock = (
    <div className="flex h-[44px] w-full min-w-0 flex-col items-center justify-center gap-0 text-center tracking-normal">
      <p className="w-full truncate text-base font-medium leading-6 text-[var(--text-primary)]">
        {item.name}
      </p>
      <p className="w-full text-sm font-normal leading-5 text-[var(--gray-400)]">
        {subtitle}
      </p>
    </div>
  );

  return (
    <article className="flex min-w-0 w-full flex-col rounded-lg border border-[var(--gray-100)] bg-[var(--white)] p-[12px]">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
        {/* 1178:8654 — 64×64 */}
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-[var(--gray-50)]">
          {item.recipePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.recipePhotoUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
              decoding="async"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/ui/empty_state_diepvries.png"
              alt=""
              className="absolute inset-0 size-full object-contain p-2 opacity-60"
              decoding="async"
            />
          )}
        </div>

        {isEditing ? (
          <>
            {/* 1178:8811 — bin/min (24) | telling (32px primary/900) | plus (24), gap 16 */}
            <div className="flex w-full shrink-0 items-center justify-center gap-4">
              <button
                type="button"
                onClick={item.packages <= 1 ? onDelete : onDecrement}
                aria-label={item.packages <= 1 ? "Verwijder" : "Minder"}
                className="flex size-6 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                {item.packages <= 1 ? (
                  <MaskIcon
                    src="/icons/recycle_bin.svg"
                    className="size-6 bg-[var(--error-600)]"
                  />
                ) : (
                  <MaskIcon
                    src="/icons/minus-circle.svg"
                    className="size-6 bg-[var(--blue-500)]"
                  />
                )}
              </button>
              <span className="min-w-10 shrink-0 text-center tabular-nums text-[32px] font-semibold leading-6 text-[var(--blue-900)]">
                {item.packages}
              </span>
              <button
                type="button"
                onClick={onIncrement}
                aria-label="Meer"
                className="flex size-6 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <MaskIcon
                  src="/icons/plus-circle.svg"
                  className="size-6 bg-[var(--blue-500)]"
                />
              </button>
            </div>
            {textBlock}
          </>
        ) : (
          <>
            <p className="w-full shrink-0 text-center tabular-nums text-[32px] font-semibold leading-6 tracking-normal text-[var(--blue-900)]">
              {item.packages}
            </p>
            {textBlock}
          </>
        )}
      </div>
    </article>
  );
}

function FreezerItemListRow({
  item,
  isEditing,
  onIncrement,
  onDecrement,
  onDelete,
}: {
  item: FreezerItem;
  isEditing: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onDelete: () => void;
}) {
  const personsCount = item.recipePersons ?? item.quantityPerPackage;
  const subtitle =
    item.type === "gerecht"
      ? personsCount === 1
        ? "1 persoon"
        : `${personsCount} personen`
      : `${item.quantityPerPackage} ${item.unit}`;

  const thumbShape =
    item.type === "gerecht" ? "rounded-full" : "rounded-md";

  const thumb = (
    <div
      className={cn(
        "relative size-10 shrink-0 overflow-hidden bg-[var(--gray-50)]",
        thumbShape,
      )}
    >
      {item.recipePhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.recipePhotoUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          decoding="async"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/ui/empty_state_diepvries.png"
          alt=""
          className="absolute inset-0 size-full object-contain p-1 opacity-60"
          decoding="async"
        />
      )}
    </div>
  );

  if (!isEditing) {
    return (
      <article className="flex w-full min-w-0 items-center gap-3 border-b border-[var(--gray-100)] py-3 last:border-b-0">
        {thumb}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium leading-6 text-[var(--text-primary)]">
            {item.name}
          </p>
          <p className="truncate text-sm font-normal leading-5 text-[var(--gray-400)]">
            {subtitle}
          </p>
        </div>
        <p className="shrink-0 tabular-nums text-[32px] font-semibold leading-6 text-[var(--blue-900)]">
          {item.packages}
        </p>
      </article>
    );
  }

  // Figma 1176:7747 “List card” — bin/minus | divider | 40px thumb | tekst | 32px count | divider | plus
  return (
    <article className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-[var(--gray-100)] bg-[var(--white)] px-3 py-3">
      <button
        type="button"
        onClick={item.packages <= 1 ? onDelete : onDecrement}
        aria-label={item.packages <= 1 ? "Verwijder" : "Minder"}
        className="flex shrink-0 items-center justify-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        {item.packages <= 1 ? (
          <MaskIcon
            src="/icons/recycle_bin.svg"
            className="size-6 bg-[var(--error-600)]"
          />
        ) : (
          <MaskIcon
            src="/icons/minus-circle.svg"
            className="size-6 bg-[var(--blue-500)]"
          />
        )}
      </button>
      <div
        className="h-10 w-px shrink-0 bg-[var(--gray-100)]"
        aria-hidden
      />
      {thumb}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium leading-6 text-[var(--text-primary)]">
          {item.name}
        </p>
        <p className="truncate text-xs font-normal leading-4 text-[var(--gray-400)]">
          {subtitle}
        </p>
      </div>
      <div className="flex min-w-10 shrink-0 flex-col items-center justify-center">
        <span className="tabular-nums text-[32px] font-semibold leading-6 text-[var(--blue-900)]">
          {item.packages}
        </span>
      </div>
      <div
        className="h-10 w-px shrink-0 bg-[var(--gray-100)]"
        aria-hidden
      />
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Meer"
        className="flex shrink-0 items-center justify-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <MaskIcon
          src="/icons/plus-circle.svg"
          className="size-6 bg-[var(--blue-500)]"
        />
      </button>
    </article>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function FreezerSection({
  title,
  items,
  viewMode,
  isEditing,
  onAdd,
  onIncrement,
  onDecrement,
  onDelete,
}: {
  title: string;
  items: FreezerItem[];
  viewMode: "grid" | "list";
  isEditing: boolean;
  onAdd: () => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between pr-4">
        <p className="text-[18px] font-bold leading-6 tracking-normal text-[var(--blue-900,#101130)]">
          {title}
        </p>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`${title} toevoegen`}
          className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded-full"
        >
          <MaskIcon
            src="/icons/plus-circle.svg"
            className="size-6 bg-[var(--blue-500)]"
          />
        </button>
      </div>

      {viewMode === "grid" ? (
        <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-4">
          {items.map((item) => (
            <FreezerItemGridCard
              key={item.id}
              item={item}
              isEditing={isEditing}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "flex w-full flex-col",
            isEditing
              ? "gap-3"
              : "rounded-lg border border-[var(--gray-100)] bg-[var(--white)] px-3",
          )}
        >
          {items.map((item) => (
            <FreezerItemListRow
              key={item.id}
              item={item}
              isEditing={isEditing}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiepvriesvoorraadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [addModalInitialTab, setAddModalInitialTab] = React.useState<
    "first" | "second"
  >("first");
  const [isEditing, setIsEditing] = React.useState(false);
  const [viewMode, setViewModeState] = React.useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const raw = window.localStorage.getItem(FREEZER_VIEW_STORAGE_KEY);
      if (raw === "list" || raw === "grid") return raw;
    } catch {
      /* ignore */
    }
    return "grid";
  });

  const setViewMode = React.useCallback((mode: "grid" | "list") => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(FREEZER_VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const { data: freezerData, isLoading: dataLoading } = db.useQuery(
    user ? { freezerItems: {} } : null,
  );

  if (authLoading || dataLoading) return <PageSpinner />;
  if (!user) {
    router.replace("/auth");
    return null;
  }

  const allItems: FreezerItem[] = (freezerData?.freezerItems ?? [])
    .filter((item) => !item.ownerId || item.ownerId === user.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) as FreezerItem[];

  const gerechten = allItems.filter((i) => i.type === "gerecht");
  const producten = allItems.filter((i) => i.type === "product");
  const hasItems = allItems.length > 0;

  async function handleAdd(item: {
    name: string;
    quantityPerPackage: number;
    unit: string;
    packages: number;
    type: "product" | "gerecht";
    recipeId?: string;
    recipePhotoUrl?: string;
    recipePersons?: number;
  }) {
    if (!user) return;
    const maxOrder = allItems.reduce(
      (max, fi) => Math.max(max, fi.order ?? 0),
      0,
    );
    await db.transact(
      db.tx.freezerItems[instantId()].update({
        type: item.type,
        name: item.name,
        quantityPerPackage: item.quantityPerPackage,
        unit: item.unit,
        packages: item.packages,
        ownerId: user.id,
        ...(item.recipeId ? { recipeId: item.recipeId } : {}),
        ...(item.recipePhotoUrl ? { recipePhotoUrl: item.recipePhotoUrl } : {}),
        ...(item.recipePersons != null
          ? { recipePersons: item.recipePersons }
          : {}),
        order: maxOrder + 1,
      }),
    );
  }

  async function handleIncrement(id: string) {
    const item = allItems.find((i) => i.id === id);
    if (!item) return;
    await db.transact(
      db.tx.freezerItems[id].update({ packages: item.packages + 1 }),
    );
  }

  async function handleDecrement(id: string) {
    const item = allItems.find((i) => i.id === id);
    if (!item || item.packages <= 1) return;
    await db.transact(
      db.tx.freezerItems[id].update({ packages: item.packages - 1 }),
    );
  }

  async function handleDelete(id: string) {
    await db.transact(db.tx.freezerItems[id].delete());
  }

  function openAddModal(tab: "first" | "second") {
    setAddModalInitialTab(tab);
    setAddModalOpen(true);
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      {/* Fixed header — zelfde rij als Figma 1178:8402 (geen weergave-toggle hier) */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <header className="mx-auto flex h-16 max-w-[956px] items-center gap-4 px-4">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => router.push("/")}
            className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <MaskIcon
              src="/icons/arrow.svg"
              className="size-6 bg-[var(--blue-500)]"
            />
          </button>
          <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
            Diepvriesvoorraad
          </p>
          <div className="size-6 shrink-0" aria-hidden />
        </header>
      </div>

      {hasItems ? (
        /* ── Items list state ─────────────────────────────────────────────── */
        <div
          className={cn(
            "relative z-10 flex flex-1 flex-col gap-6 px-4",
            "pb-[calc(88px+env(safe-area-inset-bottom,0px))]",
            "pt-[calc(64px+32px+env(safe-area-inset-top,0px))]",
          )}
        >
          {/* Figma 1178:8410 bekijkmodus — titel + potlood | toggle. Figma 1176:7892 bewerkmodus — titel | Gereed (geen toggle). */}
          <div className="flex w-full min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <h1 className="min-w-0 truncate text-2xl font-bold leading-8 tracking-normal text-[var(--text-primary)]">
                Diepvriesvoorraad
              </h1>
              {!isEditing ? (
                <button
                  type="button"
                  aria-label="Bewerken"
                  onClick={() => setIsEditing(true)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <MaskIcon
                    src="/icons/pencil.svg"
                    className="size-6 bg-[var(--blue-500)]"
                  />
                </button>
              ) : null}
            </div>
            {isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--blue-500)] px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <MaskIcon
                  src="/icons/checkmark.svg"
                  className="size-5 bg-white"
                />
                <span className="text-sm font-normal leading-5 tracking-normal text-white">
                  Gereed
                </span>
              </button>
            ) : (
              <div
                className="box-border flex shrink-0 items-stretch overflow-hidden rounded border border-[var(--gray-100)] bg-[var(--white)]"
                role="group"
                aria-label="Weergave"
              >
                <button
                  type="button"
                  aria-label="Lijstweergave"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center justify-center p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-inset",
                    viewMode === "list"
                      ? "bg-[var(--blue-25)]"
                      : "bg-[var(--white)]",
                  )}
                >
                  <ToggleViewIcon
                    src="/icons/toggle_list.svg"
                    active={viewMode === "list"}
                  />
                </button>
                <div
                  className="w-px shrink-0 self-stretch bg-[var(--gray-100)]"
                  aria-hidden
                />
                <button
                  type="button"
                  aria-label="Tegelweergave"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center justify-center p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-inset",
                    viewMode === "grid"
                      ? "bg-[var(--blue-25)]"
                      : "bg-[var(--white)]",
                  )}
                >
                  <ToggleViewIcon
                    src="/icons/toggle_grid.svg"
                    active={viewMode === "grid"}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Gerechten section */}
          {gerechten.length > 0 && (
            <FreezerSection
              title="Gerechten"
              items={gerechten}
              viewMode={viewMode}
              isEditing={isEditing}
              onAdd={() => openAddModal("second")}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onDelete={handleDelete}
            />
          )}

          {/* Producten section */}
          {producten.length > 0 && (
            <FreezerSection
              title="Producten"
              items={producten}
              viewMode={viewMode}
              isEditing={isEditing}
              onAdd={() => openAddModal("first")}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onDelete={handleDelete}
            />
          )}
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[calc(64px+env(safe-area-inset-top,0px))]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/ui/empty_state_diepvries.png"
            alt=""
            width={96}
            height={96}
            className="size-24 object-contain"
          />
          <p className="text-center text-base font-medium leading-6 text-[var(--text-tertiary)]">
            Je hebt geen items in je diepvriesvoorraad
          </p>
          <MiniButton variant="primary" onClick={() => openAddModal("first")}>
            Voeg item toe
          </MiniButton>
        </div>
      )}

      {/* FAB — only visible when items exist and not editing */}
      {hasItems && (
        <button
          type="button"
          aria-label="Item toevoegen"
          onClick={() => openAddModal("first")}
          className="fixed z-20 flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--blue-500)] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          style={{
            bottom: "calc(45px + env(safe-area-inset-bottom, 0px))",
            right: "24px",
          }}
        >
          <MaskIcon src="/icons/plus.svg" className="size-6 bg-white" />
        </button>
      )}

      <NewFreezerItemModal
        open={addModalOpen}
        initialTab={addModalInitialTab}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
