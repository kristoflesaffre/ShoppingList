"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { ClaimBadge, KadoPhoto, StoreChip, storeOf, type KadoItem } from "@/components/kado_ideeen";
import { formatEventDate, mixWithWhiteRgb, vastColor, vastIcon } from "@/lib/vaste-lijstjes";

/**
 * Detail van één kado-idee (canvas «Kado's met links · D»): grote foto, prijs en winkel, notitie,
 * wie het koopt, en de winkel openen als hoofdactie; «Markeer als gekocht» is bijzaak.
 */
export default function KadoIdeePage() {
  const params = useParams<{ id: string; itemId: string }>();
  const listId = params?.id ?? "";
  const itemId = params?.itemId ?? "";
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const { isLoading, data } = db.useQuery(itemId ? { items: { list: {}, $: { where: { id: itemId } } } } : null);
  const { data: profData } = db.useQuery({ profiles: { $: { where: { instantUserId: user?.id ?? "__none__" } } } });
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const item = (data?.items?.[0] ?? null) as (KadoItem & { list?: { id: string; name: string; eventDate?: string; colorKey?: string; vastType?: string; icon?: string } }) | null;
  const back = `/vast/${listId}`;

  if (authLoading || !user || isLoading) return <PageSpinner />;
  if (!item) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base text-[var(--text-secondary)]">Dit idee bestaat niet meer.</p>
        <Link href={back} className="font-semibold text-action-primary">
          Terug naar het lijstje
        </Link>
      </div>
    );
  }

  const list = item.list ?? null;
  const color = list ? vastColor(list) : ([229, 97, 138] as [number, number, number]);
  const icon = list ? vastIcon(list) : "/images/ui/kado_240.webp";
  const store = item.linkStore || storeOf(item.linkUrl);
  const eventLabel = formatEventDate(list?.eventDate ?? null);
  const firstName = (profData?.profiles?.[0] as { firstName?: string } | undefined)?.firstName?.trim() || null;
  const mine = item.claimedByInstantUserId === user.id;
  const claimedByOther = !!item.claimedByInstantUserId && !mine;

  const toggleClaim = () => {
    if (mine) {
      void db.transact(db.tx.items[item.id].merge({ claimedByInstantUserId: null, claimedByDisplayName: null } as never)).catch(() => undefined);
    } else {
      void db.transact(db.tx.items[item.id].update({ claimedByInstantUserId: user.id, claimedByDisplayName: firstName ?? "" })).catch(() => undefined);
    }
  };
  const toggleBought = () => void db.transact(db.tx.items[item.id].update({ checked: !item.checked })).catch(() => undefined);
  const saveNote = () => {
    if (note == null) return;
    const v = note.trim();
    if (v !== (item.note ?? "")) void db.transact(db.tx.items[item.id].update({ note: v })).catch(() => undefined);
    setNote(null);
  };
  const remove = () => {
    void db.transact(db.tx.items[item.id].delete()).catch(() => undefined);
    router.replace(back);
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[var(--bg-app)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px]"
        style={{ backgroundImage: `linear-gradient(180deg, ${mixWithWhiteRgb(color, 0.22)} 0%, var(--bg-app) 100%)` }}
      />
      <div className="relative mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pb-[calc(40px+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] motion-safe:animate-fade-up">
        <header className="flex h-16 items-center justify-between lg:mt-6">
          <Link href={back} aria-label={`Terug naar ${list?.name ?? "het lijstje"}`} className={headerRoundButtonClass}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
          </Link>
          <span className="relative flex gap-2">
            <button type="button" aria-label="Meer opties" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} className={headerRoundButtonClass}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-12 z-30 w-56 rounded-[18px] bg-[var(--white)] p-1.5 shadow-[0_18px_40px_-14px_rgba(16,17,48,0.35),0_0_0_1px_var(--border-subtle)]">
                <button type="button" onClick={remove} className="flex h-11 w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[15px] font-medium text-[var(--error-400)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                  </svg>
                  Idee verwijderen
                </button>
              </div>
            ) : null}
          </span>
        </header>

        <div className="relative mt-1">
          <KadoPhoto item={item} color={color} emptyIcon={icon} className="aspect-square max-h-[420px] w-full rounded-[26px] bg-[var(--white)]" />
          <span className="absolute left-3 top-3">
            <ClaimBadge item={item} userId={user.id} />
          </span>
        </div>

        {store ? <StoreChip store={store} className="mt-4 text-[13px]" /> : null}
        <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.01em] text-text-primary">{item.name}</h1>
        {item.linkPrice ? <p className="mt-2 text-2xl font-extrabold text-text-primary">{item.linkPrice}</p> : null}

        <div className="mt-4 rounded-[22px] bg-[var(--white)] px-4 py-1 shadow-[0_1px_2px_rgba(16,17,48,0.04),0_0_0_1px_var(--border-subtle)]">
          <div className="flex items-center gap-3 py-3">
            <span className="w-[92px] shrink-0 text-sm text-[var(--text-secondary)]">Voor</span>
            <span className="min-w-0 truncate text-[15px] font-semibold text-text-primary">
              {list?.name ?? "—"}
              {eventLabel ? ` · ${eventLabel}` : ""}
            </span>
          </div>
          <label className="flex items-center gap-3 border-t border-[var(--border-subtle)] py-1.5">
            <span className="w-[92px] shrink-0 text-sm text-[var(--text-secondary)]">Notitie</span>
            <input
              value={note ?? item.note ?? ""}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              placeholder="Notitie toevoegen"
              className="h-9 min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-text-primary outline-none placeholder:font-normal placeholder:text-[var(--text-tertiary)]"
            />
          </label>
          <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] py-3">
            <span className="w-[92px] shrink-0 text-sm text-[var(--text-secondary)]">Wie koopt?</span>
            {claimedByOther ? (
              <span className="text-[15px] font-semibold text-text-primary">{item.claimedByDisplayName || "Iemand anders"}</span>
            ) : (
              <button type="button" onClick={toggleClaim} className="text-[15px] font-semibold text-action-primary">
                {mine ? "Ik koop dit · niet meer" : "Ik koop dit"}
              </button>
            )}
          </div>
        </div>

        {item.linkUrl ? (
          <a
            href={item.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex h-[54px] items-center justify-center gap-2 rounded-pill bg-action-primary text-base font-bold text-white no-underline shadow-[0_8px_18px_-8px_rgba(79,85,241,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          >
            Bekijk op {store ?? "de winkel"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
        ) : null}
        <button type="button" onClick={toggleBought} className="mt-2 flex h-12 items-center justify-center gap-2 rounded-pill text-[15px] font-bold text-[var(--text-secondary)] [@media(hover:hover)]:hover:bg-[var(--white)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
            <path d="M5 12.5l4.2 4L19 7" />
          </svg>
          {item.checked ? "Toch nog niet gekocht" : "Markeer als gekocht"}
        </button>
      </div>
    </div>
  );
}
