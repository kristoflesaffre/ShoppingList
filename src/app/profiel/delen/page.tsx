"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageBackButton } from "@/components/ui/page_back_button";
import { Button } from "@/components/ui/button";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { ShareListModal } from "@/components/share_list_modal";
import { Switch } from "@/components/ui/switch";
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

const CARD = "overflow-hidden rounded-[20px] bg-[var(--white)] shadow-card";

/** Sectiekop met korte uitleg: maakt het verschil tussen «per soort» en «individueel» duidelijk. */
function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div className="px-1 pb-2.5">
      <h2 id={id} className="text-[17px] font-bold leading-6 text-[var(--text-primary)]">
        {title}
      </h2>
      <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

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

function PeopleCard({
  people,
  onInvite,
  onSelect,
}: {
  people: Person[];
  onInvite: () => void;
  onSelect: (person: Person) => void;
}) {
  const others = people.filter((p) => !p.isMe);
  return (
    <section aria-labelledby="deelgenoten-titel" className={cn(CARD, "px-3.5 pb-3 pt-3.5")}>
      <h2 id="deelgenoten-titel" className="mb-2.5 text-[13px] font-semibold text-[var(--text-secondary)]">
        Je deelt met
      </h2>
      {others.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]">
              <PeopleIcon className="size-6" />
            </span>
            <p className="text-[13.5px] leading-[19px] text-[var(--text-secondary)]">
              Nog niemand. Stuur een link naar je partner of huisgenoot en kies wat jullie samen delen.
            </p>
          </div>
          <Button type="button" variant="primary" size="md" onClick={onInvite} className="w-full max-w-none">
            Iemand uitnodigen
          </Button>
        </div>
      ) : (
        <ul className="-m-2 flex list-none gap-4 overflow-x-auto p-2">
          {people.map((p, i) => (
            <li key={p.id} className="w-[64px] shrink-0">
              {p.isMe ? (
                <div className="flex flex-col items-center gap-1.5">
                  <PersonAvatar name={p.name} url={p.avatarUrl} index={i} />
                  <span className="w-full truncate text-center text-[13px] font-semibold text-[var(--text-primary)]">Jij</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  aria-label={`Delen met ${p.name} beheren`}
                  className="group flex w-full flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] motion-safe:active:scale-95"
                >
                  <span className="relative rounded-full transition-shadow duration-fast [@media(hover:hover)]:group-hover:shadow-[0_0_0_5px_var(--blue-100)]">
                    <PersonAvatar name={p.name} url={p.avatarUrl} index={i} />
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-1 flex size-[22px] items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] shadow-[0_0_0_2.5px_var(--white)]"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                        <circle cx="5.5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="18.5" cy="12" r="2" />
                      </svg>
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[13px] font-semibold text-[var(--text-primary)]">{p.name}</span>
                </button>
              )}
            </li>
          ))}
          <li className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onInvite}
              aria-label="Iemand uitnodigen"
              className="flex size-[52px] items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)] transition-[background-color,box-shadow] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] motion-safe:active:scale-95 [@media(hover:hover)]:hover:bg-[var(--blue-100)] [@media(hover:hover)]:hover:shadow-[0_0_0_5px_var(--blue-100)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">Uitnodigen</span>
          </li>
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
  people,
}: {
  /** Deelgenoten-kaart, tussen de sectiekop en de soorten. */
  people?: React.ReactNode;
  enabled: ReadonlySet<AutoShareKind>;
  countByKind: Record<AutoShareKind, number>;
  onToggle: (kind: AutoShareKind, on: boolean) => void;
  onToggleAll: (on: boolean) => void;
  partnerLabel: string;
}) {
  const allOn = ALL_KINDS.every((k) => enabled.has(k));
  return (
    <section aria-labelledby="soorten-titel">
      <SectionHeading
        id="soorten-titel"
        title="Alle lijstjes delen"
        description="Alle lijstjes van een soort, ook de nieuwe, voor iedereen met wie je deelt."
      />
      {people ? <div className="pb-4">{people}</div> : null}
      <div className={CARD}>
        <div className="flex items-center gap-3 bg-[var(--blue-25)] px-3.5 py-3">
          {/* Collage van vier soorten: «alles» in één tegel. */}
          <span
            aria-hidden
            className="grid size-10 shrink-0 grid-cols-2 place-items-center gap-px rounded-[12px] bg-[var(--white)] p-[3px] shadow-[0_0_0_1px_var(--blue-100)]"
          >
            {(["supermarkt", "frituur", "cafe", "vakantie"] as const).map((k) => (
              // eslint-disable-next-line @next/next/no-img-element -- soortillustratie
              <img key={k} src={AUTO_SHARE_KIND_META[k].imageSrc} alt="" className="size-4 object-contain" />
            ))}
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

function SharedListsSection({
  lists,
  sharedState,
  onToggle,
  memberNames,
  onPickList,
}: {
  lists: OwnedListRow[];
  sharedState: Record<string, boolean>;
  onToggle: (list: OwnedListRow, on: boolean) => void;
  memberNames: (list: OwnedListRow) => string;
  /** Lege staat: één lijstje kiezen om te delen. */
  onPickList: () => void;
}) {
  return (
    <section aria-labelledby="gedeeld-titel">
      <SectionHeading
        id="gedeeld-titel"
        title="Individueel gedeelde lijstjes"
        description="Losse lijstjes die je apart deelt"
      />
      {lists.length === 0 ? (
        /* Canvas «Lege staat 4 · Banner» */
        <div className="flex items-center gap-3.5 rounded-[20px] bg-[linear-gradient(135deg,#eef0fe_0%,#f6eefb_100%)] p-4">
          <span className="relative size-16 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- illustratie */}
            <img src="/images/ui/lijstje_160.webp" alt="" className="size-[58px] object-contain" />
            <span className="absolute -bottom-1 -right-1.5 flex">
              {["/images/delen/avatar-man-160.jpg", "/images/delen/avatar-vrouw-160.jpg"].map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- decoratieve avatar
                <img
                  key={src}
                  src={src}
                  alt=""
                  className={cn("size-[30px] rounded-full object-cover shadow-[0_0_0_3px_var(--white)]", i > 0 && "-ml-2")}
                />
              ))}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-5 text-[var(--text-primary)]">Eén lijstje delen?</p>
            <p className="mb-2 mt-0.5 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">Deel één lijstje met iemand</p>
            <button
              type="button"
              onClick={onPickList}
              className="inline-flex h-8 items-center rounded-pill bg-[var(--action-primary)] px-3.5 text-[13px] font-bold text-[var(--white)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              Kies een lijstje
            </button>
          </div>
        </div>
      ) : (
      <div className={CARD}>
        <ul className="m-0 list-none p-0">
          {lists.map((list, i) => {
            const tile = listTileSrc(list);
            const on = sharedState[list.id] ?? true;
            const names = memberNames(list);
            return (
              <li
                key={list.id}
                className={cn("flex items-center gap-3 px-3.5 py-2.5", i > 0 && "border-t border-[var(--border-subtle)]")}
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--blue-25)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- lijstfoto of illustratie */}
                  <img src={tile.src} alt="" className={tile.photo ? "size-full object-cover" : "size-7 object-contain"} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span id={`gedeeld-${list.id}`} className="truncate text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                    {list.name || "Lijstje"}
                  </span>
                  <span className="truncate text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
                    {on ? (names ? `Met ${names}` : "Gedeeld") : "Alleen jij"}
                  </span>
                </span>
                <Switch
                  checked={on}
                  onCheckedChange={(next) => onToggle(list, next)}
                  aria-labelledby={`gedeeld-${list.id}`}
                />
              </li>
            );
          })}
        </ul>
      </div>
      )}
      {lists.length > 0 ? (
        <p className="px-1 pt-2 text-xs leading-[17px] text-[var(--text-tertiary)]">
          Een lijstje apart delen doe je vanuit dat lijstje, via Instellingen → Lijstje delen.
        </p>
      ) : null}
    </section>
  );
}

/** «Kies een lijstje»: één lijstje kiezen om apart te delen. */
function ListPickerSheet({
  open,
  lists,
  allShared = false,
  onClose,
  onPick,
}: {
  open: boolean;
  lists: OwnedListRow[];
  /** True als je wel lijstjes hebt, maar ze allemaal al gedeeld zijn. */
  allShared?: boolean;
  onClose: () => void;
  onPick: (list: OwnedListRow) => void;
}) {
  return (
    <SlideInModal open={open} onClose={onClose} title="Kies een lijstje" className="md:!max-w-[540px]" bodyClassName="pt-2">
      {lists.length === 0 ? (
        <p className="pb-6 text-center text-sm text-[var(--text-secondary)]">
          {allShared ? "Al je lijstjes worden al gedeeld." : "Je hebt nog geen lijstjes om te delen."}
        </p>
      ) : (
        <ul className={cn(CARD, "m-0 mb-6 list-none p-0 shadow-[0_0_0_1px_var(--border-subtle)]")}>
          {lists.map((list, i) => {
            const tile = listTileSrc(list);
            const kind = listAutoShareKind(list);
            return (
              <li key={list.id} className={cn(i > 0 && "border-t border-[var(--border-subtle)]")}>
                <button
                  type="button"
                  onClick={() => onPick(list)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--gray-25)]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--blue-25)]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- lijstfoto of illustratie */}
                    <img src={tile.src} alt="" className={tile.photo ? "size-full object-cover" : "size-7 object-contain"} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                      {list.name || "Lijstje"}
                    </span>
                    {kind ? (
                      <span className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
                        {AUTO_SHARE_KIND_META[kind].label}
                      </span>
                    ) : null}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 text-[var(--text-tertiary)]">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SlideInModal>
  );
}

const SINCE_FORMAT = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long" });
const SINCE_FORMAT_YEAR = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" });

function formatSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (d.getFullYear() === new Date().getFullYear() ? SINCE_FORMAT : SINCE_FORMAT_YEAR).format(d);
}

/** Canvas «Deelgenoot A · Groot portret»: grote foto met halo, naam, aantallen, stoppen. */
function PersonSheet({
  person,
  index,
  myId,
  myLists,
  sinceIso,
  onClose,
  onRemove,
}: {
  person: Person | null;
  index: number;
  myId: string;
  myLists: OwnedListRow[];
  sinceIso?: string | null;
  onClose: () => void;
  onRemove: (person: Person) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  /** Tweede stap: «Weet je het zeker?» voor de verbinding echt verbroken wordt. */
  const [confirming, setConfirming] = React.useState(false);
  React.useEffect(() => {
    setConfirming(false);
  }, [person?.id]);
  const { data } = db.useQuery(
    person ? { lists: { memberships: {}, $: { where: { ownerId: person.id } } } } : null,
  );
  if (!person) return null;
  const stop = async () => {
    setBusy(true);
    try {
      await onRemove(person);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const mine = myLists.filter((l) => (l.memberships ?? []).some((m) => m.instantUserId === person.id)).length;
  const theirs = ((data?.lists ?? []) as OwnedListRow[]).filter((l) =>
    (l.memberships ?? []).some((m) => m.instantUserId === myId),
  ).length;
  const word = (n: number) => (n === 1 ? "lijstje" : "lijstjes");
  const since = sinceIso ? formatSince(sinceIso) : "";
  const [bg, fg] = AVATAR_TINTS[index % AVATAR_TINTS.length]!;
  return (
    <SlideInModal
      open
      onClose={onClose}
      title="Samen delen"
      className="md:!max-w-[540px]"
      cancelLabel={null}
      footer={
        confirming ? (
          <>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
              Annuleer
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void stop()}
              className="!bg-[var(--error-500,#d92d20)] hover:!bg-[var(--error-600)]"
            >
              {busy ? "Bezig…" : "Ja, stop met delen"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={() => setConfirming(true)}
            className="!bg-[var(--error-500,#d92d20)] hover:!bg-[var(--error-600)]"
          >
            Stoppen met delen
          </Button>
        )
      }
    >
      {confirming ? (
        <div className="flex flex-col items-center gap-3 pb-4 pt-2 text-center md:pb-6">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--error-25)] text-[var(--error-600)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-7">
              <path d="M12 8v5M12 16.5h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <p className="text-xl font-bold leading-7 text-[var(--text-primary)]">Stoppen met delen met {person.name}?</p>
          <p className="max-w-[340px] text-[14px] leading-5 text-[var(--text-secondary)]">
            Jullie schrijven niet langer mee op elkaars lijstjes ({mine + theirs} in totaal). Je kan later opnieuw iemand
            uitnodigen.
          </p>
        </div>
      ) : (
      <div className="flex flex-col gap-[18px] pb-4 md:pb-6">
        <div className="flex flex-col items-center gap-3.5 pt-1.5 text-center">
          <span
            className="flex size-28 items-center justify-center overflow-hidden rounded-full text-[40px] font-bold shadow-[0_0_0_4px_var(--white),0_0_0_10px_var(--blue-50),0_18px_34px_-16px_rgba(79,85,241,0.45)]"
            style={{ backgroundColor: bg, color: fg }}
          >
            {person.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- profielfoto
              <img src={person.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              person.name.trim().charAt(0).toUpperCase() || "?"
            )}
          </span>
          <div>
            <p className="text-2xl font-bold leading-8 tracking-tight text-[var(--text-primary)]">{person.name}</p>
            {since ? (
              <p className="text-[13.5px] leading-[19px] text-[var(--text-secondary)]">Deelt met jou sinds {since}</p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[16px] bg-[var(--gray-25)] p-3 text-center">
            <p className="text-[22px] font-bold leading-7 text-[var(--text-primary)]">{mine}</p>
            <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
              {word(mine)} van jou bij {person.name}
            </p>
          </div>
          <div className="rounded-[16px] bg-[var(--gray-25)] p-3 text-center">
            <p className="text-[22px] font-bold leading-7 text-[var(--text-primary)]">{theirs}</p>
            <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
              {word(theirs)} van {person.name} bij jou
            </p>
          </div>
        </div>
        <p className="text-center text-[13px] leading-[18px] text-[var(--text-tertiary)]">
          Stop je met delen, dan schrijven jullie niet langer mee op elkaars lijstjes. Nieuwe lijstjes worden niet meer
          automatisch gedeeld. {person.name} kan dit ook zelf doen.
        </p>
      </div>
      )}
    </SlideInModal>
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

  /**
   * Gedeelde lijstjes: alleen lijstjes met meeschrijvers. Een lijstje dat je hier uitzet blijft
   * zichtbaar (schakelaar uit) tot je de pagina verlaat, zodat je het meteen terug kan aanzetten.
   */
  const [sharedState, setSharedState] = React.useState<Record<string, boolean>>({});
  const sharedLists = lists.filter((l) => {
    const kind = listAutoShareKind(l);
    if (kind && autoShare.enabledKinds.has(kind)) return false;
    return (l.memberships ?? []).length > 0 || sharedState[l.id] === false;
  });
  const nameById = React.useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const memberNames = (list: OwnedListRow) => {
    const names = (list.memberships ?? [])
      .map((m) => (m.instantUserId ? nameById.get(m.instantUserId) : undefined))
      .filter((n): n is string => Boolean(n));
    return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
  };
  const [removed, setRemoved] = React.useState<Record<string, string[]>>({});

  const handleToggleList = async (list: OwnedListRow, on: boolean) => {
    setSharedState((s) => ({ ...s, [list.id]: on }));
    if (!on) {
      const memberships = (list.memberships ?? []).filter((m) => m.id);
      setRemoved((r) => ({
        ...r,
        [list.id]: memberships.map((m) => m.instantUserId ?? "").filter(Boolean),
      }));
      if (memberships.length > 0) {
        await db.transact(memberships.map((m) => db.tx.listMembers[m.id!].delete()));
      }
      return;
    }
    const restore = removed[list.id]?.length ? removed[list.id]! : autoShare.partnerIds;
    const existing = new Set((list.memberships ?? []).map((m) => m.instantUserId));
    const txs = restore
      .filter((uid) => !existing.has(uid))
      .map((uid) => db.tx.listMembers[iid()].update({ instantUserId: uid }).link({ list: list.id }));
    if (txs.length > 0) await db.transact(txs);
  };

  const [selectedPerson, setSelectedPerson] = React.useState<Person | null>(null);

  /** Lege staat → lijstje kiezen → deelblad van dat lijstje. */
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [shareListId, setShareListId] = React.useState<string | null>(null);
  const shareList = lists.find((l) => l.id === shareListId) ?? null;
  const shareListUrl =
    shareList?.shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/deel/${encodeURIComponent(shareList.shareToken)}`
      : "";
  const pickableLists = lists.filter((l) => (l.memberships ?? []).length === 0);
  const handlePickList = (list: OwnedListRow) => {
    setPickerOpen(false);
    setShareListId(list.id);
    if (!list.shareToken) void db.transact(db.tx.lists[list.id].update({ shareToken: crypto.randomUUID() }));
  };

  /** Algemene uitnodiging: link + soorten kiezen in hetzelfde deelblad. */
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const inviteUrl =
    autoShare.inviteToken && typeof window !== "undefined"
      ? `${window.location.origin}/deel/samen/${encodeURIComponent(autoShare.inviteToken)}`
      : "";
  const openInvite = () => {
    setInviteOpen(true);
    void autoShare.ensureInviteToken();
  };

  if (authLoading || !user) return <RouteLoadingSpinner />;

  const kinds = (
    <KindsSection
      enabled={autoShare.enabledKinds}
      countByKind={countByKind}
      onToggle={(k, on) => void autoShare.setKindEnabled(k, on)}
      onToggleAll={(on) => void autoShare.setKinds(new Set(on ? ALL_KINDS : []))}
      partnerLabel={partnerLabel}
      people={<PeopleCard people={people} onInvite={openInvite} onSelect={setSelectedPerson} />}
    />
  );
  const shared = (
    <SharedListsSection
      lists={sharedLists}
      sharedState={sharedState}
      onToggle={(l, on) => void handleToggleList(l, on)}
      memberNames={memberNames}
      onPickList={() => setPickerOpen(true)}
    />
  );

  const inviteKinds = (
    <div className="overflow-hidden rounded-[18px] bg-[var(--white)] shadow-[0_0_0_1px_var(--border-subtle)]">
      <p className="px-3.5 pb-1 pt-3 text-[13px] font-semibold text-[var(--text-secondary)]">Wat deel je?</p>
      <ul className="m-0 list-none p-0">
        {ALL_KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-3 px-3.5 py-2">
            <KindTile kind={kind} size={34} />
            <span id={`uitnodiging-${kind}`} className="min-w-0 flex-1 text-[15px] font-medium text-[var(--text-primary)]">
              {AUTO_SHARE_KIND_META[kind].label}
            </span>
            <Switch
              checked={autoShare.enabledKinds.has(kind)}
              onCheckedChange={(on) => void autoShare.setKindEnabled(kind, on)}
              aria-labelledby={`uitnodiging-${kind}`}
            />
          </li>
        ))}
      </ul>
    </div>
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
            Lijstjes delen
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
            Lijstjes delen
          </h1>
        </div>

        {/* Mobiel: alles onder elkaar */}
        <div className="flex flex-col gap-5 lg:hidden">
          {kinds}
          {shared}
        </div>

        {/* Desktop: deelgenoten + soorten links, gedeelde lijstjes rechts */}
        <div className="hidden items-start gap-6 lg:grid lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-5">
              {kinds}
          </div>
          <div>{shared}</div>
        </div>
      </main>

      <PersonSheet
        person={selectedPerson}
        index={Math.max(0, people.findIndex((p) => p.id === selectedPerson?.id))}
        myId={user.id}
        myLists={lists}
        sinceIso={selectedPerson ? autoShare.partnerSince[selectedPerson.id] : null}
        onClose={() => setSelectedPerson(null)}
        onRemove={(p) => autoShare.removePartner(p.id)}
      />

      <ListPickerSheet
        open={pickerOpen}
        lists={pickableLists}
        allShared={lists.length > 0}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickList}
      />

      <ShareListModal
        open={shareList != null}
        onClose={() => setShareListId(null)}
        shareUrl={shareListUrl}
        urlReady={Boolean(shareListUrl)}
        listImageSrc={shareList ? listTileSrc(shareList).src : null}
        listImageIsPhoto={shareList ? listTileSrc(shareList).photo : false}
      />

      <ShareListModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        shareUrl={inviteUrl}
        urlReady={Boolean(inviteUrl)}
        title="Iemand uitnodigen"
        listImageSrc="/images/ui/basket.png"
        heading="Samen boodschappen doen"
        description="Wie de link opent, krijgt de soorten lijstjes die je hieronder aanzet, nu en later."
        shareMessage="Doe samen boodschappen met mij in Shopping list:"
        emailSubject="Uitnodiging: samen boodschappen doen"
        extra={inviteKinds}
      />
    </div>
  );
}
