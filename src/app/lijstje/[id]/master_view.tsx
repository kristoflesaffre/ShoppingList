"use client";

import * as React from "react";
import type { ListItem } from "./new_item_modal";
import { categoryColor } from "./list_cards_view";
import type { ItemPhotoLookupOptions } from "@/lib/item-photos";
import { categoryHeadingDisplay } from "@/lib/item-ingredient-category";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("w-full overflow-hidden rounded-[16px]", white)}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="flex shrink-0">
          <Logo src={primaryLogo} />
          <Logo src={secondaryLogo} overlap />
        </span>
        <span className="min-w-0 flex-1 leading-[17px]">
          <span className="block text-sm font-semibold text-text-primary">2 klantenkaarten gekoppeld</span>
          <span className="block truncate text-xs text-[var(--text-tertiary)]">Delhaize · Lidl</span>
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={LINK_CLASS}>
          {open ? "Klaar" : "Beheren"}
        </button>
      </div>
      {open ? (
        <div className="border-t border-[var(--border-subtle)] px-3 py-1 motion-safe:animate-fade-up">
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
        const rgb = categoryColor(title).join(",");
        return (
          <section
            key={s.title}
            className="mb-3 break-inside-avoid overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:mb-4"
          >
            <div
              className="flex items-center gap-2.5 px-3.5 py-3"
              style={{ background: `linear-gradient(90deg, rgba(${rgb},0.16), rgba(${rgb},0.05))` }}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `rgb(${rgb})` }} aria-hidden />
              <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{title}</h3>
              <span className="text-xs font-bold tabular-nums text-[var(--text-secondary)]">{s.items.length}</span>
              <button
                type="button"
                onClick={() => onAddToSection(s.title)}
                aria-label={`Favoriet toevoegen aan ${title}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <PlusIcon />
              </button>
            </div>
            <ul className="px-2.5 pb-1 pt-0.5">
              {s.items.map((item, k) => {
                const photo = item.stockPhotoUrl ?? getPhotoUrl(item.name, 80) ?? null;
                return (
                  <li key={item.id} className={cn(k > 0 && "border-t border-[var(--border-subtle)]")}>
                    <SwipeToDelete onDelete={() => onDelete(item.id)} deleteActionLabel={`Veeg naar links om "${item.name}" te verwijderen`}>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="flex w-full items-center gap-3 bg-[var(--white)] px-1 py-[9px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
                      >
                        <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--gray-25)]">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- lokale item-webp
                            <img src={photo} alt="" width={34} height={34} className="size-[34px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
                          ) : (
                            <span className="text-sm font-semibold text-[var(--blue-400)]">{item.name.trim().charAt(0).toUpperCase()}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 leading-[19px]">
                          <span className="block truncate text-[15px] font-medium text-text-primary first-letter:uppercase">{item.name}</span>
                          <span className="block truncate text-[13px] text-[var(--text-tertiary)]">{item.quantity}</span>
                        </span>
                      </button>
                    </SwipeToDelete>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
