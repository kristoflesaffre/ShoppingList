"use client";

import * as React from "react";
import type { ListItem } from "./new_item_modal";
import { categoryColor } from "./list_cards_view";
import type { ItemPhotoLookupOptions } from "@/lib/item-photos";
import { categoryHeadingDisplay, groupMeatSubtypes } from "@/lib/item-ingredient-category";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { cn } from "@/lib/utils";
import { CategoryCard } from "@/components/ui/category_card";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { StoreBadge, useStoreLongPress, useStoreMark } from "./store_mark";

type Section = { title: string; displayTitle?: string; items: ListItem[] };
type GetPhotoUrl = (name: string, size?: number, options?: ItemPhotoLookupOptions) => string | null;
export type LoyaltySlot = "delhaize" | "lidl";

const LINK_CLASS =
  "shrink-0 whitespace-nowrap rounded-sm text-[13px] font-semibold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

function CardIcon() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <path d="M3 10h18" />
      </svg>
    </span>
  );
}

function Logo({ src, faded, overlap }: { src: string; faded?: boolean; overlap?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- winkellogo uit /public/logos
    <img
      src={src}
      alt=""
      width={26}
      height={26}
      className={cn(
        "size-[26px] shrink-0 rounded-full bg-[var(--white)] object-contain shadow-[0_0_0_2px_var(--white)]",
        overlap && "-ml-2",
        faded && "opacity-45 grayscale",
      )}
    />
  );
}

/**
 * Canvas «Favorieten beheren 1 · klantenkaart-staten»: één regel onder de titel voor 2, 1 of geen
 * gekoppelde kaart (combi Lidl / Delhaize) en voor een favorietenlijst van één winkel.
 */
export function MasterLoyaltyLine({
  combo,
  storeLogo,
  storeLabel,
  primaryLogo,
  secondaryLogo,
  hasPrimary,
  hasSecondary,
  onView,
  onLink,
}: {
  combo: boolean;
  storeLogo: string;
  storeLabel: string;
  /** Combi: Delhaize-logo (slot «delhaize»). */
  primaryLogo: string;
  /** Combi: Lidl-logo (slot «lidl»). */
  secondaryLogo: string;
  hasPrimary: boolean;
  hasSecondary: boolean;
  onView: (slot: LoyaltySlot) => void;
  onLink: (slot: LoyaltySlot) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const popRef = React.useRef<HTMLDivElement>(null);
  // Zwevend paneel: sluit bij klikken ernaast of Escape.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const shell = "flex w-full items-center gap-2.5 rounded-[16px] px-3 py-2.5";
  const white = "bg-[var(--white)] shadow-card";

  const linkBox = (subline: string, slot: LoyaltySlot) => (
    <button
      type="button"
      onClick={() => onLink(slot)}
      className={cn(
        shell,
        "bg-[var(--blue-25)] text-left shadow-[inset_0_0_0_1.5px_var(--blue-100)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
      )}
    >
      <CardIcon />
      <span className="min-w-0 flex-1 leading-[17px]">
        <span className="block text-sm font-semibold text-text-primary">Klantenkaart koppelen</span>
        <span className="block truncate text-xs text-[var(--text-tertiary)]">{subline}</span>
      </span>
      <span className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-pill bg-[var(--blue-500)] px-3 text-[13px] font-semibold text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Koppelen
      </span>
    </button>
  );

  if (!combo) {
    if (!hasPrimary) return linkBox(`Scan je ${storeLabel}-kaart`, "delhaize");
    return (
      <div className={cn(shell, white)}>
        <Logo src={storeLogo} />
        <span className="min-w-0 flex-1 leading-[17px]">
          <span className="block text-sm font-semibold text-text-primary">Klantenkaart gekoppeld</span>
          <span className="block truncate text-xs text-[var(--text-tertiary)]">
            {storeLabel}
          </span>
        </span>
        <button type="button" onClick={() => onView("delhaize")} className={LINK_CLASS}>
          Beheren
        </button>
      </div>
    );
  }

  if (!hasPrimary && !hasSecondary) return linkBox("Scan je Lidl- of Delhaize-kaart", "delhaize");

  if (hasPrimary !== hasSecondary) {
    const linked: LoyaltySlot = hasPrimary ? "delhaize" : "lidl";
    const missing: LoyaltySlot = hasPrimary ? "lidl" : "delhaize";
    const name = (slot: LoyaltySlot) => (slot === "delhaize" ? "Delhaize" : "Lidl");
    return (
      <div className={cn(shell, white)}>
        <button
          type="button"
          onClick={() => onView(linked)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          aria-label={`${name(linked)}-kaart bekijken`}
        >
          <span className="flex shrink-0">
            <Logo src={primaryLogo} faded={!hasPrimary} />
            <Logo src={secondaryLogo} faded={!hasSecondary} overlap />
          </span>
          <span className="min-w-0 flex-1 leading-[17px]">
            <span className="block text-sm font-semibold text-text-primary">1 klantenkaart gekoppeld</span>
            <span className="block truncate text-xs text-[var(--text-tertiary)]">
              {name(linked)} ✓ · {name(missing)} nog niet
            </span>
          </span>
        </button>
        <button type="button" onClick={() => onLink(missing)} className={LINK_CLASS}>
          + {name(missing)}-kaart
        </button>
      </div>
    );
  }

  /* Canvas «Favorieten · pillen C»: getinte pil «2 klantenkaarten» met «Tonen»; de kaarten klappen
     open als zwevend paneel over de inhoud eronder (niets verschuift). */
  return (
    <div ref={popRef} className="relative w-full">
      <div className="flex h-14 w-full items-center gap-3 rounded-pill bg-[linear-gradient(100deg,#e7efff,#f1ecff)] pl-3 pr-2.5 [[data-theme=dark]_&]:bg-[linear-gradient(100deg,#1e2a48,#272241)]">
        <span className="flex shrink-0">
          <Logo src={primaryLogo} />
          <Logo src={secondaryLogo} overlap />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">2 klantenkaarten</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-pill bg-[var(--white)] pl-3.5 pr-2.5 text-[13.5px] font-bold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          {open ? "Klaar" : "Tonen"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-4 transition-transform", open && "rotate-90")}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-[16px] bg-[var(--white)] px-3 py-1 shadow-[0_14px_34px_-10px_rgba(16,17,48,0.32),0_0_0_1px_var(--border-subtle)] motion-safe:animate-fade-up">
          {([
            ["delhaize", primaryLogo, "Delhaize-kaart"],
            ["lidl", secondaryLogo, "Lidl-kaart"],
          ] as const).map(([slot, logo, label]) => (
            <div key={slot} className="flex items-center gap-2.5 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- winkellogo */}
              <img src={logo} alt="" width={20} height={20} className="size-5 shrink-0 object-contain" />
              <span className="min-w-0 flex-1 text-sm text-text-primary">{label}</span>
              <button type="button" onClick={() => onView(slot)} className={LINK_CLASS}>
                Bekijken
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-3.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Canvas «Favorieten beheren 1»: favorieten in categoriekaarten (zelfde stijl als «toevoegen uit
 * favorieten»). Tik op een rij om te bewerken, veeg naar links om te verwijderen, «+» in de kop
 * voegt toe aan die categorie. Desktop: drie kolommen.
 */
export function MasterCategoryCards({
  sections,
  getPhotoUrl,
  onAddToSection,
  onEdit,
  onDelete,
}: {
  sections: Section[];
  getPhotoUrl: GetPhotoUrl;
  onAddToSection: (sectionTitle: string) => void;
  onEdit: (item: ListItem) => void;
  onDelete: (itemId: string) => void;
}) {
  const cards = sections.filter((s) => s.items.length > 0);
  return (
    <div className="lg:columns-3 lg:gap-4">
      {cards.map((s) => {
        const title = categoryHeadingDisplay(s.displayTitle ?? s.title);
        return (
          <CategoryCard
            key={s.title}
            className="mb-3 lg:mb-4"
            rgb={categoryColor(title)}
            title={title}
            count={s.items.length}
            action={
              <RoundIconButton tone="onColor" size={28} onClick={() => onAddToSection(s.title)} aria-label={`Favoriet toevoegen aan ${title}`}>
                {RoundIcons.plus}
              </RoundIconButton>
            }
          >
            <ul className="px-2.5 pb-1 pt-0.5">
              {groupMeatSubtypes(s.title, s.items, (i) => i.name).map((item, k) => (
                <li key={item.id} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
                  <MasterItemRow item={item} getPhotoUrl={getPhotoUrl} onEdit={onEdit} onDelete={onDelete} />
                </li>
              ))}
            </ul>
          </CategoryCard>
        );
      })}
    </div>
  );
}

/** Eén favoriet: tik = bewerken, veeg = verwijderen; op Lidl / Delhaize ook winkellogo en lang drukken = winkel kiezen. */
function MasterItemRow({
  item,
  getPhotoUrl,
  onEdit,
  onDelete,
}: {
  item: ListItem;
  getPhotoUrl: GetPhotoUrl;
  onEdit: (item: ListItem) => void;
  onDelete: (itemId: string) => void;
}) {
  const storeMark = useStoreMark();
  const { className: pressCls, ...press } = useStoreLongPress(item);
  const photo = item.stockPhotoUrl ?? getPhotoUrl(item.name, 80) ?? null;
  return (
    <div className="relative isolate">
      <SwipeToDelete onDelete={() => onDelete(item.id)} deleteActionLabel={`Veeg naar links om "${item.name}" te verwijderen`}>
        <button
          {...press}
          type="button"
          onClick={() => onEdit(item)}
          className={cn(
            pressCls,
            "flex w-full items-center gap-3 bg-[var(--white)] px-1 py-[9px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
          )}
        >
          <span className="relative flex size-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--gray-25)]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- lokale item-webp
              <img src={photo} alt="" width={34} height={34} className="size-[34px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
            ) : (
              <span className="text-sm font-semibold text-[var(--blue-400)]">{item.name.trim().charAt(0).toUpperCase()}</span>
            )}
            <StoreBadge store={item.store} size={15} />
          </span>
          <span className="min-w-0 flex-1 leading-[19px]">
            <span className="block truncate text-[15px] font-medium text-text-primary first-letter:uppercase">{item.name}</span>
            <span className="block truncate text-[13px] text-[var(--text-tertiary)]">{item.quantity}</span>
          </span>
          {storeMark && !item.store ? <span aria-hidden className="w-[74px] shrink-0" /> : null}
        </button>
      </SwipeToDelete>
      {storeMark && !item.store ? (
        <button
          type="button"
          onClick={(e) => storeMark.openMenu(item, (e.currentTarget.closest("li") ?? e.currentTarget).getBoundingClientRect())}
          className="absolute right-1 top-1/2 z-[2] inline-flex h-7 bg-[var(--white)] -translate-y-1/2 items-center rounded-pill px-2.5 text-xs font-bold text-[var(--text-secondary)] shadow-[inset_0_0_0_1.2px_var(--gray-200)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          + winkel
        </button>
      ) : null}
    </div>
  );
}
