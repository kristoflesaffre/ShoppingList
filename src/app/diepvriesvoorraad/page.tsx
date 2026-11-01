"use client";

import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import * as React from "react";
import { PageBackButton } from "@/components/ui/page_back_button";
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
import { CountStepper } from "@/components/ui/count_stepper";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { FROST_GRADIENT_CLASS, FrostDecor } from "@/components/ui/frost_background";
import { SearchBar } from "@/components/ui/search_bar";
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

// ─── Rij en groep — canvas «03 · Diepvriesvoorraad — 4 varianten», D · Snelle lijst ──

/** Nog één pakket of portie over. */
function isLow(item: FreezerItem): boolean {
  return item.packages === 1;
}

function freezerSubtitle(item: FreezerItem): string {
  if (item.type === "gerecht") {
    const persons = item.recipePersons ?? item.quantityPerPackage;
    return persons === 1 ? "1 persoon" : `${persons} personen`;
  }
  return `${item.quantityPerPackage} ${item.unit}`;
}

function FreezerRow({
  item,
  onChangeCount,
}: {
  item: FreezerItem;
  onChangeCount: (next: number) => void;
}) {
  const getItemPhoto = useItemPhotoUrl(160);
  const photo = item.recipePhotoUrl ?? getItemPhoto(item.name);
  const isDish = item.type === "gerecht";

  return (
    <div className="flex w-full items-center gap-3 py-[9px] pl-3 pr-2.5">
      {photo && isDish ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto
        <img src={photo} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />
      ) : photo ? (
        <span className="flex size-11 shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={photo} alt="" width={36} height={36} className="size-9 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
        </span>
      ) : (
        <span
          className={cn("flex size-11 shrink-0 items-center justify-center text-[17px] font-bold", isDish ? "rounded-full" : "rounded-[12px]")}
          style={teKopenMonogramStyle(item.name)}
          aria-hidden
        >
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-[19px]">
        <span className="block truncate text-[15px] font-semibold text-text-primary first-letter:uppercase">{item.name}</span>
        <span className="block truncate text-[13px] text-[var(--text-secondary)]">
          {isLow(item) ? <span className="font-bold text-[var(--secondary-700)]">Laatste · </span> : null}
          {freezerSubtitle(item)}
        </span>
      </span>
      <CountStepper name={item.name} value={item.packages} tone="soft" onChange={onChangeCount} />
    </div>
  );
}

function FreezerGroup({
  title,
  items,
  onChangeCount,
}: {
  title: string;
  items: FreezerItem[];
  onChangeCount: (item: FreezerItem, next: number) => void;
}) {
  return (
    <section className="mb-3 lg:mb-0">
      <h2 className="mb-[7px] ml-1 text-[13px] font-bold text-[var(--text-secondary)]">{title}</h2>
      <ul className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
        {items.map((item, k) => (
          <li key={item.id} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
            <FreezerRow item={item} onChangeCount={(next) => onChangeCount(item, next)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

type FreezerFilter = "alles" | "gerecht" | "product" | "bijnaOp";

/** Zolang de melding staat, kan de hele reeks wijzigingen aan dit item ongedaan gemaakt worden. */
const UNDO_VISIBLE_MS = 6000;

interface FreezerUndo {
  /** Het item zoals het was vóór de eerste wijziging. */
  before: FreezerItem;
  next: number;
}

function undoLines({ before, next }: FreezerUndo): [string, string] {
  if (next <= 0) return [`${before.name} verwijderd`, "uit de diepvries"];
  const delta = next - before.packages;
  return [
    `${before.name} ${delta > 0 ? "+" : "−"}${Math.abs(delta)}`,
    `nog ${next} ${next === 1 ? "portie" : "porties"}`,
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiepvriesvoorraadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FreezerFilter>("alles");
  const [undo, setUndo] = React.useState<FreezerUndo | null>(null);
  /** Large-title-patroon: compacte titel pas zodra de grote titel wegscrolt. */
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } =
    useLargeTitleCollapse<HTMLHeadingElement>(64);

  const { data: freezerData, isLoading: dataLoading } = db.useQuery(
    user ? { freezerItems: {} } : null,
  );

  React.useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), UNDO_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [undo]);

  if (authLoading || dataLoading) return <PageSpinner />;
  if (!user) {
    router.replace("/auth");
    return null;
  }

  const allItems: FreezerItem[] = (freezerData?.freezerItems ?? [])
    .filter((item) => !item.ownerId || item.ownerId === user.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) as FreezerItem[];

  const lowCount = allItems.filter(isLow).length;
  /** «Bijna op» zonder treffers meer (bv. net bijgevuld): terug naar alles. */
  const activeFilter: FreezerFilter = filter === "bijnaOp" && lowCount === 0 ? "alles" : filter;
  const query = search.trim().toLowerCase();
  const visibleItems = allItems.filter(
    (i) =>
      (activeFilter === "alles" ||
        (activeFilter === "bijnaOp" ? isLow(i) : i.type === activeFilter)) &&
      (!query || i.name.toLowerCase().includes(query)),
  );
  const gerechten = visibleItems.filter((i) => i.type === "gerecht");
  const producten = visibleItems.filter((i) => i.type === "product");
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

  function handleChangeCount(item: FreezerItem, next: number) {
    if (next <= 0) void db.transact(db.tx.freezerItems[item.id].delete());
    else void db.transact(db.tx.freezerItems[item.id].update({ packages: next }));
    setUndo((current) => {
      const before = current?.before.id === item.id ? current.before : item;
      return before.packages === next ? null : { before, next };
    });
  }

  function handleUndo() {
    if (!undo) return;
    const { id, ...fields } = undo.before;
    // Update op hetzelfde id zet ook een verwijderd item terug.
    void db.transact(db.tx.freezerItems[id].update(JSON.parse(JSON.stringify(fields))));
    setUndo(null);
  }

  const totalPortions = allItems.reduce((sum, i) => sum + (i.packages ?? 0), 0);

  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col">
      <div aria-hidden className={cn("fixed inset-0 -z-10 isolate overflow-hidden", FROST_GRADIENT_CLASS)}>
        <FrostDecor />
      </div>

      {/* Fixed header — zelfde horizontale kolom als body: px-4 buiten, max-w binnen (geen dubbele inspringing). */}
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow] duration-200",
          /* Desktop: terugknop staat naast de titel; zonder items (geen titel) blijft de balk. */
          hasItems && "lg:hidden",
          isLargeTitleCollapsed
            ? "bg-[rgba(227,237,255,0.82)] shadow-[0_1px_0_var(--border-subtle)] backdrop-blur-xl [[data-theme=dark]_&]:bg-[rgba(26,34,64,0.82)]"
            : "shadow-none",
        )}
      >
        <div className="flex justify-center px-4">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.push("/")}
              className={headerRoundButtonClass}
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
              Diepvries
            </p>
            <div className="size-10 shrink-0" aria-hidden />
          </header>
        </div>
      </div>

      {hasItems ? (
        /* ── Items list state ─────────────────────────────────────────────── */
        <div
          className={cn(
            "relative z-10 flex flex-1 justify-center px-4",
            "pb-[calc(88px+env(safe-area-inset-bottom,0px))]",
            "pt-[calc(64px+32px+env(safe-area-inset-top,0px))] lg:pt-[calc(40px+env(safe-area-inset-top,0px))]",
          )}
        >
        <div className="flex w-full max-w-[956px] flex-col gap-4 motion-safe:animate-fade-up">
          {/* Paginakop — canvas «03 · Diepvriesvoorraad — 4 varianten», D · Snelle lijst */}
          <div className="flex w-full min-w-0 items-center gap-3">
            <PageBackButton href="/" label="Terug naar de startpagina" />
            <h1 ref={largeTitleRef} className="min-w-0 flex-1 truncate text-page-title font-bold leading-32 tracking-tight text-[var(--text-primary)]">
              Diepvries
            </h1>
            <span className="shrink-0 whitespace-nowrap text-[15px] font-bold tabular-nums text-[var(--blue-500)]">
              {totalPortions} {totalPortions === 1 ? "portie" : "porties"}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-4">
            <SearchBar
              surface="app"
              placeholder="Zoek in de diepvries"
              aria-label="Zoek in de diepvries"
              value={search}
              onValueChange={setSearch}
              className="lg:w-[320px]"
            />
            <FilterChipRow ariaLabel="Filter de diepvries">
              <FilterChip selected={activeFilter === "alles"} onClick={() => setFilter("alles")}>Alles</FilterChip>
              <FilterChip selected={activeFilter === "gerecht"} onClick={() => setFilter("gerecht")}>Gerechten</FilterChip>
              <FilterChip selected={activeFilter === "product"} onClick={() => setFilter("product")}>Producten</FilterChip>
              {lowCount > 0 ? (
                <FilterChip
                  selected={activeFilter === "bijnaOp"}
                  onClick={() => setFilter("bijnaOp")}
                  dotColor="var(--status-warning)"
                  count={lowCount}
                >
                  Bijna op
                </FilterChip>
              ) : null}
            </FilterChipRow>
          </div>

          {visibleItems.length > 0 ? (
            <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
              {gerechten.length > 0 ? (
                <FreezerGroup title="Gerechten" items={gerechten} onChangeCount={handleChangeCount} />
              ) : null}
              {producten.length > 0 ? (
                <FreezerGroup title="Producten" items={producten} onChangeCount={handleChangeCount} />
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-center text-[15px] text-[var(--text-secondary)]">
              {query ? `Niets gevonden voor «${search.trim()}»` : "Hier ligt nu niets"}
            </p>
          )}
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
          <MiniButton variant="primary" onClick={() => setAddModalOpen(true)}>
            Voeg item toe
          </MiniButton>
        </div>
      )}

      {hasItems && (
        <div className={cn("pointer-events-none fixed inset-x-0 z-20", APP_FAB_BOTTOM_NO_NAV_CLASS)}>
          <div className={cn(APP_FAB_INNER_PX4_CLASS, "items-center gap-3")}>
            {undo ? (
              <div
                role="status"
                className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 rounded-[16px] bg-[var(--text-primary)] py-1.5 pl-4 pr-1.5 text-[var(--white)] shadow-[0_14px_30px_-12px_rgba(16,17,48,0.6)] motion-safe:animate-fade-up lg:max-w-[360px] lg:flex-none lg:basis-[360px]"
              >
                <span className="min-w-0 flex-1 text-[13px] leading-[17px]">
                  <span className="block truncate first-letter:uppercase">{undoLines(undo)[0]}</span>
                  <span className="block truncate opacity-75">{undoLines(undo)[1]}</span>
                </span>
                <button
                  type="button"
                  onClick={handleUndo}
                  className="h-[38px] shrink-0 rounded-[12px] px-2.5 text-sm font-bold text-[var(--white)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)]"
                >
                  Ongedaan
                </button>
              </div>
            ) : null}
            <FloatingActionButton
              aria-label="Item toevoegen"
              className="pointer-events-auto shrink-0"
              onClick={() => setAddModalOpen(true)}
            />
          </div>
        </div>
      )}

      <NewFreezerItemModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
