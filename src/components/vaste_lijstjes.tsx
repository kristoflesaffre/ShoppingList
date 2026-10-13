"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { getVisibleShoppingOwnerIds } from "@/lib/shopping-share";
import { useAutoShare } from "@/lib/auto-share";
import { isoToListDate, todayIsoDate } from "@/lib/list-date";
import { listIsMasterTemplate } from "@/lib/list-master";
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
  tileIconPlacement,
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

  // Favorietenlijsten (master-templates) tellen voor de tegel «Favorieten».
  const { data: favData } = db.useQuery({
    lists: { $: { where: { ownerId: uid } } },
    listMembers: { list: {}, $: { where: { instantUserId: uid } } },
  });
  const favoritesCount = React.useMemo(() => {
    const ids = new Set<string>();
    for (const row of (favData?.lists ?? []) as (ListRow & { isMasterTemplate?: boolean })[]) {
      if (listIsMasterTemplate(row)) ids.add(row.id);
    }
    for (const m of (favData?.listMembers ?? []) as { list?: (ListRow & { isMasterTemplate?: boolean }) | null }[]) {
      if (m.list && listIsMasterTemplate(m.list)) ids.add(m.list.id);
    }
    return ids.size;
  }, [favData?.lists, favData?.listMembers]);

  // Volgorde en verborgen tegels (per gebruiker, op het profiel).
  const { data: profData } = db.useQuery({ profiles: { $: { where: { instantUserId: uid } } } });
  const profile = (profData?.profiles?.[0] ?? null) as { id: string; vasteLijstjesJson?: string | null } | null;
  const serverPrefs = React.useMemo(() => parseVastPrefs(profile?.vasteLijstjesJson), [profile?.vasteLijstjesJson]);
  // Optimistisch: eigen wijzigingen meteen tonen en als basis voor de volgende gebruiken.
  const [localPrefs, setLocalPrefs] = React.useState<VastPrefs | null>(null);
  React.useEffect(() => {
    setLocalPrefs((cur) => (cur && JSON.stringify(cur) === (profile?.vasteLijstjesJson ?? "") ? null : cur));
  }, [profile?.vasteLijstjesJson]);
  const prefs = localPrefs ?? serverPrefs;

  const allEntries = React.useMemo((): VastTileEntry[] => {
    const builtins: VastTileEntry[] = [
      { id: "te-kopen", kind: "te-kopen", href: "/te-kopen", name: "Te kopen", count: teKopenOpen, countLabel: "open", icon: "/images/ui/kopen_240.webp", color: VAST_COLORS.blauw },
      { id: "favorieten", kind: "favorieten", href: "/lijstjes-beheren/favorieten", name: "Favorieten", count: favoritesCount, countLabel: "lijstjes", icon: "/images/ui/ster_240.webp", color: VAST_COLORS.geel },
    ];
    const own: VastTileEntry[] = lists.map((l) => ({
      id: l.id,
      kind: "vast",
      href: `/vast/${l.id}`,
      name: l.name,
      count: l.openCount,
      countLabel: "open",
      icon: l.icon,
      color: l.color,
      list: l,
    }));
    const all = [...builtins, ...own];
    const rank = new Map(prefs.order.map((id, i) => [id, i]));
    return all
      .map((e, i) => ({ e, r: rank.get(e.id) ?? prefs.order.length + i }))
      .sort((a, b) => a.r - b.r)
      .map(({ e }) => e);
  }, [teKopenOpen, favoritesCount, lists, prefs.order]);

  const hiddenSet = React.useMemo(() => new Set(prefs.hidden), [prefs.hidden]);
  const tiles = React.useMemo(() => allEntries.filter((e) => !hiddenSet.has(e.id)), [allEntries, hiddenSet]);
  /** Verborgen ingebouwde tegels (Te kopen, Favorieten), om terug te zetten in bewerkstand. */
  const hiddenTiles = React.useMemo(() => allEntries.filter((e) => hiddenSet.has(e.id) && e.kind !== "vast"), [allEntries, hiddenSet]);

  const savePrefs = React.useCallback(
    (next: VastPrefs) => {
      if (!userId) return;
      setLocalPrefs(next);
      const json = JSON.stringify(next);
      const tx = profile
        ? db.tx.profiles[profile.id].update({ vasteLijstjesJson: json })
        : db.tx.profiles[iid()].update({ instantUserId: userId, vasteLijstjesJson: json });
      void db.transact(tx).catch(() => undefined);
    },
    [profile, userId],
  );
  const saveOrder = React.useCallback(
    (visibleIds: string[]) => savePrefs({ order: [...visibleIds, ...prefs.hidden.filter((id) => !visibleIds.includes(id))], hidden: prefs.hidden }),
    [prefs.hidden, savePrefs],
  );
  const hideTile = React.useCallback(
    (id: string) => savePrefs({ order: prefs.order, hidden: Array.from(new Set([...prefs.hidden, id])) }),
    [prefs, savePrefs],
  );
  const restoreTile = React.useCallback(
    (id: string) => savePrefs({ order: prefs.order, hidden: prefs.hidden.filter((h) => h !== id) }),
    [prefs, savePrefs],
  );

  return { isLoading, lists, teKopenOpen, favoritesCount, tiles, hiddenTiles, saveOrder, hideTile, restoreTile };
}

export type VastTileEntry = {
  id: string;
  kind: "te-kopen" | "favorieten" | "vast";
  href: string;
  name: string;
  count: number;
  countLabel: string;
  icon: string;
  color: [number, number, number];
  list?: VastListSummary;
};

type VastPrefs = { order: string[]; hidden: string[] };

function parseVastPrefs(raw: string | null | undefined): VastPrefs {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<VastPrefs>) : {};
    const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : []);
    return { order: ids(v.order), hidden: ids(v.hidden) };
  } catch {
    return { order: [], hidden: [] };
  }
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
  wide = false,
  countLabel = "open",
  onAdd,
  addLabel,
  editing: editingProp = false,
  onRestore,
}: {
  href: string;
  name: string;
  count: number;
  icon: string;
  color: [number, number, number];
  className?: string;
  /** Brede tegel (enige vaste tegel op desktop): groter cijfer, naam en illustratie. */
  wide?: boolean;
  /** Wat het getal telt, voor de schermlezer («open», «lijstjes»). */
  countLabel?: string;
  /** Ronde «+» rechtsboven om meteen iets toe te voegen (bv. aan Te kopen). */
  onAdd?: () => void;
  addLabel?: string;
  /** Bewerkstand: verwijderen/verbergen (ontbreekt = niet verwijderbaar). */
  onDelete?: () => void;
  /** Bewerkstand (sleepbaar, met zes puntjes), ook zonder vuilbak. */
  editing?: boolean;
  /** Verborgen tegel: gedimd met «Terugzetten». */
  onRestore?: () => void;
}) {
  const editing = editingProp || onDelete != null;
  // Zelfde zichtbare grootte voor elke illustratie, deels van de tegel af (rechtsonder).
  const placement = tileIconPlacement(icon, wide ? 104 : 84, wide ? 10 : 14);
  const body = (
    <>
      <span className={cn("font-extrabold leading-none tabular-nums", wide ? "text-[34px]" : "text-[28px]")} style={{ color: deepRgb(color) }}>
        {count}
      </span>
      <span className={cn("mt-1.5 line-clamp-2 pr-1 font-extrabold text-text-primary", wide ? "max-w-[60%] text-base leading-5" : "text-[13.5px] leading-[17px]")}>{name}</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
      <img
        src={icon}
        alt=""
        aria-hidden
        className="pointer-events-none absolute max-w-none object-contain"
        style={placement}
      />
    </>
  );
  const surface =
    "relative flex flex-col overflow-clip rounded-[22px] p-3 no-underline after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_var(--border-subtle)] after:content-[''] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";
  const cls = cn("h-[150px] w-[124px] shrink-0", surface, className);
  const style = { backgroundImage: `linear-gradient(160deg, ${mixWithWhiteRgb(color, 0.3)} 0%, ${mixWithWhiteRgb(color, 0.1)} 100%)` };
  if (onRestore) {
    return (
      <div className={cn(cls, "border-[1.5px] border-dashed border-[#c9cbe6] !bg-none")}>
        <div className="absolute inset-0 flex flex-col p-3 opacity-40 grayscale">{body}</div>
        <button
          type="button"
          onClick={onRestore}
          aria-label={`${name} terugzetten`}
          className="absolute inset-x-3 bottom-3 z-[1] inline-flex h-9 items-center justify-center gap-1.5 rounded-pill bg-[var(--white)] text-[13px] font-bold text-action-primary shadow-[0_2px_6px_-2px_rgba(16,17,48,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Terugzetten
        </button>
      </div>
    );
  }
  if (editing) {
    return (
      <div className={cn(cls, "cursor-grab active:cursor-grabbing")} style={style}>
        {body}
        {/* Zes puntjes: de hele tegel is sleepbaar. */}
        <span aria-hidden className="absolute bottom-2.5 left-2.5 flex size-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.75)] text-[var(--gray-400)]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </span>
        {onDelete ? (
          <button
            type="button"
            aria-label={`${name} verwijderen`}
            onClick={onDelete}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 z-[1] flex size-7 items-center justify-center rounded-full bg-[var(--white)] text-[var(--error-400)] shadow-[0_1px_3px_rgba(16,17,48,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[15px]">
              <path d={TRASH_PATH} />
            </svg>
          </button>
        ) : null}
      </div>
    );
  }
  if (!onAdd) {
    return (
      <Link href={href} aria-label={`${name}, ${count} ${countLabel}`} className={cls} style={style}>
        {body}
      </Link>
    );
  }
  // Met «+»: de knop staat naast de link (geen knop in een link); de buitenste laag krijgt de maat.
  return (
    <div className={cn("relative h-[150px] w-[124px] shrink-0", className)}>
      <Link href={href} aria-label={`${name}, ${count} ${countLabel}`} className={cn(surface, "size-full")} style={style}>
        {body}
      </Link>
      <button
        type="button"
        aria-label={addLabel ?? `Toevoegen aan ${name}`}
        onClick={onAdd}
        className="absolute right-2.5 top-2.5 z-[1] flex size-9 items-center justify-center rounded-full bg-[var(--white)] shadow-[0_2px_6px_-2px_rgba(16,17,48,0.25)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        style={{ color: deepRgb(color, 0.85) }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[18px]">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
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

/** «Favorieten» als vaste tegel: de favorietenlijsten (per winkel), met het aantal lijsten. */
export function FavorietenTile({ count, className, wide }: { count: number; className?: string; wide?: boolean }) {
  return (
    <VastTile href="/lijstjes-beheren/favorieten" name="Favorieten" count={count} countLabel="lijstjes" icon="/images/ui/ster_240.webp" color={VAST_COLORS.geel} className={className} wide={wide} />
  );
}

/** «Te kopen» als vaste tegel (eigen lijst, altijd aanwezig, niet verwijderbaar). */
export function TeKopenTile({ count, className, onAdd }: { count: number; className?: string; onAdd?: () => void }) {
  return (
    <VastTile
      href="/te-kopen"
      name="Te kopen"
      count={count}
      icon="/images/ui/kopen_240.webp"
      color={VAST_COLORS.blauw}
      className={className}
      onAdd={onAdd}
      addLabel="Product toevoegen aan Te kopen"
    />
  );
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
export function VasteLijstjesLane({ userId, onAddTeKopen }: { userId: string; onAddTeKopen?: () => void }) {
  const { tiles } = useVasteLijstjes(userId);
  if (tiles.length === 0) return null;
  const fit = tiles.length <= 2;
  const tileClass = fit ? "!w-auto min-w-0" : "snap-start";
  return (
    <div
      className={cn(
        fit
          ? cn("grid gap-2.5", tiles.length === 1 ? "grid-cols-1" : "grid-cols-2")
          : "-mx-4 flex snap-x gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {tiles.map((t) => (
        <VastTile
          key={t.id}
          href={t.href}
          name={t.name}
          count={t.count}
          countLabel={t.countLabel}
          icon={t.icon}
          color={t.color}
          className={tileClass}
          onAdd={t.kind === "te-kopen" ? onAddTeKopen : undefined}
          addLabel={t.kind === "te-kopen" ? "Product toevoegen aan Te kopen" : undefined}
        />
      ))}
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

/**
 * Desktoprij «Lijstjes» op de startpagina: boodschappenkaarten + vaste tegels. Met samen hoogstens
 * 3 elementen krijgt elk element een gelijk deel van de breedte; anders blijven de kaarten breed en
 * delen de vaste tegels de rest.
 */
export function HomeListsDesktopRow({
  userId,
  shopping,
  onAddTeKopen,
}: {
  userId: string;
  shopping: React.ReactNode[];
  onAddTeKopen?: () => void;
}) {
  const { tiles: allTiles } = useVasteLijstjes(userId);
  const tiles = allTiles.slice(0, 3);
  const equal = shopping.length + tiles.length <= 3;
  const tileEls = tiles.map((t) => (
    <VastTile
      key={t.id}
      href={t.href}
      name={t.name}
      count={t.count}
      countLabel={t.countLabel}
      icon={t.icon}
      color={t.color}
      wide={!equal && tiles.length === 1}
      className="!h-auto min-h-[150px] !w-auto min-w-0"
      onAdd={t.kind === "te-kopen" ? onAddTeKopen : undefined}
      addLabel={t.kind === "te-kopen" ? "Product toevoegen aan Te kopen" : undefined}
    />
  ));
  if (equal) {
    // Gelijke kolommen (raster), zodat padding van de tegels de verdeling niet scheeftrekt.
    return (
      <div className="grid items-stretch gap-3.5" style={{ gridTemplateColumns: `repeat(${shopping.length + tiles.length}, minmax(0, 1fr))` }}>
        {shopping.map((card, i) => (
          <div key={i} className="min-w-0 [&>*]:h-full">
            {card}
          </div>
        ))}
        {tileEls}
      </div>
    );
  }
  // Meer dan 3 elementen: boodschappen 60% links, vaste tegels 40% rechts, elk in gelijke kolommen.
  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-stretch gap-3.5">
      <div className="grid items-stretch gap-3.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, shopping.length)}, minmax(0, 1fr))` }}>
        {shopping.map((card, i) => (
          <div key={i} className="min-w-0 [&>*]:h-full">
            {card}
          </div>
        ))}
      </div>
      <div className="grid items-stretch gap-3" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
        {tileEls}
      </div>
    </div>
  );
}

/**
 * Raster met alle vaste tegels (overzicht «Lijstjes»). In bewerkstand: slepen om te ordenen,
 * vuilbak om te verwijderen (Te kopen/Favorieten worden enkel verborgen) en «Terugzetten».
 */
export function VasteLijstjesGrid({ userId, editing }: { userId?: string; editing: boolean }) {
  const { tiles, hiddenTiles, saveOrder, hideTile, restoreTile } = useVasteLijstjes(userId);
  const [localOrder, setLocalOrder] = React.useState<string[] | null>(null);
  const ids = tiles.map((t) => t.id);
  const idsKey = ids.join("|");
  React.useEffect(() => setLocalOrder(null), [idsKey]);
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const ordered = (localOrder ?? ids).map((id) => byId.get(id)).filter((t): t is VastTileEntry => t != null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const cur = localOrder ?? ids;
    const next = arrayMove(cur, cur.indexOf(String(active.id)), cur.indexOf(String(over.id)));
    setLocalOrder(next);
    saveOrder(next);
  };

  const remove = (t: VastTileEntry) => {
    if (t.kind !== "vast") {
      hideTile(t.id);
      return;
    }
    if (t.list && window.confirm(`«${t.name}» en alles erop verwijderen?`)) deleteVastList(t.list);
  };

  const gridClass = "grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6";
  if (!editing) {
    return (
      <div className={gridClass}>
        {ordered.map((t) => (
          <VastTile key={t.id} href={t.href} name={t.name} count={t.count} countLabel={t.countLabel} icon={t.icon} color={t.color} className="!w-full" />
        ))}
      </div>
    );
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ordered.map((t) => t.id)} strategy={rectSortingStrategy}>
        <div className={gridClass}>
          {ordered.map((t) => (
            <SortableVastTile
              key={t.id}
              tile={t}
              onDelete={t.kind !== "vast" || t.list?.isOwner ? () => remove(t) : undefined}
            />
          ))}
          {hiddenTiles.map((t) => (
            <VastTile
              key={t.id}
              href={t.href}
              name={t.name}
              count={t.count}
              countLabel={t.countLabel}
              icon={t.icon}
              color={t.color}
              className="!w-full"
              onRestore={() => restoreTile(t.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableVastTile({ tile: t, onDelete }: { tile: VastTileEntry; onDelete?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`${t.name} verslepen`}
      className={cn("relative touch-none rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]", isDragging && "z-10 scale-[1.04] shadow-[0_12px_28px_-10px_rgba(16,17,48,0.35)]")}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <VastTile
        href={t.href}
        name={t.name}
        count={t.count}
        countLabel={t.countLabel}
        icon={t.icon}
        color={t.color}
        className="!w-full"
        editing
        onDelete={onDelete}
      />
    </div>
  );
}
