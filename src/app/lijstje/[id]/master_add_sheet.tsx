"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import type { ListItem } from "./new_item_modal";
import { categoryColor } from "./list_cards_view";
import { ItemNameAutocomplete } from "@/components/ui/item_name_autocomplete";
import { normalizeForMatch, itemPhotoUrlFromSlug } from "@/lib/item-photo-matching";
import { useItemPhotoUrl } from "@/lib/item-photos";
import {
  categoryHeadingDisplay,
  groupMeatSubtypes,
  orderedCategorySectionTitles,
  resolveItemCategoryFromName,
} from "@/lib/item-ingredient-category";
import { cn } from "@/lib/utils";

type CatalogItem = { slug: string; name: string; photo: string; category: string };

function slugToDisplayName(slug: string): string {
  return slug
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Winkelproducten met foto (enkel /images/items, geen vakantie-items). */
function useGroceryCatalog(): CatalogItem[] {
  const [catalog, setCatalog] = React.useState<CatalogItem[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/item-images")
      .then((r) => r.json() as Promise<{ slugs?: string[] } | string[]>)
      .then((payload) => {
        const raw = Array.isArray(payload) ? payload : payload.slugs ?? [];
        const bases = new Map<string, string>();
        for (const entry of raw) {
          const base = String(entry).replace(/_(160|240|320)$/i, "");
          if (!base.startsWith("items/")) continue;
          const slug = normalizeForMatch(base.slice("items/".length));
          if (slug && !bases.has(slug)) bases.set(slug, base);
        }
        const items = Array.from(bases.keys())
          .sort()
          .map((slug) => {
            const name = slugToDisplayName(slug);
            return { slug, name, photo: itemPhotoUrlFromSlug(slug, 160, bases), category: resolveItemCategoryFromName(name) };
          });
        if (!cancelled) setCatalog(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return catalog;
}

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const read = () => setDesktop(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return desktop;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-4 shrink-0 text-[var(--text-secondary)] transition-transform", !open && "-rotate-90")}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * Favorieten toevoegen (canvas «Favorieten toevoegen» · mobiel B + desktop): zoeken, of bladeren in
 * producten met foto die nog niet in deze favorietenlijst staan. Tik om te kiezen; de zwarte balk
 * onderaan voegt alles in één keer toe (1 stuk, aanpasbaar in de lijst).
 */
export function MasterAddSheet({
  open,
  onClose,
  listName,
  favoritesCount,
  existingNames,
  initialCategory,
  onAddItems,
}: {
  open: boolean;
  onClose: () => void;
  listName: string;
  favoritesCount: number;
  /** Namen die al in de favorietenlijst staan. */
  existingNames: string[];
  /** Geopend via «+» bij een categorie: die categorie staat open / is gekozen. */
  initialCategory?: string | null;
  onAddItems: (items: ListItem[]) => void;
}) {
  const isDesktop = useIsDesktop();
  const catalog = useGroceryCatalog();
  const getPhotoUrl = useItemPhotoUrl(160);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [openCats, setOpenCats] = React.useState<Set<string>>(new Set());
  const [activeCat, setActiveCat] = React.useState<string | null>(null);

  const existing = React.useMemo(() => new Set(existingNames.map((n) => normalizeForMatch(n))), [existingNames]);
  const missing = React.useMemo(() => catalog.filter((c) => !existing.has(c.slug)), [catalog, existing]);
  const groups = React.useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of missing) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return orderedCategorySectionTitles(Array.from(map.keys())).map((title) => ({
      title,
      // Vlees: alle kip samen, dan kalkoen, rund, varken, … (zelfde categorie).
      items: groupMeatSubtypes(title, map.get(title) ?? [], (i) => i.name),
    }));
  }, [missing]);

  React.useEffect(() => {
    if (!open) {
      setSelected([]);
      setQuery("");
      setActiveCat(null);
      return;
    }
    const first = initialCategory && groups.some((g) => g.title === initialCategory) ? initialCategory : groups[0]?.title;
    setOpenCats(new Set(first ? [first] : []));
    setActiveCat(initialCategory && groups.some((g) => g.title === initialCategory) ? initialCategory : null);
    // Enkel bij openen (en zodra de catalogus binnen is) de startcategorie zetten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groups.length > 0]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const isSelected = (name: string) => selected.some((s) => s.toLowerCase() === name.toLowerCase());
  const toggle = (name: string) =>
    setSelected((prev) =>
      prev.some((s) => s.toLowerCase() === name.toLowerCase())
        ? prev.filter((s) => s.toLowerCase() !== name.toLowerCase())
        : [...prev, name],
    );

  const submit = () => {
    if (selected.length === 0) return;
    onAddItems(
      selected.map((name, i) => ({
        id: `master-add-${Date.now()}-${i}`,
        name,
        quantity: "1 stuk",
        checked: false,
        section: "Algemeen",
        itemCategory: resolveItemCategoryFromName(name),
      })),
    );
    onClose();
  };

  if (!open || typeof document === "undefined") return null;

  const tile = (item: CatalogItem) => {
    const sel = isSelected(item.name);
    return (
      <button
        key={item.slug}
        type="button"
        aria-pressed={sel}
        onClick={() => toggle(item.name)}
        className={cn(
          "relative flex min-w-0 flex-col items-center gap-1 rounded-[16px] px-1 pb-2 pt-2.5 transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          sel ? "bg-[var(--blue-25)] shadow-[inset_0_0_0_1.5px_var(--blue-300)]" : "bg-[var(--gray-25)]",
        )}
      >
        {sel ? (
          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--blue-500)] text-white">
            <CheckIcon className="size-[11px]" />
          </span>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element -- lokale productfoto */}
        <img src={item.photo} alt="" width={60} height={60} className="size-[60px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" loading="lazy" decoding="async" />
        <span className="w-full truncate px-1 text-center text-[12.5px] font-semibold text-text-primary">{item.name}</span>
      </button>
    );
  };

  const row = (item: CatalogItem, first: boolean) => {
    const sel = isSelected(item.name);
    return (
      <button
        key={item.slug}
        type="button"
        role="checkbox"
        aria-checked={sel}
        onClick={() => toggle(item.name)}
        className={cn(
          "flex w-full items-center gap-3 rounded-[10px] px-1 py-[7px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
          !first && "border-t border-[var(--border-subtle)]",
          sel && "bg-[var(--blue-25)]",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--gray-25)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale productfoto */}
          <img src={item.photo} alt="" width={32} height={32} className="size-8 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" loading="lazy" decoding="async" />
        </span>
        <span className={cn("min-w-0 flex-1 truncate text-[15px] text-text-primary", sel ? "font-semibold" : "font-medium")}>{item.name}</span>
        {sel ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--blue-500)] text-white">
            <CheckIcon className="size-[13px]" />
          </span>
        ) : (
          <span className="size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1.6px_var(--gray-200)]" />
        )}
      </button>
    );
  };

  const dot = (title: string) => (
    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `rgb(${categoryColor(categoryHeadingDisplay(title)).join(",")})` }} aria-hidden />
  );

  const search = (
    <ItemNameAutocomplete
      value={query}
      onChange={setQuery}
      onSelectItem={(name) => {
        if (!isSelected(name)) toggle(name);
        setQuery("");
      }}
      placeholder="Zoek een product"
      ariaLabel="Zoek een product"
      slideInTitle="Favoriet zoeken"
    />
  );

  const tray = (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2.5 rounded-[24px] bg-[var(--text-primary)] py-2 pl-3 pr-2 text-[var(--white)] shadow-[0_14px_30px_-12px_rgba(16,17,48,0.6)] motion-safe:animate-fade-up",
        isDesktop ? "absolute bottom-6 right-6 w-[440px]" : "absolute inset-x-3 bottom-[calc(20px+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <span className="flex shrink-0" aria-hidden>
        {selected.slice(-3).map((name, i) => {
          const src = getPhotoUrl(name, 160);
          return (
            <span key={name} className={cn("flex size-8 items-center justify-center rounded-full bg-white shadow-[0_0_0_2px_var(--text-primary)]", i > 0 && "-ml-2.5")}>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto
                <img src={src} alt="" width={24} height={24} className="size-6 object-contain" />
              ) : (
                <span className="text-xs font-bold text-[var(--blue-500)]">{name.charAt(0).toUpperCase()}</span>
              )}
            </span>
          );
        })}
      </span>
      <span className="min-w-0 flex-1 leading-4">
        <span className="block text-sm font-bold">{selected.length} gekozen</span>
        <span className="block truncate text-xs opacity-70">Tik om te kiezen</span>
      </span>
      <button
        type="button"
        onClick={submit}
        className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-pill bg-[var(--blue-500)] px-[18px] text-[15px] font-semibold text-white transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <CheckIcon className="size-3.5" />
        Toevoegen
      </button>
    </div>
  );

  const subtitle = `${listName} · ${favoritesCount} ${favoritesCount === 1 ? "favoriet" : "favorieten"}`;
  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Sluiten"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--gray-50)] text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className="size-5">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
  const emptyState = (
    <p className="py-10 text-center text-sm text-[var(--text-tertiary)]">
      {catalog.length === 0 ? "Producten laden…" : "Alle producten met foto staan al in je favorieten."}
    </p>
  );

  const content = isDesktop ? (
    <div role="dialog" aria-modal="true" aria-label="Favorieten toevoegen" className="relative flex h-[min(760px,90dvh)] w-full max-w-[1040px] flex-col overflow-hidden rounded-[24px] bg-[var(--white)] shadow-[0_30px_80px_-20px_rgba(16,17,48,0.5)] motion-safe:animate-fade-up">
      <div className="flex shrink-0 items-center gap-4 border-b border-[var(--border-subtle)] px-6 pb-4 pt-5">
        <div className="min-w-0 leading-[22px]">
          <h2 className="text-[22px] font-bold text-text-primary">Favorieten toevoegen</h2>
          <p className="truncate text-[13px] text-[var(--text-tertiary)]">{subtitle}</p>
        </div>
        <span className="flex-1" />
        <div className="w-[360px]">{search}</div>
        {closeButton}
      </div>
      <div className="flex min-h-0 flex-1">
        <nav className="w-[230px] shrink-0 overflow-y-auto border-r border-[var(--border-subtle)] px-3.5 py-4" aria-label="Categorieën">
          <p className="mb-2 ml-3 text-[11.5px] font-bold tracking-[0.06em] text-[var(--text-tertiary)]">NOG NIET IN FAVORIETEN</p>
          {[{ title: null as string | null, n: missing.length }, ...groups.map((g) => ({ title: g.title as string | null, n: g.items.length }))].map(({ title, n }) => {
            const active = activeCat === title;
            return (
              <button
                key={title ?? "alles"}
                type="button"
                onClick={() => setActiveCat(title)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  active ? "bg-[var(--blue-25)] font-bold text-[var(--blue-500)]" : "font-medium text-text-primary hover:bg-[var(--gray-25)]",
                )}
              >
                {title ? dot(title) : <span className="size-2 shrink-0 rounded-full bg-[var(--blue-500)]" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{title ? categoryHeadingDisplay(title) : "Alles"}</span>
                <span className="text-xs font-semibold text-[var(--text-tertiary)]">{n}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-1.5">
          {groups.length === 0
            ? emptyState
            : groups
                .filter((g) => activeCat == null || g.title === activeCat)
                .map((g) => (
                  <section key={g.title}>
                    <h3 className="mb-2 mt-4 flex items-center gap-2 text-[13px] font-bold text-text-primary">
                      {dot(g.title)}
                      {categoryHeadingDisplay(g.title)}
                      <span className="text-xs font-normal text-[var(--text-tertiary)]">{g.items.length}</span>
                    </h3>
                    <div className="grid grid-cols-6 gap-2.5">{g.items.map(tile)}</div>
                  </section>
                ))}
        </div>
      </div>
      {selected.length > 0 ? tray : null}
    </div>
  ) : (
    <div role="dialog" aria-modal="true" aria-label="Favorieten toevoegen" className="relative flex h-[calc(100dvh-44px)] w-full flex-col overflow-hidden rounded-t-[26px] bg-[var(--white)] motion-safe:animate-fade-up">
      <span aria-hidden className="mx-auto mt-2 block h-1 w-[38px] shrink-0 rounded-full bg-[var(--gray-100)]" />
      <div className="shrink-0 px-[18px] pt-2">
        <div className="mb-4 mt-1.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[22px] font-bold tracking-tight text-text-primary">Favorieten toevoegen</h2>
            <p className="truncate text-[13px] text-[var(--text-tertiary)]">{subtitle}</p>
          </div>
          {closeButton}
        </div>
        {search}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-28">
        <div className="mb-1.5 mt-[18px]">
          <p className="text-[15px] font-bold text-text-primary">Nog niet in je favorieten</p>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            {missing.length} {missing.length === 1 ? "product" : "producten"} die je nog niet toevoegde
          </p>
        </div>
        {groups.length === 0
          ? emptyState
          : groups.map((g) => {
              const isOpen = openCats.has(g.title);
              const rgb = categoryColor(categoryHeadingDisplay(g.title)).join(",");
              return (
                <section key={g.title} className="mt-2.5 overflow-hidden rounded-[18px] bg-[var(--white)] shadow-[0_0_0_1px_var(--border-subtle)]">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenCats((prev) => {
                        const next = new Set(prev);
                        if (next.has(g.title)) next.delete(g.title);
                        else next.add(g.title);
                        return next;
                      })
                    }
                    className="flex w-full items-center gap-2.5 px-3.5 py-[11px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
                    style={{ background: `linear-gradient(90deg, rgba(${rgb},0.16), rgba(${rgb},0.05))` }}
                  >
                    <span className="size-[9px] shrink-0 rounded-full" style={{ backgroundColor: `rgb(${rgb})` }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-text-primary">{categoryHeadingDisplay(g.title)}</span>
                    <span className="text-xs font-bold tabular-nums text-[var(--text-secondary)]">{g.items.length}</span>
                    <Chevron open={isOpen} />
                  </button>
                  {isOpen ? (
                    <div className="px-2.5 pb-1 pt-0.5">{g.items.map((item, i) => row(item, i === 0))}</div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenCats((prev) => new Set(prev).add(g.title))}
                      className="flex w-full items-center px-3.5 pb-[11px] pt-[9px] text-left focus-visible:outline-none"
                      aria-label={`${categoryHeadingDisplay(g.title)} openen`}
                    >
                      <span className="flex shrink-0" aria-hidden>
                        {g.items.slice(0, 4).map((item, i) => (
                          <span key={item.slug} className={cn("flex size-[30px] items-center justify-center rounded-full bg-[var(--gray-50)] shadow-[0_0_0_2px_var(--white)]", i > 0 && "-ml-2")}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- lokale productfoto */}
                            <img src={item.photo} alt="" width={22} height={22} className="size-[22px] object-contain" loading="lazy" />
                          </span>
                        ))}
                      </span>
                      <span className="ml-2 min-w-0 flex-1 truncate text-xs text-[var(--text-tertiary)]">
                        {g.items.slice(0, 3).map((i) => i.name).join(", ")}
                        {g.items.length > 3 ? "…" : ""}
                      </span>
                    </button>
                  )}
                </section>
              );
            })}
      </div>
      {selected.length > 0 ? tray : null}
    </div>
  );

  return ReactDOM.createPortal(
    <div className={cn("fixed inset-0 z-[55] flex justify-center", isDesktop ? "items-center p-6" : "items-end")}>
      <div aria-hidden className="absolute inset-0 bg-[rgba(16,17,48,0.35)]" onClick={onClose} />
      {content}
    </div>,
    document.body,
  );
}
