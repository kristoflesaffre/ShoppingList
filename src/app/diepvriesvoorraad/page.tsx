"use client";

import * as React from "react";
import { DoneButton, TitleEditButton } from "@/components/ui/title_edit_button";
import { useRouter } from "next/navigation";
import { MiniButton } from "@/components/ui/mini_button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { APP_FAB_BOTTOM_NO_NAV_CLASS, APP_FAB_INNER_PX4_CLASS } from "@/lib/app-layout";
import { db } from "@/lib/db";
import { id as instantId } from "@instantdb/react";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { NewFreezerItemModal } from "./new_freezer_item_modal";
import { cn } from "@/lib/utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { CategoryCard, type Rgb } from "@/components/ui/category_card";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { CountBadge } from "@/components/ui/count_badge";
import { CountStepper } from "@/components/ui/count_stepper";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";

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

// ─── Rij en kaart — canvas «03 · Diepvriesvoorraad — voorstel» ────────────────

function freezerSubtitle(item: FreezerItem): string {
  if (item.type === "gerecht") {
    const persons = item.recipePersons ?? item.quantityPerPackage;
    return persons === 1 ? "1 persoon" : `${persons} personen`;
  }
  return `${item.quantityPerPackage} ${item.unit}`;
}

function FreezerRow({
  item,
  isEditing,
  onChangeCount,
}: {
  item: FreezerItem;
  isEditing: boolean;
  onChangeCount: (next: number) => void;
}) {
  const getItemPhoto = useItemPhotoUrl(160);
  const photo = item.recipePhotoUrl ?? getItemPhoto(item.name);
  const isDish = item.type === "gerecht";

  return (
    <div className="flex w-full items-center gap-3 px-1 py-[9px]">
      {photo && isDish ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto
        <img src={photo} alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-full object-cover" />
      ) : photo ? (
        <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--gray-25)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={photo} alt="" width={34} height={34} className="size-[34px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
        </span>
      ) : (
        <span
          className={cn("flex size-[42px] shrink-0 items-center justify-center text-[17px] font-bold", isDish ? "rounded-full" : "rounded-[12px]")}
          style={teKopenMonogramStyle(item.name)}
          aria-hidden
        >
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-[19px]">
        <span className="block truncate text-[15px] font-medium text-text-primary first-letter:uppercase">{item.name}</span>
        <span className="block truncate text-[13px] text-[var(--text-tertiary)]">{freezerSubtitle(item)}</span>
      </span>
      {isEditing ? (
        <CountStepper name={item.name} value={item.packages} onChange={onChangeCount} />
      ) : (
        <CountBadge value={item.packages} label={`${item.packages} ${item.packages === 1 ? "portie" : "porties"}`} />
      )}
    </div>
  );
}

function FreezerCard({
  title,
  rgb,
  items,
  isEditing,
  onAdd,
  onChangeCount,
}: {
  title: string;
  rgb: Rgb;
  items: FreezerItem[];
  isEditing: boolean;
  onAdd: () => void;
  onChangeCount: (item: FreezerItem, next: number) => void;
}) {
  return (
    <CategoryCard
      className="mb-3 lg:mb-0"
      rgb={rgb}
      title={title}
      count={items.length}
      action={
        !isEditing ? (
          <RoundIconButton tone="onColor" size={28} onClick={onAdd} aria-label={`${title} toevoegen`}>
            {RoundIcons.plus}
          </RoundIconButton>
        ) : null
      }
    >
      <ul className="px-2.5 pb-1 pt-0.5">
        {items.map((item, k) => (
          <li key={item.id} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
            <FreezerRow item={item} isEditing={isEditing} onChangeCount={(next) => onChangeCount(item, next)} />
          </li>
        ))}
      </ul>
    </CategoryCard>
  );
}

/** Kopkleuren: gerechten warm oranje, producten ijsblauw. */
const GERECHTEN_RGB: Rgb = [214, 112, 31];
const PRODUCTEN_RGB: Rgb = [47, 127, 191];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiepvriesvoorraadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [addModalInitialTab, setAddModalInitialTab] = React.useState<
    "first" | "second"
  >("first");
  const [isEditing, setIsEditing] = React.useState(false);
  /** Large-title-patroon: compacte titel pas zodra de grote titel wegscrolt. */
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } =
    useLargeTitleCollapse<HTMLHeadingElement>(64);

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

  function handleChangeCount(item: FreezerItem, next: number) {
    if (next <= 0) void handleDelete(item.id);
    else if (next > item.packages) void handleIncrement(item.id);
    else void handleDecrement(item.id);
  }

  const totalPortions = allItems.reduce((sum, i) => sum + (i.packages ?? 0), 0);

  function openAddModal(tab: "first" | "second") {
    setAddModalInitialTab(tab);
    setAddModalOpen(true);
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col">

      {/* Fixed header — zelfde horizontale kolom als body: px-4 buiten, max-w binnen (geen dubbele inspringing). */}
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] transition-shadow duration-200",
          isLargeTitleCollapsed ? "shadow-[0_1px_0_var(--border-subtle)]" : "shadow-none",
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
              <MaskIcon
                src="/icons/arrow.svg"
                className="size-6 bg-[var(--blue-500)]"
              />
            </button>
            <p
              className={cn(
                "min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]",
                "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
                isLargeTitleCollapsed || !hasItems ? "translate-y-0 opacity-100" : "opacity-0 motion-safe:translate-y-1",
              )}
            >
              Diepvriesvoorraad
            </p>
            <div className="size-6 shrink-0" aria-hidden />
          </header>
        </div>
      </div>

      {hasItems ? (
        /* ── Items list state ─────────────────────────────────────────────── */
        <div
          className={cn(
            "relative z-10 flex flex-1 justify-center px-4",
            "pb-[calc(88px+env(safe-area-inset-bottom,0px))]",
            "pt-[calc(64px+32px+env(safe-area-inset-top,0px))]",
          )}
        >
        <div className="flex w-full max-w-[956px] flex-col gap-6 motion-safe:animate-fade-up">
          {/* Paginakop — canvas «03 · Diepvriesvoorraad — voorstel» */}
          <div className="flex w-full min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <h1 ref={largeTitleRef} className="min-w-0 truncate text-page-title font-bold leading-32 tracking-tight text-[var(--text-primary)]">
                  Diepvriesvoorraad
                </h1>
                {!isEditing ? <TitleEditButton onClick={() => setIsEditing(true)} /> : null}
              </div>
              <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
                {[
                  `${totalPortions} ${totalPortions === 1 ? "portie" : "porties"}`,
                  gerechten.length ? `${gerechten.length} ${gerechten.length === 1 ? "gerecht" : "gerechten"}` : null,
                  producten.length ? `${producten.length} ${producten.length === 1 ? "product" : "producten"}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {isEditing ? <DoneButton onClick={() => setIsEditing(false)} /> : null}
          </div>

          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
            {gerechten.length > 0 ? (
              <FreezerCard
                title="Gerechten"
                rgb={GERECHTEN_RGB}
                items={gerechten}
                isEditing={isEditing}
                onAdd={() => openAddModal("second")}
                onChangeCount={handleChangeCount}
              />
            ) : null}
            {producten.length > 0 ? (
              <FreezerCard
                title="Producten"
                rgb={PRODUCTEN_RGB}
                items={producten}
                isEditing={isEditing}
                onAdd={() => openAddModal("first")}
                onChangeCount={handleChangeCount}
              />
            ) : null}
          </div>
          <p className="text-center text-[12.5px] text-[var(--text-tertiary)] lg:hidden">
            {isEditing ? "Tik − als je een portie uit de diepvries haalt" : "Tik op het potlood om porties bij te werken"}
          </p>
        </div>
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[calc(64px+env(safe-area-inset-top,0px))] motion-safe:animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/ui/empty_state_diepvries.png"
            alt=""
            width={96}
            height={96}
            className="size-24 object-contain motion-safe:animate-float"
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
      {hasItems && !isEditing && (
        <div className={cn("pointer-events-none fixed inset-x-0 z-20", APP_FAB_BOTTOM_NO_NAV_CLASS)}>
          <div className={APP_FAB_INNER_PX4_CLASS}>
            <FloatingActionButton
              aria-label="Item toevoegen"
              className="pointer-events-auto"
              onClick={() => openAddModal("first")}
            />
          </div>
        </div>
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
