"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { listIsMasterTemplate } from "@/lib/list-master";
import { isIPhoneDevice } from "@/lib/utils";
import { uploadUserImageFile } from "@/lib/image-storage";
import { selectListNameInputOnFocus } from "@/lib/list-default-name";
import {
  type LandalTripChoice,
  LANDAL_LIST_CARD_ICON_URL,
  inferLandalTripLabel,
  isLandalListCard,
} from "@/lib/landal-list-card";

const ShareListModal = dynamic(
  () => import("@/components/share_list_modal").then((m) => m.ShareListModal),
  { ssr: false },
);

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
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
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

const LIJSTJE_QUERY_PLACEHOLDER_ID = "__lijst_instellingen_missing__";

/** Tegel-illustraties in slide (zelfde als Landal-aanmaak op de startpagina). */
const LANDAL_SLIDE_ICON_GEZIN = "/images/ui/gezin_160.webp";
const LANDAL_SLIDE_ICON_VRIENDEN = "/images/ui/vrienden_160.webp";

export default function LijstInstellingenPage() {
  const router = useRouter();
  const routeParams = useParams();
  const rawId = routeParams?.id;
  const listId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId) && typeof rawId[0] === "string"
        ? rawId[0]
        : "";
  const listQueryId = listId || LIJSTJE_QUERY_PLACEHOLDER_ID;

  const { isLoading: authLoading, user } = db.useAuth();

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const listDetailQuery = React.useMemo(
    () => ({
      lists: {
        items: {},
        memberships: {},
        $: { where: { id: listQueryId } },
      },
    }),
    [listQueryId],
  );

  const allListsOrderQuery = React.useMemo(
    () => ({
      lists: {
        $: { where: { ownerId: user?.id ?? LIJSTJE_QUERY_PLACEHOLDER_ID } },
      },
    }),
    [user?.id],
  );

  const { isLoading, error, data } = db.useQuery(listDetailQuery);
  const { data: allListsData } = db.useQuery(allListsOrderQuery);

  const listData = data?.lists?.[0];

  const canAccess = React.useMemo(() => {
    if (!listData || !user) return false;
    if (listData.ownerId === user.id) return true;
    return (listData.memberships ?? []).some(
      (m: { instantUserId?: string }) => m.instantUserId === user.id,
    );
  }, [listData, user]);

  const isListOwner = React.useMemo(
    () => !!(listData && user && listData.ownerId === user.id),
    [listData, user],
  );

  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [duplicateBusy, setDuplicateBusy] = React.useState(false);
  const [landalTripSlideOpen, setLandalTripSlideOpen] = React.useState(false);
  const [landalTripSaving, setLandalTripSaving] = React.useState(false);

  // Naam wijzigen
  const [nameEditMode, setNameEditMode] = React.useState(false);
  const [nameInput, setNameInput] = React.useState("");
  const [nameSaving, setNameSaving] = React.useState(false);

  // Foto wijzigen
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = React.useState(false);

  React.useEffect(() => {
    if (!shareModalOpen || !isListOwner || !listId || !user) return;
    if (listData?.shareToken) return;
    const t = crypto.randomUUID();
    void db.transact(db.tx.lists[listId].update({ shareToken: t }));
  }, [shareModalOpen, isListOwner, listId, user, listData?.shareToken]);

  const handleShareInvitePress = React.useCallback(async () => {
    if (!isListOwner || !listId || !user) return;

    const canNativeShare =
      isIPhoneDevice() &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function";

    const ensureShareToken = async (): Promise<string | null> => {
      if (listData?.shareToken) return listData.shareToken;
      const t = crypto.randomUUID();
      await db.transact(db.tx.lists[listId].update({ shareToken: t }));
      return t;
    };

    if (canNativeShare) {
      try {
        const token = await ensureShareToken();
        if (!token || typeof window === "undefined") return;
        const url = `${window.location.origin}/deel/${encodeURIComponent(token)}`;
        await navigator.share({
          title: "Lijstje delen",
          text: "Schrijf mee op dit lijstje:",
          url,
        });
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === "AbortError") return;
        setShareModalOpen(true);
      }
      return;
    }

    setShareModalOpen(true);
  }, [isListOwner, listId, user, listData?.shareToken]);

  const shareUrl = React.useMemo(() => {
    const tok = listData?.shareToken;
    if (!tok || typeof window === "undefined") return "";
    return `${window.location.origin}/deel/${encodeURIComponent(tok)}`;
  }, [listData?.shareToken]);

  const handleDeleteList = React.useCallback(async () => {
    if (!listData || !isListOwner || !listId || !user) return;
    const name = String(listData.name ?? "dit lijstje").trim();
    if (
      !window.confirm(
        `Weet je zeker dat je "${name}" wilt verwijderen? Alle items worden ook verwijderd.`,
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    try {
      const itemIds = (listData.items ?? []).map((i: { id: string }) => i.id);
      const membershipIds = (listData.memberships ?? [])
        .map((m: { id?: string }) => m.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      await db.transact([
        ...itemIds.map((itemId: string) => db.tx.items[itemId].delete()),
        ...membershipIds.map((mid: string) => db.tx.listMembers[mid].delete()),
        db.tx.lists[listId].delete(),
      ] as Parameters<typeof db.transact>[0]);
      router.replace("/");
    } finally {
      setDeleteBusy(false);
    }
  }, [listData, isListOwner, listId, user, router]);

  const handleDuplicateList = React.useCallback(async () => {
    if (!listData || !user?.id || !listId) return;
    setDuplicateBusy(true);
    try {
      const newListId = crypto.randomUUID();
      const newName = `${String(listData.name ?? "Lijstje").trim()} - duplicaat`;

      const allOrders = (allListsData?.lists ?? []).map(
        (l: { order?: number }) => l.order ?? 0,
      );
      const minOrder = allOrders.length > 0 ? Math.min(...allOrders) : 0;

      const listFields: Record<string, unknown> = {
        name: newName,
        date: listData.date ?? "",
        icon: listData.icon ?? "🛒",
        order: minOrder - 1,
        ownerId: user.id,
      };
      const src = listData as Record<string, unknown>;
      if (src.masterIcon) listFields.masterIcon = src.masterIcon;
      if (src.customIconUrl) listFields.customIconUrl = src.customIconUrl;
      if (src.landalTripLabel) listFields.landalTripLabel = src.landalTripLabel;
      if (src.sourceMasterListId) listFields.sourceMasterListId = src.sourceMasterListId;
      if (src.masterCategoryOrderJson) listFields.masterCategoryOrderJson = src.masterCategoryOrderJson;

      type RawItem = Record<string, unknown> & { id: string };
      const itemTxs = (listData.items ?? []).map((item: RawItem) => {
        const newItemId = crypto.randomUUID();
        const fields: Record<string, unknown> = {
          name: item.name,
          quantity: item.quantity,
          checked: false,
          section: item.section,
          order: item.order,
        };
        if (item.recipeGroupId) fields.recipeGroupId = item.recipeGroupId;
        if (item.recipeName) fields.recipeName = item.recipeName;
        if (item.recipeLink) fields.recipeLink = item.recipeLink;
        if (item.itemCategory) fields.itemCategory = item.itemCategory;
        if (item.fromStock) fields.fromStock = item.fromStock;
        if (item.stockPhotoUrl) fields.stockPhotoUrl = item.stockPhotoUrl;
        if (item.itemDate) fields.itemDate = item.itemDate;
        const tripP = (item as Record<string, unknown>).tripPerson;
        if (typeof tripP === "string" && tripP.trim()) {
          fields.tripPerson = tripP.trim();
        }
        return db.tx.items[newItemId].update(fields).link({ list: newListId });
      });

      await db.transact([
        db.tx.lists[newListId].update(listFields),
        ...itemTxs,
      ] as Parameters<typeof db.transact>[0]);

      router.push(`/lijstje/${encodeURIComponent(newListId)}`);
    } finally {
      setDuplicateBusy(false);
    }
  }, [listData, allListsData, user?.id, listId, router]);

  const handleOpenNameEdit = React.useCallback(() => {
    setNameInput(String(listData?.name ?? "").trim());
    setNameEditMode(true);
  }, [listData?.name]);

  const handleSaveName = React.useCallback(async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !listId) return;
    setNameSaving(true);
    try {
      await db.transact(db.tx.lists[listId].update({ name: trimmed }));
      setNameEditMode(false);
    } finally {
      setNameSaving(false);
    }
  }, [nameInput, listId]);

  const handlePhotoChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file?.type.startsWith("image/") || !listId || !user?.id) return;
      setPhotoUploading(true);
      try {
        const image = await uploadUserImageFile({
          file,
          ownerId: user.id,
          kind: "list-icon",
        });
        await db.transact(
          db.tx.lists[listId].update({ customIconUrl: image.url }),
        );
      } finally {
        setPhotoUploading(false);
      }
    },
    [listId, user?.id],
  );

  const handleLandalTripChange = React.useCallback(
    async (choice: LandalTripChoice) => {
      if (!listId || !isListOwner || !listData) return;
      const name = String(listData.name ?? "Lijstje");
      const iconUrl =
        typeof (listData as Record<string, unknown>).customIconUrl === "string"
          ? String((listData as Record<string, unknown>).customIconUrl)
          : null;
      const rawTrip =
        typeof (listData as Record<string, unknown>).landalTripLabel === "string"
          ? String((listData as Record<string, unknown>).landalTripLabel).trim()
          : "";
      const inferred = inferLandalTripLabel({
        name,
        customIconUrl: iconUrl,
        landalTripLabel: null,
      });
      const currentTrip: LandalTripChoice =
        rawTrip.toLowerCase() === "gezin"
          ? "Gezin"
          : rawTrip.toLowerCase() === "vrienden"
            ? "Vrienden"
            : inferred === "Gezin"
              ? "Gezin"
              : "Vrienden";
      const u = (iconUrl ?? "").toLowerCase();
      const iconIsGenericLandal =
        iconUrl === LANDAL_LIST_CARD_ICON_URL ||
        (Boolean(iconUrl) && u.includes("landal_160"));
      if (choice === currentTrip && iconIsGenericLandal) {
        setLandalTripSlideOpen(false);
        return;
      }
      setLandalTripSaving(true);
      try {
        await db.transact(
          db.tx.lists[listId].update({
            landalTripLabel: choice,
            customIconUrl: LANDAL_LIST_CARD_ICON_URL,
          }),
        );
        setLandalTripSlideOpen(false);
      } finally {
        setLandalTripSaving(false);
      }
    },
    [listId, isListOwner, listData],
  );

  if (authLoading || !user || isLoading) {
    return <PageSpinner surface="white" />;
  }

  if (error || !listId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <p className="text-base text-[var(--error-600)]">
          {error?.message ?? "Lijstje niet gevonden."}
        </p>
        <Link href="/" className="mt-4 text-sm font-medium text-text-link underline">
          Naar overzicht
        </Link>
      </div>
    );
  }

  if (!listData || !canAccess) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <p className="text-center text-base text-[var(--text-secondary)]">
          Je hebt geen toegang tot dit lijstje.
        </p>
        <Link href="/" className="mt-4 text-sm font-medium text-text-link underline">
          Naar overzicht
        </Link>
      </div>
    );
  }

  const listName = String(listData.name ?? "Lijstje");
  const isMaster = listIsMasterTemplate(listData);
  const customIconUrl =
    typeof (listData as Record<string, unknown>).customIconUrl === "string"
      ? ((listData as Record<string, unknown>).customIconUrl as string)
      : null;

  const rawLandalTripLabel =
    typeof (listData as Record<string, unknown>).landalTripLabel === "string"
      ? String((listData as Record<string, unknown>).landalTripLabel).trim()
      : "";
  const inferredTrip = inferLandalTripLabel({
    name: listName,
    customIconUrl,
    landalTripLabel: null,
  });
  const currentLandalTrip: LandalTripChoice =
    rawLandalTripLabel.toLowerCase() === "gezin"
      ? "Gezin"
      : rawLandalTripLabel.toLowerCase() === "vrienden"
        ? "Vrienden"
        : inferredTrip === "Gezin"
          ? "Gezin"
          : "Vrienden";
  const isLandalSettingsList = !isMaster && isLandalListCard(customIconUrl);

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[var(--white)]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 w-full bg-[var(--white)] pt-[env(safe-area-inset-top,0px)]">
        <header className="relative mx-auto flex h-16 max-w-[956px] items-center px-4">
          <Link
            href={`/lijstje/${encodeURIComponent(listId)}`}
            aria-label="Terug naar lijstje"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6" />
          </Link>
          <p className="flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
            Instellingen
          </p>
          {/* Balans-spacer */}
          <span className="size-10 shrink-0" aria-hidden />
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+env(safe-area-inset-top,0px))]">
        {/* Lijstnaam */}
        <div className="pt-8">
          {nameEditMode ? (
            <div className="flex flex-col gap-3">
              <InputField
                label="Naam lijstje"
                value={nameInput}
                autoComplete="off"
                autoFocus
                onChange={(e) => setNameInput(e.target.value)}
                onFocus={selectListNameInputOnFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveName();
                  if (e.key === "Escape") setNameEditMode(false);
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!nameInput.trim() || nameSaving}
                  onClick={() => void handleSaveName()}
                >
                  {nameSaving ? "Bewaren…" : "Bewaren"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setNameEditMode(false)}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <h1 className="text-[24px] font-bold leading-8 tracking-normal text-[var(--text-primary)]">
              {listName}
            </h1>
          )}
          {isMaster && !nameEditMode ? (
            <p className="mt-1 text-sm leading-5 text-[var(--text-tertiary)]">
              Favorietenlijst — items hier zijn templates voor nieuwe weeklijstjes.
            </p>
          ) : null}
        </div>

        {/* Acties */}
        {isListOwner ? (
          <div className="mt-6 flex flex-col divide-y divide-[var(--gray-100)]">
            {/* Naam wijzigen */}
            <button
              type="button"
              onClick={handleOpenNameEdit}
              className="flex w-full items-center gap-4 py-3 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className="flex-1 text-base font-medium leading-6 text-[var(--text-primary)]">
                Naam wijzigen
              </span>
              <ChevronRightIcon />
            </button>

            {/* Foto toevoegen / wijzigen */}
            <button
              type="button"
              disabled={photoUploading}
              onClick={() => photoInputRef.current?.click()}
              className="flex w-full items-center gap-4 py-3 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
            >
              <span className="flex flex-1 items-center gap-3 min-w-0">
                {customIconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customIconUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-[var(--radius-md)] object-cover"
                  />
                ) : null}
                <span className="text-base font-medium leading-6 text-[var(--text-primary)]">
                  {photoUploading
                    ? "Uploaden…"
                    : customIconUrl
                      ? "Foto wijzigen"
                      : "Foto toevoegen"}
                </span>
              </span>
              <ChevronRightIcon />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={handlePhotoChange}
            />

            {/* Landal: soort reis — zelfde slide-in als bij aanmaak */}
            {isLandalSettingsList ? (
              <button
                type="button"
                onClick={() => setLandalTripSlideOpen(true)}
                className="flex w-full items-center gap-4 py-3 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-medium leading-6 text-[var(--text-primary)]">
                    Soort reis wijzigen
                  </span>
                  <span className="text-sm font-normal leading-5 text-[var(--text-secondary)]">
                    Nu: {currentLandalTrip === "Gezin" ? "Gezin" : "Vrienden"}
                  </span>
                </span>
                <ChevronRightIcon />
              </button>
            ) : null}

            {/* Lijstje delen */}
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

            {/* Lijstje dupliceren */}
            {!isMaster ? (
              <button
                type="button"
                disabled={duplicateBusy}
                onClick={() => void handleDuplicateList()}
                className="flex w-full items-center gap-4 py-3 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              >
                <span className="flex-1 text-base font-medium leading-6 text-[var(--text-primary)]">
                  {duplicateBusy ? "Dupliceren…" : "Lijstje dupliceren"}
                </span>
                <ChevronRightIcon />
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm leading-5 text-[var(--text-secondary)]">
            Alleen de eigenaar kan dit lijstje aanpassen of delen.
          </p>
        )}

        {/* Spacer naar onderkant */}
        <div className="flex-1" />
      </main>

      {/* Verwijder-knop onderaan */}
      {isListOwner ? (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-4">
          <button
            type="button"
            disabled={deleteBusy}
            onClick={handleDeleteList}
            className="w-[320px] rounded-[256px] border border-[var(--error-300)] bg-[var(--white)] px-4 py-[10px] text-base font-medium leading-6 text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
          >
            {deleteBusy ? "Bezig…" : "Lijstje verwijderen"}
          </button>
        </div>
      ) : null}

      <ShareListModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        urlReady={Boolean(shareUrl)}
      />

      <SlideInModal
        open={landalTripSlideOpen}
        onClose={() => !landalTripSaving && setLandalTripSlideOpen(false)}
        title="Landal lijstje"
        titleId="instellingen-landal-trip-slide-title"
        containerClassName="z-[60]"
        className="pb-0"
        bodyClassName="px-[var(--space-4)] pb-[45px] pt-[var(--space-6)]"
      >
        <div className="grid w-full grid-cols-2 gap-[var(--space-4)]">
          <button
            type="button"
            disabled={landalTripSaving}
            onClick={() => void handleLandalTripChange("Gezin")}
            className={cn(
              "flex min-w-0 flex-col items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--white)] p-[var(--space-3)] text-center shadow-[0px_2px_4px_rgba(0,0,0,0.16)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "[@media(hover:hover)]:hover:bg-[var(--gray-25)]",
              landalTripSaving && "pointer-events-none opacity-60",
            )}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LANDAL_SLIDE_ICON_GEZIN}
                alt=""
                width={48}
                height={48}
                className="size-full object-cover"
              />
            </div>
            <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
              Gezin
            </p>
          </button>
          <button
            type="button"
            disabled={landalTripSaving}
            onClick={() => void handleLandalTripChange("Vrienden")}
            className={cn(
              "flex min-w-0 flex-col items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--white)] p-[var(--space-3)] text-center shadow-[0px_2px_4px_rgba(0,0,0,0.16)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "[@media(hover:hover)]:hover:bg-[var(--gray-25)]",
              landalTripSaving && "pointer-events-none opacity-60",
            )}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LANDAL_SLIDE_ICON_VRIENDEN}
                alt=""
                width={48}
                height={48}
                className="size-full object-cover"
              />
            </div>
            <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
              Vrienden
            </p>
          </button>
        </div>
      </SlideInModal>
    </div>
  );
}
