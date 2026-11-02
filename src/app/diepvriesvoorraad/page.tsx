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
import { matchRecipesForAutocomplete } from "@/lib/recipe-search";
import { slugToDisplayName } from "@/components/ui/item_name_autocomplete";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import type { SavedRecipe } from "@/lib/recipe_library";
import {
  FREEZER_DISH_GROUPS,
  FREEZER_PRODUCT_UNITS,
  buildFreezerSearch,
  freezerDishGroupOf,
  freezerStockLabel,
  freezerUndoLines,
  freezerUnitPatch,
  nextFreezerUndo,
  type FreezerEntry,
  type FreezerRecipeOption,
  type FreezerUndo,
} from "@/lib/freezer-search";
import { CountStepper } from "@/components/ui/count_stepper";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
import { FROST_GRADIENT_CLASS, FrostDecor } from "@/components/ui/frost_background";
import { SearchBar } from "@/components/ui/search_bar";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";
import { isPantryItem } from "@/lib/pantry";

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

type FreezerItem = FreezerEntry;

// ─── Rij en groep — canvas «03 · Diepvriesvoorraad — 4 varianten», D · Snelle lijst ──

/** Nog één pakket of portie over. */
function isLow(item: FreezerItem): boolean {
  return item.packages === 1;
}

function freezerSubtitle(item: FreezerItem): string {
  if (item.type === "gerecht") return "Gerecht";
  return `${item.quantityPerPackage} ${item.unit}`;
}

function personsLabel(persons?: number | null): string {
  if (!persons) return "Recept";
  return `Recept · ${persons} ${persons === 1 ? "persoon" : "personen"}`;
}

/** Receptfoto (rond), productfoto of monogram. */
function FreezerThumb({ name, photoUrl, isDish }: { name: string; photoUrl?: string | null; isDish: boolean }) {
  const getItemPhoto = useItemPhotoUrl(160);
  const photo = photoUrl ?? getItemPhoto(name);
  if (photo && isDish) {
    // eslint-disable-next-line @next/next/no-img-element -- receptfoto
    return <img src={photo} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />;
  }
  if (photo) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
        <img src={photo} alt="" width={36} height={36} className="size-9 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
      </span>
    );
  }
  return (
    <span
      className={cn("flex size-11 shrink-0 items-center justify-center text-[17px] font-bold", isDish ? "rounded-full" : "rounded-[12px]")}
      style={teKopenMonogramStyle(name)}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function FreezerRow({
  name,
  photoUrl,
  isDish,
  subtitle,
  trailing,
  children,
}: {
  name: string;
  photoUrl?: string | null;
  isDish: boolean;
  subtitle: React.ReactNode;
  trailing: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex w-full items-center gap-3 py-[9px] pl-3 pr-2.5">
        <FreezerThumb name={name} photoUrl={photoUrl} isDish={isDish} />
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

/** Blauwe voorraadregel in de zoekresultaten: «In voorraad: 3 porties». */
function InStock({ item }: { item: FreezerItem }) {
  return <span className="font-bold text-[var(--blue-500)]">In voorraad: {freezerStockLabel(item)}</span>;
}

function FreezerGroup({ title, children }: { title: string; children: React.ReactNode[] }) {
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

type FreezerFilter = "alles" | "gerecht" | "product" | "bijnaOp";

/** Zolang de melding staat, kan de hele reeks wijzigingen aan dit item ongedaan gemaakt worden. */
const UNDO_VISIBLE_MS = 6000;
const MAX_RESULTS = 8;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiepvriesvoorraadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [search, setSearch] = React.useState("");
  const [searchFocused, setSearchFocused] = React.useState(false);
  /** In deze zoekbeurt toegevoegd: blijft op zijn plaats in de resultaten staan (met stepper). */
  const [addedIds, setAddedIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const [filter, setFilter] = React.useState<FreezerFilter>("alles");
  const [undo, setUndo] = React.useState<FreezerUndo | null>(null);
  /** Large-title-patroon: compacte titel pas zodra de grote titel wegscrolt. */
  const { titleRef: largeTitleRef, collapsed: isLargeTitleCollapsed } =
    useLargeTitleCollapse<HTMLHeadingElement>(64);

  const typed = search.trim();
  const searching = typed.length > 0;

  const { data: freezerData, isLoading: dataLoading } = db.useQuery(
    user ? { freezerItems: {} } : null,
  );
  // Recepten pas laden zodra je het zoekveld gebruikt.
  const { data: recipeData } = db.useQuery(user && (searchFocused || searching) ? { recipes: {} } : null);
  const itemSlugs = useItemSlugs();
  const itemSynonyms = useItemSynonyms();

  const allRecipes: SavedRecipe[] = React.useMemo(
    () =>
      [...(recipeData?.recipes ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((r) => ({
          id: r.id,
          name: r.name,
          link: r.link,
          steps: r.steps ?? "",
          persons: r.persons,
          photoUrl: r.photoUrl ?? null,
          ingredients: [],
        })),
    [recipeData],
  );
  const recipeMatches = React.useMemo(
    () => (searching ? matchRecipesForAutocomplete(typed, allRecipes, MAX_RESULTS) : []),
    [allRecipes, searching, typed],
  );
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

  const allItems: FreezerItem[] = (freezerData?.freezerItems ?? [])
    .filter((item) => !isPantryItem(item) && (!item.ownerId || item.ownerId === user.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) as FreezerItem[];

  const lowCount = allItems.filter(isLow).length;
  /** «Bijna op» zonder treffers meer (bv. net bijgevuld) of tijdens het zoeken: terug naar alles. */
  const activeFilter: FreezerFilter =
    filter === "bijnaOp" && (lowCount === 0 || searching) ? "alles" : filter;
  const visibleItems = allItems.filter(
    (i) => activeFilter === "alles" || (activeFilter === "bijnaOp" ? isLow(i) : i.type === activeFilter),
  );
  const gerechten = visibleItems.filter((i) => i.type === "gerecht");
  const producten = visibleItems.filter((i) => i.type === "product");
  const hasItems = allItems.length > 0;
  const results = searching
    ? buildFreezerSearch({
        query: typed,
        items: allItems,
        recipes: recipeMatches,
        productNames: productMatches,
        addedIds,
        filter: activeFilter === "bijnaOp" ? "alles" : activeFilter,
      })
    : null;

  function changeSearch(next: string) {
    setSearch(next);
    if (!next.trim()) setAddedIds(new Set());
  }

  /** Tik op + : meteen in de diepvries (1 portie of 1 stuk), met «Ongedaan». */
  function addToFreezer(fields: Omit<FreezerItem, "id" | "ownerId" | "order">) {
    if (!user) return;
    const id = instantId();
    const record = {
      ...fields,
      ownerId: user.id,
      order: allItems.reduce((max, fi) => Math.max(max, fi.order ?? 0), 0) + 1,
    };
    void db.transact(db.tx.freezerItems[id].update(JSON.parse(JSON.stringify(record))));
    setAddedIds((current) => new Set(current).add(id));
    setUndo({ id, before: null, after: { id, ...record } });
  }

  function addRecipe(recipe: FreezerRecipeOption) {
    addToFreezer({
      type: "gerecht",
      name: recipe.name,
      quantityPerPackage: 1,
      unit: "portie",
      packages: 1,
      recipeId: recipe.id,
      recipePhotoUrl: recipe.photoUrl ?? undefined,
      recipePersons: recipe.persons ?? undefined,
    });
  }

  function addProduct(name: string) {
    addToFreezer({ type: "product", name, quantityPerPackage: 1, unit: "stuk", packages: 1 });
  }

  function handleChangeCount(item: FreezerItem, next: number) {
    if (next <= 0) void db.transact(db.tx.freezerItems[item.id].delete());
    else void db.transact(db.tx.freezerItems[item.id].update({ packages: next }));
    setUndo((current) => nextFreezerUndo(current, item, next <= 0 ? null : { ...item, packages: next }));
  }

  function handleChangeUnit(item: FreezerItem, unit: string) {
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

  const totalPortions = allItems.reduce((sum, i) => sum + (i.packages ?? 0), 0);

  const stepper = (item: FreezerItem) => (
    <CountStepper name={item.name} value={item.packages} tone="soft" onChange={(next) => handleChangeCount(item, next)} />
  );
  const plus = (label: string, onClick: () => void) => (
    <RoundIconButton tone="primary" size={36} onClick={onClick} aria-label={`${label} toevoegen aan de diepvries`}>
      {RoundIcons.plus}
    </RoundIconButton>
  );
  const restRow = (item: FreezerItem) => (
    <FreezerRow
      key={item.id}
      name={item.name}
      photoUrl={item.recipePhotoUrl}
      isDish={item.type === "gerecht"}
      subtitle={
        <>
          {isLow(item) ? <span className="font-bold text-[var(--secondary-700)]">Laatste · </span> : null}
          {freezerSubtitle(item)}
        </>
      }
      trailing={stepper(item)}
    />
  );
  const stockRow = (item: FreezerItem) => (
    <FreezerRow
      key={item.id}
      name={item.name}
      photoUrl={item.recipePhotoUrl}
      isDish={item.type === "gerecht"}
      subtitle={<InStock item={item} />}
      trailing={stepper(item)}
    >
      {item.type !== "gerecht" && addedIds.has(item.id) ? (
        <div role="group" aria-label={`Eenheid voor ${item.name}`} className="flex flex-wrap gap-1.5 pb-2.5 pl-[68px] pr-2.5">
          {FREEZER_PRODUCT_UNITS.map((u) => (
            <FilterChip key={u} selected={item.unit === u} onClick={() => handleChangeUnit(item, u)}>
              {u}
            </FilterChip>
          ))}
        </div>
      ) : null}
    </FreezerRow>
  );

  const searchHasResults =
    results && (results.inFreezer.length > 0 || results.recipes.length > 0 || results.products.length > 0);

  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col">
      <div aria-hidden className={cn("fixed inset-0 -z-10 isolate overflow-hidden", FROST_GRADIENT_CLASS)}>
        <FrostDecor />
      </div>

      {/* Fixed header — zelfde horizontale kolom als body: px-4 buiten, max-w binnen (geen dubbele inspringing). */}
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow] duration-200",
          /* Desktop: terugknop staat naast de titel. */
          "lg:hidden",
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
                isLargeTitleCollapsed ? "translate-y-0 opacity-100" : "opacity-0 motion-safe:translate-y-1",
              )}
            >
              Diepvries
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

          {/* Canvas «Zoeken én toevoegen in één veld»: het zoekveld is ook de toevoegknop. */}
          <div className="flex flex-col gap-2.5 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 items-center gap-3 lg:w-[400px]">
              <SearchBar
                surface="app"
                placeholder="Zoek of voeg toe aan de diepvries"
                aria-label="Zoek of voeg toe aan de diepvries"
                value={search}
                onValueChange={changeSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1"
              />
            </div>
            <FilterChipRow ariaLabel="Filter de diepvries">
              <FilterChip surface="onColor" selected={activeFilter === "alles"} onClick={() => setFilter("alles")}>Alles</FilterChip>
              <FilterChip surface="onColor" selected={activeFilter === "gerecht"} onClick={() => setFilter("gerecht")}>Gerechten</FilterChip>
              <FilterChip surface="onColor" selected={activeFilter === "product"} onClick={() => setFilter("product")}>Producten</FilterChip>
              {lowCount > 0 && !searching ? (
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
          </div>

          {results ? (
            /* ── Typen: eerst wat je al hebt, daaronder wat je kunt toevoegen ── */
            <div className="flex flex-col">
              {searchHasResults ? (
                <div className="lg:columns-2 lg:gap-4">
                  {results.inFreezer.length > 0 ? (
                    <FreezerGroup title="In je diepvries">{results.inFreezer.map(stockRow)}</FreezerGroup>
                  ) : null}
                  {results.recipes.length > 0 ? (
                    <FreezerGroup title="Recepten">
                      {results.recipes.map(({ recipe, stock }) =>
                        stock ? (
                          stockRow(stock)
                        ) : (
                          <FreezerRow
                            key={recipe.id}
                            name={recipe.name}
                            photoUrl={recipe.photoUrl}
                            isDish
                            subtitle={personsLabel(recipe.persons)}
                            trailing={plus(recipe.name, () => addRecipe(recipe))}
                          />
                        ),
                      )}
                    </FreezerGroup>
                  ) : null}
                  {results.products.length > 0 ? (
                    <FreezerGroup title="Producten">
                      {results.products.map(({ name, stock }) =>
                        stock ? (
                          stockRow(stock)
                        ) : (
                          <FreezerRow
                            key={name}
                            name={name}
                            isDish={false}
                            subtitle="Product"
                            trailing={plus(name, () => addProduct(name))}
                          />
                        ),
                      )}
                    </FreezerGroup>
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
            /* ── Lege diepvries: het zoekveld hierboven is de ingang ── */
            <div className="flex flex-col items-center gap-4 py-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ui/empty_state_diepvries.png"
                alt=""
                width={96}
                height={96}
                className="size-24 object-contain motion-safe:animate-float"
              />
              <p className="text-center text-base font-medium leading-6 text-[var(--text-tertiary)]">
                Je diepvries is leeg. Zoek hierboven een gerecht of product om toe te voegen.
              </p>
            </div>
          ) : visibleItems.length > 0 ? (
            <div className="lg:columns-2 lg:gap-4">
              {/* Gerechten per soort: soepen bovenaan, dan purees, sauzen … (naam bepaalt de groep). */}
              {FREEZER_DISH_GROUPS.map((g) => {
                const dishes = gerechten.filter((i) => freezerDishGroupOf(i.name) === g.key);
                return dishes.length > 0 ? <FreezerGroup key={g.key} title={g.label}>{dishes.map(restRow)}</FreezerGroup> : null;
              })}
              {producten.length > 0 ? <FreezerGroup title="Producten">{producten.map(restRow)}</FreezerGroup> : null}
            </div>
          ) : (
            <p className="py-8 text-center text-[15px] text-[var(--text-secondary)]">Hier ligt nu niets</p>
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
                <span className="block truncate first-letter:uppercase">{freezerUndoLines(undo)[0]}</span>
                <span className="block truncate opacity-75">{freezerUndoLines(undo)[1]}</span>
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
