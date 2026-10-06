"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageBackButton } from "@/components/ui/page_back_button";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RouteLoadingSpinner } from "@/components/ui/route_loading_spinner";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";
import { homeListCardIconSrc } from "@/lib/list-product-icons";
import {
  ALL_KINDS,
  AUTO_SHARE_KIND_META,
  listAutoShareKind,
  useAutoShare,
  type AutoShareKind,
  type OwnedListRow,
} from "@/lib/auto-share";

type Tab = "soorten" | "lijstjes";

const CARD = "overflow-hidden rounded-[20px] bg-[var(--white)] shadow-card";
const SECTION_LABEL = "px-1 pb-2 text-sm font-semibold leading-20 text-[var(--text-secondary)]";

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-6">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M16.5 14c3 .2 5 2.3 5 5.5" />
    </svg>
  );
}

const AVATAR_TINTS = [
  ["var(--blue-50)", "var(--blue-500)"],
  ["#dff3ea", "#23805a"],
  ["#fdf0d5", "#9a6a12"],
  ["#fbe3ef", "#b83b78"],
] as const;

function PersonAvatar({ name, url, index }: { name: string; url?: string | null; index: number }) {
  const [bg, fg] = AVATAR_TINTS[index % AVATAR_TINTS.length]!;
  return (
    <span
      className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold shadow-[0_0_0_3px_var(--white)]"
      style={{ backgroundColor: bg, color: fg }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- profielfoto
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}

type Person = { id: string; name: string; avatarUrl?: string | null; isMe?: boolean };

function PeopleCard({ people }: { people: Person[] }) {
  const others = people.filter((p) => !p.isMe);
  return (
    <section aria-labelledby="deelgenoten-titel" className={cn(CARD, "px-3.5 pb-3 pt-3.5")}>
      <h2 id="deelgenoten-titel" className="mb-2.5 text-[13px] font-semibold text-[var(--text-secondary)]">
        Je deelt met
      </h2>
      {others.length === 0 ? (
        <div className="flex items-center gap-3 pb-1">
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]">
            <PeopleIcon className="size-6" />
          </span>
          <p className="text-[13.5px] leading-[19px] text-[var(--text-secondary)]">
            Nog niemand schrijft mee. Open een lijstje en kies <span className="font-semibold">Lijstje delen</span> om
            iemand uit te nodigen.
          </p>
        </div>
      ) : (
        <ul className="m-0 flex list-none gap-4 overflow-x-auto p-0 pb-1">
          {people.map((p, i) => (
            <li key={p.id} className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
              <PersonAvatar name={p.name} url={p.avatarUrl} index={i} />
              <span className="w-full truncate text-center text-[13px] font-semibold text-[var(--text-primary)]">
                {p.isMe ? "Jij" : p.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function KindTile({ kind, size = 40 }: { kind: AutoShareKind; size?: number }) {
  const meta = AUTO_SHARE_KIND_META[kind];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[12px]"
      style={{ width: size, height: size, backgroundColor: meta.tint }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- soortillustratie */}
      <img src={meta.imageSrc} alt="" style={{ width: size * 0.72, height: size * 0.72 }} className="object-contain" />
    </span>
  );
}

function KindsSection({
  enabled,
  countByKind,
  onToggle,
  onToggleAll,
  partnerLabel,
}: {
  enabled: ReadonlySet<AutoShareKind>;
  countByKind: Record<AutoShareKind, number>;
  onToggle: (kind: AutoShareKind, on: boolean) => void;
  onToggleAll: (on: boolean) => void;
  partnerLabel: string;
}) {
  const allOn = ALL_KINDS.every((k) => enabled.has(k));
  return (
    <section aria-labelledby="soorten-titel">
      <h2 id="soorten-titel" className={SECTION_LABEL}>
        Nieuwe lijstjes automatisch delen
      </h2>
      <div className={CARD}>
        <div className="flex items-center gap-3 bg-[var(--blue-25)] px-3.5 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--white)] text-[var(--blue-500)] shadow-[0_0_0_1px_var(--blue-100)]">
            <PeopleIcon className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p id="soort-alle" className="text-[15px] font-bold leading-5 text-[var(--text-primary)]">
              Alle nieuwe lijstjes
            </p>
            <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">Alles in één keer aan of uit</p>
          </div>
          <Switch checked={allOn} onCheckedChange={onToggleAll} aria-labelledby="soort-alle" />
        </div>
        <ul className="m-0 list-none p-0">
          {ALL_KINDS.map((kind) => {
            const n = countByKind[kind];
            return (
              <li key={kind} className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-3.5 py-2.5">
                <KindTile kind={kind} />
                <div className="min-w-0 flex-1">
                  <p id={`soort-${kind}`} className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                    {AUTO_SHARE_KIND_META[kind].label}
                  </p>
                  <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
                    {n === 0 ? "Nog geen lijstjes" : n === 1 ? "1 lijstje" : `${n} lijstjes`}
                  </p>
                </div>
                <Switch
                  checked={enabled.has(kind)}
                  onCheckedChange={(on) => onToggle(kind, on)}
                  aria-labelledby={`soort-${kind}`}
                />
              </li>
            );
          })}
        </ul>
      </div>
      <p className="px-1 pt-2 text-xs leading-[17px] text-[var(--text-tertiary)]">
        Een nieuw lijstje van een soort die aan staat, {partnerLabel} meteen op de startpagina.
      </p>
    </section>
  );
}

function listTileSrc(list: OwnedListRow): { src: string; photo: boolean } {
  const custom = list.customIconUrl ?? "";
  if (custom) return { src: custom, photo: !custom.startsWith("/") };
  const masterIcon = String(list.masterIcon ?? "");
  return {
    src: homeListCardIconSrc({
      id: list.id,
      icon: String(list.icon ?? ""),
      displayVariant: masterIcon.startsWith("/logos/") ? "from-master" : "default",
      name: list.name,
    }),
    photo: false,
  };
}

function ListsSection({
  lists,
  selected,
  onToggle,
  onSelectAll,
  disabled,
}: {
  lists: OwnedListRow[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelectAll: (on: boolean) => void;
  disabled: boolean;
}) {
  const allSelected = lists.length > 0 && lists.every((l) => selected[l.id]);
  return (
    <section aria-labelledby="lijstjes-titel">
      <div className="flex items-end justify-between px-1 pb-2">
        <h2 id="lijstjes-titel" className="text-sm font-semibold leading-20 text-[var(--text-secondary)]">
          Bestaande lijstjes
        </h2>
        {lists.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectAll(!allSelected)}
            className="rounded-md text-[13.5px] font-semibold text-[var(--text-link)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-40"
          >
            {allSelected ? "Niets selecteren" : "Alles selecteren"}
          </button>
        ) : null}
      </div>
      <div className={CARD}>
        {lists.length === 0 ? (
          <p className="px-4 py-5 text-center text-sm text-[var(--text-secondary)]">Je hebt nog geen lijstjes.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {lists.map((list, i) => {
              const kind = listAutoShareKind(list);
              const shared = (list.memberships ?? []).length > 0;
              const tile = listTileSrc(list);
              return (
                <li key={list.id} className={cn(i > 0 && "border-t border-[var(--border-subtle)]")}>
                  <label
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5",
                      disabled ? "cursor-default" : "cursor-pointer [@media(hover:hover)]:hover:bg-[var(--gray-25)]",
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--blue-25)]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- lijstfoto of illustratie */}
                      <img src={tile.src} alt="" className={tile.photo ? "size-full object-cover" : "size-7 object-contain"} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                        {list.name || "Lijstje"}
                      </span>
                      <span className="flex items-center gap-1.5 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
                        {kind ? `${AUTO_SHARE_KIND_META[kind].label} ·` : null}
                        <span className={shared ? "font-medium text-[var(--blue-500)]" : "text-[var(--text-tertiary)]"}>
                          {shared ? "Gedeeld" : "Alleen jij"}
                        </span>
                      </span>
                    </span>
                    <Checkbox
                      checked={Boolean(selected[list.id])}
                      onCheckedChange={() => onToggle(list.id)}
                      disabled={disabled}
                      aria-label={`${list.name || "Lijstje"} delen`}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {disabled && lists.length > 0 ? (
        <p className="px-1 pt-2 text-xs leading-[17px] text-[var(--text-tertiary)]">
          Zodra iemand meeschrijft, deel je hier meerdere lijstjes in één keer.
        </p>
      ) : null}
    </section>
  );
}

export default function SamenDelenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const autoShare = useAutoShare(user?.id);
  const { titleRef, collapsed } = useLargeTitleCollapse<HTMLHeadingElement>(64);
  const [tab, setTab] = React.useState<Tab>("soorten");

  const peopleIds = React.useMemo(
    () => (user?.id ? [user.id, ...autoShare.partnerIds] : []),
    [user?.id, autoShare.partnerIds],
  );
  const { data: profileData } = db.useQuery(
    peopleIds.length > 0 ? { profiles: { $: { where: { instantUserId: { $in: peopleIds } } } } } : null,
  );

  const people: Person[] = React.useMemo(() => {
    const byId = new Map<string, { firstName?: string | null; avatarUrl?: string | null }>();
    for (const p of (profileData?.profiles ?? []) as Array<{
      instantUserId?: string;
      firstName?: string | null;
      avatarUrl?: string | null;
    }>) {
      if (p.instantUserId) byId.set(p.instantUserId, p);
    }
    return peopleIds.map((id) => {
      const p = byId.get(id);
      return {
        id,
        name: p?.firstName?.trim() || "Iemand",
        avatarUrl: p?.avatarUrl ?? null,
        isMe: id === user?.id,
      };
    });
  }, [peopleIds, profileData?.profiles, user?.id]);

  const partnerNames = people.filter((p) => !p.isMe).map((p) => p.name);
  const partnerLabel =
    partnerNames.length === 0
      ? "zien je deelgenoten het"
      : partnerNames.length === 1
        ? `ziet ${partnerNames[0]} het`
        : `zien ${partnerNames.slice(0, -1).join(", ")} en ${partnerNames[partnerNames.length - 1]} het`;

  const lists = React.useMemo(
    () =>
      autoShare.ownedLists
        .filter((l) => !l.isMasterTemplate)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [autoShare.ownedLists],
  );

  const countByKind = React.useMemo(() => {
    const counts = Object.fromEntries(ALL_KINDS.map((k) => [k, 0])) as Record<AutoShareKind, number>;
    for (const l of lists) {
      const k = listAutoShareKind(l);
      if (k) counts[k] += 1;
    }
    return counts;
  }, [lists]);

  /** Lijstjes-tab: lokale selectie t.o.v. de huidige deelstatus; «Bewaar» schrijft het verschil weg. */
  const sharedNow = React.useMemo(
    () => Object.fromEntries(lists.map((l) => [l.id, (l.memberships ?? []).length > 0])) as Record<string, boolean>,
    [lists],
  );
  const [draft, setDraft] = React.useState<Record<string, boolean>>({});
  const selected = React.useMemo(() => ({ ...sharedNow, ...draft }), [sharedNow, draft]);
  const changes = lists.filter((l) => selected[l.id] !== sharedNow[l.id]);
  const [saving, setSaving] = React.useState(false);
  const hasPartners = autoShare.partnerIds.length > 0;

  const handleSave = async () => {
    if (changes.length === 0) return;
    setSaving(true);
    try {
      const txs = changes.flatMap((l) => {
        const memberships = l.memberships ?? [];
        if (selected[l.id]) {
          const existing = new Set(memberships.map((m) => m.instantUserId));
          return autoShare.partnerIds
            .filter((uid) => !existing.has(uid))
            .map((uid) => db.tx.listMembers[iid()].update({ instantUserId: uid }).link({ list: l.id }));
        }
        return memberships.filter((m) => m.id).map((m) => db.tx.listMembers[m.id!].delete());
      });
      if (txs.length > 0) await db.transact(txs);
      setDraft({});
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return <RouteLoadingSpinner />;

  const changeLabel =
    changes.length === 1
      ? `${selected[changes[0]!.id] ? "Delen" : "Stoppen met delen"}: ${changes[0]!.name || "lijstje"}`
      : `${changes.length} wijzigingen`;

  const kinds = (
    <KindsSection
      enabled={autoShare.enabledKinds}
      countByKind={countByKind}
      onToggle={(k, on) => void autoShare.setKindEnabled(k, on)}
      onToggleAll={(on) => void autoShare.setKinds(new Set(on ? ALL_KINDS : []))}
      partnerLabel={partnerLabel}
    />
  );
  const listsSection = (
    <ListsSection
      lists={lists}
      selected={selected}
      disabled={!hasPartners || saving}
      onToggle={(id) => setDraft((d) => ({ ...d, [id]: !selected[id] }))}
      onSelectAll={(on) => setDraft(Object.fromEntries(lists.map((l) => [l.id, on])))}
    />
  );

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] transition-shadow duration-200 lg:hidden",
          collapsed ? "shadow-[0_1px_0_var(--border-subtle)]" : "shadow-none",
        )}
      >
        <header className="mx-auto flex h-16 w-full max-w-[956px] items-center gap-4 px-4">
          <button
            type="button"
            aria-label="Terug naar je profiel"
            onClick={() => router.push("/profiel")}
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <BackArrowIcon />
          </button>
          <p
            className={cn(
              "min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)] motion-safe:transition-[opacity,transform] motion-safe:duration-200",
              collapsed ? "opacity-100" : "opacity-0 motion-safe:translate-y-1",
            )}
          >
            Samen delen
          </p>
          <span className="size-6 shrink-0" aria-hidden />
        </header>
      </div>

      <main
        className={cn(
          "mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 motion-safe:animate-fade-up lg:max-w-[960px]",
          "pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+8px+env(safe-area-inset-top,0px))] lg:pt-10",
        )}
      >
        <div className="flex items-center gap-3 lg:pb-2">
          <PageBackButton href="/profiel" label="Terug naar je profiel" />
          <h1 ref={titleRef} className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[34px] lg:leading-10">
            Samen delen
          </h1>
        </div>

        {/* Mobiel: deelgenoten · segment · één tab */}
        <div className="flex flex-col gap-4 lg:hidden">
          <PeopleCard people={people} />
          <SegmentedControl
            ariaLabel="Weergave"
            fill
            value={tab}
            onChange={setTab}
            options={[
              { value: "soorten", label: "Soorten" },
              { value: "lijstjes", label: "Lijstjes" },
            ]}
          />
          {tab === "soorten" ? kinds : listsSection}
        </div>

        {/* Desktop: soorten links, lijstjes rechts */}
        <div className="hidden items-start gap-6 lg:grid lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-5">
            <PeopleCard people={people} />
            {kinds}
          </div>
          {listsSection}
        </div>
      </main>

      {changes.length > 0 ? (
        <div className="fixed inset-x-3 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-30 mx-auto flex max-w-[456px] items-center gap-2.5 rounded-pill bg-[var(--gray-900)] py-2 pl-[18px] pr-2 text-[var(--white)] shadow-[0_18px_30px_-12px_rgba(16,17,48,0.5)] motion-safe:animate-fade-up">
          <span className="min-w-0 flex-1 truncate text-sm">{changeLabel}</span>
          <button
            type="button"
            onClick={() => setDraft({})}
            className="h-10 shrink-0 rounded-pill px-3 text-sm font-semibold text-[var(--white)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)]"
          >
            Annuleer
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="h-10 shrink-0 rounded-pill bg-[var(--action-primary)] px-[18px] text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--white)] disabled:opacity-60"
          >
            {saving ? "Bewaren…" : "Bewaar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
