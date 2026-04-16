"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDndContext } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListSectionHeader } from "@/components/list_section_header";
import { ListCard } from "@/components/ui/list_card";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { cn } from "@/lib/utils";
import { homeListCardIconSrc } from "@/lib/list-product-icons";

export type HomeOverviewList = {
  id: string;
  name: string;
  date: string;
  icon: string;
  order: number;
  items?: { id: string }[];
  isOwner: boolean;
  membershipIds?: string[];
  displayVariant: "default" | "shared" | "master" | "from-master";
  sharedWithFirstName: string | null;
  storeLogos: string[];
  isMasterTemplate: boolean;
};

function itemCountLabel(count: number): string {
  return count === 1 ? "1 product" : `${count} producten`;
}

function favoriteCountLabel(count: number): string {
  return count === 1 ? "1 favoriet" : `${count} favorieten`;
}

/** `edit`: geen navigatie op de kaart (alleen slepen/verwijderen). `manage`: zelfde chrome + tap opent lijst. */
export type HomeListCardInteractionMode = "edit" | "manage";

function SortableListCard({
  list,
  interactionMode,
  onDelete,
  onStartFromMaster,
}: {
  list: HomeOverviewList;
  interactionMode: HomeListCardInteractionMode;
  onDelete: () => void;
  onStartFromMaster: () => void;
}) {
  const router = useRouter();
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

  const isEditableChrome = true;

  const card = (
    <ListCard
      listName={list.name}
      itemCount={
        list.displayVariant === "master"
          ? favoriteCountLabel(list.items?.length ?? 0)
          : itemCountLabel(list.items?.length ?? 0)
      }
      displayVariant={list.displayVariant}
      storeLogos={list.storeLogos}
      sharedWithFirstName={list.sharedWithFirstName ?? undefined}
      icon={
        // eslint-disable-next-line @next/next/no-img-element -- lokale webp
        <img
          src={homeListCardIconSrc(list)}
          alt=""
          width={48}
          height={48}
          decoding="async"
          className="object-contain"
        />
      }
      state={isEditableChrome ? "editable" : "default"}
      onDelete={list.isOwner ? onDelete : undefined}
      onReorder={undefined}
      onMasterAdd={
        list.displayVariant === "master" ? onStartFromMaster : undefined
      }
      dragHandleProps={{ ...attributes, ...listeners }}
      className={cn(interactionMode === "manage" && "cursor-pointer")}
    />
  );

  const swipeOnDelete =
    interactionMode === "manage" && list.isOwner ? onDelete : undefined;

  const wrapped =
    interactionMode === "manage" ? (
      list.displayVariant === "master" ? (
        <div
          role="link"
          tabIndex={0}
          className="block w-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
          onClick={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest("button")) return;
            router.push(`/lijstje/${list.id}`);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const t = e.target as HTMLElement;
              if (t.closest("button")) return;
              e.preventDefault();
              router.push(`/lijstje/${list.id}`);
            }
          }}
        >
          <SwipeToDelete
            onDelete={swipeOnDelete}
            deleteActionLabel="Lijstje verwijderen"
          >
            {card}
          </SwipeToDelete>
        </div>
      ) : (
        <SwipeToDelete
          onDelete={swipeOnDelete}
          deleteActionLabel="Lijstje verwijderen"
        >
          <Link href={`/lijstje/${list.id}`} className="block no-underline">
            {card}
          </Link>
        </SwipeToDelete>
      )
    ) : (
      <SwipeToDelete onDelete={undefined} deleteActionLabel="Lijstje verwijderen">
        {card}
      </SwipeToDelete>
    );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]",
      )}
    >
      {wrapped}
    </div>
  );
}

/** Standaardweergave (Figma 1148:8952): tegels onder elkaar, geen sleep-/edit-chrome. */
function StaticDisplayListRow({
  list,
  onDelete,
  onStartFromMaster,
}: {
  list: HomeOverviewList;
  onDelete: () => void;
  onStartFromMaster: () => void;
}) {
  const router = useRouter();

  const card = (
    <ListCard
      listName={list.name}
      itemCount={
        list.displayVariant === "master"
          ? favoriteCountLabel(list.items?.length ?? 0)
          : itemCountLabel(list.items?.length ?? 0)
      }
      displayVariant={list.displayVariant}
      storeLogos={list.storeLogos}
      sharedWithFirstName={list.sharedWithFirstName ?? undefined}
      icon={
        // eslint-disable-next-line @next/next/no-img-element -- lokale webp
        <img
          src={homeListCardIconSrc(list)}
          alt=""
          width={48}
          height={48}
          decoding="async"
          className="object-contain"
        />
      }
      state="default"
      onMasterAdd={
        list.displayVariant === "master" ? onStartFromMaster : undefined
      }
      className="cursor-pointer"
    />
  );

  const swipeOnDelete = list.isOwner ? onDelete : undefined;

  const wrapped =
    list.displayVariant === "master" ? (
      <div
        role="link"
        tabIndex={0}
        className="block w-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest("button")) return;
          router.push(`/lijstje/${list.id}`);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            const t = e.target as HTMLElement;
            if (t.closest("button")) return;
            e.preventDefault();
            router.push(`/lijstje/${list.id}`);
          }
        }}
      >
        <SwipeToDelete
          onDelete={swipeOnDelete}
          deleteActionLabel="Lijstje verwijderen"
        >
          {card}
        </SwipeToDelete>
      </div>
    ) : (
      <SwipeToDelete
        onDelete={swipeOnDelete}
        deleteActionLabel="Lijstje verwijderen"
      >
        <Link href={`/lijstje/${list.id}`} className="block no-underline">
          {card}
        </Link>
      </SwipeToDelete>
    );

  return <div>{wrapped}</div>;
}

/** Zelfde sectie-opbouw als `SortableHomeListSections`, zonder dnd-kit (alleen weergave + tap/swipe). */
export function StaticStackedHomeListSections({
  lists,
  removingId,
  addingId,
  addingIdExpanded,
  onDelete,
  onStartFromMaster,
  beherenSingleSection,
}: {
  lists: HomeOverviewList[];
  removingId: string | null;
  addingId: string | null;
  addingIdExpanded: boolean;
  onDelete: (id: string) => void;
  onStartFromMaster: (id: string) => void;
  beherenSingleSection?: "lijstjes" | "favorieten";
}) {
  const normalLists = lists.filter((l) => l.displayVariant !== "master");
  const masterLists = lists.filter((l) => l.displayVariant === "master");
  const visibleNormalLists = normalLists;
  const visibleMasterLists = masterLists;
  const showSectionHeaders = beherenSingleSection == null;

  return (
    <div className="flex flex-col">
      {normalLists.length > 0 ? (
        <div className="flex flex-col">
          {showSectionHeaders ? (
            <ListSectionHeader
              icon="list"
              label="Lijstjes"
              showNaarOverzicht={false}
            />
          ) : null}
          <div className={cn("flex flex-col", showSectionHeaders && "mt-4")}>
            {visibleNormalLists.map((list, index) => {
              const isRemoving = removingId === list.id;
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              const isAnimating = isRemoving || isAddingCollapsed;

              const wrapperClass = cn(
                "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                isAnimating
                  ? "mb-0 max-h-0 opacity-0"
                  : "max-h-[200px] opacity-100",
                !isAnimating &&
                  (index < visibleNormalLists.length - 1 ? "mb-3" : "mb-0"),
              );

              return (
                <div key={list.id} className={wrapperClass}>
                  <StaticDisplayListRow
                    list={list}
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
          {showSectionHeaders ? (
            <ListSectionHeader
              icon="heart"
              label="Favorieten lijstjes"
              showNaarOverzicht={false}
            />
          ) : null}
          <div className={cn("flex flex-col", showSectionHeaders && "mt-4")}>
            {visibleMasterLists.map((list, index) => {
              const isRemoving = removingId === list.id;
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              const isAnimating = isRemoving || isAddingCollapsed;

              const wrapperClass = cn(
                "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                isAnimating
                  ? "mb-0 max-h-0 opacity-0"
                  : "max-h-[200px] opacity-100",
                !isAnimating &&
                  (index < visibleMasterLists.length - 1 ? "mb-3" : "mb-0"),
              );

              return (
                <div key={list.id} className={wrapperClass}>
                  <StaticDisplayListRow
                    list={list}
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

export function SortableHomeListSections({
  lists,
  interactionMode,
  removingId,
  addingId,
  addingIdExpanded,
  onDelete,
  onStartFromMaster,
  beherenSingleSection,
}: {
  lists: HomeOverviewList[];
  interactionMode: HomeListCardInteractionMode;
  removingId: string | null;
  addingId: string | null;
  addingIdExpanded: boolean;
  onDelete: (id: string) => void;
  onStartFromMaster: (id: string) => void;
  /** Alleen kaarten (geen sectiekop): beheren-pagina met één sectie. */
  beherenSingleSection?: "lijstjes" | "favorieten";
}) {
  const { active } = useDndContext();
  const isDndActive = active != null;

  const normalLists = lists.filter((l) => l.displayVariant !== "master");
  const masterLists = lists.filter((l) => l.displayVariant === "master");
  const visibleNormalLists = normalLists;
  const visibleMasterLists = masterLists;
  const showSectionHeaders = beherenSingleSection == null;

  return (
    <div className="flex flex-col">
      {normalLists.length > 0 ? (
        <div className="flex flex-col">
          {showSectionHeaders ? (
            <ListSectionHeader
              icon="list"
              label="Lijstjes"
              showNaarOverzicht={false}
            />
          ) : null}
          <div className={cn("flex flex-col", showSectionHeaders && "mt-4")}>
            {visibleNormalLists.map((list, index) => {
              const isRemoving = removingId === list.id;
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              const isAnimating = isRemoving || isAddingCollapsed;

              const wrapperClass = isDndActive
                ? cn(
                    index < visibleNormalLists.length - 1 ? "mb-3" : "mb-0",
                  )
                : cn(
                    "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                    isAnimating
                      ? "mb-0 max-h-0 opacity-0"
                      : "max-h-[200px] opacity-100",
                    !isAnimating &&
                      (index < visibleNormalLists.length - 1
                        ? "mb-3"
                        : "mb-0"),
                  );

              return (
                <div key={list.id} className={wrapperClass}>
                  <SortableListCard
                    list={list}
                    interactionMode={interactionMode}
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
          {showSectionHeaders ? (
            <ListSectionHeader
              icon="heart"
              label="Favorieten lijstjes"
              showNaarOverzicht={false}
            />
          ) : null}
          <div className={cn("flex flex-col", showSectionHeaders && "mt-4")}>
            {visibleMasterLists.map((list, index) => {
              const isRemoving = removingId === list.id;
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              const isAnimating = isRemoving || isAddingCollapsed;

              const wrapperClass = isDndActive
                ? cn(
                    index < visibleMasterLists.length - 1 ? "mb-3" : "mb-0",
                  )
                : cn(
                    "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                    isAnimating
                      ? "mb-0 max-h-0 opacity-0"
                      : "max-h-[200px] opacity-100",
                    !isAnimating &&
                      (index < visibleMasterLists.length - 1
                        ? "mb-3"
                        : "mb-0"),
                  );

              return (
                <div key={list.id} className={wrapperClass}>
                  <SortableListCard
                    list={list}
                    interactionMode={interactionMode}
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
