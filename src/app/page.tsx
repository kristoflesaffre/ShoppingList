"use client";

import * as React from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
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
import { ListCard } from "@/components/ui/list_card";
import { EditButton } from "@/components/ui/edit_button";
import { MiniButton } from "@/components/ui/mini_button";
import { Snackbar } from "@/components/ui/snackbar";
import { cn } from "@/lib/utils";

type HomeList = {
  id: string;
  name: string;
  date: string;
  itemCount: string;
  icon: string;
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

function getRandomFoodIcon() {
  return FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];
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
      <ListCard
        listName={list.name}
        date={list.date}
        itemCount={list.itemCount}
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
    </div>
  );
}

export default function Home() {
  const [lists, setLists] = React.useState<HomeList[]>([
    {
      id: "weeklijstje",
      name: "Weeklijstje",
      date: "25-04-2026",
      itemCount: "6 items",
      icon: "/images/ui/food/icon_apple.png",
    },
    {
      id: "feestje",
      name: "Weeklijstje",
      date: "18-04-2026",
      itemCount: "17 items",
      icon: "/images/ui/food/icon_banana.png",
    },
    {
      id: "derde",
      name: "Weeklijstje",
      date: "11-04-2026",
      itemCount: "21 items",
      icon: "/images/ui/food/icon_carrot.png",
    },
  ]);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [lastDeleted, setLastDeleted] = React.useState<{
    list: HomeList;
    index: number;
  } | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(
    null,
  );

  const hasLists = lists.length > 0;

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

  const handleDeleteList = (id: string) => {
    setLists((current) => {
      const index = current.findIndex((list) => list.id === id);
      if (index === -1) return current;
      const list = current[index];
      const next = [...current];
      next.splice(index, 1);
      setLastDeleted({ list, index });
      setSnackbarMessage(`'${list.name}' verwijderd`);
      return next;
    });
  };

  const handleUndoDelete = () => {
    if (!lastDeleted) return;
    setLists((current) => {
      const next = [...current];
      next.splice(lastDeleted.index, 0, lastDeleted.list);
      return next;
    });
    setLastDeleted(null);
    setSnackbarMessage(null);
  };

  const handleCreateList = () => {
    const now = new Date();
    const id = `lijst-${now.getTime()}`;
    setLists((current) => [
      ...current,
      {
        id,
        name: "Nieuw lijstje",
        date: now.toLocaleDateString("nl-NL"),
        itemCount: "0 items",
        icon: getRandomFoodIcon(),
      },
    ]);
  };

  const handleOpenList = (id: string) => {
    void id;
  };

  const handleReorderLists = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over == null || active.id === over.id) return;
    setLists((current) => {
      const oldIndex = current.findIndex((l) => l.id === active.id);
      const newIndex = current.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

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

  return (
    <div className="relative flex min-h-screen w-full flex-col px-[16px]">
      {/* Content area – 16px from viewport (parent px), responsive width */}
      <div className="flex flex-1 flex-col pb-[120px] pt-[86px]">
          {/* Header: title + edit button – alleen tonen als er lijstjes zijn (Figma 119-512) */}
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
              <MiniButton variant="primary" onClick={handleCreateList}>
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
                <div className="flex flex-col gap-3">
                  {lists.map((list) => (
                    <SortableListCard
                      key={list.id}
                      list={list}
                      isEditMode={isEditMode}
                      onDelete={() => handleDeleteList(list.id)}
                      onOpenList={() => handleOpenList(list.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
      </div>

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

            {/* Right tab – Profiel (inactive) */}
            <button
              type="button"
              className="flex flex-col items-center gap-3 shrink-0 w-[41px] text-[var(--blue-300)]"
            >
              <AvatarIcon className="size-6" />
              <span className="text-xs leading-4 font-normal tracking-normal">
                Profiel
              </span>
            </button>

            {/* FAB – Figma: 84×84, top -28px, border-6 blue-200, bg blue-500 */}
            <button
              type="button"
              onClick={handleCreateList}
              aria-label="Nieuw lijstje"
              className="absolute left-1/2 top-[-28px] -translate-x-1/2 flex size-[84px] items-center justify-center rounded-full border-[6px] border-[var(--blue-200)] bg-[var(--blue-500)] text-white shadow-[var(--shadow-drop)] transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <PlusIcon className="size-6" />
            </button>
          </nav>
      </div>
    </div>
  );
}
