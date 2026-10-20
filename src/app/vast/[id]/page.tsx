"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { headerRoundButtonClass, HeaderEditButton } from "@/components/ui/header_round_button";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { VastListSheet } from "@/components/vaste_lijstjes";
import { useAutoShare } from "@/lib/auto-share";
import { KadoIdeeen, type KadoItem } from "@/components/kado_ideeen";
import {
  VAST_COLORS,
  VAST_TYPE_META,
  daysUntilEvent,
  daysUntilLabel,
  deepRgb,
  formatEventDate,
  isVastList,
  mixWithWhiteRgb,
  vastColor,
  vastIcon,
  vastType,
  type VastColorKey,
} from "@/lib/vaste-lijstjes";

/**
 * Detail van een vast lijstje (canvas «Lijstjes · B uitgewerkt · 4–5»): band in de kleur van het
 * lijstje met de illustratie, de open punten om af te vinken en toe te voegen, en daaronder wat
 * al gekocht/gedaan is (met «Wis»).
 */

type ItemRow = { id: string; name: string; checked?: boolean; order?: number };

function CheckCircle({ checked, color, onClick, label }: { checked: boolean; color: [number, number, number]; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <span
        className={cn("flex size-[22px] items-center justify-center rounded-full transition-colors duration-fast", !checked && "shadow-[inset_0_0_0_1.6px_#c6c8ce]")}
        style={checked ? { backgroundColor: `rgb(${color.join(",")})` } : undefined}
      >
        {checked ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3">
            <path d="M5 12.5l4.2 4L19 7" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

export default function VastLijstjePage() {
  const params = useParams<{ id: string }>();
  const listId = params?.id ?? "";
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const { isLoading, data } = db.useQuery(listId ? { lists: { items: {}, memberships: {}, $: { where: { id: listId } } } } : null);
  const [draft, setDraft] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const list = (data?.lists?.[0] ?? null) as
    | { id: string; name: string; items?: ItemRow[]; memberships?: { id: string; instantUserId?: string }[]; ownerId?: string; eventDate?: string; colorKey?: string; listKind?: string; vastType?: string; icon?: string }
    | null;
  const items = React.useMemo(() => [...((list?.items ?? []) as ItemRow[])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [list?.items]);
  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  // Met wie het lijstje gedeeld is (eigenaar + deelnemers, zonder jezelf): naam en profielfoto.
  const otherIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (list?.ownerId) ids.add(list.ownerId);
    for (const m of list?.memberships ?? []) if (m.instantUserId) ids.add(m.instantUserId);
    if (user?.id) ids.delete(user.id);
    return Array.from(ids);
  }, [list?.ownerId, list?.memberships, user?.id]);
  /** Je deelgenoten: in het menu kan de eigenaar per persoon kiezen of die het lijstje ziet. */
  const { partnerIds } = useAutoShare(user?.id);
  const profileIds = React.useMemo(() => Array.from(new Set([...otherIds, ...partnerIds])), [otherIds, partnerIds]);
  const { data: peopleData } = db.useQuery({
    profiles: { $: { where: profileIds.length > 0 ? { or: profileIds.map((id) => ({ instantUserId: id })) } : { instantUserId: "__vast_geen_deelnemers__" } } },
  } as unknown as Parameters<typeof db.useQuery>[0]);
  const profileOf = React.useCallback(
    (id: string) => {
      const rows = ((peopleData as { profiles?: { instantUserId?: string; firstName?: string; avatarUrl?: string }[] } | undefined)?.profiles ?? []);
      const p = rows.find((r) => r.instantUserId === id);
      return { id, name: p?.firstName?.trim() || null, avatarUrl: p?.avatarUrl?.trim() || null };
    },
    [peopleData],
  );
  const people = React.useMemo(() => otherIds.map(profileOf), [otherIds, profileOf]);
  const named = people.filter((p) => p.name).map((p) => p.name as string);
  const sharedLabel =
    named.length === 0 ? "Gedeeld" : `Gedeeld met ${named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} en ${named[named.length - 1]}`}`;

  if (authLoading || !user || isLoading) return <PageSpinner />;
  if (!list || !isVastList(list)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base text-[var(--text-secondary)]">Dit lijstje bestaat niet meer.</p>
        <Link href="/lijstjes-beheren/lijstjes" className="font-semibold text-action-primary">
          Naar je lijstjes
        </Link>
      </div>
    );
  }

  const type = vastType(list);
  const meta = VAST_TYPE_META[type];
  const color = vastColor(list);
  const icon = vastIcon(list);
  const isPerson = /\/(meisje|jongen|man|gezin)_/.test(icon);
  const shared = (list.memberships ?? []).length > 0 || list.ownerId !== user.id;
  const eventIso = typeof list.eventDate === "string" ? list.eventDate : null;
  const eventLabel = formatEventDate(eventIso);
  const daysLabel = daysUntilLabel(daysUntilEvent(eventIso));
  const countLabel = `${open.length} ${open.length === 1 ? meta.itemNoun : type === "kado" ? "ideeën" : type === "todo" ? "taken" : "items"} open`;

  const addItem = () => {
    const name = draft.trim();
    if (!name) return;
    const order = items.length > 0 ? Math.max(...items.map((i) => i.order ?? 0)) + 1 : 0;
    void db
      .transact(db.tx.items[iid()].update({ name, quantity: "", checked: false, section: "Algemeen", order }).link({ list: list.id }))
      .catch(() => undefined);
    setDraft("");
    inputRef.current?.focus();
  };
  const toggle = (item: ItemRow) => void db.transact(db.tx.items[item.id].update({ checked: !item.checked })).catch(() => undefined);
  const remove = (item: ItemRow) => void db.transact(db.tx.items[item.id].delete()).catch(() => undefined);
  const clearDone = () => void db.transact(done.map((i) => db.tx.items[i.id].delete())).catch(() => undefined);
  const deleteList = () => {
    void db
      .transact([...items.map((i) => db.tx.items[i.id].delete()), ...(list.memberships ?? []).map((m) => db.tx.listMembers[m.id].delete()), db.tx.lists[list.id].delete()])
      .catch(() => undefined);
    router.replace("/lijstjes-beheren/lijstjes");
  };

  const accent = deepRgb(color, 0.72);
  const isKado = type === "kado";
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[var(--bg-app)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[340px]"
        style={{ backgroundImage: `linear-gradient(180deg, ${mixWithWhiteRgb(color, 0.34)} 0%, ${mixWithWhiteRgb(color, 0.12)} 60%, var(--bg-app) 100%)` }}
      />
      <div className={cn("relative mx-auto flex w-full flex-1 flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] motion-safe:animate-fade-up", isKado ? "max-w-[1120px]" : "max-w-[720px]")}>
        <header className="flex h-16 items-center justify-between lg:mt-6">
          <Link href="/lijstjes-beheren/lijstjes" aria-label="Terug naar je lijstjes" className={headerRoundButtonClass}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
          </Link>
          <span className="relative flex gap-2">
            {list.ownerId === user.id ? <HeaderEditButton label="Lijstje wijzigen" onClick={() => setEditOpen(true)} /> : null}
            {list.ownerId === user.id ? (
              <button type="button" aria-label="Meer opties" aria-expanded={menuOpen} onClick={() => { setMenuOpen((v) => !v); setConfirmDelete(false); }} className={headerRoundButtonClass}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
                  <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>
            ) : null}
            {menuOpen ? (
              <div className="absolute right-0 top-12 z-30 w-60 rounded-[18px] bg-[var(--white)] p-1.5 shadow-[0_18px_40px_-14px_rgba(16,17,48,0.35),0_0_0_1px_var(--border-subtle)]">
                {confirmDelete ? (
                  <div className="p-2.5">
                    <p className="text-sm text-text-primary">«{list.name}» en alles erop verwijderen?</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => setMenuOpen(false)} className="h-9 flex-1 rounded-pill bg-[var(--gray-25)] text-sm font-semibold text-text-primary">
                        Annuleer
                      </button>
                      <button type="button" onClick={deleteList} className="h-9 flex-1 rounded-pill bg-[var(--error-400)] text-sm font-semibold text-white">
                        Verwijderen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                  {/* Delen per persoon: bv. een kado-lijstje voor Chloé niet met Chloé delen. */}
                  {Array.from(new Set([...partnerIds, ...(list.memberships ?? []).map((m) => m.instantUserId ?? "")]))
                    .filter((id) => id && id !== user.id)
                    .map((id) => {
                      const person = profileOf(id);
                      const membership = (list.memberships ?? []).find((m) => m.instantUserId === id);
                      const label = person.name ?? "deelgenoot";
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            void db
                              .transact(
                                membership
                                  ? db.tx.listMembers[membership.id].delete()
                                  : db.tx.listMembers[iid()].update({ instantUserId: id }).link({ list: list.id }),
                              )
                              .catch(() => undefined);
                            setMenuOpen(false);
                          }}
                          className="flex h-11 w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[15px] font-medium text-text-primary [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
                        >
                          <span className="flex size-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] text-[11px] font-bold text-[var(--blue-500)]">
                            {person.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- profielfoto
                              <img src={person.avatarUrl} alt="" className="size-full object-cover" />
                            ) : (
                              label.charAt(0).toUpperCase()
                            )}
                          </span>
                          {membership ? `Niet meer delen met ${label}` : `Delen met ${label}`}
                        </button>
                      );
                    })}
                  <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[15px] font-medium text-[var(--error-400)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                    </svg>
                    Lijstje verwijderen
                  </button>
                  </>
                )}
              </div>
            ) : null}
          </span>
        </header>

        {isKado ? (
          <KadoIdeeen
            header={
              <section className="mb-3 flex min-w-0 items-center gap-3.5 lg:mb-0">
                <span className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[rgba(255,255,255,0.75)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
                  <img src={icon} alt="" className={cn("object-contain", isPerson ? "size-16 rounded-full" : "size-[58px]")} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-text-primary lg:text-[30px]">{list.name}</h1>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {eventLabel ? (
                      <span className="inline-flex h-7 items-center rounded-pill bg-[rgba(255,255,255,0.85)] px-2.5 text-[12.5px] font-bold text-text-primary">🎂 {eventLabel}</span>
                    ) : null}
                    {daysLabel ? (
                      <span className="inline-flex h-7 items-center rounded-pill bg-[rgba(255,255,255,0.85)] px-2.5 text-[12.5px] font-bold" style={{ color: accent }}>
                        {daysLabel}
                      </span>
                    ) : null}
                    {shared ? (
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-[rgba(255,255,255,0.85)] pl-1 pr-2.5 text-[12.5px] font-bold text-[var(--text-secondary)]">
                        <span className="flex">
                          {people.slice(0, 3).map((p, i) => (
                            <span
                              key={p.id}
                              className={cn(
                                "flex size-5 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] text-[10px] font-extrabold text-action-primary ring-2 ring-white",
                                i > 0 && "-ml-1.5",
                              )}
                            >
                              {p.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- profielfoto (data-URL of extern)
                                <img src={p.avatarUrl} alt="" className="size-full object-cover" />
                              ) : (
                                (p.name ?? "?").charAt(0).toUpperCase()
                              )}
                            </span>
                          ))}
                        </span>
                        {sharedLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>
            }
            listId={list.id}
            listName={list.name}
            items={items as KadoItem[]}
            color={color}
            userId={user.id}
            emptyIcon={icon}
          />
        ) : (
          <>
          <section className="mb-5 flex flex-col items-center text-center">
            <span
              className="flex size-28 items-center justify-center overflow-hidden rounded-[32px] bg-[rgba(255,255,255,0.75)]"
              style={{ boxShadow: `0 14px 28px -18px rgb(${color.join(",")})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
              <img src={icon} alt="" className={cn("object-contain", isPerson ? "size-24 rounded-full" : "size-[88px]")} />
            </span>
            <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-text-primary">{list.name}</h1>
            <p className="mt-0.5 text-[13.5px] text-[var(--text-secondary)]">
              {shared ? `${sharedLabel} · ` : ""}
              {countLabel}
            </p>
            {eventLabel ? (
              <div className="mt-3 flex gap-2">
                <span className="inline-flex h-8 items-center rounded-pill bg-[rgba(255,255,255,0.8)] px-3 text-[13px] font-bold text-text-primary">🎂 {eventLabel}</span>
                {daysLabel ? (
                  <span className="inline-flex h-8 items-center rounded-pill bg-[rgba(255,255,255,0.8)] px-3 text-[13px] font-bold" style={{ color: accent }}>
                    {daysLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="rounded-[22px] bg-[var(--white)] px-4 pb-3 pt-1 shadow-[0_1px_2px_rgba(16,17,48,0.04),0_0_0_1px_var(--border-subtle)]">
            {open.length > 0 ? (
              <ul className="m-0 list-none p-0">
                {open.map((item, i) => (
                  <li key={item.id} className={cn(i > 0 && "border-t border-[var(--border-subtle)]")}>
                    <SwipeToDelete onDelete={() => remove(item)} deleteActionLabel={`Veeg naar links om "${item.name}" te verwijderen`}>
                      <div className="flex items-center gap-3 bg-[var(--white)] py-3">
                        <CheckCircle checked={false} color={color} onClick={() => toggle(item)} label={`${item.name} afvinken`} />
                        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-5 text-text-primary">{item.name}</span>
                      </div>
                    </SwipeToDelete>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-[var(--text-tertiary)]">Nog niets op dit lijstje.</p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addItem();
              }}
              className="mt-1 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={type === "todo" ? "Nieuwe taak…" : "Iets toevoegen…"}
                aria-label="Nieuw item"
                className="h-10 min-w-0 flex-1 rounded-[14px] bg-[var(--gray-25)] px-3.5 text-[15px] text-text-primary outline-none placeholder:text-[var(--text-tertiary)] focus:bg-[var(--white)] focus:shadow-[inset_0_0_0_1.5px_var(--blue-300)]"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-sm font-bold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: mixWithWhiteRgb(color, 0.14), color: accent }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Toevoegen
              </button>
            </form>
          </div>

          {done.length > 0 ? (
            <>
              <div className="mx-1 mb-1.5 mt-5 flex items-center justify-between">
                <span className="text-xs font-extrabold tracking-[0.05em] text-[var(--text-tertiary)]">
                  {meta.doneLabel.toUpperCase()} · {done.length}
                </span>
                <button type="button" onClick={clearDone} className="rounded-pill px-1 text-[13px] font-semibold text-action-primary">
                  Wis
                </button>
              </div>
              <ul className="m-0 list-none rounded-[22px] bg-[var(--white)] px-4 py-0.5 opacity-75 shadow-[0_0_0_1px_var(--border-subtle)]">
                {done.map((item, i) => (
                  <li key={item.id} className={cn("flex items-center gap-3 py-3", i > 0 && "border-t border-[var(--border-subtle)]")}>
                    <CheckCircle checked color={color} onClick={() => toggle(item)} label={`${item.name} terugzetten`} />
                    <span className="min-w-0 flex-1 text-[15px] text-[var(--text-tertiary)] line-through">{item.name}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          </>
        )}
      </div>

      <VastListSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        ownerId={user.id}
        initial={{
          id: list.id,
          name: list.name,
          type,
          colorKey: (typeof list.colorKey === "string" && list.colorKey in VAST_COLORS ? list.colorKey : VAST_TYPE_META[type].color) as VastColorKey,
          icon,
          eventDate: eventIso ?? "",
        }}
      />
    </div>
  );
}
