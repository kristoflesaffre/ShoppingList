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
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";

type HomeList = {
  id: string;
  name: string;
  date: string;
  icon: string;
  order: number;
  items?: { id: string }[];
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

/** List icon – public/icons/list.svg */
function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.19998 2.1H2.59998C2.32398 2.1 2.09998 2.324 2.09998 2.6V9.16C2.09998 9.436 2.32398 9.66 2.59998 9.66H9.19998C9.47598 9.66 9.69998 9.436 9.69998 9.16V2.6C9.69998 2.323 9.47698 2.1 9.19998 2.1ZM8.69998 8.66H3.09998V3.1H8.69998V8.66ZM9.19998 14.3H2.59998C2.32398 14.3 2.09998 14.524 2.09998 14.8V21.36C2.09998 21.636 2.32398 21.86 2.59998 21.86H9.19998C9.47598 21.86 9.69998 21.636 9.69998 21.36V14.8C9.69998 14.523 9.47698 14.3 9.19998 14.3ZM8.69998 20.859H3.09998V15.3H8.69998V20.859ZM13.4 3.6C13.4 3.324 13.624 3.1 13.9 3.1H21.4C21.676 3.1 21.9 3.324 21.9 3.6C21.9 3.876 21.676 4.1 21.4 4.1H13.9C13.624 4.1 13.4 3.876 13.4 3.6ZM21.9 8.3C21.9 8.576 21.676 8.8 21.4 8.8H13.9C13.624 8.8 13.4 8.576 13.4 8.3C13.4 8.024 13.624 7.8 13.9 7.8H21.4C21.677 7.8 21.9 8.023 21.9 8.3ZM21.9 15.7C21.9 15.976 21.676 16.2 21.4 16.2H13.9C13.624 16.2 13.4 15.976 13.4 15.7C13.4 15.424 13.624 15.2 13.9 15.2H21.4C21.677 16.2 21.9 15.424 21.9 15.7ZM21.9 20.399C21.9 20.675 21.676 20.899 21.4 20.899H13.9C13.624 20.899 13.4 20.675 13.4 20.399C13.4 20.123 13.624 19.899 13.9 19.899H21.4C21.677 19.899 21.9 20.123 21.9 20.399Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Avatar icon – public/icons/avatar.svg */
function AvatarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.41 11.6263C14.7921 11.6263 16.7231 9.69525 16.7231 7.31316C16.7231 4.93107 14.7921 3 12.41 3C10.0279 3 8.0968 4.93107 8.0968 7.31316C8.0968 9.69525 10.0279 11.6263 12.41 11.6263Z" />
      <path d="M19.82 20.2526C19.82 16.9143 16.4989 14.2142 12.41 14.2142C8.32113 14.2142 5 16.9143 5 20.2526" />
    </svg>
  );
}

/** Plus icon – public/icons/plus.svg */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1C12.5523 1 13 1.44772 13 2V11H22C22.5523 11 23 11.4477 23 12C23 12.5523 22.5523 13 22 13H13V22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22V13H2C1.44772 13 1 12.5523 1 12C1 11.4477 1.44772 11 2 11H11V2C11 1.44772 11.4477 1 12 1Z"
        fill="currentColor"
      />
    </svg>
  );
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
        onDelete={!isEditMode ? onDelete : undefined}
        deleteActionLabel="Lijstje verwijderen"
      >
        <ListCard
          listName={list.name}
          date={list.date}
          itemCount={itemCountLabel(list.items?.length ?? 0)}
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
          onDelete={isEditMode ? onDelete : undefined}
          onReorder={undefined}
          dragHandleProps={isEditMode ? { ...attributes, ...listeners } : undefined}
          onClick={!isEditMode ? onOpenList : undefined}
          className={cn(!isEditMode && "cursor-pointer")}
        />
      </SwipeToDelete>
    </div>
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
      $: { where: { ownerId } },
    },
    profiles: {
      $: { where: { instantUserId: ownerId } },
    },
  });

  const profileAvatarUrl = data?.profiles?.[0]?.avatarUrl ?? null;

  const lists: HomeList[] = React.useMemo(() => {
    if (!data?.lists) return [];
    return [...data.lists]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((l) => ({
        ...l,
        items: l.items ?? [],
      }));
  }, [data]);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
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
        if (!list) return;
        const itemIds = (list.items ?? []).map((i) => i.id);
        db.transact([
          ...itemIds.map((itemId) => db.tx.items[itemId].delete()),
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
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewListName("");
  };

  const handleSaveNewList = React.useCallback(() => {
    if (!user) return;
    const name = newListName.trim() || "Nieuw lijstje";
    const now = new Date();
    const newId = iid();
    db.transact(
      db.tx.lists[newId].update({
        name,
        date: now.toLocaleDateString("nl-NL"),
        icon: getIconForNewList(lists),
        order: lists.length > 0 ? Math.min(...lists.map((l) => l.order)) - 1 : 0,
        ownerId: user.id,
      }),
    );
    setAddingId(newId);
    handleCloseCreateModal();
  }, [newListName, lists, user]);

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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-base text-text-secondary">Laden…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-base text-[var(--error-600)]">
          Er ging iets mis: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col px-[16px]">
      {/* Content area */}
      <div className="flex flex-1 flex-col pb-[120px] pt-[86px]">
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

      {/* Slide-in modal – Nieuw lijstje (Figma 472:2235) */}
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
        <div className="flex flex-col items-center gap-8">
          <InputField
            label="Naam lijstje"
            placeholder="Naam lijstje"
            value={newListName}
            autoComplete="off"
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newListName.trim()) handleSaveNewList();
            }}
          />
        </div>
      </SlideInModal>

      {/* Snackbar – positioned above bottom nav */}
      {snackbarMessage && (
        <div className="fixed inset-x-0 bottom-[120px] z-10 flex justify-center px-2">
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDelete}
          />
        </div>
      )}

      {/* Bottom navigation – Figma 672:2703, fixed to viewport bottom */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[30px] bg-white pt-3 pb-[33px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.13)]">
          <nav className="relative mx-auto flex h-12 w-full max-w-[390px] items-center justify-center gap-[149px] px-6">
            {/* Left tab – Lijstjes (active) */}
            <button
              type="button"
              className="flex flex-col items-center gap-3 shrink-0 w-[41px] text-[var(--blue-500)]"
            >
              <ListIcon className="size-6" />
              <span className="text-xs leading-4 font-normal tracking-normal">
                Lijstjes
              </span>
            </button>

            {/* Right tab – Profiel (inactive); Figma 740:4262: ronde profielfoto indien opgeladen */}
            <button
              type="button"
              aria-label="Profiel"
              className="flex flex-col items-center gap-3 shrink-0 w-[41px] text-[var(--blue-300)]"
            >
              <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-[var(--gray-100)] ring-1 ring-[var(--gray-100)]">
                {profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB-profiel
                  <img
                    src={profileAvatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    className="size-full object-cover"
                  />
                ) : (
                  <AvatarIcon className="size-6 text-[var(--blue-300)]" />
                )}
              </span>
              <span className="text-xs leading-4 font-normal tracking-normal">
                Profiel
              </span>
            </button>

            {/* FAB – Figma: 84×84, top -28px, border-6 blue-200, bg blue-500. Active: border compresses for press effect. */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              aria-label="Nieuw lijstje"
              className="absolute left-1/2 top-[-28px] -translate-x-1/2 flex size-[84px] items-center justify-center rounded-full border-[6px] border-[var(--blue-200)] bg-[var(--blue-500)] text-white shadow-[var(--shadow-drop)] transition-[border-width,color] duration-150 ease-out hover:bg-[var(--blue-600)] active:border-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <PlusIcon className="size-6" />
            </button>
          </nav>
      </div>
    </div>
  );
}
