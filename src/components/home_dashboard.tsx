"use client";

import * as React from "react";
import Link from "next/link";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { cn } from "@/lib/utils";
import { FROST_GRADIENT_CLASS, FrostDecor } from "@/components/ui/frost_background";
import { PANTRY_GRADIENT_CLASS, PANTRY_TEXT_CLASS, PantryDecor } from "@/components/ui/pantry_background";
import { OverviewPill } from "@/components/list_section_header";
import { isPantryLow, pantryStatsLabel } from "@/lib/pantry";
import { displayQuantity } from "@/lib/recipe_ingredient_quantity";

export type DashboardFreezerItem = {
  id: string;
  name: string;
  type?: string;
  packages: number;
  recipePhotoUrl?: string | null;
};

/** App-icoon voor de diepvries (zelfde als in de navigatie en de diepvriespagina). */
const SNOWFLAKE = (
  <span
    aria-hidden
    className="inline-block size-[18px] shrink-0 bg-current"
    style={{
      WebkitMaskImage: "url(/icons/freeze.svg)",
      maskImage: "url(/icons/freeze.svg)",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    }}
  />
);

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Startpagina · Voorraad: 4 × 3 fototegels; is er meer, dan wordt het twaalfde vak «+n meer». */
const STOCK_TILE_SLOTS = 12;

function stockTiles<T>(items: T[]): { shown: T[]; rest: number } {
  if (items.length <= STOCK_TILE_SLOTS) return { shown: items, rest: 0 };
  return { shown: items.slice(0, STOCK_TILE_SLOTS - 1), rest: items.length - (STOCK_TILE_SLOTS - 1) };
}

/**
 * Canvas «Startpagina · Voorraad: enkel foto's» 2: vierkante glazen tegel met alleen de foto (gerecht = rond bord,
 * product = vrijstaand) en het aantal als gevuld bolletje rechtsboven; oranje = het laatste exemplaar. De naam staat
 * in de tooltip en het aria-label.
 */
function StockPhotoTile({
  href,
  name,
  count,
  countLabel,
  photo,
  dish = false,
  low = false,
  tone,
}: {
  href: string;
  name: string;
  count: number;
  countLabel: string;
  photo: string | null;
  dish?: boolean;
  low?: boolean;
  tone: "frost" | "pantry";
}) {
  return (
    <Link
      href={href}
      title={name}
      aria-label={`${name}: ${countLabel}`}
      className={cn(
        "relative flex aspect-square min-w-0 items-center justify-center rounded-[18px] no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        tone === "frost"
          ? "bg-[rgba(255,255,255,0.62)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8),0_6px_16px_-12px_rgba(47,95,179,0.45)] [[data-theme=dark]_&]:bg-[rgba(255,255,255,0.06)] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "bg-[rgba(255,255,255,0.66)] shadow-[0_1px_2px_rgba(97,66,36,0.06)] [[data-theme=dark]_&]:bg-[rgba(255,255,255,0.06)]",
        "[@media(hover:hover)]:hover:bg-[rgba(255,255,255,0.85)]",
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto of lokale productfoto
        <img
          src={photo}
          alt=""
          width={64}
          height={64}
          className={dish ? "size-[58%] rounded-full object-cover shadow-[0_0_0_3px_rgba(255,255,255,0.7)]" : "size-[56%] object-contain"}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-[52%] items-center justify-center bg-[var(--white)] text-lg font-bold",
            dish ? "rounded-full" : "rounded-[14px]",
            tone === "frost" ? "text-[var(--blue-400)]" : "text-[var(--secondary-700)]",
          )}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "absolute right-1.5 top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-pill px-1.5 text-xs font-extrabold tabular-nums text-white",
          low ? "bg-[var(--status-warning)]" : tone === "frost" ? "bg-[var(--blue-500)]" : "bg-[var(--secondary-800)] [[data-theme=dark]_&]:text-[#2e2218]",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

function StockMoreTile({ href, rest, tone }: { href: string; rest: number; tone: "frost" | "pantry" }) {
  return (
    <Link
      href={href}
      aria-label={`Nog ${rest} meer`}
      className={cn(
        "flex aspect-square min-w-0 flex-col items-center justify-center rounded-[18px] border-[1.5px] border-dashed no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        tone === "frost"
          ? "border-[rgba(63,109,192,0.35)] text-[#2f5fb3] [[data-theme=dark]_&]:text-[#9db8ee]"
          : cn("border-[rgba(97,66,36,0.28)]", PANTRY_TEXT_CLASS),
      )}
    >
      <span className="text-[19px] font-extrabold leading-none">+{rest}</span>
      <span className="mt-1 text-[11.5px] font-semibold">meer</span>
    </Link>
  );
}

const FROST_CARD_CLASS = cn("relative isolate overflow-hidden rounded-[24px]", FROST_GRADIENT_CLASS);

export type DashboardFreezerRow = DashboardFreezerItem & { quantityPerPackage?: number; unit?: string };

/**
 * Canvas «Startpagina · Voorraad: enkel foto's» 2: de diepvries als raster van fototegels, eerst de gerechten en
 * dan de ingrediënten en andere producten.
 */
export function HomeDashboardFreezerColumn({ items }: { items: DashboardFreezerRow[] }) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const ordered = [...items.filter((i) => i.type === "gerecht"), ...items.filter((i) => i.type !== "gerecht")];
  const { shown, rest } = stockTiles(ordered);
  const stats = plural(items.length, "item", "items");

  return (
    <section aria-labelledby="dashboard-freezer" className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id="dashboard-freezer" className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
          Voorraad
        </h2>
        {/* Canvas «Startpagina · Voorraad» A: openen via de overzichtspil, zoals de andere homesecties. */}
        {items.length > 0 ? <OverviewPill href="/diepvriesvoorraad" count={items.length} ariaLabel={`Diepvries openen (${items.length})`} /> : null}
      </div>
      <div className={cn(FROST_CARD_CLASS, "flex flex-1 flex-col p-5")}>
        <FrostDecor />
        <p className="relative flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-[#3f6dc0] [[data-theme=dark]_&]:text-[#9db8ee]">
          {SNOWFLAKE}
          Diepvries{items.length > 0 ? ` · ${stats}` : ""}
        </p>
        {items.length === 0 ? (
          /* Lege diepvries: vriendelijke illustratie met één duidelijke actie. */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-4 text-center">
            <span className="relative flex size-[132px] items-center justify-center" aria-hidden>
              <span className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_70%)]" />
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
              <img
                src="/images/ui/empty_state_diepvries.png"
                alt=""
                width={112}
                height={112}
                className="relative size-28 object-contain drop-shadow-[0_14px_18px_rgba(47,95,179,0.25)] motion-safe:animate-fade-up"
              />
            </span>
            <span>
              <span className="block text-lg font-extrabold text-text-primary">Je diepvries is leeg</span>
              <span className="mt-1 block text-[13.5px] leading-5 text-[var(--text-secondary)] [text-wrap:balance]">
                Kook je wat te veel? Vries het in, dan zie je hier wat je nog in huis hebt.
              </span>
            </span>
            <Link
              href="/diepvriesvoorraad"
              className="mt-1 inline-flex h-[34px] items-center gap-1.5 rounded-pill bg-[var(--blue-500)] px-3.5 text-sm font-semibold text-white no-underline transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            >
              {PLUS_ICON}
              Iets invriezen
            </Link>
          </div>
        ) : (
          <ul className="relative m-0 mt-3.5 grid list-none grid-cols-4 gap-2 pl-0">
            {shown.map((item) => {
              const isDish = item.type === "gerecht";
              return (
                <li key={item.id} className="min-w-0">
                  <StockPhotoTile
                    href="/diepvriesvoorraad"
                    tone="frost"
                    name={item.name}
                    count={item.packages}
                    countLabel={isDish ? plural(item.packages, "portie", "porties") : plural(item.packages, "pak", "pakken")}
                    photo={item.recipePhotoUrl ?? (isDish ? null : getPhotoUrl(item.name))}
                    dish={isDish}
                    low={item.packages <= 1}
                  />
                </li>
              );
            })}
            {rest > 0 ? (
              <li className="min-w-0">
                <StockMoreTile href="/diepvriesvoorraad" rest={rest} tone="frost" />
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </section>
  );
}

const PANTRY_ICON = (
  <span
    aria-hidden
    className="inline-block size-[18px] shrink-0 bg-current"
    style={{ WebkitMask: "url(/icons/pantry.svg) center/contain no-repeat", mask: "url(/icons/pantry.svg) center/contain no-repeat" }}
  />
);

/** Canvas «Startpagina · Voorraad: enkel foto's» 2: warme tweeling van de diepvrieskolom op de computer. */
export function HomeDashboardPantryColumn({ items }: { items: DashboardFreezerRow[] }) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const { shown, rest } = stockTiles(items);

  return (
    <section aria-labelledby="dashboard-pantry" className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id="dashboard-pantry" className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
          Voorraadkast
        </h2>
        <OverviewPill href="/voorraadkast" count={items.length || undefined} ariaLabel={items.length > 0 ? `Voorraadkast openen (${items.length})` : "Voorraadkast openen"} />
      </div>
      <div className={cn("relative isolate flex flex-1 flex-col overflow-hidden rounded-[24px] p-5", PANTRY_GRADIENT_CLASS)}>
        <PantryDecor />
        <p className={cn("relative flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.06em]", PANTRY_TEXT_CLASS)}>
          {PANTRY_ICON}
          {items.length > 0 ? pantryStatsLabel(items) : "Nog leeg"}
        </p>
        {items.length === 0 ? (
          <p className="mt-3 text-[13.5px] leading-5 text-[var(--text-secondary)]">Hou bij hoeveel bloem, olie, koekjes of chips je nog in huis hebt.</p>
        ) : (
          <ul className="m-0 mt-3.5 grid list-none grid-cols-4 gap-2 pl-0">
            {shown.map((item) => (
              <li key={item.id} className="min-w-0">
                <StockPhotoTile
                  href="/voorraadkast"
                  tone="pantry"
                  name={item.name}
                  count={item.packages}
                  countLabel={`${item.packages}× ${item.quantityPerPackage ?? ""} ${item.unit ?? ""}`.trim()}
                  photo={getPhotoUrl(item.name)}
                  low={isPantryLow(item)}
                />
              </li>
            ))}
            {rest > 0 ? (
              <li className="min-w-0">
                <StockMoreTile href="/voorraadkast" rest={rest} tone="pantry" />
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </section>
  );
}

export function HomePantryPlatesCard({ items }: { items: DashboardFreezerRow[] }) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const tileClass = "flex flex-col items-center gap-1.5 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded-[14px]";

  return (
    <div className={cn("relative isolate overflow-hidden rounded-[24px] py-4", PANTRY_GRADIENT_CLASS)}>
      <PantryDecor />
      <p className={cn("flex items-center gap-2 px-4 text-xs font-extrabold uppercase tracking-[0.06em]", PANTRY_TEXT_CLASS)}>
        {PANTRY_ICON}
        {pantryStatsLabel(items)}
      </p>
      <ul className="m-0 mt-4 flex list-none gap-1.5 overflow-x-auto px-4 pb-1 pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const photo = getPhotoUrl(item.name);
          const low = isPantryLow(item);
          return (
            <li key={item.id} className="w-[92px] shrink-0">
              <Link href="/voorraadkast" className={tileClass}>
                <span className="relative">
                  <span className="flex size-[76px] items-center justify-center overflow-hidden rounded-full bg-[var(--white)]">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- lokale productfoto
                      <img src={photo} alt="" width={76} height={76} className="size-[60px] object-contain" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-[28px] font-extrabold text-[var(--secondary-700)]" aria-hidden>{item.name.trim().charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "absolute -right-1 -top-0.5 flex h-[22px] items-center rounded-pill px-[7px] text-xs font-extrabold shadow-[0_2px_6px_rgba(0,0,0,0.1)]",
                      low ? "bg-[var(--secondary-700)] text-white" : "bg-[var(--white)] text-[var(--secondary-700)]",
                    )}
                  >
                    {item.packages}×
                  </span>
                </span>
                <span className="line-clamp-2 text-center text-[13px] font-bold leading-4 text-text-primary first-letter:uppercase">{item.name}</span>
              </Link>
            </li>
          );
        })}
        <li className="w-[92px] shrink-0">
          <Link href="/voorraadkast" className={tileClass}>
            <span className={cn("flex size-[76px] items-center justify-center rounded-full border-2 border-dashed border-[rgba(145,100,54,0.45)]", PANTRY_TEXT_CLASS)}>{PLUS_ICON}</span>
            <span className={cn("text-[13px] font-bold leading-4", PANTRY_TEXT_CLASS)}>Toevoegen</span>
          </Link>
        </li>
      </ul>
    </div>
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
  limit = 5,
  me,
}: {
  items: DashboardShoppingItem[];
  addedByFor: (item: DashboardShoppingItem) => DashboardAddedBy | null;
  onAdd: () => void;
  onBought: (id: string) => void;
  limit?: number;
  /** Jouw naam en foto, naast die van wie meedoet. */
  me?: DashboardAddedBy;
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
    <section aria-labelledby="dashboard-shopping" className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id="dashboard-shopping" className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]">
          Te kopen
        </h2>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[13px] font-semibold text-action-primary [@media(hover:hover)]:hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {PLUS_ICON}
            Toevoegen
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col rounded-[22px] bg-[var(--white)] px-5 pb-2 pt-4 shadow-card">
        <div className={cn("mb-1 flex items-center gap-2.5", items.length === 0 && "hidden")}>
          {others.size > 0 ? (
            <span className="flex" aria-hidden>
              {[...(me ? [me] : []), ...Array.from(others.values())].map((p, i) => (
                <Initial key={p.firstName} name={p.firstName} avatarUrl={p.avatarUrl} className={cn("size-7 text-xs shadow-[0_0_0_2px_var(--white)]", i > 0 && "-ml-2")} />
              ))}
            </span>
          ) : null}
          <span className="flex-1 text-[15px] font-extrabold text-text-primary">{others.size > 0 ? "Samen" : "Jouw lijst"}</span>
          <span className="text-[13px] font-bold tabular-nums text-[var(--text-tertiary)]">{items.length}</span>
        </div>
        {items.length === 0 ? (
          /* Lege lijst: zelfde illustratiestijl als de lege diepvries, gecentreerd. */
          <div className="relative flex flex-1 flex-col items-center justify-center gap-3 px-2 py-4 text-center">
            <span className="relative flex size-[120px] items-center justify-center" aria-hidden>
              <span className="absolute inset-1 rounded-full bg-[radial-gradient(circle,#fff1e3_0%,rgba(255,241,227,0)_70%)] [[data-theme=dark]_&]:opacity-20" />
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
              <img
                src="/images/ui/kopen_320.webp"
                alt=""
                width={96}
                height={96}
                className="relative size-24 object-contain drop-shadow-[0_14px_18px_rgba(160,110,60,0.22)] motion-safe:animate-fade-up"
              />
            </span>
            <span>
              <span className="block text-lg font-extrabold text-text-primary">Alles gekocht</span>
              <span className="mt-1 block text-[13.5px] leading-5 text-[var(--text-secondary)] [text-wrap:balance]">
                Niets meer op jullie lijst. Wat mag je niet vergeten?
              </span>
            </span>
            <button
              type="button"
              onClick={onAdd}
              className="mt-1 inline-flex h-[34px] items-center gap-1.5 rounded-pill bg-[var(--blue-500)] px-3.5 text-sm font-semibold text-white transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            >
              {PLUS_ICON}
              Product toevoegen
            </button>
          </div>
        ) : (
          <ul className="m-0 list-none pl-0">
            {shown.map((item, i) => {
              const by = addedByFor(item);
              const done = pending[item.id] != null;
              return (
                <li key={item.id} className={cn("flex items-center gap-3 py-[9px]", i > 0 && "border-t border-[var(--border-subtle)]")}>
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
                  <span className={cn("min-w-0 flex-1 truncate text-[15px] font-semibold first-letter:uppercase", done ? "text-[var(--gray-300)] line-through" : "text-text-primary")}>
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
                  <span className="min-w-[52px] shrink-0 text-right text-[13.5px] text-[var(--text-secondary)]">{displayQuantity(item.quantity)}</span>
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

/**
 * Canvas «Diepvries mobiel 2»: bordenrij in een frostkaart (mobiel startscherm). Gerechten als
 * rond bord, producten als foto op wit; teller rechtsboven, op het einde «Invriezen».
 */
export function HomeFreezerPlatesCard({ items }: { items: DashboardFreezerRow[] }) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const stats = plural(items.length, "item", "items");
  // Gerechten eerst, dan producten; binnen elke groep eerst items met een foto.
  const ordered = items
    .map((item) => ({ item, photo: item.recipePhotoUrl ?? (item.type === "gerecht" ? null : getPhotoUrl(item.name)) }))
    .sort((a, b) => Number(b.item.type === "gerecht") - Number(a.item.type === "gerecht") || Number(!!b.photo) - Number(!!a.photo));

  return (
    <div className={cn(FROST_CARD_CLASS, "py-4")}>
      <FrostDecor />
      <p className="relative flex items-center gap-2 px-4 text-xs font-extrabold uppercase tracking-[0.06em] text-[#3f6dc0] [[data-theme=dark]_&]:text-[#9db8ee]">
        {SNOWFLAKE}
        {stats}
      </p>
      <ul className="relative m-0 mt-4 flex list-none gap-1.5 overflow-x-auto px-4 pb-1 pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ordered.map(({ item, photo }) => {
          const isDish = item.type === "gerecht";
          return (
            <li key={item.id} className="w-[92px] shrink-0">
              <Link href="/diepvriesvoorraad" className="flex flex-col items-center gap-1.5 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded-[14px]">
                <span className="relative">
                  <span className={cn("flex size-[76px] items-center justify-center overflow-hidden rounded-full", isDish && photo ? "shadow-[0_12px_20px_-12px_rgba(30,60,120,0.5)]" : "bg-[var(--white)] shadow-[0_0_0_4px_rgba(255,255,255,0.7),0_12px_20px_-12px_rgba(30,60,120,0.5)]")}>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- receptfoto of lokale productfoto
                      <img
                        src={photo}
                        alt=""
                        width={76}
                        height={76}
                        className={isDish ? "size-full scale-[1.08] object-cover" : "size-[60px] object-contain"}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-[28px] font-extrabold text-[#c26b2b]" aria-hidden>
                        {item.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="absolute -right-1 -top-0.5 flex h-[22px] items-center rounded-pill bg-[var(--white)] px-[7px] text-xs font-extrabold text-[#2f5fb3] shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
                    {item.packages}×
                  </span>
                </span>
                <span className="line-clamp-2 text-center text-[13px] font-bold leading-4 text-text-primary first-letter:uppercase">{item.name}</span>
              </Link>
            </li>
          );
        })}
        <li className="w-[92px] shrink-0">
          <Link href="/diepvriesvoorraad" className="flex flex-col items-center gap-1.5 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded-[14px]">
            <span className="flex size-[76px] items-center justify-center rounded-full border-2 border-dashed border-[rgba(77,121,199,0.45)] text-[#4d79c7]">{PLUS_ICON}</span>
            <span className="text-[13px] font-bold leading-4 text-[#3f6dc0]">Invriezen</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
