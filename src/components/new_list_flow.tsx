"use client";

/**
 * «Nieuw lijstje»-flow (keuze soort → supermarkt/frituur/café/Landal/vakantie/vast, plus snelle start vanuit
 * favorieten). Eén component voor home en het lijstjes-overzicht, zodat de modal boven het huidige scherm opent.
 * Openen via de ref: `open()` (soortkeuze) of `startFromMaster(id)` (naam + datum voor een favorietenlijst).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { SelectTile } from "@/components/ui/select_tile";
import { StoreSelectionTile } from "@/components/ui/store_selection_tile";
import { ListDateStepper } from "@/components/list_date_stepper";
import { VastListSheet } from "@/components/vaste_lijstjes";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import {
  defaultCafeListName,
  defaultFrituurListName,
  defaultLandalListName,
  defaultNewListName,
  selectListNameInputOnFocus,
} from "@/lib/list-default-name";
import { inferLandalTripLabel, isLandalListCard } from "@/lib/landal-list-card";
import {
  isLandalGezinList,
  landalGezinHouseholdMembershipTransactions,
  LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS,
} from "@/lib/landal-gezin-household";
import { autoShareMembershipTransactions, listAutoShareKind, useAutoShare } from "@/lib/auto-share";
import { listIsMasterTemplate } from "@/lib/list-master";
import { MASTER_STORE_OPTIONS, findMasterStoreByListName, findMasterStoreBySlug } from "@/lib/master-stores";
import type { MasterStoreSlug } from "@/lib/master-stores";
import { listIsFrituurVenueList, pickListProductIconForNewList } from "@/lib/list-product-icons";
import { uploadUserImageFile } from "@/lib/image-storage";
import { isoToListDate, todayIsoDate } from "@/lib/list-date";
import { normalizeTripPerson } from "@/lib/trip-person";
import { isVastList } from "@/lib/vaste-lijstjes";
import { isEmptyDraftMasterList } from "@/lib/draft-master-lists";

/** Figma 1320:22790 — volgorde swimlane supermarktlogos. */
const SUPERMARKT_SWIMLANE_SLUG_ORDER: readonly MasterStoreSlug[] = [
  "colruyt",
  "delhaize",
  "lidl",
  "aldi",
  "carrefour",
  "bio-planet",
  "spar",
  "match",
  "albert-heijn",
  "jumbo",
  "okay",
  "lidl-delhaize",
  "action",
  "zeeman",
  "wibra",
  "kruidvat",
] as const;

function masterStoresForSupermarktSwimlane(): (typeof MASTER_STORE_OPTIONS)[number][] {
  const bySlug = new Map(MASTER_STORE_OPTIONS.map((s) => [s.slug, s]));
  const out: (typeof MASTER_STORE_OPTIONS)[number][] = [];
  for (const slug of SUPERMARKT_SWIMLANE_SLUG_ORDER) {
    const s = bySlug.get(slug);
    if (s) out.push(s);
  }
  return out;
}

/** Meest gekozen winkels eerst; bij gelijke telling recentst gekozen eerst; anders vaste Figma-volgorde. */
function sortSupermarktStoresByPickerUsage(
  stores: (typeof MASTER_STORE_OPTIONS)[number][],
  statsRows: ReadonlyArray<{
    storeSlug?: string | null;
    pickCount?: number | null;
    lastPickedAtIso?: string | null;
  }>,
): (typeof MASTER_STORE_OPTIONS)[number][] {
  const bySlug = new Map<string, { count: number; last: string }>();
  for (const r of statsRows) {
    const slug = String(r.storeSlug ?? "").trim();
    if (!slug) continue;
    const n =
      typeof r.pickCount === "number" && !Number.isNaN(r.pickCount)
        ? r.pickCount
        : 0;
    const last = String(r.lastPickedAtIso ?? "");
    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, { count: n, last });
    } else {
      bySlug.set(slug, {
        count: Math.max(prev.count, n),
        last: last > prev.last ? last : prev.last,
      });
    }
  }
  const defaultIdx = new Map(
    SUPERMARKT_SWIMLANE_SLUG_ORDER.map((slug, i) => [slug, i]),
  );
  return [...stores].sort((a, b) => {
    const sa = bySlug.get(a.slug) ?? { count: 0, last: "" };
    const sb = bySlug.get(b.slug) ?? { count: 0, last: "" };
    if (sb.count !== sa.count) return sb.count - sa.count;
    if (sb.last !== sa.last) return sb.last.localeCompare(sa.last);
    return (
      (defaultIdx.get(a.slug as MasterStoreSlug) ?? 999) -
      (defaultIdx.get(b.slug as MasterStoreSlug) ?? 999)
    );
  });
}

/** Koppel klantenkaart aan nieuw lijstje wanneer winkel past (Figma 1320:22753). */
function findLoyaltyCardIdForStore(
  store: (typeof MASTER_STORE_OPTIONS)[number],
  loyaltyCards: ReadonlyArray<{
    id: string;
    cardName?: string | null;
    list?: { id?: string } | null;
  }>,
): string | null {
  const want = store.label.trim().toLowerCase();
  const matches = loyaltyCards.filter(
    (c) => String(c.cardName ?? "").trim().toLowerCase() === want,
  );
  const unlinked = matches.find((c) => !c.list?.id);
  return (unlinked ?? matches[0])?.id ?? null;
}

/** Venue-slide na FAB: supermarkt/café-illustraties; frituur nog placeholder. */
const VENUE_TILE_ICON_SUPERMARKT = "/images/ui/supermarkt_160.webp";
const VENUE_TILE_ICON_FRITUUR = "/images/ui/product_icons/frieten_160.webp";
const VENUE_TILE_ICON_CAFE = "/images/ui/cafe_160.webp";
const VENUE_TILE_ICON_LANDAL = "/images/ui/landal_160.webp";
const VENUE_TILE_ICON_VAKANTIE = "/images/ui/vakantie_160.webp";
const VENUE_TILE_ICON_VAST = "/images/ui/kado_160.webp";
const VENUE_TILE_ICON_GEZIN = "/images/ui/gezin_160.webp";
const VENUE_TILE_ICON_VRIENDEN = "/images/ui/vrienden_160.webp";

type PendingLandalChoice = { listName: string };

type PendingFrituurChoice = {
  listName: string;
  customIconUrl: string | null;
};

function defaultListNameForIsoDate(isoDate: string): string {
  return defaultNewListName(new Date(`${isoDate}T12:00:00`));
}

type SavedListIconImage = {
  id: string | null;
  imageDataUrl: string;
  createdAtIso: string;
  lastUsedAtIso: string;
};

type FrituurPreviousList = {
  id: string;
  name: string;
  items: CopyableListItem[];
};

type CopyableListItem = {
  name?: unknown;
  quantity?: unknown;
  section?: unknown;
  order?: unknown;
  itemCategory?: unknown;
  recipeGroupId?: unknown;
  recipeName?: unknown;
  recipeLink?: unknown;
  fromStock?: unknown;
  stockPhotoUrl?: unknown;
  itemDate?: unknown;
  tripPerson?: unknown;
  trip_person?: unknown;
};

type CopyableListTemplate = {
  items?: CopyableListItem[] | null;
};

function nonEmptyString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function copiedItemUpdate(item: CopyableListItem, order: number) {
  const itemName = nonEmptyString(item.name);
  if (!itemName) return null;

  const update: Record<string, string | number | boolean> = {
    name: itemName,
    quantity: String(item.quantity ?? "1"),
    checked: false,
    section: String(item.section ?? "Algemeen"),
    order,
  };

  const optionalStringFields = [
    "itemCategory",
    "recipeGroupId",
    "recipeName",
    "recipeLink",
    "stockPhotoUrl",
    "itemDate",
  ] as const;

  for (const field of optionalStringFields) {
    const value = nonEmptyString(item[field]);
    if (value) update[field] = value;
  }

  if (item.fromStock === true) update.fromStock = true;

  const tripPerson = nonEmptyString(item.tripPerson ?? item.trip_person);
  if (tripPerson) update.tripPerson = normalizeTripPerson(tripPerson);

  return update;
}

/** SVG als externe img kan geen currentColor; mask + action-primary (= primary 500) voor monochrome iconen. */
export function IconPrimaryMask({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-10 shrink-0 bg-action-primary", className)}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
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

/** Lijstje zoals de flow het nodig heeft (namen, volgorde, iconen, favorieten). */
type FlowList = {
  id: string;
  name: string;
  order: number;
  icon: string;
  items: { id: string }[];
  isMasterTemplate: boolean;
  masterIcon: string | null;
  sourceMasterListId: string | null;
  customIconUrl: string | null;
};

export type NewListFlowHandle = {
  /** Soortkeuze «Nieuw lijstje» openen. */
  open: () => void;
  /** Naam + datum voor een nieuw lijstje vanuit een favorietenlijst. */
  startFromMaster: (masterId: string) => void;
};

function toFlowList(l: Record<string, unknown>): FlowList {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: String(l.id),
    name: str(l.name),
    order: typeof l.order === "number" ? l.order : 0,
    icon: str(l.icon),
    items: (Array.isArray(l.items) ? l.items : []) as { id: string }[],
    isMasterTemplate: listIsMasterTemplate(l as Parameters<typeof listIsMasterTemplate>[0]),
    masterIcon: str(l.masterIcon) || null,
    sourceMasterListId: str(l.sourceMasterListId) || null,
    customIconUrl: str(l.customIconUrl) || null,
  };
}

export const NewListFlow = React.forwardRef<NewListFlowHandle, { onCreated?: (listId: string) => void }>(
  function NewListFlow({ onCreated }, ref) {
  const router = useRouter();
  const { user } = db.useAuth();
  const autoShare = useAutoShare(user?.id);
  const onCreatedRef = React.useRef(onCreated);
  onCreatedRef.current = onCreated;
  const ownerId = user?.id ?? "__no_user__";

  const { data } = db.useQuery({
    lists: { items: {}, $: { where: { ownerId } } },
    listMembers: { list: { items: {} }, $: { where: { instantUserId: ownerId } } },
    loyaltyCards: { list: {}, $: { where: { ownerId } } },
    listIconImages: { $: { where: { ownerId } } },
    supermarktPickerStats: { $: { where: { ownerId } } },
  });

  /** Eigen en gedeelde lijstjes (zonder vaste lijstjes en lege concept-favorieten), op volgorde. */
  const lists = React.useMemo((): FlowList[] => {
    const byId = new Map<string, FlowList>();
    for (const l of data?.lists ?? []) {
      if (isEmptyDraftMasterList(l) || isVastList(l)) continue;
      byId.set(String(l.id), toFlowList(l as Record<string, unknown>));
    }
    for (const row of data?.listMembers ?? []) {
      const l = row.list as Record<string, unknown> | null | undefined;
      if (!l || typeof l !== "object" || !("id" in l) || isVastList(l as Parameters<typeof isVastList>[0])) continue;
      if (!byId.has(String(l.id))) byId.set(String(l.id), toFlowList(l));
    }
    return Array.from(byId.values()).sort((a, b) => a.order - b.order);
  }, [data?.lists, data?.listMembers]);
  const masterLists = React.useMemo(() => lists.filter((l) => l.isMasterTemplate), [lists]);

  const [newListName, setNewListName] = React.useState("");
  /** Geplande winkeldag (ISO); bepaalt wanneer het lijstje als afgerond telt. */
  const [newListDate, setNewListDate] = React.useState(() => todayIsoDate());
  const [newListCustomIcon, setNewListCustomIcon] = React.useState<string | null>(null);
  const [newListIconPickerOpen, setNewListIconPickerOpen] = React.useState(false);
  const [pendingFrituurChoice, setPendingFrituurChoice] =
    React.useState<PendingFrituurChoice | null>(null);
  const [pendingLandalChoice, setPendingLandalChoice] =
    React.useState<PendingLandalChoice | null>(null);
  const [blankVenueSlideOpen, setBlankVenueSlideOpen] = React.useState(false);
  const [supermarktNewListSlideOpen, setSupermarktNewListSlideOpen] =
    React.useState(false);
  const [selectedSupermarktStoreSlug, setSelectedSupermarktStoreSlug] =
    React.useState<MasterStoreSlug | null>(null);
  const newListPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [quickMasterListName, setQuickMasterListName] = React.useState("");
  /** Geplande winkeldag (ISO) voor «+ Lijstje» vanaf een master. */
  const [quickMasterDate, setQuickMasterDate] = React.useState(() => todayIsoDate());
  const [quickMasterId, setQuickMasterId] = React.useState<string | null>(null);
  const [isQuickMasterModalOpen, setIsQuickMasterModalOpen] = React.useState(false);
  /** Nieuwe key bij elke modal-open: remount van het formulier zodat radio’s terug naar default staan. */
  const [newListFormKey, setNewListFormKey] = React.useState(0);

  const handleNewListDateChange = React.useCallback(
    (nextDate: string) => {
      setNewListName((current) =>
        current === defaultListNameForIsoDate(newListDate)
          ? defaultListNameForIsoDate(nextDate)
          : current,
      );
      setNewListDate(nextDate);
    },
    [newListDate],
  );

  const handleQuickMasterDateChange = React.useCallback(
    (nextDate: string) => {
      setQuickMasterListName((current) =>
        current === defaultListNameForIsoDate(quickMasterDate)
          ? defaultListNameForIsoDate(nextDate)
          : current,
      );
      setQuickMasterDate(nextDate);
    },
    [quickMasterDate],
  );

  const savedListIconImages = React.useMemo((): SavedListIconImage[] => {
    const byDataUrl = new Map<string, SavedListIconImage>();
    const rawLibrary = (data as { listIconImages?: unknown[] } | undefined)
      ?.listIconImages;

    if (Array.isArray(rawLibrary)) {
      for (const row of rawLibrary) {
        if (!row || typeof row !== "object") continue;
        const r = row as {
          id?: unknown;
          imageDataUrl?: unknown;
          createdAtIso?: unknown;
          lastUsedAtIso?: unknown;
        };
        if (typeof r.imageDataUrl !== "string" || r.imageDataUrl.length === 0) {
          continue;
        }
        byDataUrl.set(r.imageDataUrl, {
          id: typeof r.id === "string" ? r.id : null,
          imageDataUrl: r.imageDataUrl,
          createdAtIso:
            typeof r.createdAtIso === "string" ? r.createdAtIso : "",
          lastUsedAtIso:
            typeof r.lastUsedAtIso === "string" ? r.lastUsedAtIso : "",
        });
      }
    }

    // Backfill-achtig: ook oude lijstjes zonder bibliotheekrecord blijven herbruikbaar.
    for (const list of lists) {
      const imageDataUrl = list.customIconUrl;
      if (!imageDataUrl || byDataUrl.has(imageDataUrl)) continue;
      byDataUrl.set(imageDataUrl, {
        id: null,
        imageDataUrl,
        createdAtIso: "",
        lastUsedAtIso: "",
      });
    }

    return Array.from(byDataUrl.values()).sort((a, b) =>
      (b.lastUsedAtIso || b.createdAtIso).localeCompare(
        a.lastUsedAtIso || a.createdAtIso,
      ),
    );
  }, [data, lists]);

  const latestFrituurList = React.useMemo((): FrituurPreviousList | null => {
    const candidates = (data?.lists ?? [])
      .filter((list) => {
        if (listIsMasterTemplate(list)) return false;
        return listIsFrituurVenueList(String(list.name ?? ""));
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const latest = candidates[0];
    if (!latest?.id) return null;
    return {
      id: String(latest.id),
      name: String(latest.name ?? "Frituur"),
      items: ((latest.items ?? []) as FrituurPreviousList["items"])
        .slice()
        .sort((a, b) => {
          const orderA = typeof a.order === "number" ? a.order : 0;
          const orderB = typeof b.order === "number" ? b.order : 0;
          return orderA - orderB;
        }),
    };
  }, [data?.lists]);

  /** Favorietenlijsten voor de snelle start, gesorteerd op hoe vaak je er een lijstje van maakte. */
  const quickStartMasters = React.useMemo(() => {
    const usage = (m: FlowList) =>
      lists.filter(
        (l) =>
          !l.isMasterTemplate &&
          (l.sourceMasterListId === m.id ||
            (!l.sourceMasterListId && !!l.masterIcon && (l.masterIcon === m.icon || l.masterIcon === m.masterIcon))),
      ).length;
    return masterLists
      .filter((m) => (m.items?.length ?? 0) > 0)
      .map((m) => ({ m, n: usage(m) }))
      .sort((a, b) => b.n - a.n)
      .map(({ m }) => m);
  }, [lists, masterLists]);

  const handleCloseNewListFormState = React.useCallback(() => {
    setSupermarktNewListSlideOpen(false);
    setSelectedSupermarktStoreSlug(null);
    setNewListName("");
    setNewListCustomIcon(null);
    setNewListIconPickerOpen(false);
    setPendingFrituurChoice(null);
  }, []);

  /** Figma: eerst venue-slide; daarna pas naam/soort-modal. */
  const handleOpenCreateModal = React.useCallback(() => {
    setPendingFrituurChoice(null);
    setBlankVenueSlideOpen(true);
  }, []);

  /** Figma 1320:22753 — supermarkt: naam + swimlane + Volgende. */
  const openSupermarktNewListSlide = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    setSupermarktNewListSlideOpen(true);
    setSelectedSupermarktStoreSlug(null);
    setNewListName(defaultNewListName(new Date(), lists.map((l) => l.name)));
    setNewListDate(todayIsoDate());
    setNewListFormKey((k) => k + 1);
    setNewListCustomIcon(null);
    setNewListIconPickerOpen(false);
    setPendingFrituurChoice(null);
  }, [lists]);

  const handleNewListPhotoChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file?.type.startsWith("image/")) return;
      if (!user?.id) return;
      try {
        const image = await uploadUserImageFile({
          file,
          ownerId: user.id,
          kind: "list-icon",
        });
        setNewListCustomIcon(image.url);
        setNewListIconPickerOpen(false);
      } catch {
        // negeer compressiefouten stilzwijgend
      }
    },
    [user?.id],
  );

  const handleCloseQuickMasterModal = React.useCallback(() => {
    setIsQuickMasterModalOpen(false);
    setQuickMasterId(null);
    setQuickMasterListName("");
  }, []);

  const handleStartFromMaster = React.useCallback((masterId: string) => {
    setQuickMasterId(masterId);
    setQuickMasterListName(defaultNewListName(new Date(), lists.map((l) => l.name)));
    setQuickMasterDate(todayIsoDate());
    setIsQuickMasterModalOpen(true);
  }, [lists]);

  const handleQuickMasterSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!quickMasterId) return;
      const name = quickMasterListName.trim();
      if (!name) return;
      router.push(
        `/nieuw-lijstje/selecteer-master-lijstje/${encodeURIComponent(
          quickMasterId,
        )}/items?naam=${encodeURIComponent(name)}&datum=${encodeURIComponent(quickMasterDate)}`,
      );
      handleCloseQuickMasterModal();
    },
    [handleCloseQuickMasterModal, quickMasterDate, quickMasterId, quickMasterListName, router],
  );

  const loyaltyCardsForLinking = React.useMemo(() => {
    const raw = (data?.loyaltyCards ?? []) as Array<{
      id: string;
      cardName?: string | null;
      list?: { id?: string } | null;
    }>;
    return raw.filter((c) => typeof c.id === "string");
  }, [data?.loyaltyCards]);

  const supermarktSwimlaneStoresOrdered = React.useMemo(() => {
    const base = masterStoresForSupermarktSwimlane();
    const stats = (data?.supermarktPickerStats ?? []) as Array<{
      storeSlug?: string | null;
      pickCount?: number | null;
      lastPickedAtIso?: string | null;
    }>;
    return sortSupermarktStoresByPickerUsage(base, stats);
  }, [data?.supermarktPickerStats]);

  const createBlankList = React.useCallback(
    ({
      listName,
      duplicateFrom,
      startFrituurWizard,
      startCafeWizard = false,
      customIconForCreate,
      pickerMasterStore,
      loyaltyCardIdToLink,
      landalTripLabel,
      copyItemsFrom,
      listDateIso,
    }: {
      listName: string;
      /** Geplande winkeldag (ISO); standaard vandaag. */
      listDateIso?: string | null;
      duplicateFrom?: FrituurPreviousList | null;
      copyItemsFrom?: CopyableListTemplate | null;
      startFrituurWizard: boolean;
      startCafeWizard?: boolean;
      /** Override i.p.v. `newListCustomIcon` (modal kan al gesloten zijn). */
      customIconForCreate?: string | null;
      /** Gekozen winkeltegel (Figma swimlane); `masterIcon` ook als lijstnaam geen winkel is. */
      pickerMasterStore?: (typeof MASTER_STORE_OPTIONS)[number] | null;
      /** Optioneel: bestaande klantenkaart koppelen indien match met winkel. */
      loyaltyCardIdToLink?: string | null;
      /** Alleen Landal-flow: «Gezin» / «Vrienden» voor kaartondertitel. */
      landalTripLabel?: string | null;
    }) => {
      if (!user) return;
      setBlankVenueSlideOpen(false);
      const customIcon =
        customIconForCreate !== undefined ? customIconForCreate : newListCustomIcon;
      const icon = pickListProductIconForNewList(lists, listName);
      const storeFromName = findMasterStoreByListName(listName);
      const storeForMasterIcon = pickerMasterStore ?? storeFromName;
      const now = new Date();
      const nowIso = now.toISOString();
      const newId = iid();
      const txs: Parameters<typeof db.transact>[0] = [
        db.tx.lists[newId].update({
          name: listName,
          date: isoToListDate(listDateIso ?? todayIsoDate(now)),
          icon,
          order:
            lists.length > 0 ? Math.min(...lists.map((l) => l.order)) - 1 : 0,
          ownerId: user.id,
          isMasterTemplate: false,
          ...(storeForMasterIcon ? { masterIcon: storeForMasterIcon.logoSrc } : {}),
          ...(customIcon ? { customIconUrl: customIcon } : {}),
          ...(landalTripLabel != null && landalTripLabel !== ""
            ? { landalTripLabel }
            : {}),
        }),
      ];

      const duplicateItems = copyItemsFrom?.items ?? duplicateFrom?.items ?? [];
      for (let index = 0; index < duplicateItems.length; index += 1) {
        const item = duplicateItems[index];
        if (!item) continue;
        const copiedItem = copiedItemUpdate(item, index);
        if (!copiedItem) continue;
        txs.push(
          db.tx.items[iid()]
            .update(copiedItem)
            .link({ list: newId }),
        );
      }

      if (customIcon) {
        const existingIcon = savedListIconImages.find(
          (img) => img.imageDataUrl === customIcon && img.id,
        );
        if (existingIcon?.id) {
          txs.push(
            db.tx.listIconImages[existingIcon.id].update({
              lastUsedAtIso: nowIso,
            }),
          );
        } else {
          txs.push(
            db.tx.listIconImages[iid()].update({
              ownerId: user.id,
              imageDataUrl: customIcon,
              createdAtIso: nowIso,
              lastUsedAtIso: nowIso,
            }),
          );
        }
      }

      if (loyaltyCardIdToLink) {
        txs.push(db.tx.lists[newId].link({ loyaltyCard: loyaltyCardIdToLink }));
      }

      if (
        isLandalGezinList({
          name: listName,
          customIconUrl: customIcon,
          landalTripLabel: landalTripLabel ?? null,
        })
      ) {
        txs.push(
          ...landalGezinHouseholdMembershipTransactions(newId, user.id, []),
        );
      }

      txs.push(
        ...autoShareMembershipTransactions(
          newId,
          listAutoShareKind({ name: listName, customIconUrl: customIcon }),
          autoShare.enabledKinds,
          autoShare.partnerIds,
          isLandalGezinList({
            name: listName,
            customIconUrl: customIcon,
            landalTripLabel: landalTripLabel ?? null,
          })
            ? LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS
            : [],
        ),
      );

      if (pickerMasterStore) {
        const slug = pickerMasterStore.slug;
        const statRows = (data?.supermarktPickerStats ?? []) as Array<{
          id: string;
          storeSlug?: string | null;
          pickCount?: number | null;
        }>;
        const statRow = statRows.find(
          (r) => r.storeSlug === slug && typeof r.id === "string",
        );
        if (statRow?.id) {
          txs.push(
            db.tx.supermarktPickerStats[statRow.id].update({
              pickCount:
                (typeof statRow.pickCount === "number" ? statRow.pickCount : 0) +
                1,
              lastPickedAtIso: nowIso,
            }),
          );
        } else {
          txs.push(
            db.tx.supermarktPickerStats[iid()].update({
              ownerId: user.id,
              storeSlug: slug,
              pickCount: 1,
              lastPickedAtIso: nowIso,
            }),
          );
        }
      }

      db.transact(txs as Parameters<typeof db.transact>[0]).catch(() => undefined);
      handleCloseNewListFormState();
      if (startFrituurWizard) {
        router.push(`/lijstje/${newId}?frituurWizard=1`);
        return;
      }
      if (startCafeWizard) {
        router.push(`/lijstje/${newId}?cafeWizard=1`);
        return;
      }
      if (duplicateFrom) {
        router.push(`/lijstje/${newId}`);
        return;
      }
      onCreatedRef.current?.(newId);
    },
    [
      autoShare.enabledKinds,
      autoShare.partnerIds,
      data?.supermarktPickerStats,
      handleCloseNewListFormState,
      lists,
      newListCustomIcon,
      router,
      savedListIconImages,
      user,
    ],
  );

  const handleCloseBlankVenueStep = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
  }, []);

  const handleBlankVenuePickSupermarkt = React.useCallback(() => {
    openSupermarktNewListSlide();
  }, [openSupermarktNewListSlide]);

  const handleSupermarktSlideVolgende = React.useCallback(() => {
    if (!user) return;
    const name = newListName.trim();
    if (!name) return;
    const store = selectedSupermarktStoreSlug
      ? findMasterStoreBySlug(selectedSupermarktStoreSlug)
      : undefined;
    const loyaltyCardIdToLink =
      store != null
        ? findLoyaltyCardIdForStore(store, loyaltyCardsForLinking)
        : null;
    createBlankList({
      listName: name,
      duplicateFrom: null,
      startFrituurWizard: false,
      startCafeWizard: false,
      customIconForCreate: newListCustomIcon,
      pickerMasterStore: store ?? null,
      loyaltyCardIdToLink,
      listDateIso: newListDate,
    });
  }, [
    createBlankList,
    newListDate,
    loyaltyCardsForLinking,
    newListCustomIcon,
    newListName,
    selectedSupermarktStoreSlug,
    user,
  ]);

  const handleBlankVenuePickFrituur = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    const listName = defaultFrituurListName(lists.map((l) => l.name));
    if (listIsFrituurVenueList(listName) && latestFrituurList) {
      setPendingFrituurChoice({ listName, customIconUrl: null });
      return;
    }
    createBlankList({
      listName,
      duplicateFrom: null,
      startFrituurWizard: true,
      startCafeWizard: false,
      customIconForCreate: null,
    });
  }, [createBlankList, latestFrituurList, lists]);

  const handleBlankVenuePickCafe = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    const listName = defaultCafeListName(lists.map((l) => l.name));
    createBlankList({
      listName,
      duplicateFrom: null,
      startFrituurWizard: false,
      startCafeWizard: true,
      customIconForCreate: null,
    });
  }, [createBlankList, lists]);

  const handleBlankVenuePickLandal = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    const listName = defaultLandalListName(lists.map((l) => l.name));
    setPendingLandalChoice({ listName });
  }, [lists]);

  const latestLandalTemplateForTrip = React.useCallback(
    (tripLabel: "Gezin" | "Vrienden"): CopyableListTemplate | null => {
      const candidates: Array<Record<string, unknown> & CopyableListTemplate> = [];

      for (const list of data?.lists ?? []) {
        candidates.push(list as Record<string, unknown> & CopyableListTemplate);
      }
      for (const row of data?.listMembers ?? []) {
        const list = (row as { list?: unknown }).list;
        if (list && typeof list === "object") {
          candidates.push(list as Record<string, unknown> & CopyableListTemplate);
        }
      }

      const byId = new Map<string, Record<string, unknown> & CopyableListTemplate>();
      for (const list of candidates) {
        const id = typeof list.id === "string" ? list.id : "";
        if (
          !id ||
          byId.has(id) ||
          listIsMasterTemplate({
            isMasterTemplate:
              typeof list.isMasterTemplate === "boolean"
                ? list.isMasterTemplate
                : null,
            icon: typeof list.icon === "string" ? list.icon : null,
            name: typeof list.name === "string" ? list.name : null,
          })
        ) {
          continue;
        }
        const customIconUrl =
          typeof list.customIconUrl === "string" ? list.customIconUrl : null;
        if (!isLandalListCard(customIconUrl)) continue;
        const inferredTripLabel = inferLandalTripLabel({
          name: typeof list.name === "string" ? list.name : "",
          customIconUrl,
          landalTripLabel:
            typeof list.landalTripLabel === "string" ? list.landalTripLabel : null,
        });
        if (inferredTripLabel !== tripLabel) continue;
        byId.set(id, list);
      }

      return (
        Array.from(byId.values()).sort((a, b) => {
          const orderA =
            typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB =
            typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        })[0] ?? null
      );
    },
    [data?.listMembers, data?.lists],
  );

  const handleLandalSubPick = React.useCallback((subSuffix: "Gezin" | "Vrienden") => {
    setPendingLandalChoice(null);
    const baseName =
      pendingLandalChoice?.listName ??
      defaultLandalListName(lists.map((l) => l.name));
    const listName = `${baseName} ${subSuffix}`;
    const previousLandalList = latestLandalTemplateForTrip(subSuffix);
    createBlankList({
      listName,
      duplicateFrom: null,
      copyItemsFrom: previousLandalList,
      startFrituurWizard: false,
      startCafeWizard: false,
      customIconForCreate: VENUE_TILE_ICON_LANDAL,
      landalTripLabel: subSuffix,
    });
  }, [createBlankList, latestLandalTemplateForTrip, lists, pendingLandalChoice]);

  const handleBlankVenuePickVakantie = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    router.push("/nieuw-lijstje/vakantie");
  }, [router]);

  /** Vast lijstje (kado's, to do, …): eigen formulier. */
  const [vastSheetOpen, setVastSheetOpen] = React.useState(false);
  const handleBlankVenuePickVast = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    setVastSheetOpen(true);
  }, []);

  React.useImperativeHandle(ref, () => ({ open: handleOpenCreateModal, startFromMaster: handleStartFromMaster }), [
    handleOpenCreateModal,
    handleStartFromMaster,
  ]);

  return (
    <>
      {/* Figma 1320:22753 — Nieuw lijstje supermarkt (swimlane + optionele klantenkaart-koppeling) */}
      <SlideInModal
        open={supermarktNewListSlideOpen}
        onClose={handleCloseNewListFormState}
        title="Nieuw lijstje supermarkt"
        titleId="supermarkt-new-list-slide-title"
        className="pb-0"
        bodyClassName="pb-[var(--space-2)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        disableEscapeClose={
          newListIconPickerOpen || pendingFrituurChoice != null || pendingLandalChoice != null
        }
        footer={
          <Button
            type="button"
            variant="primary"
            disabled={!newListName.trim()}
            onClick={handleSupermarktSlideVolgende}
          >
            Volgende
          </Button>
        }
      >
        <div
          key={newListFormKey}
          className="flex w-full flex-col items-center gap-[var(--space-8)]"
        >
          <ListDateStepper value={newListDate} onChange={handleNewListDateChange} />

          <div className="flex w-full flex-col gap-[var(--space-2)]">
            <label
              htmlFor="supermarkt-new-list-name"
              className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]"
            >
              Naam lijstje
            </label>
            <div className="flex w-full items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="supermarkt-new-list-name"
                  value={newListName}
                  autoComplete="off"
                  onChange={(e) => setNewListName(e.target.value)}
                  onFocus={selectListNameInputOnFocus}
                  placeholder="Naam lijstje"
                  className={cn(
                    "flex h-12 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--white)] px-4 text-base leading-24 tracking-normal text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-placeholder)] focus-visible:outline-none focus-visible:border-[var(--border-focus)]",
                    !newListCustomIcon && "pr-12",
                  )}
                />
                {!newListCustomIcon ? (
                  <button
                    type="button"
                    aria-label="Afbeeldingopties openen"
                    aria-expanded={newListIconPickerOpen}
                    onClick={() => setNewListIconPickerOpen((open) => !open)}
                    className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center"
                  >
                    <span
                      aria-hidden
                      className="inline-block size-6 bg-[var(--blue-500)]"
                      style={{
                        WebkitMaskImage: "url(/icons/camera.svg)",
                        maskImage: "url(/icons/camera.svg)",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                      }}
                    />
                  </button>
                ) : null}
              </div>
              {newListCustomIcon ? (
                <button
                  type="button"
                  aria-label="Afbeeldingopties openen"
                  aria-expanded={newListIconPickerOpen}
                  onClick={() => setNewListIconPickerOpen((open) => !open)}
                  className="relative shrink-0 size-12 overflow-hidden rounded-[var(--radius-md)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newListCustomIcon} alt="" className="size-full object-cover" />
                </button>
              ) : null}
            </div>
            <input
              ref={newListPhotoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={handleNewListPhotoChange}
            />
          </div>

          <div className="w-full min-w-0">
            <p className="sr-only">Supermarkt (optioneel)</p>
            <div
              role="radiogroup"
              aria-label="Supermarkt, optioneel"
              className="-mx-1 flex gap-[var(--space-3)] overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {supermarktSwimlaneStoresOrdered.map((store) => {
                const selected = selectedSupermarktStoreSlug === store.slug;
                return (
                  <StoreSelectionTile
                    key={store.slug}
                    role="radio"
                    aria-checked={selected}
                    label={store.label}
                    logoSrc={store.logoSrc}
                    selected={selected}
                    onClick={() =>
                      setSelectedSupermarktStoreSlug((prev) =>
                        prev === store.slug ? null : store.slug,
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </SlideInModal>

      <SlideInModal
        open={blankVenueSlideOpen}
        onClose={handleCloseBlankVenueStep}
        title="Nieuw lijstje"
        titleId="blank-list-venue-slide-title"
        containerClassName="z-[60]"
        className="!bg-[var(--bg-app)] pb-0"
        bodyClassName="px-[var(--space-4)] pb-[34px] pt-[var(--space-2)] md:px-6 md:pb-6"
      >
        {/* Canvas «Nieuw lijstje A»: favorieten als snelle start + soorten als witte kaarten met schaduw. */}
        <div className="flex w-full flex-col gap-4">
          {quickStartMasters.length > 0 ? (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-secondary)]">Vanuit je favorieten</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1.5 pt-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                {quickStartMasters.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        handleCloseBlankVenueStep();
                        handleStartFromMaster(m.id);
                      }}
                      className="flex h-[46px] shrink-0 items-center gap-2 rounded-pill bg-[var(--white)] pl-1.5 pr-3 shadow-[0_1px_2px_rgba(16,17,48,0.06),0_6px_16px_-8px_rgba(16,17,48,0.18)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      aria-label={`Nieuw lijstje uit favorieten ${m.name}`}
                    >
                      <span className="flex size-[34px] items-center justify-center rounded-full bg-[var(--gray-25)]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- winkellogo */}
                        <img src={m.masterIcon || m.icon} alt="" width={24} height={24} className="size-6 object-contain" />
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{m.name}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5 text-[var(--blue-500)]">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
          <div>
            {quickStartMasters.length > 0 ? (
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-secondary)]">Of kies een soort lijstje</p>
            ) : null}
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-3">
              {(
                [
                  ["Supermarkt", "Boodschappen voor een dag of de week", VENUE_TILE_ICON_SUPERMARKT, handleBlankVenuePickSupermarkt],
                  ["Frituur", "Iedereen kiest, jij bestelt", VENUE_TILE_ICON_FRITUUR, handleBlankVenuePickFrituur],
                  ["Café", "Rondjes bijhouden met vrienden", VENUE_TILE_ICON_CAFE, handleBlankVenuePickCafe],
                  ["Landal", "Voor je verblijf in een Landal-park", VENUE_TILE_ICON_LANDAL, handleBlankVenuePickLandal],
                  ["Vakantie", "Paklijst op maat voor je reis", VENUE_TILE_ICON_VAKANTIE, handleBlankVenuePickVakantie],
                  ["Vast lijstje", "Kado's per persoon, to do, …", VENUE_TILE_ICON_VAST, handleBlankVenuePickVast],
                ] as const
              ).map(([title, description, icon, onPick]) => (
                <button
                  key={title}
                  type="button"
                  onClick={onPick}
                  className="flex items-center gap-3 rounded-[18px] bg-[var(--white)] py-2.5 pl-2.5 pr-3.5 text-left shadow-[0_1px_2px_rgba(16,17,48,0.06),0_6px_16px_-8px_rgba(16,17,48,0.18)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] md:flex-col md:gap-1.5 md:px-3 md:pb-4 md:pt-[18px] md:text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
                  <img src={icon} alt="" width={56} height={56} className="size-11 shrink-0 object-contain md:size-14" />
                  <span className="min-w-0 flex-1 leading-[19px] md:mt-1">
                    <span className="block text-[15.5px] font-semibold text-[var(--text-primary)]">{title}</span>
                    <span className="block text-[13px] text-[var(--text-secondary)] md:text-[12.5px] md:leading-[17px]">{description}</span>
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px] shrink-0 text-[var(--gray-300)] md:hidden">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SlideInModal>

      {user ? (
        <VastListSheet open={vastSheetOpen} onClose={() => setVastSheetOpen(false)} ownerId={user.id} nextOrder={Date.now()} />
      ) : null}

      <SlideInModal
        open={pendingFrituurChoice != null}
        onClose={() => setPendingFrituurChoice(null)}
        title="Nieuw frituur lijstje"
        titleId="new-frituur-choice-slide-title"
        containerClassName="z-[60]"
        className="pb-0"
        bodyClassName="pb-[45px]"
      >
        <div className="flex w-full flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              if (!pendingFrituurChoice || !latestFrituurList) return;
              createBlankList({
                listName: pendingFrituurChoice.listName,
                duplicateFrom: latestFrituurList,
                startFrituurWizard: false,
                customIconForCreate: pendingFrituurChoice.customIconUrl,
              });
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Vertrek van vorige lijstje"
              subtitle="Je bestelt bijna hetzelfde dan vorige keer"
              icon={<IconPrimaryMask src="/icons/list.svg" />}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!pendingFrituurChoice) return;
              createBlankList({
                listName: pendingFrituurChoice.listName,
                duplicateFrom: null,
                startFrituurWizard: true,
                customIconForCreate: pendingFrituurChoice.customIconUrl,
              });
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Nieuw lijstje"
              subtitle="Je doet een totaal andere bestelling"
              icon={<IconPrimaryMask src="/icons/plus-circle.svg" />}
            />
          </button>
        </div>
      </SlideInModal>

      <SlideInModal
        open={pendingLandalChoice != null}
        onClose={() => setPendingLandalChoice(null)}
        title="Landal lijstje"
        titleId="new-landal-choice-slide-title"
        containerClassName="z-[60]"
        className="pb-0"
        bodyClassName="px-[var(--space-4)] pb-[45px] pt-[var(--space-6)]"
      >
        <div className="grid w-full grid-cols-2 gap-[var(--space-4)]">
          <button
            type="button"
            onClick={() => handleLandalSubPick("Gezin")}
            className={cn(
              "flex min-w-0 flex-col items-center gap-[var(--space-2)] rounded-lg bg-[var(--white)] p-[var(--space-3)] text-center shadow-card transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "[@media(hover:hover)]:hover:bg-[var(--gray-25)]",
            )}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={VENUE_TILE_ICON_GEZIN} alt="" width={48} height={48} className="size-full object-cover" />
            </div>
            <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
              Gezin
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleLandalSubPick("Vrienden")}
            className={cn(
              "flex min-w-0 flex-col items-center gap-[var(--space-2)] rounded-lg bg-[var(--white)] p-[var(--space-3)] text-center shadow-card transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "[@media(hover:hover)]:hover:bg-[var(--gray-25)]",
            )}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={VENUE_TILE_ICON_VRIENDEN} alt="" width={48} height={48} className="size-full object-cover" />
            </div>
            <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
              Vrienden
            </p>
          </button>
        </div>
      </SlideInModal>

      <SlideInModal
        open={newListIconPickerOpen}
        onClose={() => setNewListIconPickerOpen(false)}
        title="Afbeelding kiezen"
        titleId="new-list-icon-picker-slide-title"
        containerClassName="z-[60]"
        className="pb-0"
      >
        <div className="flex w-full flex-col gap-6">
          <button
            type="button"
            onClick={() => newListPhotoInputRef.current?.click()}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Nieuwe foto"
              subtitle="Maak een foto of kies uit je galerij"
              icon={<IconPrimaryMask src="/icons/camera.svg" />}
            />
          </button>

          {savedListIconImages.length > 0 ? (
            <section className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
                  Eerder gebruikt
                </h3>
                <p className="text-sm font-normal leading-20 tracking-normal text-[var(--text-secondary)]">
                  Kies snel een afbeelding die je al eens hebt gebruikt.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {savedListIconImages.map((image) => {
                  const isSelected = newListCustomIcon === image.imageDataUrl;
                  return (
                    <button
                      key={image.id ?? image.imageDataUrl}
                      type="button"
                      aria-label="Eerder gebruikte afbeelding kiezen"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setNewListCustomIcon(image.imageDataUrl);
                        setNewListIconPickerOpen(false);
                      }}
                      className={cn(
                        "relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border bg-[var(--white)] shadow-drop transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                        isSelected
                          ? "border-action-primary ring-2 ring-action-primary"
                          : "border-[var(--border-default)]",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageDataUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                      {isSelected ? (
                        <span
                          aria-hidden
                          className="absolute right-1 top-1 size-4 rounded-full bg-action-primary ring-2 ring-[var(--white)]"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-[var(--radius-md)] bg-[var(--blue-25)] px-4 py-3">
              <p className="text-sm font-normal leading-20 tracking-normal text-[var(--text-secondary)]">
                Je hebt nog geen eerder gebruikte afbeeldingen. Voeg eerst een
                nieuwe foto toe.
              </p>
            </div>
          )}
        </div>
      </SlideInModal>

      <SlideInModal
        open={isQuickMasterModalOpen}
        onClose={handleCloseQuickMasterModal}
        title="Nieuw lijstje"
        footer={
          <Button
            type="submit"
            form="quick-master-create-form"
            variant="primary"
            disabled={!quickMasterListName.trim()}
          >
            Bewaren
          </Button>
        }
      >
        <form
          id="quick-master-create-form"
          onSubmit={handleQuickMasterSubmit}
          className="flex w-full flex-col items-center gap-8"
        >
          <ListDateStepper value={quickMasterDate} onChange={handleQuickMasterDateChange} />
          <InputField
            label="Naam lijstje"
            placeholder="Naam lijstje"
            name="newListName"
            value={quickMasterListName}
            autoComplete="off"
            onChange={(e) => setQuickMasterListName(e.target.value)}
            onFocus={selectListNameInputOnFocus}
          />
        </form>
      </SlideInModal>
    </>
  );
  },
);
