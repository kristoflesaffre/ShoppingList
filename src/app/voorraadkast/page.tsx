"use client";

import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import * as React from "react";
import { PageBackButton } from "@/components/ui/page_back_button";
import { useRouter } from "next/navigation";
import { APP_FAB_BOTTOM_NO_NAV_CLASS, APP_FAB_INNER_PX4_CLASS } from "@/lib/app-layout";
import { db } from "@/lib/db";
import { id as instantId } from "@instantdb/react";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { cn } from "@/lib/utils";
import {
  freezerUndoLines,
  nextFreezerUndo,
  type FreezerEntry,
  type FreezerUndo,
} from "@/lib/freezer-search";
import { Button } from "@/components/ui/button";
import { CountStepper } from "@/components/ui/count_stepper";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { DatePickerModal } from "@/components/list_date_stepper";
import { PantryExpiryNote } from "@/components/pantry_expiry_note";
import { pantryExpiryQuickPicks } from "@/lib/pantry-expiry";
import { pantryNewPatch, pantryStockPatch } from "@/lib/pantry-add";
import { PantryAddSheet, PantryProductPhoto, type PantryAddition } from "./pantry_add_sheet";
import { PANTRY_GRADIENT_CLASS, PantryDecor } from "@/components/ui/pantry_background";
import { SearchBar } from "@/components/ui/search_bar";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";
import { isPantryItem, isPantryLow, pantryGroupOf, PANTRY_GROUPS, PANTRY_ITEM_TYPE, type PantryGroup } from "@/lib/pantry";

/** Canvas «VK · Voorraadkast», C · Tweeling van de diepvries: snelle lijst met steppers op een warm verloop. */

type PantryItem = FreezerEntry;

function PantryRow({
  name,
  subtitle,
  trailing,
  onOpen,
}: {
  name: string;
  subtitle: React.ReactNode;
  trailing: React.ReactNode;
  /** Tik op de naam: vervaldatum instellen. */
  onOpen?: () => void;
}) {
  const label = (
    <>
      <span className="block truncate text-[15px] font-semibold text-text-primary first-letter:uppercase">{name}</span>
      <span className="block truncate text-[13px] text-[var(--text-secondary)]">{subtitle}</span>
    </>
  );

  return (
    <div className="flex w-full items-center gap-3 py-[9px] pl-3 pr-2.5">
      <PantryProductPhoto name={name} />
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Vervaldatum van ${name}`}
          className="min-w-0 flex-1 rounded-[12px] text-left leading-[19px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          {label}
        </button>
      ) : (
        <span className="min-w-0 flex-1 leading-[19px]">{label}</span>
      )}
      {trailing}
    </div>
  );
}

function PantryGroupCard({ title, children }: { title: string; children: React.ReactNode[] }) {
  return (
    <section className="mb-3 break-inside-avoid lg:mb-4">
      <h2 className="mb-[7px] ml-1 text-[13px] font-bold text-[var(--text-secondary)]">{title}</h2>
      <ul className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
        {children.map((child, k) => (
          <li key={k} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
            {child}
          </li>
        ))}
      </ul>
    </section>
  );
}

type PantryFilter = "alles" | "bijnaOp" | PantryGroup;

/** Zolang de melding staat, kan de hele reeks wijzigingen aan dit item ongedaan gemaakt worden. */
const UNDO_VISIBLE_MS = 6000;

export default function VoorraadkastPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [search, setSearch] = React.useState("");
  const [searchFocused, setSearchFocused] = React.useState(false);
  /** Blad «Product toevoegen» open, met deze beginzoekterm. */
  const [addQuery, setAddQuery] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<PantryFilter>("alles");
  const [undo, setUndo] = React.useState<FreezerUndo | null>(null);
  /** Datumkiezer «Vervaldatum» open voor dit product. */
  const [expiryItem, setExpiryItem] = React.useState<PantryItem | null>(null);
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } = useLargeTitleCollapse<HTMLHeadingElement>(64);

  const typed = search.trim();
  const searching = typed.length > 0;

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
  const visibleItems = allItems.filter(
    (i) => activeFilter === "alles" || (activeFilter === "bijnaOp" ? isPantryLow(i) : pantryGroupOf(i.name) === activeFilter),
  );
  const hasItems = allItems.length > 0;
  // Zoeken gaat altijd over de hele voorraadkast (de filters staan dan even weg).
  const searchResults = searching ? allItems.filter((i) => i.name.toLowerCase().includes(typed.toLowerCase())) : null;

  /** Knop «Toevoegen» in het blad: nieuw product, of het aantal erbij als je het al hebt; met «Ongedaan». */
  function addProduct({ name, stock, quantity, unit, expiryDate }: PantryAddition) {
    if (!user) return;
    if (stock) {
      const patch = pantryStockPatch(stock, quantity, expiryDate);
      void db.transact(db.tx.freezerItems[stock.id].update(patch));
      setUndo({ id: stock.id, before: stock, after: { ...stock, ...patch } });
    } else {
      const id = instantId();
      const record = {
        type: PANTRY_ITEM_TYPE,
        name,
        ownerId: user.id,
        order: allItems.reduce((max, fi) => Math.max(max, fi.order ?? 0), 0) + 1,
        ...pantryNewPatch(quantity, unit, expiryDate),
      };
      void db.transact(db.tx.freezerItems[id].update(record));
      setUndo({ id, before: null, after: { id, ...record } });
    }
    setAddQuery(null);
    setSearch("");
  }

  function handleChangeCount(item: PantryItem, next: number) {
    if (next <= 0) void db.transact(db.tx.freezerItems[item.id].delete());
    else void db.transact(db.tx.freezerItems[item.id].update({ packages: next }));
    setUndo((current) => nextFreezerUndo(current, item, next <= 0 ? null : { ...item, packages: next }));
  }

  function openExpiry(item: PantryItem) {
    setExpiryItem(item);
  }

  function saveExpiry(value: string) {
    if (!expiryItem) return;
    void db.transact(db.tx.freezerItems[expiryItem.id].update({ expiryDate: value || null }));
    setExpiryItem(null);
  }

  function handleUndo() {
    if (!undo) return;
    if (!undo.before) {
      void db.transact(db.tx.freezerItems[undo.id].delete());
    } else {
      const { id, ...fields } = undo.before;
      // Update op hetzelfde id zet ook een verwijderd item terug.
      void db.transact(db.tx.freezerItems[id].update(JSON.parse(JSON.stringify({ ...fields, expiryDate: fields.expiryDate ?? null }))));
    }
    setUndo(null);
  }

  const stepper = (item: PantryItem) => (
    <CountStepper name={item.name} value={item.packages} tone="soft" onChange={(next) => handleChangeCount(item, next)} />
  );
  const restRow = (item: PantryItem) => (
    <PantryRow
      key={item.id}
      name={item.name}
      subtitle={
        <>
          {item.quantityPerPackage} {item.unit}
          {item.expiryDate ? " " : " · "}
          <PantryExpiryNote expiryDate={item.expiryDate} />
        </>
      }
      trailing={stepper(item)}
      onOpen={() => openExpiry(item)}
    />
  );

  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col">
      <div aria-hidden className={cn("fixed inset-0 -z-10 isolate overflow-hidden", PANTRY_GRADIENT_CLASS)}>
        <PantryDecor />
      </div>

      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow] duration-200",
          "lg:hidden",
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
                isLargeTitleCollapsed ? "translate-y-0 opacity-100" : "opacity-0 motion-safe:translate-y-1",
              )}
            >
              Voorraadkast
            </p>
            <div className="size-10 shrink-0" aria-hidden />
          </header>
        </div>
      </div>

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
            <div className="hidden shrink-0 lg:block">
              <Button size="sm" onClick={() => setAddQuery("")}>+ Toevoegen</Button>
            </div>
          </div>

          {/* Het zoekveld zoekt in je eigen voorraad; toevoegen gebeurt in het blad «Product toevoegen». */}
          <div className="flex flex-col gap-2.5 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 items-center gap-3 lg:w-[400px]">
              <SearchBar
                surface="app"
                placeholder="Zoek in je voorraadkast"
                aria-label="Zoek in je voorraadkast"
                value={search}
                onValueChange={setSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1"
              />
            </div>
            {hasItems && !searching ? (
              <FilterChipRow ariaLabel="Filter de voorraadkast">
                <FilterChip surface="onColor" selected={activeFilter === "alles"} onClick={() => setFilter("alles")}>Alles</FilterChip>
                {presentGroups.map((g) => (
                  <FilterChip surface="onColor" key={g.key} selected={activeFilter === g.key} onClick={() => setFilter(g.key)}>{g.label}</FilterChip>
                ))}
                {lowCount > 0 ? (
                  <FilterChip
                    surface="onColor"
                    selected={activeFilter === "bijnaOp"}
                    onClick={() => setFilter("bijnaOp")}
                    dotColor="var(--status-warning)"
                    count={lowCount}
                  >
                    Bijna op
                  </FilterChip>
                ) : null}
              </FilterChipRow>
            ) : null}
          </div>

          {searchResults ? (
            searchResults.length > 0 ? (
              <div className="lg:columns-2 lg:gap-4">
                <PantryGroupCard title="In je voorraadkast">{searchResults.map(restRow)}</PantryGroupCard>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-center text-[15px] text-[var(--text-secondary)]">«{typed}» staat nog niet in je voorraadkast</p>
                <div>
                  <Button size="sm" onClick={() => setAddQuery(typed)}>+ Toevoegen</Button>
                </div>
              </div>
            )
          ) : !hasItems ? (
            <div className="flex flex-col items-center gap-4 py-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/ingredients/bloem_320.webp" alt="" width={96} height={96} className="size-24 object-contain mix-blend-multiply motion-safe:animate-float [[data-theme=dark]_&]:mix-blend-normal" />
              <p className="max-w-[320px] text-center text-base font-medium leading-6 text-[var(--text-secondary)]">
                Nog niets in je voorraadkast. Voeg bloem, olie, koekjes of chips toe.
              </p>
              <div>
                <Button size="sm" onClick={() => setAddQuery("")}>+ Toevoegen</Button>
              </div>
            </div>
          ) : visibleItems.length > 0 ? (
            <div className="lg:columns-2 lg:gap-4">
              {PANTRY_GROUPS.map((g) => {
                const items = visibleItems.filter((i) => pantryGroupOf(i.name) === g.key);
                return items.length > 0 ? <PantryGroupCard key={g.key} title={g.label}>{items.map(restRow)}</PantryGroupCard> : null;
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-[15px] text-[var(--text-secondary)]">Hier staat nu niets</p>
          )}
        </div>
      </div>

      {!undo && !searching && !searchFocused ? (
        <div className={cn("pointer-events-none fixed inset-x-0 z-20 lg:hidden", APP_FAB_BOTTOM_NO_NAV_CLASS)}>
          <div className={APP_FAB_INNER_PX4_CLASS}>
            <FloatingActionButton aria-label="Toevoegen aan de voorraadkast" className="pointer-events-auto" onClick={() => setAddQuery("")} />
          </div>
        </div>
      ) : null}

      {undo ? (
        <div className={cn("pointer-events-none fixed inset-x-0 z-20", APP_FAB_BOTTOM_NO_NAV_CLASS)}>
          <div className={cn(APP_FAB_INNER_PX4_CLASS, "items-center gap-3")}>
            <div
              role="status"
              className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 rounded-[16px] bg-[var(--text-primary)] py-1.5 pl-4 pr-1.5 text-[var(--white)] shadow-[0_14px_30px_-12px_rgba(16,17,48,0.6)] motion-safe:animate-fade-up lg:max-w-[360px] lg:flex-none lg:basis-[360px]"
            >
              <span className="min-w-0 flex-1 text-[13px] leading-[17px]">
                <span className="block truncate first-letter:uppercase">{freezerUndoLines(undo, "voorraadkast")[0]}</span>
                <span className="block truncate opacity-75">{freezerUndoLines(undo, "voorraadkast")[1]}</span>
              </span>
              <button
                type="button"
                onClick={handleUndo}
                className="h-[38px] shrink-0 rounded-[12px] px-2.5 text-sm font-bold text-[var(--white)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)]"
              >
                Ongedaan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addQuery !== null ? (
        <PantryAddSheet items={allItems} initialQuery={addQuery} onClose={() => setAddQuery(null)} onAdd={addProduct} />
      ) : null}

      {expiryItem ? (
        <DatePickerModal
          title={`${expiryItem.name} houdbaar tot`}
          value={expiryItem.expiryDate ?? ""}
          quickPicks={pantryExpiryQuickPicks()}
          onClose={() => setExpiryItem(null)}
          onPick={saveExpiry}
          onClear={expiryItem.expiryDate ? () => saveExpiry("") : undefined}
        />
      ) : null}
    </div>
  );
}
