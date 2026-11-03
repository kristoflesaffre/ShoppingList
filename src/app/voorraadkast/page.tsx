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
  freezerStockLabel,
} from "@/lib/freezer-search";
import { Button } from "@/components/ui/button";
import { CountStepper } from "@/components/ui/count_stepper";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import type { Rgb } from "@/components/ui/category_card";
import { SectionIndex } from "@/components/ui/section_index";
import { categoryColor } from "@/app/lijstje/[id]/list_cards_view";
import { scrollSpyId, useScrollSpy } from "@/lib/use_scroll_spy";
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

/** Canvas «Voorraadkast · 4 layouts» A: witte kaart, kop = bolletje · titel · aantal; de actieve groep krijgt op desktop een blauw streepje links. */
function PantryGroupCard({
  id,
  title,
  dotColor,
  active = false,
  children,
}: {
  id?: string;
  title: string;
  dotColor?: string;
  active?: boolean;
  children: React.ReactNode[];
}) {
  return (
    <section id={id} aria-label={title} className="relative overflow-visible">
      {active ? <span aria-hidden className="absolute -left-3 top-3.5 hidden h-[22px] w-1 rounded-full bg-[var(--blue-500)] lg:block" /> : null}
      <div className="overflow-hidden rounded-[20px] bg-[var(--white)] shadow-card">
        <div className="flex items-center gap-2 px-3.5 pb-1.5 pt-3">
          {dotColor ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} /> : null}
          <h2 className="truncate text-[14px] font-bold text-[var(--text-primary)]">{title}</h2>
          <span className="text-[13px] tabular-nums text-[var(--text-tertiary)]">{children.length}</span>
        </div>
        <ul>
          {children.map((child, k) => (
            <li key={k} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
              {child}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Kleur per groep: dezelfde tinten als de categoriekaarten op een lijstje; kruiden groen. */
const GROUP_RGB: Record<PantryGroup, Rgb> = {
  bakken: categoryColor("Bakproducten"),
  olie: categoryColor("Olie"),
  kruiden: categoryColor("Groente"),
  snacks: categoryColor("Snacks"),
  overig: [112, 119, 132],
};
const rgbCss = (rgb: Rgb) => `rgb(${rgb.join(",")})`;

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="var(--status-warning)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}
const SPY_PREFIX = "voorraad";

/** Zolang de melding staat, kan de hele reeks wijzigingen aan dit item ongedaan gemaakt worden. */
const UNDO_VISIBLE_MS = 6000;

export default function VoorraadkastPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [search, setSearch] = React.useState("");
  const [searchFocused, setSearchFocused] = React.useState(false);
  /** Blad «Product toevoegen» open, met deze beginzoekterm. */
  const [addQuery, setAddQuery] = React.useState<string | null>(null);
  /** «Bijna op» is het enige filter; de groepen zijn een inhoudstafel die naar de sectie springt. */
  const [lowOnly, setLowOnly] = React.useState(false);
  /** Na het wissen van zoeken / «Bijna op» eerst renderen, dan springen. */
  const [pendingJump, setPendingJump] = React.useState<string | null>(null);
  const stickyRef = React.useRef<HTMLDivElement>(null);
  const [undo, setUndo] = React.useState<FreezerUndo | null>(null);
  /** Datumkiezer «Vervaldatum» open voor dit product. */
  const [expiryItem, setExpiryItem] = React.useState<PantryItem | null>(null);
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } = useLargeTitleCollapse<HTMLHeadingElement>(64);

  const typed = search.trim();
  const searching = typed.length > 0;

  const { data, isLoading: dataLoading } = db.useQuery(user ? { freezerItems: {} } : null);

  const allItems = (data?.freezerItems ?? [])
    .filter((item) => isPantryItem(item) && (!item.ownerId || item.ownerId === user?.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) as PantryItem[];
  const presentGroups = PANTRY_GROUPS.filter((g) => allItems.some((i) => pantryGroupOf(i.name) === g.key));

  // Gsm: de zoekbalk met chips plakt onder de topbalk; desktop: een kleine marge boven de sectie.
  const spyOffset = React.useCallback(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return 24;
    return stickyRef.current?.getBoundingClientRect().bottom ?? 0;
  }, []);
  const { active: activeGroup, jumpTo } = useScrollSpy(SPY_PREFIX, presentGroups.map((g) => g.key), spyOffset);

  React.useEffect(() => {
    if (!pendingJump) return;
    if (pendingJump === "alles") window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    else jumpTo(pendingJump);
    setPendingJump(null);
  }, [pendingJump, jumpTo]);

  // Gsm: de actieve chip schuift mee in beeld.
  React.useEffect(() => {
    const row = stickyRef.current?.querySelector<HTMLElement>("[data-jump-chips] > div");
    const chip = row?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (!row || !chip) return;
    const r = row.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    if (c.left < r.left + 16 || c.right > r.right - 16) row.scrollBy({ left: c.left - r.left - 16, behavior: "smooth" });
  }, [activeGroup, lowOnly]);

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

  const lowItems = allItems.filter(isPantryLow);
  const lowCount = lowItems.length;
  // «Bijna op» zonder treffers meer (bv. net bijgevuld): terug naar alles.
  const showLow = lowOnly && lowCount > 0;
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

  /** Inhoudstafel: naar een groep springen (zoeken en «Bijna op» gaan dan uit). */
  function goTo(key: string) {
    if (key === "bijnaOp") {
      setLowOnly(true);
      setSearch("");
      window.scrollTo({ top: 0 });
      return;
    }
    setLowOnly(false);
    setSearch("");
    setPendingJump(key);
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
          {freezerStockLabel(item)}
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
            ? "bg-[rgba(250,235,213,0.82)] backdrop-blur-xl [[data-theme=dark]_&]:bg-[rgba(46,35,25,0.82)]"
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

          <div className={cn("flex flex-col gap-4", hasItems && "lg:grid lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start lg:gap-6")}>
          {hasItems ? (
            <SectionIndex
              ariaLabel="Groepen in je voorraadkast"
              className="sticky top-10 hidden lg:block"
              activeKey={searching ? null : showLow ? "bijnaOp" : activeGroup}
              onSelect={goTo}
              items={[
                { key: "alles", label: "Alles", count: allItems.length, separatorAfter: lowCount === 0 },
                ...(lowCount > 0 ? [{ key: "bijnaOp", label: "Bijna op", count: lowCount, icon: <WarningIcon />, separatorAfter: true }] : []),
                ...presentGroups.map((g) => ({
                  key: g.key,
                  label: g.label,
                  count: allItems.filter((i) => pantryGroupOf(i.name) === g.key).length,
                  dotColor: rgbCss(GROUP_RGB[g.key]),
                })),
              ]}
            />
          ) : null}
          <div className="flex min-w-0 flex-col gap-4">
          {/* Het zoekveld zoekt in je eigen voorraad; toevoegen gebeurt in het blad «Product toevoegen». Gsm: plakt met de chips onder de topbalk. */}
          <div
            ref={stickyRef}
            className={cn(
              "sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-10 -mx-4 flex flex-col gap-2.5 px-4 py-2 transition-[background-color,box-shadow] duration-200",
              "lg:static lg:mx-0 lg:p-0",
              isLargeTitleCollapsed
                ? "bg-[rgba(250,235,213,0.82)] shadow-[0_1px_0_var(--border-subtle)] backdrop-blur-xl [[data-theme=dark]_&]:bg-[rgba(46,35,25,0.82)] lg:bg-transparent lg:shadow-none lg:backdrop-blur-none"
                : "",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
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
              <div data-jump-chips className="lg:hidden">
                <FilterChipRow ariaLabel="Groepen in je voorraadkast">
                  {lowCount > 0 ? (
                    <FilterChip
                      surface="onColor"
                      selected={showLow}
                      onClick={() => (showLow ? goTo("alles") : goTo("bijnaOp"))}
                      dotColor="var(--status-warning)"
                      count={lowCount}
                    >
                      Bijna op
                    </FilterChip>
                  ) : null}
                  {presentGroups.map((g) => (
                    <FilterChip surface="onColor" key={g.key} selected={!showLow && activeGroup === g.key} onClick={() => goTo(g.key)} dotColor={rgbCss(GROUP_RGB[g.key])}>
                      {g.label}
                    </FilterChip>
                  ))}
                </FilterChipRow>
              </div>
            ) : null}
          </div>

          {searchResults ? (
            searchResults.length > 0 ? (
              <PantryGroupCard title="In je voorraadkast">{searchResults.map(restRow)}</PantryGroupCard>
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
          ) : showLow ? (
            <PantryGroupCard title="Bijna op" dotColor="var(--status-warning)">{lowItems.map(restRow)}</PantryGroupCard>
          ) : (
            <div className="flex flex-col gap-3 lg:gap-4">
              {presentGroups.map((g) => (
                <PantryGroupCard
                  key={g.key}
                  id={scrollSpyId(SPY_PREFIX, g.key)}
                  title={g.label}
                  dotColor={rgbCss(GROUP_RGB[g.key])}
                  active={activeGroup === g.key}
                >
                  {allItems.filter((i) => pantryGroupOf(i.name) === g.key).map(restRow)}
                </PantryGroupCard>
              ))}
            </div>
          )}
          </div>
          </div>
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
