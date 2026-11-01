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
import { NewFreezerItemModal } from "@/app/diepvriesvoorraad/new_freezer_item_modal";
import { cn } from "@/lib/utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { CountStepper } from "@/components/ui/count_stepper";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { PANTRY_GRADIENT_CLASS } from "@/components/ui/pantry_background";
import { SearchBar } from "@/components/ui/search_bar";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";
import { isPantryItem, isPantryLow, pantryGroupOf, PANTRY_GROUPS, PANTRY_ITEM_TYPE, type PantryGroup } from "@/lib/pantry";

/** Canvas «VK · Voorraadkast», C · Tweeling van de diepvries: snelle lijst met steppers op een warm verloop. */

interface PantryItem {
  id: string;
  type: string;
  name: string;
  quantityPerPackage: number;
  unit: string;
  packages: number;
  ownerId?: string;
  order?: number;
}

function PantryRow({ item, onChangeCount }: { item: PantryItem; onChangeCount: (next: number) => void }) {
  const getItemPhoto = useItemPhotoUrl(160);
  const photo = getItemPhoto(item.name);

  return (
    <div className="flex w-full items-center gap-3 py-[9px] pl-3 pr-2.5">
      {photo ? (
        <span className="flex size-11 shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={photo} alt="" width={36} height={36} className="size-9 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
        </span>
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold" style={teKopenMonogramStyle(item.name)} aria-hidden>
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-[19px]">
        <span className="block truncate text-[15px] font-semibold text-text-primary first-letter:uppercase">{item.name}</span>
        <span className="block truncate text-[13px] text-[var(--text-secondary)]">
          {isPantryLow(item) ? <span className="font-bold text-[var(--secondary-700)]">Laatste · </span> : null}
          {item.quantityPerPackage} {item.unit}
        </span>
      </span>
      <CountStepper name={item.name} value={item.packages} tone="soft" onChange={onChangeCount} />
    </div>
  );
}

function PantryGroupCard({
  title,
  items,
  onChangeCount,
}: {
  title: string;
  items: PantryItem[];
  onChangeCount: (item: PantryItem, next: number) => void;
}) {
  return (
    <section className="mb-3 lg:mb-0">
      <h2 className="mb-[7px] ml-1 text-[13px] font-bold text-[var(--text-secondary)]">{title}</h2>
      <ul className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
        {items.map((item, k) => (
          <li key={item.id} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
            <PantryRow item={item} onChangeCount={(next) => onChangeCount(item, next)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

type PantryFilter = "alles" | "bijnaOp" | PantryGroup;

const UNDO_VISIBLE_MS = 6000;

interface PantryUndo {
  before: PantryItem;
  next: number;
}

function undoLines({ before, next }: PantryUndo): [string, string] {
  if (next <= 0) return [`${before.name} verwijderd`, "uit de voorraadkast"];
  const delta = next - before.packages;
  return [`${before.name} ${delta > 0 ? "+" : "−"}${Math.abs(delta)}`, `nog ${next}`];
}

export default function VoorraadkastPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<PantryFilter>("alles");
  const [undo, setUndo] = React.useState<PantryUndo | null>(null);
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } = useLargeTitleCollapse<HTMLHeadingElement>(64);

  const { data, isLoading: dataLoading } = db.useQuery(user ? { freezerItems: {} } : null);

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

  const allItems = (data?.freezerItems ?? [])
    .filter((item) => isPantryItem(item) && (!item.ownerId || item.ownerId === user.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) as PantryItem[];

  const lowCount = allItems.filter(isPantryLow).length;
  const presentGroups = PANTRY_GROUPS.filter((g) => allItems.some((i) => pantryGroupOf(i.name) === g.key));
  // Filter zonder treffers meer (bv. net bijgevuld of laatste product weg): terug naar alles.
  const filterStillUseful = filter === "alles" || (filter === "bijnaOp" ? lowCount > 0 : presentGroups.some((g) => g.key === filter));
  const activeFilter: PantryFilter = filterStillUseful ? filter : "alles";
  const query = search.trim().toLowerCase();
  const visibleItems = allItems.filter(
    (i) =>
      (activeFilter === "alles" || (activeFilter === "bijnaOp" ? isPantryLow(i) : pantryGroupOf(i.name) === activeFilter)) &&
      (!query || i.name.toLowerCase().includes(query)),
  );
  const hasItems = allItems.length > 0;

  async function handleAdd(item: { name: string; quantityPerPackage: number; unit: string; packages: number }) {
    if (!user) return;
    // Heb je dit al (zelfde naam en verpakking)? Dan telt het erbij op in plaats van een tweede rij.
    const existing = allItems.find(
      (i) => i.name.trim().toLowerCase() === item.name.trim().toLowerCase() && i.unit === item.unit && i.quantityPerPackage === item.quantityPerPackage,
    );
    if (existing) {
      await db.transact(db.tx.freezerItems[existing.id].update({ packages: existing.packages + item.packages }));
      return;
    }
    const maxOrder = allItems.reduce((max, fi) => Math.max(max, fi.order ?? 0), 0);
    await db.transact(
      db.tx.freezerItems[instantId()].update({
        type: PANTRY_ITEM_TYPE,
        name: item.name,
        quantityPerPackage: item.quantityPerPackage,
        unit: item.unit,
        packages: item.packages,
        ownerId: user.id,
        order: maxOrder + 1,
      }),
    );
  }

  function handleChangeCount(item: PantryItem, next: number) {
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

  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col">
      <div aria-hidden className={cn("fixed inset-0 -z-10", PANTRY_GRADIENT_CLASS)} />

      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow] duration-200",
          hasItems && "lg:hidden",
          isLargeTitleCollapsed
            ? "bg-[rgba(250,235,213,0.82)] shadow-[0_1px_0_var(--border-subtle)] backdrop-blur-xl [[data-theme=dark]_&]:bg-[rgba(46,35,25,0.82)]"
            : "shadow-none",
        )}
      >
        <div className="flex justify-center px-4">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4">
            <button type="button" aria-label="Terug" onClick={() => router.push("/")} className={headerRoundButtonClass}>
              <span
                aria-hidden
                className="inline-block size-6 shrink-0 bg-[var(--blue-500)]"
                style={{ WebkitMask: "url(/icons/arrow.svg) center/contain no-repeat", mask: "url(/icons/arrow.svg) center/contain no-repeat" }}
              />
            </button>
            <p
              className={cn(
                "min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]",
                "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
                isLargeTitleCollapsed || !hasItems ? "translate-y-0 opacity-100" : "opacity-0 motion-safe:translate-y-1",
              )}
            >
              Voorraadkast
            </p>
            <div className="size-10 shrink-0" aria-hidden />
          </header>
        </div>
      </div>

      {hasItems ? (
        <div
          className={cn(
            "relative z-10 flex flex-1 justify-center px-4",
            "pb-[calc(88px+env(safe-area-inset-bottom,0px))]",
            "pt-[calc(64px+32px+env(safe-area-inset-top,0px))] lg:pt-[calc(40px+env(safe-area-inset-top,0px))]",
          )}
        >
          <div className="flex w-full max-w-[956px] flex-col gap-4 motion-safe:animate-fade-up">
            <div className="flex w-full min-w-0 items-center gap-3">
              <PageBackButton href="/" label="Terug naar de startpagina" />
              <h1 ref={largeTitleRef} className="min-w-0 flex-1 truncate text-page-title font-bold leading-32 tracking-tight text-[var(--text-primary)]">
                Voorraadkast
              </h1>
              <span className="shrink-0 whitespace-nowrap text-[15px] font-bold tabular-nums text-[var(--blue-500)]">
                {allItems.length} {allItems.length === 1 ? "product" : "producten"}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-4">
              <SearchBar
                surface="app"
                placeholder="Zoek in de voorraadkast"
                aria-label="Zoek in de voorraadkast"
                value={search}
                onValueChange={setSearch}
                className="lg:w-[320px]"
              />
              <FilterChipRow ariaLabel="Filter de voorraadkast">
                <FilterChip selected={activeFilter === "alles"} onClick={() => setFilter("alles")}>Alles</FilterChip>
                {presentGroups.map((g) => (
                  <FilterChip key={g.key} selected={activeFilter === g.key} onClick={() => setFilter(g.key)}>{g.label}</FilterChip>
                ))}
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
                {PANTRY_GROUPS.map((g) => {
                  const items = visibleItems.filter((i) => pantryGroupOf(i.name) === g.key);
                  return items.length > 0 ? <PantryGroupCard key={g.key} title={g.label} items={items} onChangeCount={handleChangeCount} /> : null;
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-[15px] text-[var(--text-secondary)]">
                {query ? `Niets gevonden voor «${search.trim()}»` : "Hier staat nu niets"}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[calc(64px+env(safe-area-inset-top,0px))] motion-safe:animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/ingredients/bloem_320.webp" alt="" width={96} height={96} className="size-24 object-contain mix-blend-multiply motion-safe:animate-float [[data-theme=dark]_&]:mix-blend-normal" />
          <p className="max-w-[300px] text-center text-base font-medium leading-6 text-[var(--text-secondary)]">
            Nog niets in je voorraadkast. Voeg bloem, olie, koekjes of chips toe.
          </p>
          <MiniButton variant="primary" onClick={() => setAddModalOpen(true)}>
            Voeg product toe
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
            <FloatingActionButton aria-label="Product toevoegen" className="pointer-events-auto shrink-0" onClick={() => setAddModalOpen(true)} />
          </div>
        </div>
      )}

      <NewFreezerItemModal mode="voorraadkast" open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAdd} />
    </div>
  );
}
