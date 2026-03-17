"use client";

import * as React from "react";
import Image from "next/image";
import { ListCard } from "@/components/ui/list_card";
import { EditButton } from "@/components/ui/edit_button";
import { MiniButton } from "@/components/ui/mini_button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { Snackbar } from "@/components/ui/snackbar";

type HomeList = {
  id: string;
  name: string;
  date: string;
  itemCount: string;
  icon: string;
};

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
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <line x1="3" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="19" x2="10" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="19" x2="21" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
      <path d="M20.59 22c0-3.87-3.85-7-8.59-7s-8.59 3.13-8.59 7" />
    </svg>
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
        icon: "/images/ui/food/icon_apple.png",
      },
    ]);
  };

  const handleOpenList = (id: string) => {
    void id;
  };

  return (
    <div className="flex min-h-screen w-full flex-col px-[16px]">
      <div className="relative flex w-full flex-col overflow-hidden">
        {/* Content area – 16px from viewport (parent px), responsive width */}
        <div className="flex flex-1 flex-col pb-[120px] pt-[86px]">
          {/* Header: title + edit button */}
          <div className="mb-6 flex items-center gap-4">
            <h1 className="flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Mijn lijstjes
            </h1>
            <EditButton
              variant={isEditMode ? "active" : "inactive"}
              onClick={handleToggleEdit}
            />
          </div>

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
            /* List cards */
            <div className="flex flex-col gap-3">
              {lists.map((list) => (
                <ListCard
                  key={list.id}
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
                  onDelete={
                    isEditMode ? () => handleDeleteList(list.id) : undefined
                  }
                  onReorder={isEditMode ? () => undefined : undefined}
                  onClick={
                    !isEditMode ? () => handleOpenList(list.id) : undefined
                  }
                  className={!isEditMode ? "cursor-pointer" : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Snackbar – positioned above bottom nav */}
        {snackbarMessage && (
          <div className="absolute inset-x-0 bottom-[120px] z-10 flex justify-center px-2">
            <Snackbar
              message={snackbarMessage}
              actionLabel="Zet terug"
              onAction={handleUndoDelete}
            />
          </div>
        )}

        {/* Bottom navigation – fixed to bottom of the phone frame */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-start rounded-t-[32px] bg-white shadow-[0px_-1px_4px_0px_rgba(12,12,13,0.1),0px_-1px_4px_0px_rgba(12,12,13,0.05)]">
          <nav className="relative flex h-[75px] w-full items-start justify-between rounded-t-[32px] bg-white px-[25px]">
            {/* Left tab – Lijstjes (active) */}
            <div className="flex w-[148px] items-start">
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-3 px-[15px] py-[12.5px] text-[#386bf6]"
              >
                <ListIcon className="size-6" />
                <span className="text-xs leading-none">Lijstjes</span>
              </button>
            </div>

            {/* Right tab – Profiel (inactive) */}
            <div className="flex w-[130px] items-start">
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-3 px-[15px] py-[12.5px] text-[#9db2ce]"
              >
                <UserIcon className="size-6" />
                <span className="text-xs leading-none">Profiel</span>
              </button>
            </div>

            {/* FAB – centered, overlapping the top of the nav */}
            <div className="absolute left-1/2 top-[-24px] -translate-x-1/2 rounded-full border-[6px] border-white bg-white p-[6px]">
              <FloatingActionButton
                aria-label="Nieuw lijstje"
                onClick={handleCreateList}
                className="border-[6px] border-blue-200 p-[30px]"
              />
            </div>
          </nav>

          {/* Home indicator bar */}
          <div className="flex w-full items-center justify-center pb-2 pt-1">
            <div className="h-[5px] w-[139px] rounded-full bg-gray-black" />
          </div>
        </div>
      </div>
    </div>
  );
}
