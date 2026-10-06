"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { LOYALTY_STANDALONE_STORE_OPTIONS } from "@/lib/loyalty-standalone-stores";
import { SearchBar } from "@/components/ui/search_bar";
import { PageBackButton } from "@/components/ui/page_back_button";
import { AddLoyaltyCardSheet } from "@/components/add_loyalty_card_sheet";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { cn } from "@/lib/utils";

/** Zelfde pijl als SlideInModal — public/icons/arrow.svg */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

const MAX_CUSTOM_NAAM_QUERY = 120;

/** Enkel wanneer de zoekopdracht geen winkel oplevert: eigen kaart toevoegen. */
function CustomCardRow({ query, onPick }: { query: string; onPick: (name: string) => void }) {
  const trimmed = query.trim().slice(0, MAX_CUSTOM_NAAM_QUERY);
  return (
    <button
      type="button"
      onClick={() => onPick(trimmed)}
      aria-label={`Klantenkaart toevoegen voor ${trimmed}`}
      className="flex w-full min-w-0 text-left items-center gap-3 rounded-[18px] bg-[var(--white)] p-3.5 no-underline shadow-[0_0_0_1px_var(--border-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 [@media(hover:hover)]:hover:bg-[var(--gray-25)] active:bg-[var(--gray-50)]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--blue-50)] text-[var(--blue-500)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M3 10h18M7 15h4" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
          Kaart voor «{trimmed}» toevoegen
        </span>
        <span className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
          Staat je winkel er niet tussen? Geen probleem.
        </span>
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 shrink-0 text-[var(--text-tertiary)]">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

const TILE_CLASS =
  "relative w-full flex h-[104px] min-w-0 flex-col items-center justify-center gap-[9px] rounded-[20px] bg-[var(--white)] px-2 no-underline shadow-[0_1px_2px_rgba(16,17,48,0.04)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus lg:h-[116px]";

export default function KlantenkaartToevoegenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const [query, setQuery] = React.useState("");
  /** Canvas «15 · variant 1a»: winkel kiezen opent meteen het blad «Kaart van …». */
  const [sheetCard, setSheetCard] = React.useState<{ name: string; logoSrc: string | null } | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const openSheet = (name: string, logoSrc: string | null) => {
    setSheetCard({ name, logoSrc });
    setSheetOpen(true);
  };

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const { data } = db.useQuery({
    loyaltyCards: { $: { where: { ownerId: user?.id ?? "__no_user__" } } },
  });

  /** Winkel (label, kleine letters) → bestaande kaart: tik opent die kaart. */
  const existingByStore = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of (data?.loyaltyCards ?? []) as Array<{ id: string; cardName?: string | null }>) {
      const key = String(c.cardName ?? "").trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, c.id);
    }
    return map;
  }, [data?.loyaltyCards]);

  const sortedStores = React.useMemo(
    () =>
      [...LOYALTY_STANDALONE_STORE_OPTIONS].sort((a, b) =>
        a.label.localeCompare(b.label, "nl", { sensitivity: "base" }),
      ),
    [],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedStores;
    return sortedStores.filter((s) => s.label.toLowerCase().includes(q));
  }, [sortedStores, query]);

  if (authLoading || !user) {
    return <PageSpinner />;
  }

  const noMatch = filtered.length === 0 && query.trim().length > 0;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[var(--bg-app)] px-4">
      {/* Mobiel: topbalk met terugpijl; desktop: ronde terugknop naast de titel. */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <header className="mx-auto flex h-16 max-w-[956px] items-center px-4">
          <Link
            href="/klantenkaarten"
            aria-label="Terug naar klantenkaarten"
            className="flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6 shrink-0" />
          </Link>
        </header>
      </div>

      <div className="flex flex-1 flex-col pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+8px+env(safe-area-inset-top,0px))] lg:pt-[calc(44px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-4 lg:gap-[22px]">
          {/* Canvas «14 · Klantenkaart toevoegen — voorstel» */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PageBackButton href="/klantenkaarten" label="Terug naar klantenkaarten" />
              <div className="min-w-0">
                <h1 className="text-[30px] font-bold leading-9 tracking-tight text-text-primary lg:text-[32px]">
                  Klantenkaart toevoegen
                </h1>
                <p className="mt-1 text-[13.5px] leading-[18px] text-[var(--text-secondary)]">Kies de winkel van je kaart</p>
              </div>
            </div>
            <SearchBar
              className="!bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:w-[300px]"
              value={query}
              onValueChange={setQuery}
              placeholder="Zoek een winkel"
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>

          {noMatch ? (
            <div className="flex flex-col gap-4">
              <p className="pt-1 text-center text-[13px] text-[var(--text-tertiary)]">
                Geen winkel gevonden voor «{query.trim()}»
              </p>
              <CustomCardRow query={query} onPick={(name) => openSheet(name, null)} />
            </div>
          ) : (
            <div className="grid w-full min-w-0 grid-cols-3 gap-2.5 lg:grid-cols-6 lg:gap-3">
              {filtered.map((store) => {
                const existingId = existingByStore.get(store.label.toLowerCase());
                const logo = (
                  // eslint-disable-next-line @next/next/no-img-element -- winkellogo
                  <img src={store.logoSrc} alt="" width={46} height={46} className="size-10 object-contain lg:size-[46px]" aria-hidden />
                );
                return existingId ? (
                  /* Canvas «14 · Al toegevoegd A2»: nauwelijks getint, vinkje + tekst. */
                  <Link
                    key={store.slug}
                    href={`/klantenkaarten?open=${encodeURIComponent(existingId)}`}
                    aria-label={`${store.label}: kaart al toegevoegd, openen`}
                    className={cn(TILE_CLASS, "!gap-1.5 !bg-[#fafaff]")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- winkellogo */}
                    <img src={store.logoSrc} alt="" width={40} height={40} className="size-9 object-contain lg:size-10" aria-hidden />
                    <span className="w-full truncate text-center text-[13.5px] font-semibold text-text-primary">{store.label}</span>
                    <span className="inline-flex items-center gap-[3px] text-[11px] font-semibold text-[var(--blue-400)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-2.5">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                      Toegevoegd
                    </span>
                  </Link>
                ) : (
                  <button
                    key={store.slug}
                    type="button"
                    onClick={() => openSheet(store.label, store.logoSrc)}
                    aria-label={`Klantenkaart toevoegen: ${store.label}`}
                    className={TILE_CLASS}
                  >
                    {logo}
                    <span className="w-full truncate text-center text-[13.5px] font-semibold text-text-primary">{store.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {sheetCard ? (
        <AddLoyaltyCardSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          cardName={sheetCard.name}
          logoSrc={sheetCard.logoSrc}
        />
      ) : null}
    </div>
  );
}
