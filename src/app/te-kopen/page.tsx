"use client";

import { HeaderEditButton, headerRoundButtonClass } from "@/components/ui/header_round_button";
import * as React from "react";
import { DoneButton } from "@/components/ui/title_edit_button";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { id as instantId } from "@instantdb/react";
import { db } from "@/lib/db";
import { cn, isIPhoneDevice } from "@/lib/utils";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { Snackbar } from "@/components/ui/snackbar";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { APP_SNACKBAR_NO_NAV_FIXTURE_CLASS } from "@/lib/app-layout";
import { primeKeyboard } from "@/lib/keyboard_focus";
import { AddShoppingItemSlideIn } from "@/components/add_shopping_item_slide_in";
import {
  TE_KOPEN_STORE_OPTIONS,
  findTeKopenStoreByLabelOrSlug,
} from "@/lib/master-stores";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { MiniButton } from "@/components/ui/mini_button";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { SearchBar } from "@/components/ui/search_bar";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { teKopenMonogramStyle, teKopenStoreRgb } from "@/lib/te-kopen-style";
import { StoreOrderPanel, loadStoreOrder, applySavedStoreOrder } from "@/app/te-kopen/store_order_panel";
import { getVisibleShoppingOwnerIds } from "@/lib/shopping-share";
import { mixWithWhiteRgb } from "@/lib/vaste-lijstjes";

const ShareListModal = dynamic(
  () => import("@/components/share_list_modal").then((m) => m.ShareListModal),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  store?: string | null;
  section?: string | null;
  checked: boolean;
  order: number;
  ownerId?: string | null;
};

type ShoppingShare = {
  id: string;
  ownerId?: string | null;
  shareToken?: string | null;
  memberships?: { id?: string; instantUserId?: string | null }[] | null;
};

type ProfileRow = {
  instantUserId?: string | null;
  firstName?: string | null;
  avatarUrl?: string | null;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

function ChevronRightIcon() {
  return (
    <span
      aria-hidden
      className="inline-block size-6 shrink-0 bg-[var(--action-primary)]"
      style={{
        WebkitMaskImage: "url(/icons/chevron.svg)",
        maskImage: "url(/icons/chevron.svg)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        transform: "rotate(-90deg)",
      }}
    />
  );
}

// ─── Rij en secties (canvas «Te kopen · redesign 1 · als vast lijstje») ─────────

type AddedBy = { firstName: string; avatarUrl?: string | null };

const BLUE: [number, number, number] = [79, 85, 241];

function CheckCircle({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className="-my-2 -ml-1.5 flex size-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <span className={cn("flex size-[22px] items-center justify-center rounded-full transition-colors duration-fast", checked ? "bg-[var(--blue-500)]" : "shadow-[inset_0_0_0_1.6px_#c6c8ce]")}>
        {checked ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3">
            <path d="M5 12.5l4.2 4L19 7" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

function StoreLogo({ store, size = 20 }: { store: string; size?: number }) {
  const info = findTeKopenStoreByLabelOrSlug(store);
  if (!info) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
        style={{ width: size, height: size, backgroundColor: `rgb(${teKopenStoreRgb(store).join(",")})` }}
        aria-hidden
      >
        {store.charAt(0).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- winkellogo uit /public/logos
  return <img src={info.logoSrc} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

/** Rij: afvinken · foto of monogram · naam · aantal (+ wie) · winkellogo als het product aan een winkel hangt. */
function ShoppingRow({
  item,
  isEditing,
  addedBy,
  showStore,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ShoppingItem;
  isEditing: boolean;
  addedBy?: AddedBy | null;
  showStore: boolean;
  onToggle: (item: ShoppingItem) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}) {
  const getPhoto = useItemPhotoUrl(160);
  const photoSrc = getPhoto(item.name);

  const content = (
    <>
      {photoSrc ? (
        <span className="flex size-[42px] shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={photoSrc} alt="" width={34} height={34} className="size-[34px] object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
        </span>
      ) : (
        <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold" style={teKopenMonogramStyle(item.name)} aria-hidden>
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-[19px]">
        <span className="block truncate text-[15px] font-semibold text-text-primary first-letter:uppercase">{item.name}</span>
        <span className="flex min-w-0 items-center gap-[5px] text-[13px] text-[var(--text-tertiary)]">
          <span className="shrink-0">{item.quantity}</span>
          {addedBy ? (
            <>
              <span aria-hidden>·</span>
              <span className="flex size-[15px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--secondary-100)] text-[8px] font-bold text-[var(--secondary-800)]" aria-hidden>
                {addedBy.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- profielfoto (data-URL)
                  <img src={addedBy.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  addedBy.firstName.charAt(0).toUpperCase()
                )}
              </span>
              <span className="truncate">door {addedBy.firstName}</span>
            </>
          ) : null}
        </span>
      </span>
      {showStore && item.store ? (
        <span className="flex shrink-0 items-center" title={`Te kopen bij ${item.store}`}>
          <StoreLogo store={item.store} size={22} />
          <span className="sr-only">bij {item.store}</span>
        </span>
      ) : null}
    </>
  );

  /** Hele rij opent het wijzigblad (naam, hoeveelheid, sectie, winkel) — ook in bewerkstand. */
  const editButton = (
    <button
      type="button"
      onClick={() => onEdit(item)}
      aria-label={`${item.name} wijzigen`}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
    >
      {content}
    </button>
  );

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 py-[11px] px-4 transition-colors duration-fast [@media(hover:hover)]:hover:bg-[var(--gray-25)]">
        {editButton}
        <RoundIconButton tone="danger" size={28} onClick={() => onDelete(item.id)} aria-label={`${item.name} verwijderen`}>
          {RoundIcons.trash}
        </RoundIconButton>
      </div>
    );
  }

  return (
    <SwipeToDelete onDelete={() => onDelete(item.id)} deleteActionLabel={`Veeg naar links om "${item.name}" te verwijderen`}>
      <div className="flex items-center gap-3 bg-[var(--white)] py-[11px] px-4 transition-colors duration-fast [@media(hover:hover)]:hover:bg-[var(--gray-25)]">
        <CheckCircle checked={false} onClick={() => onToggle(item)} label={`${item.name} afvinken`} />
        {editButton}
      </div>
    </SwipeToDelete>
  );
}

type Group = { key: string; kind: "section" | "store" | "algemeen"; title: string; store: string | null; section: string | null; items: ShoppingItem[] };

function GroupBlock({
  group,
  isEditing,
  addedByFor,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onRemoveSection,
}: {
  group: Group;
  isEditing: boolean;
  addedByFor: (item: ShoppingItem) => AddedBy | null;
  onAdd: () => void;
  onToggle: (item: ShoppingItem) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
  onRemoveSection?: () => void;
}) {
  return (
    <section aria-label={group.title}>
      <div className="mb-2 flex min-h-8 items-center gap-2.5 px-1">
        {group.kind === "store" && group.store ? (
          <StoreLogo store={group.store} size={22} />
        ) : group.kind === "section" ? (
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[var(--blue-50)] text-action-primary" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </span>
        ) : (
          <span className="ml-1.5 mr-1 size-2.5 shrink-0 rounded-full bg-[var(--blue-500)]" aria-hidden />
        )}
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{group.title}</h2>
        <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--text-secondary)]">{group.items.length}</span>
        {isEditing && onRemoveSection ? (
          <RoundIconButton tone="danger" size={28} onClick={onRemoveSection} aria-label={`Sectie ${group.title} verwijderen`}>
            {RoundIcons.trash}
          </RoundIconButton>
        ) : !isEditing ? (
          <RoundIconButton tone="surface" size={28} onClick={onAdd} aria-label={`Product toevoegen aan ${group.title}`}>
            {RoundIcons.plus}
          </RoundIconButton>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-[22px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04),0_0_0_1px_var(--border-subtle)]">
        {group.items.length > 0 ? (
          <ul className="m-0 list-none p-0">
            {group.items.map((item, k) => (
              <li
                key={item.id}
                className={cn("relative", k > 0 && "before:absolute before:inset-x-4 before:top-0 before:z-[1] before:h-px before:bg-[var(--border-subtle)] before:content-['']")}
              >
                <ShoppingRow
                  item={item}
                  isEditing={isEditing}
                  addedBy={addedByFor(item)}
                  showStore={group.kind !== "store"}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </li>
            ))}
          </ul>
        ) : (
          <button type="button" onClick={onAdd} className="w-full py-3.5 text-center text-sm text-[var(--text-tertiary)]">
            Nog leeg · tik om iets toe te voegen
          </button>
        )}
      </div>
    </section>
  );
}

function parseSections(raw: string | null | undefined): string[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
  } catch {
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeKopenPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [addOpen, setAddOpen] = React.useState(false);
  const [preselectedStore, setPreselectedStore] = React.useState<string | null>(null);
  const [preselectedSection, setPreselectedSection] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<ShoppingItem | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [isStoreOrderMode, setIsStoreOrderMode] = React.useState(false);
  const [storeOrder, setStoreOrder] = React.useState<string[] | null>(() => loadStoreOrder());
  const [lastDeletedItem, setLastDeletedItem] = React.useState<ShoppingItem | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [localShareToken, setLocalShareToken] = React.useState<string | null>(null);
  const [sectionSheetOpen, setSectionSheetOpen] = React.useState(false);
  const [sectionDraft, setSectionDraft] = React.useState("");

  const { data, isLoading: dataLoading } = db.useQuery(
    user
      ? {
          shoppingItems: {},
          shoppingShares: {
            memberships: {},
            $: { where: { ownerId: user.id } },
          },
          shoppingShareMembers: {
            shoppingShare: { memberships: {} },
            $: { where: { instantUserId: user.id } },
          },
        }
      : null,
  );
  const { data: myProfileData } = db.useQuery({ profiles: { $: { where: { instantUserId: user?.id ?? "__te_kopen_geen__" } } } });
  const myProfile = (myProfileData?.profiles?.[0] ?? null) as { id: string; teKopenSectionsJson?: string | null } | null;
  const serverSections = React.useMemo(() => parseSections(myProfile?.teKopenSectionsJson), [myProfile?.teKopenSectionsJson]);
  // Optimistisch: eigen wijziging meteen tonen tot de server ze terugstuurt.
  const [localSections, setLocalSections] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    setLocalSections((cur) => (cur && JSON.stringify(cur) === (myProfile?.teKopenSectionsJson ?? "") ? null : cur));
  }, [myProfile?.teKopenSectionsJson]);
  const savedSections = localSections ?? serverSections;

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeletedItem(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  const ownedShoppingShare = ((data?.shoppingShares ?? []) as ShoppingShare[])[0] ?? null;
  const visibleShoppingOwnerIds = getVisibleShoppingOwnerIds({
    userId: user?.id,
    ownedShares: data?.shoppingShares as ShoppingShare[] | undefined,
    joinedMemberships: data?.shoppingShareMembers as
      | { shoppingShare?: ShoppingShare | null }[]
      | undefined,
  });
  const otherShoppingOwnerIds = React.useMemo(() => {
    if (!user?.id) return [];
    return Array.from(visibleShoppingOwnerIds).filter((id) => id !== user.id);
  }, [user?.id, visibleShoppingOwnerIds]);
  const shoppingProfilesQuery = React.useMemo(
    () => ({
      profiles: {
        $: {
          where:
            otherShoppingOwnerIds.length > 0
              ? {
                  or: otherShoppingOwnerIds.map((id) => ({
                    instantUserId: id,
                  })),
                }
              : { instantUserId: "__te_kopen_profiles_none__" },
        },
      },
    }),
    [otherShoppingOwnerIds],
  );
  const { data: shoppingProfilesData } = db.useQuery(
    shoppingProfilesQuery as unknown as Parameters<typeof db.useQuery>[0],
  );
  const shoppingFirstNameByUserId = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of (shoppingProfilesData?.profiles ?? []) as ProfileRow[]) {
      const uid = p.instantUserId;
      const firstName = p.firstName?.trim();
      if (uid && firstName) m.set(uid, firstName);
    }
    return m;
  }, [shoppingProfilesData?.profiles]);

  const shoppingAvatarByUserId = React.useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of (shoppingProfilesData?.profiles ?? []) as ProfileRow[]) {
      const uid = p.instantUserId;
      if (!uid) continue;
      const url = p.avatarUrl?.trim();
      m.set(uid, url && url.length > 0 ? url : null);
    }
    return m;
  }, [shoppingProfilesData?.profiles]);

  const allItems: ShoppingItem[] = ((data?.shoppingItems ?? []) as ShoppingItem[])
    .filter((item) => item.ownerId != null && visibleShoppingOwnerIds.has(item.ownerId))
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  const openItems = allItems.filter((i) => !i.checked);
  const boughtItems = allItems.filter((i) => i.checked);

  const query = searchQuery.trim().toLowerCase();
  const visibleItems = query ? openItems.filter((i) => i.name.toLowerCase().includes(query)) : openItems;

  // Eigen secties (bewaarde volgorde + secties die alleen op producten staan), dan winkels, dan Algemeen.
  const sectionNames = Array.from(new Set([...savedSections, ...allItems.map((i) => i.section?.trim()).filter((x): x is string => !!x)]));
  const bySection = new Map<string, ShoppingItem[]>();
  const byStore = new Map<string, ShoppingItem[]>();
  for (const item of visibleItems) {
    const sec = item.section?.trim();
    if (sec) {
      if (!bySection.has(sec)) bySection.set(sec, []);
      bySection.get(sec)!.push(item);
    } else {
      const key = item.store ?? "";
      if (!byStore.has(key)) byStore.set(key, []);
      byStore.get(key)!.push(item);
    }
  }
  const rawStoreKeys = Array.from(byStore.keys());
  const defaultOrder = rawStoreKeys.slice().sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    const ia = TE_KOPEN_STORE_OPTIONS.findIndex((s) => s.label === a);
    const ib = TE_KOPEN_STORE_OPTIONS.findIndex((s) => s.label === b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "nl");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const orderedStoreKeys = applySavedStoreOrder(defaultOrder, storeOrder);
  const groups: Group[] = [
    ...sectionNames
      .filter((name) => !query || bySection.has(name))
      .map((name): Group => ({ key: `sectie:${name}`, kind: "section", title: name, store: null, section: name, items: bySection.get(name) ?? [] })),
    ...orderedStoreKeys.map(
      (key): Group => ({
        key: `winkel:${key}`,
        kind: key === "" ? "algemeen" : "store",
        title: key === "" ? "Algemeen" : key,
        store: key === "" ? null : key,
        section: null,
        items: byStore.get(key) ?? [],
      }),
    ),
  ];

  const saveSections = (next: string[]) => {
    if (!user) return;
    const json = JSON.stringify(next);
    setLocalSections(next);
    void db
      .transact(
        myProfile
          ? db.tx.profiles[myProfile.id].update({ teKopenSectionsJson: json })
          : db.tx.profiles[instantId()].update({ instantUserId: user.id, teKopenSectionsJson: json }),
      )
      .catch(() => undefined);
  };
  const addSection = () => {
    const name = sectionDraft.trim();
    if (!name) return;
    if (!sectionNames.some((s) => s.toLowerCase() === name.toLowerCase())) saveSections([...sectionNames, name]);
    setSectionDraft("");
    setSectionSheetOpen(false);
  };
  /** Sectie weg: producten blijven, ze vallen terug op hun winkel (of Algemeen). */
  const removeSection = (name: string) => {
    const inSection = allItems.filter((i) => i.section?.trim() === name);
    void db
      .transact(inSection.map((i) => db.tx.shoppingItems[i.id].update({ section: "" })))
      .catch(() => undefined);
    saveSections(sectionNames.filter((s) => s !== name));
  };

  async function handleAdd(name: string, quantity: string, store: string | null, section: string | null) {
    if (!user) return;
    if (editingItem) {
      await db.transact(
        db.tx.shoppingItems[editingItem.id].update({ name, quantity, store: store ?? null, section: section ?? "" }),
      );
      return;
    }
    const maxOrder = allItems.reduce((max, i) => Math.max(max, i.order ?? 0), 0);
    await db.transact(
      db.tx.shoppingItems[instantId()].update({
        name,
        quantity,
        ...(store ? { store } : {}),
        ...(section ? { section } : {}),
        checked: false,
        order: maxOrder + 1,
        ownerId: user.id,
      }),
    );
  }

  const toggleBought = (item: ShoppingItem) => void db.transact(db.tx.shoppingItems[item.id].update({ checked: !item.checked })).catch(() => undefined);
  const clearBought = () => void db.transact(boughtItems.map((i) => db.tx.shoppingItems[i.id].delete())).catch(() => undefined);

  async function handleDelete(id: string) {
    const item = allItems.find((i) => i.id === id);
    if (!item) return;
    await db.transact(db.tx.shoppingItems[id].delete());
    setLastDeletedItem(item);
    setSnackbarMessage(`'${item.name}' verwijderd`);
  }

  function handleUndo() {
    if (!lastDeletedItem) return;
    const item = lastDeletedItem;
    if (!user) return;
    void db.transact(
      db.tx.shoppingItems[item.id].update({
        name: item.name,
        quantity: item.quantity,
        ...(item.store ? { store: item.store } : {}),
        ...(item.section ? { section: item.section } : {}),
        checked: item.checked,
        order: item.order,
        ownerId: item.ownerId ?? user.id,
      }),
    );
    setLastDeletedItem(null);
    setSnackbarMessage(null);
  }

  function openAdd(group?: Group) {
    setEditingItem(null);
    setPreselectedStore(group?.store ?? null);
    setPreselectedSection(group?.section ?? null);
    primeKeyboard();
    setAddOpen(true);
  }

  const ensureShareToken = React.useCallback(async () => {
    if (!user) return null;
    const existingToken = ownedShoppingShare?.shareToken ?? localShareToken;
    if (existingToken) return existingToken;

    const token = crypto.randomUUID();
    if (ownedShoppingShare?.id) {
      await db.transact(db.tx.shoppingShares[ownedShoppingShare.id].update({ shareToken: token }));
    } else {
      await db.transact(
        db.tx.shoppingShares[instantId()].update({
          ownerId: user.id,
          shareToken: token,
        }),
      );
    }
    setLocalShareToken(token);
    return token;
  }, [user, ownedShoppingShare?.id, ownedShoppingShare?.shareToken, localShareToken]);

  const handleShareInvitePress = React.useCallback(async () => {
    if (!user) return;

    const canNativeShare =
      isIPhoneDevice() &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function";

    if (canNativeShare) {
      try {
        const token = await ensureShareToken();
        if (!token || typeof window === "undefined") return;
        const url = `${window.location.origin}/deel/te-kopen/${encodeURIComponent(token)}`;
        await navigator.share({
          title: "Lijstje delen",
          text: "Schrijf mee op dit lijstje:",
          url,
        });
        setSettingsOpen(false);
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === "AbortError") return;
        setShareModalOpen(true);
      }
      return;
    }

    await ensureShareToken();
    setShareModalOpen(true);
  }, [user, ensureShareToken]);

  const shareUrl = React.useMemo(() => {
    const tok = ownedShoppingShare?.shareToken ?? localShareToken;
    if (!tok || typeof window === "undefined") return "";
    return `${window.location.origin}/deel/te-kopen/${encodeURIComponent(tok)}`;
  }, [ownedShoppingShare?.shareToken, localShareToken]);

  if (authLoading || dataLoading) return <PageSpinner />;
  if (!user) {
    router.replace("/auth");
    return null;
  }

  const sharedNames = otherShoppingOwnerIds.map((id) => shoppingFirstNameByUserId.get(id)).filter((n): n is string => !!n);
  const sharedLabel =
    otherShoppingOwnerIds.length === 0
      ? null
      : sharedNames.length === 0
        ? "Gedeeld"
        : `Gedeeld met ${sharedNames.length === 1 ? sharedNames[0] : `${sharedNames.slice(0, -1).join(", ")} en ${sharedNames[sharedNames.length - 1]}`}`;
  const addedByFor = (item: ShoppingItem): AddedBy | null =>
    item.ownerId && item.ownerId !== user.id
      ? { firstName: shoppingFirstNameByUserId.get(item.ownerId) ?? "deelnemer", avatarUrl: shoppingAvatarByUserId.get(item.ownerId) }
      : null;
  const countLabel = `${openItems.length} ${openItems.length === 1 ? "product" : "producten"}`;

  const intro = (
    <section className="mb-5 flex flex-col items-center text-center lg:sticky lg:top-10 lg:mb-0 lg:items-start lg:text-left">
      <span
        className="flex size-[104px] items-center justify-center rounded-[30px] bg-[rgba(255,255,255,0.75)]"
        style={{ boxShadow: `0 14px 28px -18px rgb(${BLUE.join(",")})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
        <img src="/images/ui/kopen_240.webp" alt="" className="size-20 object-contain" />
      </span>
      <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-text-primary lg:mt-4 lg:text-[34px]">
        {isStoreOrderMode ? "Volgorde winkels" : "Te kopen"}
      </h1>
      <p className="mt-0.5 text-[13.5px] text-[var(--text-secondary)] lg:mt-1 lg:text-[14.5px]">
        <span className="lg:hidden">{countLabel}</span>
        <span className="hidden lg:inline">
          {countLabel} · dingen die je niet wil vergeten,
          <br />
          bij de winkel of online.
        </span>
      </p>
      {sharedLabel ? (
        <span className="mt-2.5 inline-flex h-[30px] items-center gap-1.5 rounded-pill bg-[rgba(255,255,255,0.85)] pl-1 pr-3 text-[12.5px] font-bold text-[var(--text-secondary)]">
          <span className="flex">
            {otherShoppingOwnerIds.slice(0, 3).map((id, i) => {
              const avatar = shoppingAvatarByUserId.get(id);
              const name = shoppingFirstNameByUserId.get(id) ?? "?";
              return (
                <span key={id} className={cn("flex size-[22px] items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] text-[10px] font-extrabold text-action-primary ring-2 ring-white", i > 0 && "-ml-1.5")}>
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- profielfoto (data-URL of extern)
                    <img src={avatar} alt="" className="size-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </span>
              );
            })}
          </span>
          {sharedLabel}
        </span>
      ) : null}
    </section>
  );

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[var(--bg-app)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[340px]"
        style={{ backgroundImage: `linear-gradient(180deg, ${mixWithWhiteRgb(BLUE, 0.3)} 0%, ${mixWithWhiteRgb(BLUE, 0.1)} 60%, var(--bg-app) 100%)` }}
      />
      <div className="relative mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] motion-safe:animate-fade-up">
        <header className="flex h-16 items-center justify-between gap-2 lg:mt-6">
          <button type="button" aria-label="Terug naar de startpagina" onClick={() => router.push("/")} className={headerRoundButtonClass}>
            <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
          </button>
          <span className="flex items-center gap-2">
            {isStoreOrderMode ? (
              <DoneButton onClick={() => setIsStoreOrderMode(false)} />
            ) : isEditing ? (
              <DoneButton onClick={() => setIsEditing(false)} />
            ) : (
              <>
                {allItems.length > 0 ? (
                  <button
                    type="button"
                    aria-label={searchOpen ? "Zoeken sluiten" : "Zoeken in te kopen"}
                    aria-pressed={searchOpen}
                    onClick={() => {
                      setSearchOpen((v) => !v);
                      setSearchQuery("");
                    }}
                    className={cn(headerRoundButtonClass, searchOpen && "!bg-[var(--blue-500)] !text-white")}
                  >
                    {RoundIcons.search}
                  </button>
                ) : null}
                {allItems.length > 0 || sectionNames.length > 0 ? <HeaderEditButton onClick={() => setIsEditing(true)} /> : null}
                <button type="button" aria-label="Instellingen" onClick={() => setSettingsOpen(true)} className={headerRoundButtonClass}>
                  {RoundIcons.more}
                </button>
              </>
            )}
          </span>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-14">
          {intro}

          <div className="flex min-w-0 flex-col gap-5">
            {isStoreOrderMode ? (
              <StoreOrderPanel storeKeys={orderedStoreKeys} onChange={(next) => setStoreOrder(next)} />
            ) : (
              <>
                {searchOpen ? (
                  <SearchBar surface="app" value={searchQuery} onValueChange={setSearchQuery} placeholder="Zoeken in te kopen…" />
                ) : !isEditing ? (
                  <button
                    type="button"
                    onClick={() => openAdd()}
                    className="flex h-[52px] items-center gap-2.5 rounded-pill bg-[var(--white)] pl-4 pr-1.5 text-left shadow-[0_0_0_1px_var(--border-subtle),0_6px_16px_-10px_rgba(16,17,48,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--text-tertiary)]">Wat moet je nog kopen?</span>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-primary text-white" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="size-[18px]">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                    <span className="sr-only">Product toevoegen</span>
                  </button>
                ) : null}

                {isEditing && orderedStoreKeys.length > 1 ? (
                  <MiniButton variant="secondary" className="self-start" onClick={() => setIsStoreOrderMode(true)}>
                    Volgorde winkels wijzigen
                  </MiniButton>
                ) : null}

                {openItems.length === 0 && sectionNames.length === 0 ? (
                  <p className="py-6 text-center text-[15px] text-[var(--text-tertiary)]">
                    Niets meer te kopen. Voeg iets toe dat je niet wil vergeten.
                  </p>
                ) : groups.length === 0 ? (
                  <p className="py-8 text-center text-[15px] text-[var(--text-tertiary)]">Geen producten gevonden voor «{searchQuery.trim()}».</p>
                ) : (
                  groups.map((group) => (
                    <GroupBlock
                      key={group.key}
                      group={group}
                      isEditing={isEditing}
                      addedByFor={addedByFor}
                      onAdd={() => openAdd(group)}
                      onToggle={toggleBought}
                      onEdit={(item) => {
                        setEditingItem(item);
                        setAddOpen(true);
                      }}
                      onDelete={handleDelete}
                      onRemoveSection={group.kind === "section" ? () => removeSection(group.title) : undefined}
                    />
                  ))
                )}

                {!searchOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSectionDraft("");
                      setSectionSheetOpen(true);
                    }}
                    className="flex h-12 items-center justify-center gap-1.5 rounded-[18px] border-[1.5px] border-dashed border-[#c9cbe6] text-sm font-bold text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-4">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Nieuwe sectie
                  </button>
                ) : null}

                {boughtItems.length > 0 && !searchOpen ? (
                  <div>
                    <div className="mx-1 mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-extrabold tracking-[0.05em] text-[var(--text-tertiary)]">GEKOCHT · {boughtItems.length}</span>
                      <button type="button" onClick={clearBought} className="rounded-pill px-1 text-[13px] font-semibold text-action-primary">
                        Wis
                      </button>
                    </div>
                    <ul className="m-0 list-none rounded-[22px] bg-[var(--white)] px-4 py-0.5 opacity-75 shadow-[0_0_0_1px_var(--border-subtle)]">
                      {boughtItems.map((item, i) => (
                        <li key={item.id} className={cn("flex items-center gap-3 py-2.5", i > 0 && "border-t border-[var(--border-subtle)]")}>
                          <CheckCircle checked onClick={() => toggleBought(item)} label={`${item.name} terugzetten`} />
                          <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--text-tertiary)] line-through first-letter:uppercase">{item.name}</span>
                          {item.store ? <StoreLogo store={item.store} size={18} /> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Snackbar */}
      {snackbarMessage && (
        <div className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS} role="region" aria-label="Melding">
          <Snackbar message={snackbarMessage} actionLabel="Zet terug" onAction={handleUndo} />
        </div>
      )}

      <AddShoppingItemSlideIn
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        initialStore={preselectedStore}
        initialSection={preselectedSection}
        sections={sectionNames}
        editItem={editingItem}
      />

      <SlideInModal
        open={sectionSheetOpen}
        onClose={() => setSectionSheetOpen(false)}
        title="Nieuwe sectie"
        footer={
          <Button variant="primary" disabled={!sectionDraft.trim()} onClick={addSection}>
            Maak sectie
          </Button>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addSection();
          }}
        >
          <InputField label="Naam" value={sectionDraft} onChange={(e) => setSectionDraft(e.target.value)} placeholder="bv. Badkamer, Online, Verjaardag Noë" autoFocus />
        </form>
      </SlideInModal>

      <SlideInModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Instellingen"
        titleId="te-kopen-settings-title"
        containerClassName="z-[55]"
        bodyClassName="px-[var(--space-4)] pb-[45px] pt-[var(--space-6)]"
      >
        <button
          type="button"
          onClick={() => void handleShareInvitePress()}
          className="flex w-full items-center gap-4 py-3 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="flex-1 text-base font-medium leading-6 text-[var(--text-primary)]">
            Lijstje delen
          </span>
          <ChevronRightIcon />
        </button>
      </SlideInModal>

      <ShareListModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        urlReady={Boolean(shareUrl)}
      />
    </div>
  );
}
