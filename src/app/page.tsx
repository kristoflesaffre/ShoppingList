"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { ListCard } from "@/components/ui/list_card";
import { MiniButton } from "@/components/ui/mini_button";
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
import {
  masterStoreLabelFromListIcon,
  storeLogosFromListIcon,
} from "@/lib/master-stores";
import { db } from "@/lib/db";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { APP_FAB_BOTTOM_CLASS } from "@/lib/app-layout";
import {
  EMPTY_HOME_LIST_ILLUSTRATION_SRC,
  homeListCardIconSrc,
  pickListProductIconForNewList,
  planOwnerListDecorIconUpdates,
} from "@/lib/list-product-icons";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { ListSectionHeader } from "@/components/list_section_header";

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

function itemCountLabel(count: number): string {
  return count === 1 ? "1 product" : `${count} producten`;
}

/** Telling op favorietenmastertegels (Figma 1148:8298). */
function favoriteCountLabel(count: number): string {
  return count === 1 ? "1 favoriet" : `${count} favorieten`;
}

/** Startpagina: alleen tikken om te openen; volgorde/verwijderen op `/lijstjes-beheren/lijstjes` of `/lijstjes-beheren/favorieten`. */
function HomeStaticListSections({
  lists,
  addingId,
  addingIdExpanded,
  onStartFromMaster,
}: {
  lists: HomeList[];
  addingId: string | null;
  addingIdExpanded: boolean;
  onStartFromMaster: (id: string) => void;
}) {
  const router = useRouter();

  const normalLists = lists.filter((l) => l.displayVariant !== "master");
  const masterLists = lists.filter((l) => l.displayVariant === "master");
  const visibleNormalLists = normalLists.slice(0, 3);
  const visibleMasterLists = masterLists.slice(0, 3);

  const rowWrapperClass = (isAddingCollapsed: boolean, index: number, len: number) =>
    cn(
      "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
      isAddingCollapsed
        ? "mb-0 max-h-0 opacity-0"
        : "max-h-[200px] opacity-100",
      !isAddingCollapsed && (index < len - 1 ? "mb-3" : "mb-0"),
    );

  const cardFor = (list: HomeList) => (
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
        list.displayVariant === "master"
          ? () => onStartFromMaster(list.id)
          : undefined
      }
      className="cursor-pointer"
    />
  );

  return (
    <div className="flex flex-col">
      {normalLists.length > 0 ? (
        <div className="flex flex-col">
          <ListSectionHeader
            icon="list"
            label="Lijstjes"
            showNaarOverzicht={normalLists.length > 3}
            naarOverzichtHref="/lijstjes-beheren/lijstjes"
          />
          <div className="mt-4 flex flex-col">
            {visibleNormalLists.map((list, index) => {
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              return (
                <div
                  key={list.id}
                  className={rowWrapperClass(
                    isAddingCollapsed,
                    index,
                    visibleNormalLists.length,
                  )}
                >
                  <Link
                    href={`/lijstje/${list.id}`}
                    className="block no-underline"
                  >
                    {cardFor(list)}
                  </Link>
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
            normalLists.length > 0 ? "mt-10" : undefined,
          )}
        >
          <ListSectionHeader
            icon="heart"
            label="Favorieten lijstjes"
            showNaarOverzicht
            naarOverzichtHref="/lijstjes-beheren/favorieten"
          />
          <div className="mt-4 flex flex-col">
            {visibleMasterLists.map((list, index) => {
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              return (
                <div
                  key={list.id}
                  className={rowWrapperClass(
                    isAddingCollapsed,
                    index,
                    visibleMasterLists.length,
                  )}
                >
                  <div
                    role="link"
                    tabIndex={0}
                    className="block cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      router.push(`/lijstje/${list.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if ((e.target as HTMLElement).closest("button")) return;
                        e.preventDefault();
                        router.push(`/lijstje/${list.id}`);
                      }
                    }}
                  >
                    {cardFor(list)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
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

  /** Bestaande masterlijsten: naam gelijkzetten aan winkel uit het logo (Lidl, Delhaize, …). */
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

  /** Eénmalige herberekening van lijst-decor-iconen: min duplicaten binnen de product-icon-pool. */
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

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [quickMasterListName, setQuickMasterListName] = React.useState("");
  const [quickMasterId, setQuickMasterId] = React.useState<string | null>(null);
  const [isQuickMasterModalOpen, setIsQuickMasterModalOpen] = React.useState(false);
  /** Nieuwe key bij elke modal-open: remount van het formulier zodat radio’s terug naar default staan. */
  const [newListFormKey, setNewListFormKey] = React.useState(0);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addingIdExpanded, setAddingIdExpanded] = React.useState(false);

  const hasLists = lists.length > 0;

  const ADD_ANIMATION_MS = 300;

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
      const icon = pickListProductIconForNewList(lists);
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
    <div className="relative flex min-h-dvh w-full flex-col px-[var(--space-4)]">
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(var(--space-4)+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          {!hasLists ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="relative size-24 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- lokale webp */}
                <img
                  src={EMPTY_HOME_LIST_ILLUSTRATION_SRC}
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                  className="object-contain"
                />
              </div>
              <p className="text-center text-base font-medium leading-24 text-[var(--text-secondary)]">
                Je hebt nog geen lijstjes
              </p>
              <MiniButton variant="primary" onClick={handleOpenCreateModal}>
                Voeg lijstje toe
              </MiniButton>
            </div>
          ) : (
            <HomeStaticListSections
              lists={lists}
              addingId={addingId}
              addingIdExpanded={addingIdExpanded}
              onStartFromMaster={handleStartFromMaster}
            />
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
              title="Lijstje van favoriet"
              subtitle="Vertrek van een favorietenlijst (geen winkel kiezen)"
              icon={<IconPrimaryMask src="/icons/list-from-master-list.svg" />}
            />
            <NewListKindFormOption
              value="master"
              title="Favorieten lijstje"
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

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-20",
          APP_FAB_BOTTOM_CLASS,
        )}
      >
        <div className="px-[var(--space-4)]">
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
