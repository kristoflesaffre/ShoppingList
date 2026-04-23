"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { listIsMasterTemplate } from "@/lib/list-master";
import { isIPhoneDevice } from "@/lib/utils";
import { fileToAvatarDataUrl } from "@/lib/profile_crypto";
import { selectListNameInputOnFocus } from "@/lib/list-default-name";

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

const LIJSTJE_QUERY_PLACEHOLDER_ID = "__lijst_instellingen_missing__";

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

  const { isLoading, error, data } = db.useQuery(listDetailQuery);

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
      if (!file?.type.startsWith("image/") || !listId) return;
      setPhotoUploading(true);
      try {
        const dataUrl = await fileToAvatarDataUrl(file);
        await db.transact(
          db.tx.lists[listId].update({ customIconUrl: dataUrl }),
        );
      } finally {
        setPhotoUploading(false);
      }
    },
    [listId],
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
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-text-link underline"
        >
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
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-text-link underline"
        >
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

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <div className="fixed top-0 left-0 right-0 z-10 w-full bg-[var(--white)] pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_var(--gray-100)]">
        <header className="relative mx-auto flex h-14 max-w-[956px] items-center gap-3 px-[var(--space-4)]">
          <Link
            href={`/lijstje/${encodeURIComponent(listId)}`}
            aria-label="Terug naar lijstje"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-section-title font-bold leading-24 text-[var(--blue-900)]">
            Instellingen
          </h1>
        </header>
      </div>

      <main className="mx-auto w-full max-w-[956px] flex-1 px-[var(--space-4)] pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[calc(72px+env(safe-area-inset-top,0px))]">
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
          <p className="text-base font-medium leading-24 text-text-primary">
            {listName}
          </p>
        )}
        {isMaster ? (
          <p className="mt-1 text-sm leading-20 text-[var(--text-tertiary)]">
            Favorietenlijst — items hier zijn templates voor nieuwe weeklijstjes.
          </p>
        ) : null}

        <ul className="mt-10 flex flex-col gap-3">
          {isListOwner ? (
            <li>
              <button
                type="button"
                onClick={handleOpenNameEdit}
                className="flex w-full items-center justify-between gap-4 rounded-md border border-[var(--gray-100)] bg-[var(--white)] px-4 py-4 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="text-base font-medium leading-24 text-text-primary">
                  Naam wijzigen
                </span>
                <span className="text-sm text-text-link" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ) : null}
          {isListOwner ? (
            <li>
              <button
                type="button"
                disabled={photoUploading}
                onClick={() => photoInputRef.current?.click()}
                className="flex w-full items-center justify-between gap-4 rounded-md border border-[var(--gray-100)] bg-[var(--white)] px-4 py-4 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {customIconUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={customIconUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-[var(--radius-md)] object-cover"
                    />
                  ) : null}
                  <span className="text-base font-medium leading-24 text-text-primary">
                    {photoUploading
                      ? "Uploaden…"
                      : customIconUrl
                        ? "Foto wijzigen"
                        : "Foto toevoegen"}
                  </span>
                </div>
                <span className="text-sm text-text-link" aria-hidden>
                  ›
                </span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={handlePhotoChange}
              />
            </li>
          ) : null}
          {isListOwner ? (
            <li>
              <button
                type="button"
                onClick={() => void handleShareInvitePress()}
                className="flex w-full items-center justify-between gap-4 rounded-md border border-[var(--gray-100)] bg-[var(--white)] px-4 py-4 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="text-base font-medium leading-24 text-text-primary">
                  Lijstje delen
                </span>
                <span className="text-sm text-text-link" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ) : null}
          {isListOwner ? (
            <li>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={handleDeleteList}
                className="w-full rounded-pill border border-[var(--error-300)] bg-[var(--white)] px-4 py-3 text-base font-medium leading-24 text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              >
                {deleteBusy ? "Bezig…" : "Lijstje verwijderen"}
              </button>
            </li>
          ) : (
            <li className="rounded-md border border-[var(--gray-100)] bg-[var(--white)] px-4 py-4 text-sm leading-20 text-[var(--text-secondary)]">
              Alleen de eigenaar kan dit lijstje delen of verwijderen.
            </li>
          )}
        </ul>
      </main>

      <ShareListModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        urlReady={Boolean(shareUrl)}
      />
    </div>
  );
}
