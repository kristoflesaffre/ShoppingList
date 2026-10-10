"use client";

import * as React from "react";
import Link from "next/link";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { cn } from "@/lib/utils";

export type DashboardFreezerItem = {
  id: string;
  name: string;
  type?: string;
  packages: number;
  recipePhotoUrl?: string | null;
};

const SNOWFLAKE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
  </svg>
);

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Foto van een diepvriesitem: gerecht = rond bord, product = afgeronde tegel. */
function FreezerThumb({ item }: { item: DashboardFreezerItem }) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const isDish = item.type === "gerecht";
  const photo = item.recipePhotoUrl ?? (isDish ? null : getPhotoUrl(item.name));
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden bg-[var(--white)] shadow-[0_0_0_3px_rgba(255,255,255,0.6)]",
        isDish ? "rounded-full" : "rounded-[14px]",
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto of lokale productfoto
        <img
          src={photo}
          alt=""
          width={44}
          height={44}
          className={isDish ? "size-full object-cover" : "size-9 object-contain"}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-sm font-bold text-[var(--blue-400)]" aria-hidden>
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export type DashboardFreezerRow = DashboardFreezerItem & { quantityPerPackage?: number; unit?: string; recipePersons?: number };

/**
 * Canvas «Combinatie · Voorraad A»: diepvries als hoge lichtblauwe kolom naast de lijstjes én
 * Te kopen, gegroepeerd in gerechten en producten.
 */
export function HomeDashboardFreezerColumn({ items }: { items: DashboardFreezerRow[] }) {
  const dishes = items.filter((i) => i.type === "gerecht");
  const products = items.filter((i) => i.type !== "gerecht");
  const portions = dishes.reduce((sum, i) => sum + Math.max(0, i.packages || 0), 0);
  const stats = [plural(items.length, "item", "items"), portions > 0 ? plural(portions, "portie", "porties") : null]
    .filter(Boolean)
    .join(" · ");

  const row = (item: DashboardFreezerRow, first: boolean) => {
    const isDish = item.type === "gerecht";
    const sub = isDish
      ? item.recipePersons
        ? `Gerecht · ${plural(item.recipePersons, "persoon", "personen")}`
        : "Gerecht"
      : item.quantityPerPackage && item.unit
        ? `${item.quantityPerPackage} ${item.unit} per pak`
        : "Product";
    const count = isDish ? plural(item.packages, "portie", "porties") : plural(item.packages, "pak", "pakken");
    return (
      <li key={item.id} className={cn("flex items-center gap-3 py-2.5", !first && "border-t border-[rgba(77,121,199,0.14)]")}>
        <FreezerThumb item={item} />
        <span className="min-w-0 flex-1 leading-[18px]">
          <span className="block truncate text-[15px] font-semibold text-text-primary first-letter:uppercase">{item.name}</span>
          <span className="block truncate text-[12.5px] text-[var(--text-secondary)]">{sub}</span>
        </span>
        <span className="shrink-0 text-sm font-extrabold text-[#2f5fb3]">{count}</span>
      </li>
    );
  };
  const group = (title: string, list: DashboardFreezerRow[]) =>
    list.length > 0 ? (
      <div className="mt-3.5">
        <p className="text-xs font-extrabold tracking-[0.06em] text-[#6c8cc8]">{title}</p>
        <ul className="m-0 list-none pl-0">{list.map((item, i) => row(item, i === 0))}</ul>
      </div>
    ) : null;

  return (
    <section aria-labelledby="dashboard-freezer" className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id="dashboard-freezer" className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
          Voorraad
        </h2>
        <Link
          href="/diepvriesvoorraad"
          className="rounded-pill px-2 py-1 text-[13px] font-medium leading-[18px] text-action-primary no-underline [@media(hover:hover)]:hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          Open
        </Link>
      </div>
      <div className="flex flex-1 flex-col rounded-[24px] bg-[linear-gradient(160deg,#e6f0ff_0%,#dde9fd_55%,#f2f6ff_100%)] p-5 [[data-theme=dark]_&]:bg-[linear-gradient(160deg,#1c2640_0%,#18213a_100%)]">
        <p className="flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-[#4d79c7]">
          {SNOWFLAKE}
          Diepvries{items.length > 0 ? ` · ${stats}` : ""}
        </p>
        {items.length === 0 ? (
          <p className="mt-4 text-sm leading-5 text-[var(--text-secondary)]">
            Je diepvries is leeg. Voeg een gerecht of product toe, dan zie je hier wat je in huis hebt.
          </p>
        ) : (
          <>
            {group("GERECHTEN", dishes)}
            {group("PRODUCTEN", products)}
          </>
        )}
        <div className="min-h-4 flex-1" />
        <div className="flex gap-2">
          <Link
            href="/diepvriesvoorraad"
            className="flex h-10 flex-1 items-center justify-center rounded-pill bg-[var(--white)] text-sm font-bold text-[var(--blue-500)] no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Diepvries openen
          </Link>
          <Link
            href="/diepvriesvoorraad"
            aria-label="Iets in de diepvries leggen"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {PLUS_ICON}
          </Link>
        </div>
      </div>
    </section>
  );
}

export type DashboardShoppingItem = { id: string; name: string; quantity: string };
export type DashboardAddedBy = { firstName: string; avatarUrl: string | null };

function Initial({ name, avatarUrl, className }: { name: string; avatarUrl?: string | null; className?: string }) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- profielfoto
    <img src={avatarUrl} alt="" className={cn("rounded-full object-cover", className)} />
  ) : (
    <span className={cn("flex items-center justify-center rounded-full bg-[#c98b6b] font-extrabold text-white", className)}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

const UNDO_MS = 4000;

/**
 * Canvas «Combinatie · Te kopen»: één gedeelde lijst voor iedereen. Wat een ander toevoegde krijgt
 * een klein naamlabel. Afvinken = gekocht (na 4 s weg, tot dan «Ongedaan maken»).
 */
export function HomeDashboardShoppingList({
  items,
  addedByFor,
  onAdd,
  onBought,
  limit = 8,
}: {
  items: DashboardShoppingItem[];
  addedByFor: (item: DashboardShoppingItem) => DashboardAddedBy | null;
  onAdd: () => void;
  onBought: (id: string) => void;
  limit?: number;
}) {
  const [pending, setPending] = React.useState<Record<string, number>>({});
  const onBoughtRef = React.useRef(onBought);
  onBoughtRef.current = onBought;

  React.useEffect(
    () => () => {
      Object.values(pending).forEach((t) => window.clearTimeout(t));
    },
    // Alleen bij unmount opruimen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const toggle = (id: string) => {
    setPending((prev) => {
      const next = { ...prev };
      if (next[id]) {
        window.clearTimeout(next[id]);
        delete next[id];
      } else {
        next[id] = window.setTimeout(() => {
          onBoughtRef.current(id);
          setPending((p) => {
            const rest = { ...p };
            delete rest[id];
            return rest;
          });
        }, UNDO_MS);
      }
      return next;
    });
  };

  const others = new Map<string, DashboardAddedBy>();
  for (const item of items) {
    const by = addedByFor(item);
    if (by) others.set(by.firstName, by);
  }
  const shown = items.slice(0, limit);

  return (
    <section aria-labelledby="dashboard-shopping" className="flex min-w-0 flex-col gap-4">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id="dashboard-shopping" className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
          Te kopen
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[13px] font-semibold text-action-primary [@media(hover:hover)]:hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {PLUS_ICON}
          Toevoegen
        </button>
      </div>
      <div className="rounded-[22px] bg-[var(--white)] px-5 pb-2 pt-4 shadow-card">
        <div className="mb-1 flex items-center gap-2.5">
          {others.size > 0 ? (
            <span className="flex" aria-hidden>
              {Array.from(others.values()).map((p, i) => (
                <Initial key={p.firstName} name={p.firstName} avatarUrl={p.avatarUrl} className={cn("size-7 text-xs shadow-[0_0_0_2px_var(--white)]", i > 0 && "-ml-2")} />
              ))}
            </span>
          ) : null}
          <span className="flex-1 text-[15px] font-extrabold text-text-primary">{others.size > 0 ? "Samen" : "Jouw lijst"}</span>
          <span className="text-[13px] font-bold tabular-nums text-[var(--text-tertiary)]">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-secondary)]">Niets te kopen. Voeg iets toe wat je niet mag vergeten.</p>
        ) : (
          <ul className="m-0 list-none pl-0">
            {shown.map((item, i) => {
              const by = addedByFor(item);
              const done = pending[item.id] != null;
              return (
                <li key={item.id} className={cn("flex items-center gap-3 py-[11px]", i > 0 && "border-t border-[var(--border-subtle)]")}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`${item.name} gekocht`}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
                      done ? "bg-[var(--blue-500)] text-white" : "shadow-[inset_0_0_0_1.6px_var(--gray-200)]",
                    )}
                  >
                    {done ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    ) : null}
                  </button>
                  <span className={cn("min-w-0 flex-1 truncate text-[15px] font-semibold", done ? "text-[var(--gray-300)] line-through" : "text-text-primary")}>
                    {item.name}
                  </span>
                  {done ? (
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="shrink-0 rounded-sm text-[13px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Ongedaan maken
                    </button>
                  ) : by ? (
                    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-pill bg-[#f7efe9] pl-[3px] pr-2.5 text-xs font-bold text-[#8a5a3c] [[data-theme=dark]_&]:bg-[rgba(201,139,107,0.18)] [[data-theme=dark]_&]:text-[#e8c3ad]">
                      <Initial name={by.firstName} avatarUrl={by.avatarUrl} className="size-[18px] text-[10px]" />
                      {by.firstName}
                    </span>
                  ) : null}
                  <span className="min-w-[52px] shrink-0 text-right text-[13.5px] text-[var(--text-secondary)]">{item.quantity}</span>
                </li>
              );
            })}
          </ul>
        )}
        {items.length > shown.length ? (
          <Link
            href="/te-kopen"
            className="flex h-11 items-center justify-center border-t border-[var(--border-subtle)] text-[13px] font-semibold text-action-primary no-underline"
          >
            Toon alle {items.length}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
