"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { SearchBar } from "@/components/ui/search_bar";
import { cn } from "@/lib/utils";
import { categoryHeadingDisplay, orderedCategorySectionTitles, resolveItemCategoryFromName } from "@/lib/item-ingredient-category";
import { storeNameKey, type ItemStore } from "@/lib/item-store";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { categoryColor } from "./list_cards_view";
import { StoreLogos } from "./store_mark";

/**
 * Lidl / Delhaize-favorieten: «Winkel per product». Voor élk product (catalogus, ingrediënten van
 * recepten, favorieten) kies je Lidl, Delhaize of allebei; weeklijstjes nemen dit over.
 */
export type IngredientStoreEntry = { name: string; photo?: string | null };

type Filter = "all" | "none" | ItemStore;

const OPTIONS: { value: ItemStore; label: string }[] = [
  { value: "lidl", label: "Lidl" },
  { value: "delhaize", label: "Delhaize" },
  { value: "both", label: "Allebei" },
];

function StorePicker({
  value,
  onChange,
  name,
  small = false,
}: {
  value?: ItemStore;
  onChange: (value: ItemStore | undefined) => void;
  name: string;
  small?: boolean;
}) {
  return (
    <span role="radiogroup" aria-label={`Winkel voor ${name}`} className="flex shrink-0 gap-1">
      {OPTIONS.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(on ? undefined : o.value)}
            className={cn(
              "flex items-center justify-center rounded-full transition-[background-color,box-shadow,opacity] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              small ? "h-7 min-w-7 px-1" : "h-9 min-w-9 px-1.5",
              on
                ? "bg-[var(--blue-25)] shadow-[inset_0_0_0_2px_var(--blue-500)]"
                : "bg-[var(--gray-25)] opacity-60 grayscale-[60%] [@media(hover:hover)]:hover:opacity-100 [@media(hover:hover)]:hover:grayscale-0",
            )}
          >
            <StoreLogos store={o.value} size={small ? 16 : 20} ring={o.value === "both"} />
          </button>
        );
      })}
    </span>
  );
}

export function IngredientStoreSheet({
  open,
  onClose,
  entries,
  storeFor,
  onSet,
  onSetMany,
}: {
  open: boolean;
  onClose: () => void;
  entries: IngredientStoreEntry[];
  storeFor: (name: string) => ItemStore | undefined;
  onSet: (name: string, store: ItemStore | undefined) => void;
  onSetMany: (names: string[], store: ItemStore) => void;
}) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setFilter("all");
    }
  }, [open]);

  const counts = React.useMemo(() => {
    const c = { all: entries.length, none: 0, lidl: 0, delhaize: 0, both: 0 };
    for (const e of entries) {
      const s = storeFor(e.name);
      if (s) c[s] += 1;
      else c.none += 1;
    }
    return c;
  }, [entries, storeFor]);

  const groups = React.useMemo(() => {
    const q = storeNameKey(query);
    const visible = entries.filter((e) => {
      if (q && !storeNameKey(e.name).includes(q)) return false;
      const s = storeFor(e.name);
      if (filter === "all") return true;
      if (filter === "none") return !s;
      return s === filter;
    });
    const map = new Map<string, IngredientStoreEntry[]>();
    for (const e of visible) {
      const cat = resolveItemCategoryFromName(e.name);
      const list = map.get(cat) ?? [];
      list.push(e);
      map.set(cat, list);
    }
    return orderedCategorySectionTitles(Array.from(map.keys())).map((title) => ({
      title,
      items: (map.get(title) ?? []).sort((a, b) => a.name.localeCompare(b.name, "nl")),
    }));
  }, [entries, query, filter, storeFor]);

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Alles", count: counts.all },
    { value: "none", label: "Nog niet gekozen", count: counts.none },
    { value: "lidl", label: "Lidl", count: counts.lidl },
    { value: "delhaize", label: "Delhaize", count: counts.delhaize },
    { value: "both", label: "Allebei", count: counts.both },
  ];

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Winkel per product"
      titleId="ingredient-store-sheet-title"
      className="md:!max-w-[640px]"
      cancelLabel={null}
    >
      <div className="flex w-full flex-col gap-3 pb-4">
        <p className="text-[13.5px] leading-5 text-[var(--text-secondary)]">
          Kies waar je elk product koopt, ook als het geen favoriet is. Nieuwe en bestaande weeklijstjes nemen dit over.
          {" "}
          <span className="font-semibold text-text-primary">
            {counts.all - counts.none} van {counts.all} gekozen
          </span>
        </p>
        <SearchBar value={query} onValueChange={setQuery} placeholder="Zoek een product…" />
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                filter === f.value ? "bg-[var(--text-primary)] text-[var(--white)]" : "bg-[var(--gray-25)] text-text-primary",
              )}
            >
              {f.label}
              <span className="text-xs tabular-nums opacity-60">{f.count}</span>
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">Geen producten gevonden.</p>
        ) : (
          groups.map((g) => {
            const title = categoryHeadingDisplay(g.title);
            const rgb = categoryColor(title);
            return (
              <section key={g.title} className="overflow-hidden rounded-[18px] bg-[var(--white)] shadow-[0_0_0_1px_var(--border-subtle)]">
                <div
                  className="flex items-center gap-2.5 px-3.5 py-2.5"
                  style={{ background: `linear-gradient(90deg, rgba(${rgb.join(",")},0.16), rgba(${rgb.join(",")},0.05))` }}
                >
                  <span className="size-[9px] shrink-0 rounded-full" style={{ backgroundColor: `rgb(${rgb.join(",")})` }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-text-primary">{title}</span>
                  <span className="hidden text-xs font-semibold text-[var(--text-secondary)] sm:inline">Alles:</span>
                  <StorePicker
                    small
                    name={`alles in ${title}`}
                    value={g.items.every((e) => storeFor(e.name) === "lidl") ? "lidl" : g.items.every((e) => storeFor(e.name) === "delhaize") ? "delhaize" : g.items.every((e) => storeFor(e.name) === "both") ? "both" : undefined}
                    onChange={(store) => {
                      if (store) onSetMany(g.items.map((e) => e.name), store);
                    }}
                  />
                </div>
                <ul className="m-0 list-none px-2.5 pl-0">
                  {g.items.map((e, i) => {
                    const photo = e.photo ?? getPhotoUrl(e.name);
                    return (
                      <li key={e.name} className={cn("ml-2.5 flex items-center gap-3 py-2", i > 0 && "border-t border-[var(--border-subtle)]")}>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--gray-25)]">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto
                            <img src={photo} alt="" width={30} height={30} className="size-[30px] object-contain" loading="lazy" decoding="async" />
                          ) : (
                            <span className="text-sm font-bold text-[var(--blue-400)]" aria-hidden>
                              {e.name.trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-text-primary first-letter:uppercase">{e.name}</span>
                        <StorePicker name={e.name} value={storeFor(e.name)} onChange={(store) => onSet(e.name, store)} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </SlideInModal>
  );
}
