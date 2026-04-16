"use client";

import * as React from "react";
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
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { Snackbar } from "@/components/ui/snackbar";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import {
  SortableHomeListSections,
  StaticStackedHomeListSections,
  type HomeOverviewList,
} from "@/components/home_lists_overview";
import {
  defaultNewListName,
  selectListNameInputOnFocus,
} from "@/lib/list-default-name";
import { listIsMasterTemplate } from "@/lib/list-master";
import {
  masterStoreLabelFromListIcon,
  storeLogosFromListIcon,
} from "@/lib/master-stores";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { planOwnerListDecorIconUpdates } from "@/lib/list-product-icons";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import {
  APP_FAB_BOTTOM_NO_NAV_CLASS,
  APP_FAB_INNER_PX4_CLASS,
  APP_SNACKBAR_NO_NAV_FIXTURE_CLASS,
} from "@/lib/app-layout";

export type LijstjesBeherenSection = "lijstjes" | "favorieten";

type ListMembershipRow = { id?: string; instantUserId?: string };

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46677 11.929 3.46677 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14.1 12C14.1 13.16 13.16 14.1 12 14.1C10.84 14.1 9.9 13.16 9.9 12C9.9 10.84 10.84 9.9 12 9.9C13.16 9.9 14.1 10.84 14.1 12ZM4.6 9.9C3.44 9.9 2.5 10.84 2.5 12C2.5 13.16 3.44 14.1 4.6 14.1C5.76 14.1 6.7 13.16 6.7 12C6.7 10.84 5.76 9.9 4.6 9.9ZM19.4 9.9C18.24 9.9 17.3 10.84 17.3 12C17.3 13.16 18.24 14.1 19.4 14.1C20.56 14.1 21.5 13.16 21.5 12C21.5 10.84 20.56 9.9 19.4 9.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function inSectionList(
  section: LijstjesBeherenSection,
  l: HomeOverviewList,
): boolean {
  return section === "lijstjes" ? !l.isMasterTemplate : l.isMasterTemplate;
}

export function LijstjesBeherenClient({
  section,
}: {
  section: LijstjesBeherenSection;
}) {
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
  });

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

  React.useEffect(() => {
    if (!user || authLoading || isLoading || !data?.lists) return;
    const txs = data.lists
      .filter((l) => listIsMasterTemplate(l))
      .map((l) => {
        const icon = typeof l.icon === "string" ? l.icon : "";
        const label = masterStoreLabelFromListIcon(icon);
        const current = String((l as { name?: string }).name ?? "").trim();
        if (!label || current === label) return null;
        return db.tx.lists[String(l.id)].update({ name: label });
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx != null);
    if (txs.length > 0) {
      void db.transact(txs);
    }
  }, [user, authLoading, isLoading, data?.lists]);

  const shareFirstNameByUserId = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of shareProfilesData?.profiles ?? []) {
      const uid = p.instantUserId;
      const fn = (p.firstName ?? "").trim();
      if (uid && fn) m.set(uid, fn);
    }
    return m;
  }, [shareProfilesData?.profiles]);

  const lists: HomeOverviewList[] = React.useMemo(() => {
    const owned: HomeOverviewList[] = (data?.lists ?? []).map((l) => {
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
      const masterIconSrc: string =
        ((l as Record<string, unknown>).masterIcon as string) || "";
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
        storeLogos: isFromMaster
          ? storeLogosFromListIcon(effectiveStoreIcon)
          : [],
        sharedWithFirstName: isMaster
          ? null
          : hasOtherMembers
            ? sharedName
            : null,
        isMasterTemplate: isMaster,
      };
    });

    const shared: HomeOverviewList[] = (data?.listMembers ?? [])
      .map((row) => row.list)
      .filter(
        (l): l is NonNullable<typeof l> =>
          l != null && typeof l === "object" && "id" in l,
      )
      .map((l) => {
        const isMaster = listIsMasterTemplate(l);
        const ownerIdRow =
          "ownerId" in l && typeof l.ownerId === "string"
            ? l.ownerId
            : undefined;
        const ownerFirst =
          ownerIdRow != null
            ? shareFirstNameByUserId.get(ownerIdRow) ?? null
            : null;
        const masterIconSrc2: string =
          ((l as Record<string, unknown>).masterIcon as string) || "";
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
          sharedWithFirstName:
            isMaster || isFromMaster ? null : ownerFirst,
          storeLogos: isFromMaster
            ? storeLogosFromListIcon(effectiveStoreIcon2)
            : [],
          isMasterTemplate: isMaster,
        };
      });

    const byId = new Map<string, HomeOverviewList>();
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

  React.useEffect(() => {
    if (!user?.id || authLoading || isLoading) return;
    const rows = (data?.lists ?? []) as Record<string, unknown>[];
    const mine = rows.filter(
      (l) =>
        l &&
        typeof l === "object" &&
        String((l as { ownerId?: string }).ownerId ?? "") === user.id,
    ) as { id: string; icon?: string }[];
    if (mine.length === 0) return;
    const plans = planOwnerListDecorIconUpdates(
      mine.map((l) => ({
        id: String(l.id),
        icon: typeof l.icon === "string" ? l.icon : "",
        isMasterTemplate: listIsMasterTemplate(l),
      })),
    );
    if (plans.length === 0) return;
    void db.transact(
      plans.map((p) => db.tx.lists[p.listId].update({ icon: p.nextIcon })),
    );
  }, [user?.id, authLoading, isLoading, data?.lists]);

  const sectionLists = React.useMemo(
    () => lists.filter((l) => inSectionList(section, l)),
    [lists, section],
  );

  const [quickMasterListName, setQuickMasterListName] = React.useState("");
  const [quickMasterId, setQuickMasterId] = React.useState<string | null>(null);
  const [isQuickMasterModalOpen, setIsQuickMasterModalOpen] =
    React.useState(false);
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
  /** Figma 1148:9665 — potlood: sorteer- en verwijder-chrome op de kaarten. */
  const [isCardsEditMode, setIsCardsEditMode] = React.useState(false);
  const removeTimeoutRef = React.useRef<number | NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setIsCardsEditMode(false);
  }, [section]);

  const hasAnyLists = lists.length > 0;
  const hasSectionLists = sectionLists.length > 0;

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

  const handleStartFromMaster = React.useCallback((masterId: string) => {
    setQuickMasterId(masterId);
    setQuickMasterListName(defaultNewListName());
    setIsQuickMasterModalOpen(true);
  }, []);

  const handleCloseQuickMasterModal = React.useCallback(() => {
    setIsQuickMasterModalOpen(false);
    setQuickMasterId(null);
    setQuickMasterListName("");
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

  const sisterHref =
    section === "lijstjes"
      ? "/lijstjes-beheren/favorieten"
      : "/lijstjes-beheren/lijstjes";
  const sisterLabel =
    section === "lijstjes" ? "Naar favorietenlijsten" : "Naar lijstjes";

  const pageTitle =
    section === "lijstjes" ? "Lijstjes" : "Favorieten lijstjes";

  const handleFabNewList = React.useCallback(() => {
    router.push("/nieuw-lijstje/selecteer-winkel");
  }, [router]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleReorderLists = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || active.id === over.id) return;
      const sortedFull = [...lists].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      const sectionItems = sortedFull.filter((l) => inSectionList(section, l));
      const oldIndex = sectionItems.findIndex((l) => l.id === active.id);
      const newIndex = sectionItems.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newSectionOrder = arrayMove(sectionItems, oldIndex, newIndex);
      let si = 0;
      const merged = sortedFull.map((l) =>
        inSectionList(section, l) ? newSectionOrder[si++]! : l,
      );
      const txns = merged.map((l, i) => db.tx.lists[l.id].update({ order: i }));
      void db.transact(txns);
    },
    [lists, section],
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
    <div className="relative flex min-h-dvh w-full flex-col">
      {/*
        Figma 1148:8955 — top app bar: back + gecentreerde titel (medium 16) + three-dots.
        Grid met 2.5rem / 1fr / 2.5rem zodat het midden altijd echt gecentreerd is.
      */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-[var(--white)] pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_var(--gray-100)]">
        <header className="mx-auto grid h-16 max-w-[956px] grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-4 px-[var(--space-4)]">
          <Link
            href="/"
            aria-label="Terug naar mijn lijstjes"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6" />
          </Link>
          <p className="min-w-0 truncate text-center text-base font-medium leading-24 tracking-normal text-text-primary">
            {pageTitle}
          </p>
          <button
            type="button"
            aria-label="Meer opties (binnenkort beschikbaar)"
            disabled
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-action-primary opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <DotsIcon className="size-6" />
          </button>
        </header>
      </div>

      <div className="flex flex-1 flex-col pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-[var(--space-4)] pt-8">
          {!hasAnyLists ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
              <p className="text-center text-base font-medium leading-24 text-[var(--text-secondary)]">
                Je hebt nog geen lijstjes om te beheren.
              </p>
              <Link
                href="/"
                className="text-sm font-medium text-text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Terug naar overzicht
              </Link>
            </div>
          ) : !hasSectionLists ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
              <p className="text-center text-base font-medium leading-24 text-[var(--text-secondary)]">
                {section === "lijstjes"
                  ? "Je hebt hier nog geen lijstjes om te rangschikken."
                  : "Je hebt hier nog geen favorietenlijsten."}
              </p>
              <Link
                href={sisterHref}
                className="text-sm font-medium text-action-primary no-underline transition-colors [@media(hover:hover)]:hover:text-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
              >
                {sisterLabel}
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Terug naar home
              </Link>
            </div>
          ) : (
            <>
              {/* Figma 1148:9003 / 1148:9665 — titel + potlood of titel + Gereed. */}
              <div
                className={cn(
                  "mb-6 flex min-h-8 items-center",
                  isCardsEditMode ? "gap-4" : "gap-2",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <h1 className="min-w-0 truncate text-page-title font-bold leading-32 tracking-normal text-text-primary">
                    {pageTitle}
                  </h1>
                  {!isCardsEditMode ? (
                    <button
                      type="button"
                      aria-label={
                        section === "lijstjes"
                          ? "Lijstjes bewerken"
                          : "Favorietenlijsten bewerken"
                      }
                      onClick={() => setIsCardsEditMode(true)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <PencilIcon className="size-6" />
                    </button>
                  ) : null}
                </div>
                {isCardsEditMode ? (
                  <button
                    type="button"
                    onClick={() => setIsCardsEditMode(false)}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--blue-500)] px-2 py-1 text-sm font-normal leading-20 text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <CheckmarkIcon className="size-6 shrink-0" />
                    Gereed
                  </button>
                ) : null}
              </div>
              {isCardsEditMode ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleReorderLists}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={sectionLists.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <SortableHomeListSections
                      lists={sectionLists}
                      interactionMode="edit"
                      removingId={removingId}
                      addingId={addingId}
                      addingIdExpanded={addingIdExpanded}
                      onDelete={handleDeleteList}
                      onStartFromMaster={handleStartFromMaster}
                      beherenSingleSection={section}
                    />
                  </SortableContext>
                </DndContext>
              ) : (
                <StaticStackedHomeListSections
                  lists={sectionLists}
                  removingId={removingId}
                  addingId={addingId}
                  addingIdExpanded={addingIdExpanded}
                  onDelete={handleDeleteList}
                  onStartFromMaster={handleStartFromMaster}
                  beherenSingleSection={section}
                />
              )}
            </>
          )}
        </div>
      </div>

      <SlideInModal
        open={isQuickMasterModalOpen}
        onClose={handleCloseQuickMasterModal}
        title="Naam lijstje"
        footer={
          <Button
            type="submit"
            form="beheren-quick-master-create-form"
            variant="primary"
            disabled={!quickMasterListName.trim()}
          >
            Bewaren
          </Button>
        }
      >
        <form
          id="beheren-quick-master-create-form"
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

      {snackbarMessage ? (
        <div className={APP_SNACKBAR_NO_NAV_FIXTURE_CLASS}>
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDelete}
          />
        </div>
      ) : null}

      {!snackbarMessage && !isCardsEditMode ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-20",
            APP_FAB_BOTTOM_NO_NAV_CLASS,
          )}
        >
          <div className={APP_FAB_INNER_PX4_CLASS}>
            <FloatingActionButton
              aria-label="Nieuw lijstje"
              className="pointer-events-auto"
              onClick={handleFabNewList}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
