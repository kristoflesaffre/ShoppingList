"use client";

import * as React from "react";
import Image from "next/image";
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
import { RadioSelectTile } from "@/components/ui/radio_select_tile";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { AppBottomNav } from "@/components/app_bottom_nav";

type ListMembershipRow = { id?: string; instantUserId?: string };

/** Soort nieuw lijstje in create-modal (Figma 772:3065); bewaren gebruikt nu alleen `blank` in de DB. */
type NewListKind = "blank" | "from_master" | "master";

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
  /** Figma 762:3452: toon “gedeeld met …” op de kaart. */
  displayVariant: "default" | "shared";
  /** Voornaam van de andere partij (deelnemer of eigenaar); null = ListCard toont “deelnemer”. */
  sharedWithFirstName: string | null;
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
  onOpenList,
}: {
  lists: HomeList[];
  isEditMode: boolean;
  removingId: string | null;
  addingId: string | null;
  addingIdExpanded: boolean;
  onDelete: (id: string) => void;
  onOpenList: (id: string) => void;
}) {
  const { active } = useDndContext();
  const isDndActive = active != null;

  return (
    <div className="flex flex-col">
      {lists.map((list, index) => {
        const isRemoving = removingId === list.id;
        const isAdding = addingId === list.id;
        const isAddingCollapsed = isAdding && !addingIdExpanded;
        const isAnimating = isRemoving || isAddingCollapsed;

        const wrapperClass = isDndActive
          ? cn(index < lists.length - 1 ? "mb-3" : "mb-0")
          : cn(
              "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
              isAnimating ? "max-h-0 opacity-0 mb-0" : "max-h-[200px] opacity-100",
              !isAnimating && (index < lists.length - 1 ? "mb-3" : "mb-0")
            );

        return (
          <div key={list.id} className={wrapperClass}>
            <SortableListCard
              list={list}
              isEditMode={isEditMode}
              onDelete={() => onDelete(list.id)}
              onOpenList={() => onOpenList(list.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

function SortableListCard({
  list,
  isEditMode,
  onDelete,
  onOpenList,
}: {
  list: HomeList;
  isEditMode: boolean;
  onDelete: () => void;
  onOpenList: () => void;
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
        <ListCard
          listName={list.name}
          date={list.date}
          itemCount={itemCountLabel(list.items?.length ?? 0)}
          displayVariant={list.displayVariant}
          sharedWithFirstName={
            list.sharedWithFirstName ?? undefined
          }
          icon={
            <Image
              src={list.icon}
              alt=""
              width={48}
              height={48}
              className="object-contain"
            />
          }
          state={isEditMode ? "editable" : "default"}
          onDelete={isEditMode && list.isOwner ? onDelete : undefined}
          onReorder={undefined}
          dragHandleProps={isEditMode ? { ...attributes, ...listeners } : undefined}
          onClick={!isEditMode ? onOpenList : undefined}
          className={cn(!isEditMode && "cursor-pointer")}
        />
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
      const memberIds = ((l.memberships ?? []) as ListMembershipRow[])
        .map((m) => m.instantUserId)
        .filter((id): id is string => !!id && id !== user?.id);
      const hasOtherMembers = memberIds.length > 0;
      const primaryOtherId = memberIds[0];
      const sharedName =
        primaryOtherId != null
          ? shareFirstNameByUserId.get(primaryOtherId) ?? null
          : null;
      return {
        id: l.id,
        name: l.name,
        date: l.date,
        icon: l.icon,
        order: l.order,
        items: l.items ?? [],
        isOwner: true,
        membershipIds: (l.memberships ?? []).map((m) => m.id),
        displayVariant: hasOtherMembers ? "shared" : "default",
        sharedWithFirstName: hasOtherMembers ? sharedName : null,
      };
    });

    const shared: HomeList[] = (data?.listMembers ?? [])
      .map((row) => row.list)
      .filter(
        (l): l is NonNullable<typeof l> =>
          l != null && typeof l === "object" && "id" in l,
      )
      .map((l) => {
        const ownerId =
          "ownerId" in l && typeof l.ownerId === "string"
            ? l.ownerId
            : undefined;
        const ownerFirst =
          ownerId != null
            ? shareFirstNameByUserId.get(ownerId) ?? null
            : null;
        return {
          id: l.id,
          name: l.name,
          date: l.date,
          icon: l.icon,
          order: l.order,
          items: l.items ?? [],
          isOwner: false,
          displayVariant: "shared" as const,
          sharedWithFirstName: ownerFirst,
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
  const [newListKind, setNewListKind] = React.useState<NewListKind>("blank");
  const [lastDeleted, setLastDeleted] = React.useState<{
    listId: string;
    listName: string;
    order: number;
    icon: string;
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
      }),
    );
    setLastDeleted(null);
    setSnackbarMessage(null);
    setAddingId(lastDeleted.listId);
  }, [lastDeleted, user]);

  const handleOpenCreateModal = () => {
    setNewListName("");
    setNewListKind("blank");
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewListName("");
    setNewListKind("blank");
  };

  const handleSaveNewList = React.useCallback(() => {
    if (!user) return;
    const name = newListName.trim();
    if (!name) return;

    if (newListKind === "master") {
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
        order: lists.length > 0 ? Math.min(...lists.map((l) => l.order)) - 1 : 0,
        ownerId: user.id,
      }),
    );
    setAddingId(newId);
    handleCloseCreateModal();
  }, [newListName, newListKind, lists, user, router]);

  const handleOpenList = (listId: string) => {
    router.push(`/lijstje/${listId}`);
  };

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
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-base text-text-secondary">Laden…</p>
      </div>
    );
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
      <div className="flex flex-1 flex-col pb-[96px] pt-[calc(52px+env(safe-area-inset-top,0px))]">
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
                  onOpenList={handleOpenList}
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
        compact
        footer={
          <Button
            variant="primary"
            onClick={handleSaveNewList}
            disabled={!newListName.trim()}
          >
            Bewaren
          </Button>
        }
      >
        <div className="flex w-full flex-col items-center gap-8">
          <InputField
            label="Naam lijstje"
            placeholder="Naam lijstje"
            value={newListName}
            autoComplete="off"
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (newListName.trim()) handleSaveNewList();
            }}
          />
          <div
            role="radiogroup"
            aria-label="Soort lijstje"
            className="flex w-full flex-col gap-4"
          >
            <RadioSelectTile
              role="radio"
              aria-checked={newListKind === "blank"}
              tabIndex={0}
              variant={newListKind === "blank" ? "selected" : "unselected"}
              title="Lijstje"
              subtitle="Nieuw blanco lijstje"
              onClick={() => setNewListKind("blank")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setNewListKind("blank");
                }
              }}
              className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            />
            <RadioSelectTile
              role="radio"
              aria-checked={newListKind === "from_master"}
              tabIndex={0}
              variant={
                newListKind === "from_master" ? "selected" : "unselected"
              }
              title="Lijstje van master lijstje"
              subtitle="Vertrek van bestaand master lijstje"
              icon={<IconPrimaryMask src="/icons/list-from-master-list.svg" />}
              onClick={() => setNewListKind("from_master")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setNewListKind("from_master");
                }
              }}
              className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            />
            <RadioSelectTile
              role="radio"
              aria-checked={newListKind === "master"}
              tabIndex={0}
              variant={newListKind === "master" ? "selected" : "unselected"}
              title="Master lijstje"
              subtitle="Template lijstje voor een winkel"
              icon={<IconPrimaryMask src="/icons/master-list.svg" />}
              onClick={() => setNewListKind("master")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setNewListKind("master");
                }
              }}
              className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </SlideInModal>

      {/* Snackbar – positioned above bottom nav */}
      {snackbarMessage && (
        <div className="fixed inset-x-0 bottom-[96px] z-10 flex justify-center px-2">
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
        onLijstjes={() => router.push("/")}
        onProfiel={() => router.push("/profiel")}
        onFabClick={handleOpenCreateModal}
      />
    </div>
  );
}
