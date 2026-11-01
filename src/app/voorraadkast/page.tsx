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
import { normalizeForMatch, useItemPhotoUrl, useItemSlugs, useItemSynonyms } from "@/lib/item-photos";
import { matchItemSlugsForAutocomplete } from "@/lib/item-slug-autocomplete";
import { slugToDisplayName } from "@/components/ui/item_name_autocomplete";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import {
  PANTRY_PRODUCT_UNITS,
  buildFreezerSearch,
  freezerStockLabel,
  freezerUndoLines,
  freezerUnitPatch,
  nextFreezerUndo,
  type FreezerEntry,
  type FreezerUndo,
} from "@/lib/freezer-search";
import { CountStepper } from "@/components/ui/count_stepper";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { PANTRY_GRADIENT_CLASS, PantryDecor } from "@/components/ui/pantry_background";
import { SearchBar } from "@/components/ui/search_bar";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";
import { isPantryItem, isPantryLow, pantryGroupOf, PANTRY_GROUPS, PANTRY_ITEM_TYPE, type PantryGroup } from "@/lib/pantry";

/** Canvas «VK · Voorraadkast», C · Tweeling van de diepvries: snelle lijst met steppers op een warm verloop. */

type PantryItem = FreezerEntry;

function PantryRow({
  name,
  subtitle,
  trailing,
  children,
}: {
  name: string;
  subtitle: React.ReactNode;
  trailing: React.ReactNode;
  children?: React.ReactNode;
}) {
  const getItemPhoto = useItemPhotoUrl(160);
  const photo = getItemPhoto(name);

  return (
    <div>
      <div className="flex w-full items-center gap-3 py-[9px] pl-3 pr-2.5">
        {photo ? (
          <span className="flex size-11 shrink-0 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
            <img src={photo} alt="" width={36} height={36} className="size-9 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
          </span>
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold" style={teKopenMonogramStyle(name)} aria-hidden>
            {name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1 leading-[19px]">
          <span className="block truncate text-[15px] font-semibold text-text-primary first-letter:uppercase">{name}</span>
          <span className="block truncate text-[13px] text-[var(--text-secondary)]">{subtitle}</span>
        </span>
        {trailing}
      </div>
      {children}
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
const MAX_RESULTS = 8;

export default function VoorraadkastPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [search, setSearch] = React.useState("");
  const [searchFocused, setSearchFocused] = React.useState(false);
  /** In deze zoekbeurt toegevoegd: blijft op zijn plaats in de resultaten staan (met stepper en eenheden). */
  const [addedIds, setAddedIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const [filter, setFilter] = React.useState<PantryFilter>("alles");
  const [undo, setUndo] = React.useState<FreezerUndo | null>(null);
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } = useLargeTitleCollapse<HTMLHeadingElement>(64);

  const typed = search.trim();
  const searching = typed.length > 0;

  const { data, isLoading: dataLoading } = db.useQuery(user ? { freezerItems: {} } : null);
  const itemSlugs = useItemSlugs();
  const itemSynonyms = useItemSynonyms();
  const productMatches = React.useMemo(() => {
    const norm = normalizeForMatch(typed);
    if (!norm || !itemSlugs.length) return [];
    return matchItemSlugsForAutocomplete(norm, itemSlugs, itemSynonyms, MAX_RESULTS).map(slugToDisplayName);
  }, [itemSlugs, itemSynonyms, typed]);

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
  const results = searching
    ? buildFreezerSearch({ query: typed, items: allItems, recipes: [], productNames: productMatches, addedIds, filter: "product" })
    : null;
  const searchHasResults = results && (results.inFreezer.length > 0 || results.products.length > 0);

  function changeSearch(next: string) {
    setSearch(next);
    if (!next.trim()) setAddedIds(new Set());
  }

  function cancelSearch() {
    changeSearch("");
    setSearchFocused(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  /** Tik op + : meteen in de voorraadkast (1 stuk), met «Ongedaan» en eenheden om bij te stellen. */
  function addProduct(name: string) {
    if (!user) return;
    const id = instantId();
    const record = {
      type: PANTRY_ITEM_TYPE,
      name,
      quantityPerPackage: 1,
      unit: "stuk",
      packages: 1,
      ownerId: user.id,
      order: allItems.reduce((max, fi) => Math.max(max, fi.order ?? 0), 0) + 1,
    };
    void db.transact(db.tx.freezerItems[id].update(record));
    setAddedIds((current) => new Set(current).add(id));
    setUndo({ id, before: null, after: { id, ...record } });
  }

  function handleChangeCount(item: PantryItem, next: number) {
    if (next <= 0) void db.transact(db.tx.freezerItems[item.id].delete());
    else void db.transact(db.tx.freezerItems[item.id].update({ packages: next }));
    setUndo((current) => nextFreezerUndo(current, item, next <= 0 ? null : { ...item, packages: next }));
  }

  function handleChangeUnit(item: PantryItem, unit: string) {
    const patch = freezerUnitPatch(item, unit);
    void db.transact(db.tx.freezerItems[item.id].update(patch));
    setUndo((current) => nextFreezerUndo(current, item, { ...item, ...patch }));
  }

  function handleUndo() {
    if (!undo) return;
    if (!undo.before) {
      void db.transact(db.tx.freezerItems[undo.id].delete());
    } else {
      const { id, ...fields } = undo.before;
      // Update op hetzelfde id zet ook een verwijderd item terug.
      void db.transact(db.tx.freezerItems[id].update(JSON.parse(JSON.stringify(fields))));
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
          {isPantryLow(item) ? <span className="font-bold text-[var(--secondary-700)]">Laatste · </span> : null}
          {item.quantityPerPackage} {item.unit}
        </>
      }
      trailing={stepper(item)}
    />
  );
  const stockRow = (item: PantryItem) => (
    <PantryRow
      key={item.id}
      name={item.name}
      subtitle={<span className="font-bold text-[var(--blue-500)]">In voorraad: {freezerStockLabel(item)}</span>}
      trailing={stepper(item)}
    >
      {addedIds.has(item.id) ? (
        <div role="group" aria-label={`Eenheid voor ${item.name}`} className="flex flex-wrap gap-1.5 pb-2.5 pl-[68px] pr-2.5">
          {PANTRY_PRODUCT_UNITS.map((u) => (
            <FilterChip key={u} selected={item.unit === u} onClick={() => handleChangeUnit(item, u)}>
              {u}
            </FilterChip>
          ))}
        </div>
      ) : null}
    </PantryRow>
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
            <span className="shrink-0 whitespace-nowrap text-[15px] font-bold tabular-nums text-[var(--blue-500)]">
              {allItems.length} {allItems.length === 1 ? "product" : "producten"}
            </span>
          </div>

          {/* Zoals de diepvries: het zoekveld is ook de toevoegknop. */}
          <div className="flex flex-col gap-2.5 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 items-center gap-3 lg:w-[400px]">
              <SearchBar
                surface="app"
                placeholder="Zoek of voeg toe aan de voorraadkast"
                aria-label="Zoek of voeg toe aan de voorraadkast"
                value={search}
                onValueChange={changeSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1"
              />
              {searchFocused || searching ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cancelSearch}
                  className="shrink-0 text-[15px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  Annuleer
                </button>
              ) : null}
            </div>
            {hasItems && !searching ? (
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
            ) : null}
          </div>

          {results ? (
            /* ── Typen: eerst wat je al hebt, daaronder wat je kunt toevoegen ── */
            <div className="flex flex-col">
              {searchHasResults ? (
                <div className="lg:columns-2 lg:gap-4">
                  {results.inFreezer.length > 0 ? <PantryGroupCard title="In je voorraadkast">{results.inFreezer.map(stockRow)}</PantryGroupCard> : null}
                  {results.products.length > 0 ? (
                    <PantryGroupCard title="Producten">
                      {results.products.map(({ name, stock }) =>
                        stock ? (
                          stockRow(stock)
                        ) : (
                          <PantryRow
                            key={name}
                            name={name}
                            subtitle="Product"
                            trailing={
                              <RoundIconButton tone="primary" size={36} onClick={() => addProduct(name)} aria-label={`${name} toevoegen aan de voorraadkast`}>
                                {RoundIcons.plus}
                              </RoundIconButton>
                            }
                          />
                        ),
                      )}
                    </PantryGroupCard>
                  ) : null}
                </div>
              ) : null}
              {results.createName ? (
                <button
                  type="button"
                  onClick={() => addProduct(results.createName!)}
                  className="flex h-12 w-full items-center gap-2.5 rounded-[14px] px-3 text-left text-[15px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-[18px] shrink-0">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="min-w-0 truncate">«{results.createName}» als nieuw product</span>
                </button>
              ) : null}
            </div>
          ) : !hasItems ? (
            /* ── Lege voorraadkast: het zoekveld hierboven is de ingang ── */
            <div className="flex flex-col items-center gap-4 py-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/ingredients/bloem_320.webp" alt="" width={96} height={96} className="size-24 object-contain mix-blend-multiply motion-safe:animate-float [[data-theme=dark]_&]:mix-blend-normal" />
              <p className="max-w-[320px] text-center text-base font-medium leading-6 text-[var(--text-secondary)]">
                Nog niets in je voorraadkast. Zoek hierboven bloem, olie, koekjes of chips om toe te voegen.
              </p>
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
    </div>
  );
}
