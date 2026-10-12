"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { getVisibleShoppingOwnerIds } from "@/lib/shopping-share";
import { useAutoShare } from "@/lib/auto-share";
import { isoToListDate, todayIsoDate } from "@/lib/list-date";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { FilterChip } from "@/components/ui/filter_chip";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  VAST_COLOR_KEYS,
  VAST_COLORS,
  VAST_ICONS,
  VAST_TYPE_META,
  deepRgb,
  isVastList,
  mixWithWhiteRgb,
  vastColor,
  vastIcon,
  vastType,
  type VastColorKey,
  type VastType,
} from "@/lib/vaste-lijstjes";

export type VastListSummary = {
  id: string;
  name: string;
  type: VastType;
  color: [number, number, number];
  colorKey: VastColorKey | null;
  icon: string;
  eventDate: string | null;
  openCount: number;
  isOwner: boolean;
  order: number;
  /** Voor verwijderen: items en deelnemers van het lijstje. */
  itemIds: string[];
  memberIds: string[];
};

type ListRow = {
  id: string;
  name?: string;
  icon?: string;
  order?: number;
  ownerId?: string;
  listKind?: string;
  vastType?: string;
  colorKey?: string;
  eventDate?: string;
  items?: { id: string; checked?: boolean }[];
  memberships?: { id: string }[];
};

function summarize(row: ListRow, isOwner: boolean): VastListSummary {
  return {
    id: row.id,
    name: row.name ?? "",
    type: vastType(row),
    color: vastColor(row),
    colorKey: typeof row.colorKey === "string" && row.colorKey in VAST_COLORS ? (row.colorKey as VastColorKey) : null,
    icon: vastIcon(row),
    eventDate: typeof row.eventDate === "string" && row.eventDate ? row.eventDate : null,
    openCount: (row.items ?? []).filter((i) => !i.checked).length,
    isOwner,
    order: typeof row.order === "number" ? row.order : 0,
    itemIds: (row.items ?? []).map((i) => i.id),
    memberIds: (row.memberships ?? []).map((m) => m.id),
  };
}

/** Vaste lijstjes van de gebruiker (eigen + gedeeld) en het aantal open punten in «Te kopen». */
export function useVasteLijstjes(userId: string | null | undefined) {
  const uid = userId ?? "__no_user__";
  const { isLoading, data } = db.useQuery({
    lists: { items: {}, memberships: {}, $: { where: { ownerId: uid, listKind: "vast" } } },
    listMembers: { list: { items: {} }, $: { where: { instantUserId: uid } } },
    shoppingItems: {},
    shoppingShares: { memberships: {}, $: { where: { ownerId: uid } } },
    shoppingShareMembers: { shoppingShare: { memberships: {} }, $: { where: { instantUserId: uid } } },
  });

  const lists = React.useMemo(() => {
    const byId = new Map<string, VastListSummary>();
    for (const row of (data?.lists ?? []) as ListRow[]) {
      if (isVastList(row)) byId.set(row.id, summarize(row, true));
    }
    for (const m of (data?.listMembers ?? []) as { list?: ListRow | null }[]) {
      const row = m.list;
      if (row && isVastList(row) && !byId.has(row.id)) byId.set(row.id, summarize(row, false));
    }
    return Array.from(byId.values()).sort((a, b) => a.order - b.order);
  }, [data?.lists, data?.listMembers]);

  const teKopenOpen = React.useMemo(() => {
    if (!userId) return 0;
    const owners = getVisibleShoppingOwnerIds({
      userId,
      ownedShares: data?.shoppingShares as Parameters<typeof getVisibleShoppingOwnerIds>[0]["ownedShares"],
      joinedMemberships: data?.shoppingShareMembers as Parameters<typeof getVisibleShoppingOwnerIds>[0]["joinedMemberships"],
    });
    return ((data?.shoppingItems ?? []) as { ownerId?: string; checked?: boolean }[]).filter(
      (i) => (!i.ownerId || owners.has(i.ownerId)) && !i.checked,
    ).length;
  }, [data?.shoppingItems, data?.shoppingShares, data?.shoppingShareMembers, userId]);

  return { isLoading, lists, teKopenOpen };
}

const TRASH_PATH = "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13";

/**
 * Gekleurde tegel van een vast lijstje (canvas «Vaste lijstjes»): groot aantal open punten,
 * de naam en de illustratie in de hoek. In bewerkstand een rode vuilbak rechtsboven.
 */
export function VastTile({
  href,
  name,
  count,
  icon,
  color,
  className,
  onDelete,
}: {
  href: string;
  name: string;
  count: number;
  icon: string;
  color: [number, number, number];
  className?: string;
  /** Bewerkstand: verwijderen (ontbreekt = niet verwijderbaar). */
  onDelete?: () => void;
}) {
  const editing = onDelete != null;
  const person = /\/(meisje|jongen|man|gezin)_/.test(icon);
  const body = (
    <>
      <span className="text-[28px] font-extrabold leading-none tabular-nums" style={{ color: deepRgb(color) }}>
        {count}
      </span>
      <span className="mt-1.5 line-clamp-2 pr-1 text-[13.5px] font-extrabold leading-[17px] text-text-primary">{name}</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
      <img
        src={icon}
        alt=""
        aria-hidden
        className={cn(
          "pointer-events-none absolute object-contain",
          person ? "-bottom-1 -right-1 size-[62px] rounded-full bg-[var(--white)]" : "-bottom-2 -right-2 size-[70px]",
        )}
      />
    </>
  );
  const cls = cn(
    "relative flex h-[150px] w-[124px] shrink-0 flex-col overflow-hidden rounded-[22px] p-3 no-underline",
    "transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
    className,
  );
  const style = { backgroundImage: `linear-gradient(160deg, ${mixWithWhiteRgb(color, 0.3)} 0%, ${mixWithWhiteRgb(color, 0.1)} 100%)` };
  if (editing) {
    return (
      <div className={cls} style={style}>
        {body}
        <button
          type="button"
          aria-label={`${name} verwijderen`}
          onClick={onDelete}
          className="absolute right-2 top-2 z-[1] flex size-7 items-center justify-center rounded-full bg-[var(--white)] text-[var(--error-400)] shadow-[0_1px_3px_rgba(16,17,48,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[15px]">
            <path d={TRASH_PATH} />
          </svg>
        </button>
      </div>
    );
  }
  return (
    <Link href={href} aria-label={`${name}, ${count} open`} className={cls} style={style}>
      {body}
    </Link>
  );
}

/** Stippeltegel «Nieuw» die het formulier voor een vast lijstje opent. */
export function NewVastTile({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[150px] w-[124px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[22px] border-[1.5px] border-dashed border-[#c9cbe6] text-[13px] font-bold text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-4">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Nieuw
    </button>
  );
}

/** «Te kopen» als vaste tegel (eigen lijst, altijd aanwezig, niet verwijderbaar). */
export function TeKopenTile({ count, className }: { count: number; className?: string }) {
  return <VastTile href="/te-kopen" name="Te kopen" count={count} icon="/images/ui/kopen_240.webp" color={VAST_COLORS.blauw} className={className} />;
}

export type VastListDraft = {
  id?: string;
  name: string;
  type: VastType;
  colorKey: VastColorKey;
  icon: string;
  eventDate: string;
};

/**
 * Formulier voor een nieuw (of bestaand) vast lijstje: soort, naam, (verjaar)datum bij kado's,
 * kleur en illustratie. Nieuw lijstje: optioneel meteen delen met je deelgenoten.
 */
export function VastListSheet({
  open,
  onClose,
  initial,
  ownerId,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  /** Bewerken: huidige waarden; ontbreekt = nieuw lijstje. */
  initial?: VastListDraft | null;
  ownerId: string;
  /** Volgorde voor een nieuw lijstje (onderaan). */
  nextOrder?: number;
}) {
  const router = useRouter();
  const { partnerIds } = useAutoShare(ownerId);
  const editing = initial?.id != null;
  const [type, setType] = React.useState<VastType>(initial?.type ?? "kado");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [eventDate, setEventDate] = React.useState(initial?.eventDate ?? "");
  const [colorKey, setColorKey] = React.useState<VastColorKey>(initial?.colorKey ?? "roze");
  const [icon, setIcon] = React.useState(initial?.icon ?? VAST_TYPE_META.kado.icon);
  const [share, setShare] = React.useState(true);
  const [person, setPerson] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? "kado");
    setName(initial?.name ?? "");
    setEventDate(initial?.eventDate ?? "");
    setColorKey(initial?.colorKey ?? "roze");
    setIcon(initial?.icon ?? VAST_TYPE_META.kado.icon);
    setPerson("");
    setShare(true);
    // Enkel bij openen (of een ander lijstje) opnieuw invullen, niet bij elke render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const pickType = (t: VastType) => {
    setType(t);
    if (!editing) {
      setColorKey(VAST_TYPE_META[t].color);
      setIcon(VAST_TYPE_META[t].icon);
      if (t === "todo" && !name.trim()) setName("To do");
    }
  };

  const finalName = type === "kado" && !editing ? (person.trim() ? `Kado's ${person.trim()}` : "") : name.trim();
  const canSave = finalName.length > 0;

  const save = () => {
    if (!canSave) return;
    const fields = {
      name: finalName,
      icon,
      vastType: type,
      colorKey,
      eventDate: type === "kado" ? eventDate : "",
    };
    if (editing && initial?.id) {
      void db.transact(db.tx.lists[initial.id].update(fields)).catch(() => undefined);
      onClose();
      return;
    }
    const newId = iid();
    const txs: Parameters<typeof db.transact>[0] = [
      db.tx.lists[newId].update({
        ...fields,
        listKind: "vast",
        date: isoToListDate(todayIsoDate()),
        order: nextOrder ?? 0,
        ownerId,
        isMasterTemplate: false,
      }),
      ...(share ? partnerIds.map((uid) => db.tx.listMembers[iid()].update({ instantUserId: uid }).link({ list: newId })) : []),
    ];
    void db.transact(txs).catch(() => undefined);
    onClose();
    router.push(`/vast/${newId}`);
  };

  const color = VAST_COLORS[colorKey];
  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={editing ? "Lijstje wijzigen" : "Nieuw vast lijstje"}
      footer={
        <Button variant="primary" disabled={!canSave} onClick={save}>
          {editing ? "Bewaren" : "Maak lijstje"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {!editing ? (
          <div>
            <p className="mb-2 text-sm text-text-primary">Soort</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(VAST_TYPE_META) as VastType[]).map((t) => (
                <FilterChip key={t} selected={type === t} onClick={() => pickType(t)}>
                  {VAST_TYPE_META[t].label}
                </FilterChip>
              ))}
            </div>
          </div>
        ) : null}

        {type === "kado" && !editing ? (
          <InputField label="Voor wie?" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="bv. Noë" autoFocus />
        ) : (
          <InputField label="Naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. To do" autoFocus={!editing} />
        )}

        {type === "kado" ? (
          <InputField
            label="Verjaardag of gelegenheid (optioneel)"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        ) : null}

        <div>
          <p className="mb-2 text-sm text-text-primary">Kleur</p>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Kleur">
            {VAST_COLOR_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={colorKey === k}
                aria-label={k}
                onClick={() => setColorKey(k)}
                className={cn(
                  "size-9 rounded-full transition-transform duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  colorKey === k ? "scale-110 shadow-[0_0_0_2px_var(--white),0_0_0_4px_var(--text-primary)]" : "",
                )}
                style={{ backgroundImage: `linear-gradient(160deg, ${mixWithWhiteRgb(VAST_COLORS[k], 0.55)}, ${mixWithWhiteRgb(VAST_COLORS[k], 0.25)})` }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-text-primary">Illustratie</p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Illustratie">
            {VAST_ICONS.map((src) => (
              <button
                key={src}
                type="button"
                role="radio"
                aria-checked={icon === src}
                onClick={() => setIcon(src)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-[16px] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  icon === src ? "shadow-[inset_0_0_0_2px_var(--blue-500)]" : "",
                )}
                style={{ backgroundColor: mixWithWhiteRgb(color, 0.14) }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
                <img src={src} alt="" className="size-[70%] object-contain" />
              </button>
            ))}
          </div>
        </div>

        {!editing && partnerIds.length > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--gray-25)] px-4 py-3">
            <span className="text-[15px] text-text-primary">Delen met je deelgenoten</span>
            <Switch checked={share} onCheckedChange={setShare} aria-label="Delen met je deelgenoten" />
          </div>
        ) : null}
      </div>
    </SlideInModal>
  );
}

export { deepRgb, mixWithWhiteRgb };

/**
 * Rij «Vaste lijstjes» op de startpagina: «Te kopen», de eigen vaste lijstjes en een tegel «Nieuw».
 */
export function VasteLijstjesLane({ userId }: { userId: string }) {
  const { lists, teKopenOpen } = useVasteLijstjes(userId);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[17px] font-bold leading-6 text-text-primary">Vaste lijstjes</h3>
      <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        <TeKopenTile count={teKopenOpen} className="snap-start" />
        {lists.map((l) => (
          <VastTile key={l.id} href={`/vast/${l.id}`} name={l.name} count={l.openCount} icon={l.icon} color={l.color} className="snap-start" />
        ))}
        <NewVastTile onClick={() => setSheetOpen(true)} className="snap-start" />
      </div>
      <VastListSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        ownerId={userId}
        nextOrder={lists.length > 0 ? Math.max(...lists.map((l) => l.order)) + 1 : 0}
      />
    </div>
  );
}

/** Vast lijstje met zijn items en deelnemers verwijderen. */
export function deleteVastList(list: Pick<VastListSummary, "id" | "itemIds" | "memberIds">) {
  void db
    .transact([
      ...list.itemIds.map((id) => db.tx.items[id].delete()),
      ...list.memberIds.map((id) => db.tx.listMembers[id].delete()),
      db.tx.lists[list.id].delete(),
    ])
    .catch(() => undefined);
}
