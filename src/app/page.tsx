"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { id as iid } from "@instantdb/react";
import { ListCard } from "@/components/ui/list_card";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { EditButton } from "@/components/ui/edit_button";
import { MiniButton } from "@/components/ui/mini_button";
import { Snackbar } from "@/components/ui/snackbar";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { SelectTile } from "@/components/ui/select_tile";
import { cn } from "@/lib/utils";
import {
  defaultNewListName,
  selectListNameInputOnFocus,
} from "@/lib/list-default-name";
import { listIsMasterTemplate } from "@/lib/list-master";
import { storeLogosFromListIcon } from "@/lib/master-stores";
import { db } from "@/lib/db";
import { AppBottomNav } from "@/components/app_bottom_nav";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { APP_FAB_BOTTOM_CLASS } from "@/lib/app-layout";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";

type ListMembershipRow = { id?: string; instantUserId?: string };

/** Soort nieuw lijstje in create-modal (Figma 772:3065); bewaren gebruikt nu alleen `blank` in de DB. */
type NewListKind = "blank" | "from_master" | "master";

const HOME_NEW_LIST_FORM_ID = "home-new-list-form";

/** Native radio + SelectTile zodat FormData bij "Bewaren" altijd de echte tegelkeuze wéérgeeft (geen React-state drift). */
function NewListKindFormOption({
  value,
  defaultChecked,
  title,
  subtitle,
  icon,
}: {
  value: NewListKind;
  defaultChecked?: boolean;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-border-focus focus-within:ring-offset-2">
      <input
        type="radio"
        name="newListKind"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--blue-200)] bg-[var(--white)] transition-colors",
          "peer-checked:border-action-primary peer-checked:[&>span]:opacity-100",
        )}
        aria-hidden
      >
        <span className="size-4 rounded-full border border-[var(--blue-100)] bg-action-primary opacity-0 transition-opacity" />
      </span>
      <SelectTile
        className="min-w-0 flex-1"
        title={title}
        subtitle={subtitle}
        icon={icon}
      />
    </label>
  );
}

type HomeList = {
  id: string;
  name: string;
  date: string;
  icon: string;
  order: number;
  items?: { id: string }[];
  /** Alleen eigenaar mag lijst verwijderen; gedeelde lijsten zijn read-open + bewerken op detail. */
  isOwner: boolean;
  /** Lidmaatschappen om mee te verwijderen bij delete (alleen bij eigenaar). */
  membershipIds?: string[];
  /** Figma 762:3452: toon "gedeeld met …" op de kaart. */
  displayVariant: "default" | "shared" | "master" | "from-master";
  /** Voornaam van de andere partij (deelnemer of eigenaar); null = ListCard toont "deelnemer". */
  sharedWithFirstName: string | null;
  /** Winkellogo-URL's (1-2) voor kaartbadge bij displayVariant "from-master". */
  storeLogos: string[];
  /** Master-template (niet: weeklijst met winkel-logo). */
  isMasterTemplate: boolean;
};

const FOOD_ICONS = [
  "/images/ui/food/icon_apple.png",
  "/images/ui/food/icon_aubergine.png",
  "/images/ui/food/icon_banana.png",
  "/images/ui/food/icon_blueberries.png",
  "/images/ui/food/icon_bread.png",
  "/images/ui/food/icon_carrot.png",
  "/images/ui/food/icon_cheese.png",
  "/images/ui/food/icon_milk.png",
  "/images/ui/food/icon_nutella.png",
  "/images/ui/food/icon_strawberry.png",
  "/images/ui/food/icon_tangerine.png",
] as const;

/**
 * Returns an icon for a new list. Prefers icons not yet used by existing lists.
 * Only when all icons are used may an icon be reused.
 */
function getIconForNewList(existingLists: HomeList[]): string {
  const usedIcons = new Set(existingLists.map((l) => l.icon));
  const unusedIcons = FOOD_ICONS.filter((icon) => !usedIcons.has(icon));
  const pool = unusedIcons.length > 0 ? unusedIcons : [...FOOD_ICONS];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Deterministische food icon voor een from-master lijst op basis van de lijst-ID.
 * Geeft altijd hetzelfde icoon terug voor hetzelfde ID (ook voor legacy DB-items met store logo).
 */
function foodIconFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return FOOD_ICONS[Math.abs(h) % FOOD_ICONS.length];
}

function itemCountLabel(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

/** Renders the sortable list; must be inside DndContext to use useDndContext for drag state */
function SortableListItems({
  lists,
  isEditMode,
  removingId,
  addingId,
  addingIdExpanded,
  onDelete,
  onStartFromMaster,
}: {
  lists: HomeList[];
  isEditMode: boolean;
  removingId: string | null;
  addingId: string | null;
  addingIdExpanded: boolean;
  onDelete: (id: string) => void;
  onStartFromMaster: (id: string) => void;
}) {
  const { active } = useDndContext();
  const isDndActive = active != null;
  const [showAllNormal, setShowAllNormal] = React.useState(false);
  const [showAllMaster, setShowAllMaster] = React.useState(false);

  const normalLists = lists.filter((l) => l.displayVariant !== "master");
  const masterLists = lists.filter((l) => l.displayVariant === "master");
  const visibleNormalLists = showAllNormal ? normalLists : normalLists.slice(0, 3);
  const visibleMasterLists = showAllMaster ? masterLists : masterLists.slice(0, 3);

  return (
    <div className="flex flex-col">
      {normalLists.length > 0 ? (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-section-title font-bold leading-24 tracking-normal text-[var(--blue-900)]">
              Lijstjes
            </h2>
            {normalLists.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAllNormal((prev) => !prev)}
                className="text-sm font-medium leading-20 tracking-normal text-[var(--blue-500)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
              >
                {showAllNormal ? "Toon minder" : "Toon meer"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col">
            {visibleNormalLists.map((list, index) => {
              const isRemoving = removingId === list.id;
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              const isAnimating = isRemoving || isAddingCollapsed;

              const wrapperClass = isDndActive
                ? cn(index < visibleNormalLists.length - 1 ? "mb-3" : "mb-0")
                : cn(
                    "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                    isAnimating
                      ? "max-h-0 opacity-0 mb-0"
                      : "max-h-[200px] opacity-100",
                    !isAnimating &&
                      (index < visibleNormalLists.length - 1 ? "mb-3" : "mb-0")
                  );

              return (
                <div key={list.id} className={wrapperClass}>
                  <SortableListCard
                    list={list}
                    isEditMode={isEditMode}
                    onDelete={() => onDelete(list.id)}
                    onStartFromMaster={() => onStartFromMaster(list.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {masterLists.length > 0 ? (
        <div
          className={cn(
            "flex flex-col",
            normalLists.length > 0 ? "mt-8" : undefined,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-section-title font-bold leading-24 tracking-normal text-[var(--blue-900)]">
              Master lijstjes
            </h2>
            {masterLists.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAllMaster((prev) => !prev)}
                className="text-sm font-medium leading-20 tracking-normal text-[var(--blue-500)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
              >
                {showAllMaster ? "Toon minder" : "Toon meer"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col">
            {visibleMasterLists.map((list, index) => {
              const isRemoving = removingId === list.id;
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              const isAnimating = isRemoving || isAddingCollapsed;

              const wrapperClass = isDndActive
                ? cn(index < visibleMasterLists.length - 1 ? "mb-3" : "mb-0")
                : cn(
                    "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                    isAnimating
                      ? "max-h-0 opacity-0 mb-0"
                      : "max-h-[200px] opacity-100",
                    !isAnimating &&
                      (index < visibleMasterLists.length - 1 ? "mb-3" : "mb-0")
                  );

              return (
                <div key={list.id} className={wrapperClass}>
                  <SortableListCard
                    list={list}
                    isEditMode={isEditMode}
                    onDelete={() => onDelete(list.id)}
                    onStartFromMaster={() => onStartFromMaster(list.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableListCard({
  list,
  isEditMode,
  onDelete,
  onStartFromMaster,
}: {
  list: HomeList;
  isEditMode: boolean;
  onDelete: () => void;
  onStartFromMaster: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const card = (
    <ListCard
      listName={list.name}
      date={list.date}
      itemCount={itemCountLabel(list.items?.length ?? 0)}
      displayVariant={list.displayVariant}
      storeLogos={list.storeLogos}
      sharedWithFirstName={
        list.sharedWithFirstName ?? undefined
      }
      icon={
        <Image
          src={
            list.displayVariant === "from-master" && list.icon.startsWith("/logos/")
              ? foodIconFromId(list.id)
              : list.icon
          }
          alt=""
          width={48}
          height={48}
          className="object-contain"
        />
      }
      state={isEditMode ? "editable" : "default"}
      onDelete={isEditMode && list.isOwner ? onDelete : undefined}
      onReorder={undefined}
      onMasterAdd={
        !isEditMode && list.displayVariant === "master"
          ? onStartFromMaster
          : undefined
      }
      dragHandleProps={isEditMode ? { ...attributes, ...listeners } : undefined}
      className={cn(!isEditMode && "cursor-pointer")}
    />
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]"
      )}
    >
      <SwipeToDelete
        onDelete={!isEditMode && list.isOwner ? onDelete : undefined}
        deleteActionLabel="Lijstje verwijderen"
      >
        {isEditMode ? (
          card
        ) : list.displayVariant === "master" ? (
          <button
            type="button"
            className="w-full text-left"
            onClick={onStartFromMaster}
          >
            {card}
          </button>
        ) : (
          <Link href={`/lijstje/${list.id}`} className="block no-underline">
            {card}
          </Link>
        )}
      </SwipeToDelete>
    </div>
  );
}

/** SVG als externe img kan geen currentColor; mask + action-primary (= primary 500) voor monochrome iconen. */
function IconPrimaryMask({ src, className }: { src: string; className?: string }) {
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

export default function Home() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, error, data } = db.useQuery({
    lists: {
      items: {},
      memberships: {},
      $: { where: { ownerId } },
    },
    listMembers: {
      list: { items: {} },
      $: { where: { instantUserId: ownerId } },
    },
    profiles: {
      $: { where: { instantUserId: ownerId } },
    },
  });

  const profileRow = data?.profiles?.[0];
  const profileAvatarUrl = profileRow?.avatarUrl ?? null;
  const profileFirstName = (profileRow?.firstName ?? "").trim() || null;

  const shareRelatedUserIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (!data || !user?.id) return [] as string[];
    for (const l of data.lists ?? []) {
      for (const m of (l.memberships ?? []) as ListMembershipRow[]) {
        const uid = m.instantUserId;
        if (uid && uid !== user.id) ids.add(uid);
      }
    }
    for (const row of data.listMembers ?? []) {
      const list = row.list as { ownerId?: string } | null | undefined;
      if (list?.ownerId) ids.add(list.ownerId);
    }
    return Array.from(ids);
  }, [data, user?.id]);

  const shareProfilesQuery = React.useMemo(
    () => ({
      profiles: {
        $: {
          where:
            shareRelatedUserIds.length > 0
              ? {
                  or: shareRelatedUserIds.map((id) => ({
                    instantUserId: id,
                  })),
                }
              : { instantUserId: "__share_profiles_none__" },
        },
      },
    }),
    [shareRelatedUserIds],
  );

  const { data: shareProfilesData } = db.useQuery(
    shareProfilesQuery as unknown as Parameters<typeof db.useQuery>[0],
  );

  const shareFirstNameByUserId = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of shareProfilesData?.profiles ?? []) {
      const uid = p.instantUserId;
      const fn = (p.firstName ?? "").trim();
      if (uid && fn) m.set(uid, fn);
    }
    return m;
  }, [shareProfilesData?.profiles]);

  const lists: HomeList[] = React.useMemo(() => {
    const owned: HomeList[] = (data?.lists ?? []).map((l) => {
      const isMaster = listIsMasterTemplate(l);
      const memberIds = ((l.memberships ?? []) as ListMembershipRow[])
        .map((m) => m.instantUserId)
        .filter((id): id is string => !!id && id !== user?.id);
      const hasOtherMembers = memberIds.length > 0;
      const primaryOtherId = memberIds[0];
      const sharedName =
        primaryOtherId != null
          ? shareFirstNameByUserId.get(primaryOtherId) ?? null
          : null;
      // masterIcon = winkellogo opgeslagen bij aanmaken; voor oude lijstjes valt het terug op icon (= was al een winkellogo).
      const masterIconSrc: string = (l as Record<string, unknown>).masterIcon as string || "";
      const effectiveStoreIcon = masterIconSrc.startsWith("/logos/")
        ? masterIconSrc
        : typeof l.icon === "string" && l.icon.startsWith("/logos/")
          ? l.icon
          : "";
      const isFromMaster = !isMaster && effectiveStoreIcon.length > 0;
      return {
        id: l.id,
        name: l.name,
        date: l.date,
        icon: l.icon,
        order: l.order,
        items: l.items ?? [],
        isOwner: true,
        membershipIds: (l.memberships ?? []).map((m) => m.id),
        displayVariant: isMaster
          ? "master"
          : hasOtherMembers
            ? "shared"
            : isFromMaster
              ? "from-master"
              : "default",
        storeLogos: isFromMaster ? storeLogosFromListIcon(effectiveStoreIcon) : [],
        sharedWithFirstName: isMaster ? null : hasOtherMembers ? sharedName : null,
        isMasterTemplate: isMaster,
      };
    });

    const shared: HomeList[] = (data?.listMembers ?? [])
      .map((row) => row.list)
      .filter(
        (l): l is NonNullable<typeof l> =>
          l != null && typeof l === "object" && "id" in l,
      )
      .map((l) => {
        const isMaster = listIsMasterTemplate(l);
        const ownerId =
          "ownerId" in l && typeof l.ownerId === "string"
            ? l.ownerId
            : undefined;
        const ownerFirst =
          ownerId != null
            ? shareFirstNameByUserId.get(ownerId) ?? null
            : null;
        const masterIconSrc2: string = (l as Record<string, unknown>).masterIcon as string || "";
        const effectiveStoreIcon2 = masterIconSrc2.startsWith("/logos/")
          ? masterIconSrc2
          : typeof l.icon === "string" && l.icon.startsWith("/logos/")
            ? l.icon
            : "";
        const isFromMaster = !isMaster && effectiveStoreIcon2.length > 0;
        return {
          id: l.id,
          name: l.name,
          date: l.date,
          icon: l.icon,
          order: l.order,
          items: l.items ?? [],
          isOwner: false,
          displayVariant: isMaster
            ? ("master" as const)
            : isFromMaster
              ? ("from-master" as const)
              : ("shared" as const),
          sharedWithFirstName: isMaster || isFromMaster ? null : ownerFirst,
          storeLogos: isFromMaster ? storeLogosFromListIcon(effectiveStoreIcon2) : [],
          isMasterTemplate: isMaster,
        };
      });

    const byId = new Map<string, HomeList>();
    for (const l of owned) {
      byId.set(l.id, l);
    }
    for (const l of shared) {
      if (!byId.has(l.id)) {
        byId.set(l.id, l);
      }
    }
    return Array.from(byId.values()).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
  }, [data, user?.id, shareFirstNameByUserId]);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [quickMasterListName, setQuickMasterListName] = React.useState("");
  const [quickMasterId, setQuickMasterId] = React.useState<string | null>(null);
  const [isQuickMasterModalOpen, setIsQuickMasterModalOpen] = React.useState(false);
  /** Nieuwe key bij elke modal-open: remount van het formulier zodat radio’s terug naar default staan. */
  const [newListFormKey, setNewListFormKey] = React.useState(0);
  const [lastDeleted, setLastDeleted] = React.useState<{
    listId: string;
    listName: string;
    order: number;
    icon: string;
    isMasterTemplate: boolean;
  } | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(
    null,
  );
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addingIdExpanded, setAddingIdExpanded] = React.useState(false);
  const removeTimeoutRef = React.useRef<number | NodeJS.Timeout | null>(null);

  const hasLists = lists.length > 0;

  const DELETE_ANIMATION_MS = 300;
  const ADD_ANIMATION_MS = 300;

  React.useEffect(() => {
    return () => {
      if (removeTimeoutRef.current) clearTimeout(removeTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!addingId) return;
    setAddingIdExpanded(false);
    const rafId = requestAnimationFrame(() => {
      setAddingIdExpanded(true);
    });
    const timeoutId = window.setTimeout(() => {
      setAddingId(null);
      setAddingIdExpanded(false);
    }, ADD_ANIMATION_MS);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [addingId]);

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeleted(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  const handleToggleEdit = () => {
    setIsEditMode((prev) => !prev);
  };

  const handleDeleteList = React.useCallback(
    (listId: string) => {
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
        removeTimeoutRef.current = null;
      }
      setRemovingId(listId);
      removeTimeoutRef.current = window.setTimeout(() => {
        removeTimeoutRef.current = null;
        const list = lists.find((l) => l.id === listId);
        if (!list || !list.isOwner) return;
        const itemIds = (list.items ?? []).map((i) => i.id);
        const membershipIds = list.membershipIds ?? [];
        db.transact([
          ...itemIds.map((itemId) => db.tx.items[itemId].delete()),
          ...membershipIds.map((mid) => db.tx.listMembers[mid].delete()),
          db.tx.lists[listId].delete(),
        ] as Parameters<typeof db.transact>[0]);
        setLastDeleted({
          listId,
          listName: list.name,
          order: list.order,
          icon: list.icon,
          isMasterTemplate: list.isMasterTemplate,
        });
        setSnackbarMessage(`'${list.name}' verwijderd`);
        setRemovingId(null);
      }, DELETE_ANIMATION_MS);
    },
    [lists],
  );

  const handleUndoDelete = React.useCallback(() => {
    if (!lastDeleted || !user) return;
    db.transact(
      db.tx.lists[lastDeleted.listId].update({
        name: lastDeleted.listName,
        date: new Date().toLocaleDateString("nl-NL"),
        icon: lastDeleted.icon,
        order: lastDeleted.order,
        ownerId: user.id,
        isMasterTemplate: lastDeleted.isMasterTemplate,
      }),
    );
    setLastDeleted(null);
    setSnackbarMessage(null);
    setAddingId(lastDeleted.listId);
  }, [lastDeleted, user]);

  const handleCloseCreateModal = React.useCallback(() => {
    setIsCreateModalOpen(false);
    setNewListName("");
  }, []);

  const handleOpenCreateModal = () => {
    setNewListName(defaultNewListName());
    setNewListFormKey((k) => k + 1);
    setIsCreateModalOpen(true);
  };

  const handleCloseQuickMasterModal = React.useCallback(() => {
    setIsQuickMasterModalOpen(false);
    setQuickMasterId(null);
    setQuickMasterListName("");
  }, []);

  const handleStartFromMaster = React.useCallback((masterId: string) => {
    setQuickMasterId(masterId);
    setQuickMasterListName(defaultNewListName());
    setIsQuickMasterModalOpen(true);
  }, []);

  const handleQuickMasterSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!quickMasterId) return;
      const name = quickMasterListName.trim();
      if (!name) return;
      router.push(
        `/nieuw-lijstje/selecteer-master-lijstje/${encodeURIComponent(
          quickMasterId,
        )}/items?naam=${encodeURIComponent(name)}`,
      );
      handleCloseQuickMasterModal();
    },
    [handleCloseQuickMasterModal, quickMasterId, quickMasterListName, router],
  );

  const handleNewListFormSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user) return;
      const fd = new FormData(event.currentTarget);
      const name = String(fd.get("newListName") ?? "").trim();
      if (!name) return;
      const rawKind = fd.get("newListKind");
      const kind: NewListKind =
        rawKind === "from_master" || rawKind === "master" || rawKind === "blank"
          ? rawKind
          : "blank";

      if (kind === "from_master") {
        router.push(
          `/nieuw-lijstje/selecteer-master-lijstje?naam=${encodeURIComponent(
            name,
          )}`,
        );
        handleCloseCreateModal();
        return;
      }
      if (kind === "master") {
        router.push(
          `/nieuw-lijstje/selecteer-winkel?naam=${encodeURIComponent(name)}`,
        );
        handleCloseCreateModal();
        return;
      }

      const listName = name;
      const icon = getIconForNewList(lists);
      const now = new Date();
      const newId = iid();
      db.transact(
        db.tx.lists[newId].update({
          name: listName,
          date: now.toLocaleDateString("nl-NL"),
          icon,
          order:
            lists.length > 0 ? Math.min(...lists.map((l) => l.order)) - 1 : 0,
          ownerId: user.id,
          isMasterTemplate: false,
        }),
      );
      setAddingId(newId);
      handleCloseCreateModal();
    },
    [user, lists, router, handleCloseCreateModal],
  );

  const handleReorderLists = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const oldIndex = lists.findIndex((l) => l.id === active.id);
      const newIndex = lists.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(lists, oldIndex, newIndex);
      const txns = reordered.map((l, i) =>
        db.tx.lists[l.id].update({ order: i }),
      );
      db.transact(txns);
    },
    [lists],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (authLoading || !user || isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-base text-[var(--error-600)]">
          Er ging iets mis: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-[16px]">
      {/* Content area */}
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          {hasLists && (
            <div className="mb-6 flex items-center gap-4">
              <h1 className="flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
                Mijn lijstjes
              </h1>
              <EditButton
                variant={isEditMode ? "active" : "inactive"}
                onClick={handleToggleEdit}
              />
            </div>
          )}

          {/* Empty state */}
          {!hasLists ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="relative size-24 overflow-hidden">
                <Image
                  src="/images/ui/food/icon_apple.png"
                  alt=""
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <p className="text-center text-base font-medium leading-24 tracking-normal text-gray-500">
                Je hebt nog geen lijstjes
              </p>
              <MiniButton variant="primary" onClick={handleOpenCreateModal}>
                Voeg lijstje toe
              </MiniButton>
            </div>
          ) : (
            /* List cards – sortable in edit mode */
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleReorderLists}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={lists.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <SortableListItems
                  lists={lists}
                  isEditMode={isEditMode}
                  removingId={removingId}
                  addingId={addingId}
                  addingIdExpanded={addingIdExpanded}
                  onDelete={handleDeleteList}
                  onStartFromMaster={handleStartFromMaster}
                />
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Slide-in: Nieuw lijstje (472:2235, 772:3065); master → fullscreen winkelkeuze (794:3317) */}
      <SlideInModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Nieuw lijstje"
        footer={
          <Button
            type="submit"
            form={HOME_NEW_LIST_FORM_ID}
            variant="primary"
            disabled={!newListName.trim()}
          >
            Bewaren
          </Button>
        }
      >
        <form
          id={HOME_NEW_LIST_FORM_ID}
          key={newListFormKey}
          onSubmit={handleNewListFormSubmit}
          className="flex w-full flex-col items-center gap-8"
        >
          <InputField
            label="Naam lijstje"
            placeholder="Naam lijstje"
            name="newListName"
            value={newListName}
            autoComplete="off"
            onChange={(e) => setNewListName(e.target.value)}
            onFocus={selectListNameInputOnFocus}
          />
          <div
            role="radiogroup"
            aria-label="Soort lijstje"
            className="flex w-full flex-col gap-4"
          >
            <NewListKindFormOption
              value="blank"
              defaultChecked
              title="Lijstje"
              subtitle="Nieuw blanco lijstje"
            />
            <NewListKindFormOption
              value="from_master"
              title="Lijstje van master lijstje"
              subtitle="Vertrek van bestaand master lijstje (geen winkel kiezen)"
              icon={<IconPrimaryMask src="/icons/list-from-master-list.svg" />}
            />
            <NewListKindFormOption
              value="master"
              title="Master lijstje"
              subtitle="Nieuwe template: eerst winkel kiezen"
              icon={<IconPrimaryMask src="/icons/master-list.svg" />}
            />
          </div>
        </form>
      </SlideInModal>

      <SlideInModal
        open={isQuickMasterModalOpen}
        onClose={handleCloseQuickMasterModal}
        title="Naam lijstje"
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

      {/* Snackbar – positioned above bottom nav */}
      {snackbarMessage && (
        <div className="fixed inset-x-0 bottom-[calc(183px+env(safe-area-inset-bottom,0px))] z-30 flex justify-center px-2">
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDelete}
          />
        </div>
      )}

      <AppBottomNav
        active="lijstjes"
        profileAvatarUrl={profileAvatarUrl}
        profileFirstName={profileFirstName}
      />

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-20",
          APP_FAB_BOTTOM_CLASS,
        )}
      >
        <div className="px-[16px]">
          <div className="mx-auto flex w-full max-w-[956px] justify-end">
            <FloatingActionButton
              aria-label="Nieuw lijstje"
              className="pointer-events-auto"
              onClick={handleOpenCreateModal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
