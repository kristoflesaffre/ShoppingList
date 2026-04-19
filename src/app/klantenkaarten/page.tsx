"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import {
  MASTER_STORE_OPTIONS,
  masterStoreLabelFromListIcon,
  listIconIsLidlDelhaizeCombo,
  LOYALTY_COMBO_PRIMARY_LOGO_SRC,
  LOYALTY_COMBO_SECONDARY_LOGO_SRC,
} from "@/lib/master-stores";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import { LoyaltyCardEditorSlideIn } from "@/components/loyalty_card_editor_slide_in";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { Snackbar } from "@/components/ui/snackbar";
import {
  APP_FAB_BOTTOM_CLASS,
  APP_SNACKBAR_FIXTURE_CLASS,
} from "@/lib/app-layout";
import { cn } from "@/lib/utils";

type LoyaltyCardRow = {
  id: string;
  codeType: string;
  codeFormat: string;
  rawValue: string;
  cardName: string;
  /** Logo-URL om in de tegel te tonen — afgeleid van de winkel, niet van de kaart-entity zelf. */
  logoSrc: string;
  createdAtIso: string;
};


/** Figma 1096:7436 EditButton — alert-func-check 24×24 + label */
function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
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

/** Figma 1096:7436 — action-func-bin, rood (outline) */
function TrashOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6h14l-1 14H6L5 6Zm5 5v6m4-6v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma 1096:6757 — action-func-pencil 24×24 */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.17663 19.8235C3.03379 19.6807 2.97224 19.4751 3.01172 19.2777L3.94074 14.633C3.96397 14.5157 4.02087 14.4089 4.10564 14.323L15.2539 3.17679C15.4896 2.94107 15.8728 2.94107 16.1086 3.17679L19.8246 6.89257C19.9361 7.00637 20 7.15965 20 7.31989C20 7.48013 19.9361 7.63341 19.8246 7.7472L17.0376 10.534L8.67642 18.8934C8.59048 18.9782 8.48365 19.0362 8.36636 19.0594L3.72126 19.9884C3.68178 19.9965 3.6423 20 3.60281 20C3.44488 19.9988 3.29043 19.9361 3.17663 19.8235ZM13.7465 6.39094L16.6091 9.25326L18.5426 7.31989L15.6801 4.45757L13.7465 6.39094ZM4.37274 18.6263L7.95062 17.911L15.7544 10.1079L12.893 7.24557L5.08808 15.0499L4.37274 18.6263Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10H22" strokeLinecap="round" />
      <path d="M6 15.5H10" strokeLinecap="round" />
    </svg>
  );
}

const loyaltyTileCardClass =
  "flex w-full min-w-0 flex-col rounded-[8px] bg-[var(--white)] p-3 text-center shadow-[0px_2px_8px_0px_rgba(0,0,0,0.16)]";

/** Zachte ease-out; scaleY groeit naar beneden (origin-top). */
const SCALE_MS = 560;
const SCALE_EASE = "cubic-bezier(0.14, 0.82, 0.22, 1)";
/** Infaden actie-iconen parallel met schaal. */
const ICON_FADE_MS = 440;
const ICON_FADE_EASE = "cubic-bezier(0.22, 1, 0.42, 1)";

/** Figma sp-16 = 16px kolomgap; row-gap iets groter bij scaleY zodat visuele rijafstand gelijk blijft. */
const GRID_GAP_PX = 16;
const GRID_ROW_GAP_EXTRA_SCALE_Y_PX = 6;

/**
 * Figma 1096:6757 — normaal: hele tegel klikbaar.
 * Figma 1096:7436 — bewerken: logo + naam + rij potlood | scheidingslijn | prullenbak (sp-8 kolom).
 * Animatie: schaal en infade starten tegelijk. scaleY met origin-top: bovenkant blijft vast, groei naar onder.
 */
function LoyaltyCardGridTile({
  card,
  isEditMode,
  prefersReducedMotion,
  onOpen,
  onRequestEdit,
  onRequestDelete,
}: {
  card: LoyaltyCardRow;
  isEditMode: boolean;
  prefersReducedMotion: boolean;
  onOpen: () => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
}) {
  const [scaleExpanded, setScaleExpanded] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!isEditMode) {
      setScaleExpanded(false);
      return;
    }
    if (prefersReducedMotion) {
      setScaleExpanded(true);
      return;
    }
    setScaleExpanded(false);
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setScaleExpanded(true);
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [isEditMode, prefersReducedMotion]);

  const logoSrc = card.logoSrc;

  const logoBlock = (
    <div className="relative size-12 shrink-0 overflow-hidden">
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
        <img
          src={logoSrc}
          alt=""
          width={48}
          height={48}
          className="size-full object-contain object-center"
        />
      ) : (
        <span className="flex size-full items-center justify-center">
          <CardIcon className="size-8 text-[var(--gray-400)]" />
        </span>
      )}
    </div>
  );

  const nameBlock = (
    <p className="line-clamp-2 w-full min-w-0 break-words text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
      {card.cardName}
    </p>
  );

  /** Alleen verticaal schalen — geen breedte (geen scaleX). */
  const scaledForEdit =
    !prefersReducedMotion && isEditMode && scaleExpanded
      ? "scale-x-100 scale-y-[1.04]"
      : "scale-x-100 scale-y-100";

  const showEditChrome =
    isEditMode && (prefersReducedMotion || scaleExpanded);

  return (
    <div
      style={
        prefersReducedMotion || !isEditMode
          ? undefined
          : ({
              transitionDuration: `${SCALE_MS}ms`,
              transitionTimingFunction: SCALE_EASE,
            } as React.CSSProperties)
      }
      className={cn(
        "relative min-w-0 w-full origin-top",
        /* Alleen in bewerkmodus transform animeren; in default direct scale 1 (geen “vastgelopen” schaal). */
        !prefersReducedMotion &&
          isEditMode &&
          "transition-transform motion-reduce:transition-none",
        scaledForEdit,
      )}
    >
      {/*
        Default: alleen logo + naam (compacte Figma-hoogte). Editable: zelfde gap-2 + actierij.
        Geen placeholder-rij in default — die liet tegels kunstmatig hoog ogen na terugschakelen.
      */}
      <div
        className={cn(loyaltyTileCardClass, "relative flex flex-col items-center gap-2")}
      >
        <div className={cn(!isEditMode && "pointer-events-none")}>{logoBlock}</div>
        <div className={cn(!isEditMode && "pointer-events-none w-full min-w-0")}>
          {nameBlock}
        </div>
        {isEditMode ? (
          <div
            className={cn(
              "relative z-[1] flex h-8 w-full min-w-0 shrink-0 items-center justify-between",
              !prefersReducedMotion &&
                "transition-opacity motion-reduce:transition-none",
              showEditChrome
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            )}
            style={
              prefersReducedMotion
                ? undefined
                : ({
                    transitionDuration: `${ICON_FADE_MS}ms`,
                    transitionTimingFunction: ICON_FADE_EASE,
                  } as React.CSSProperties)
            }
          >
            <button
              type="button"
              aria-label={`${card.cardName} wijzigen`}
              onClick={onRequestEdit}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <PencilIcon className="size-6" />
            </button>
            <div
              className="h-8 w-px shrink-0 bg-[var(--gray-100)]"
              aria-hidden
            />
            <button
              type="button"
              aria-label={`${card.cardName} verwijderen`}
              onClick={(e) => {
                e.preventDefault();
                onRequestDelete();
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-full p-1 text-[var(--error-400)] transition-colors [@media(hover:hover)]:hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <TrashOutlineIcon className="size-6" />
            </button>
          </div>
        ) : null}
        {!isEditMode ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`${card.cardName} openen`}
            className="absolute inset-0 z-[1] rounded-[8px] border-0 bg-transparent p-0 transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-25)] active:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Bevestigingsdialoog voor het verwijderen van een klantenkaart die nog aan een lijstje gelinkt is.
 * Gecentreerd over een donker overlay, twee acties: annuleren en rood verwijderen.
 */
function ConfirmDeleteDialog({
  cardName,
  listName,
  deleting,
  onConfirm,
  onCancel,
}: {
  cardName: string;
  listName: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Sluit op Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, deleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
        className="w-full max-w-[358px] rounded-[20px] bg-[var(--white)] p-6 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.24)] flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="confirm-delete-title"
            className="text-base font-semibold leading-24 tracking-normal text-[var(--text-primary)]"
          >
            Klantenkaart verwijderen?
          </h2>
          <p
            id="confirm-delete-desc"
            className="text-sm font-normal leading-20 tracking-normal text-[var(--gray-600)]"
          >
            De{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {cardName}
            </span>{" "}
            klantenkaart wordt nog gebruikt op het favorieten lijstje{" "}
            <span className="font-medium text-[var(--text-primary)]">
              &ldquo;{listName}&rdquo;
            </span>
            . Ben je zeker dat je deze wil verwijderen?
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className={cn(
              "w-full rounded-[var(--radius-pill)] py-2 px-4",
              "text-base font-medium leading-24 text-white",
              "bg-[var(--error-400)] transition-colors",
              "[@media(hover:hover)]:hover:bg-[var(--error-600)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {deleting ? "Verwijderen…" : "Verwijderen"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className={cn(
              "w-full rounded-[var(--radius-pill)] py-2 px-4",
              "text-base font-medium leading-24 text-[var(--action-primary)]",
              "border border-[var(--action-primary)] bg-transparent transition-colors",
              "[@media(hover:hover)]:hover:bg-[var(--blue-25)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KlantenKaartenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, data } = db.useQuery(
    user
      ? {
          loyaltyCards: { $: { where: { ownerId } } },
          lists: {
            $: { where: { ownerId } },
            loyaltyCard: {},
            loyaltyCardSecondary: {},
          },
        }
      : null,
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const [viewCard, setViewCard] = React.useState<LoyaltyCardRow | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editorCard, setEditorCard] = React.useState<LoyaltyCardRow | null>(
    null,
  );
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = React.useState<LoyaltyCardRow | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [lastDeletedCard, setLastDeletedCard] =
    React.useState<LoyaltyCardRow | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(
    null,
  );

  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const cards: LoyaltyCardRow[] = React.useMemo(() => {
    const seenId = new Set<string>();
    const raw: LoyaltyCardRow[] = [];

    type RawCard = {
      id: string;
      codeType?: string | null;
      codeFormat?: string | null;
      rawValue?: string | null;
      cardName?: string | null;
      createdAtIso?: string | null;
    };

    const pushResolved = (c: RawCard, resolvedName: string, resolvedLogoSrc: string) => {
      if (!resolvedName || !resolvedLogoSrc) return; // sla niet-herkende winkels over
      if (seenId.has(c.id)) return;
      seenId.add(c.id);
      raw.push({
        id: c.id,
        codeType: String(c.codeType ?? ""),
        codeFormat: String(c.codeFormat ?? ""),
        rawValue: String(c.rawValue ?? ""),
        cardName: resolvedName,
        logoSrc: resolvedLogoSrc,
        createdAtIso: String(c.createdAtIso ?? ""),
      });
    };

    // 1. Kaarten gekoppeld aan eigen lijsten: afgeleid van de winkel-icon van het lijstje.
    //    Dit corrigeert ook oude kaarten die de lijstnaam als cardName hebben.
    for (const list of data?.lists ?? []) {
      const listRow = list as Record<string, unknown>;
      const listIcon = String(listRow.icon ?? "");
      const masterIcon = String(listRow.masterIcon ?? "") || listIcon;
      const effectiveIcon = masterIcon || listIcon;

      if (list.loyaltyCard) {
        if (listIconIsLidlDelhaizeCombo(effectiveIcon)) {
          pushResolved(list.loyaltyCard, "Delhaize", LOYALTY_COMBO_PRIMARY_LOGO_SRC);
        } else {
          const label = masterStoreLabelFromListIcon(effectiveIcon);
          if (label) pushResolved(list.loyaltyCard, label, effectiveIcon);
        }
      }

      if (list.loyaltyCardSecondary && listIconIsLidlDelhaizeCombo(effectiveIcon)) {
        pushResolved(list.loyaltyCardSecondary, "Lidl", LOYALTY_COMBO_SECONDARY_LOGO_SRC);
      }
    }

    // 2. Standalone kaarten (alleen ownerId, geen lijstkoppeling): gebruik cardName voor logo.
    for (const c of data?.loyaltyCards ?? []) {
      if (seenId.has(c.id)) continue; // al verwerkt via lijstkoppeling
      const store = MASTER_STORE_OPTIONS.find((s) => s.label === String(c.cardName ?? ""));
      if (store) pushResolved(c, store.label, store.logoSrc);
    }

    // Sorteer op nieuwste eerst
    raw.sort(
      (a, b) =>
        new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime(),
    );

    // Dedupliceer per winkel — toon per winkel maar één kaart (meest recent)
    const seenName = new Set<string>();
    return raw.filter((c) => {
      const key = c.cardName.trim().toLowerCase();
      if (seenName.has(key)) return false;
      seenName.add(key);
      return true;
    });
  }, [data]);

  /** Kaarten die nog gelinkt zijn aan een (favorieten) lijstje: cardId → lijstnaam. */
  const cardListMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const list of data?.lists ?? []) {
      const listRow = list as Record<string, unknown>;
      const listName = String(listRow.name ?? "");
      if (list.loyaltyCard) map.set(String(list.loyaltyCard.id), listName);
      if (list.loyaltyCardSecondary) map.set(String(list.loyaltyCardSecondary.id), listName);
    }
    return map;
  }, [data?.lists]);

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeletedCard(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  const handleUndoDeleteCard = React.useCallback(() => {
    if (!lastDeletedCard || !user) return;
    void db.transact(
      db.tx.loyaltyCards[lastDeletedCard.id].update({
        codeType: lastDeletedCard.codeType,
        codeFormat: lastDeletedCard.codeFormat,
        rawValue: lastDeletedCard.rawValue,
        cardName: lastDeletedCard.cardName,
        createdAtIso: lastDeletedCard.createdAtIso,
        ownerId: user.id,
      }),
    );
    setLastDeletedCard(null);
    setSnackbarMessage(null);
  }, [lastDeletedCard, user]);

  const handleDeleteCard = React.useCallback(
    async (card: LoyaltyCardRow) => {
      setDeletingId(card.id);
      try {
        await db.transact(db.tx.loyaltyCards[card.id].delete());
        setLastDeletedCard(card);
        setSnackbarMessage(`'${card.cardName}' verwijderd`);
        if (viewCard?.id === card.id) {
          setViewOpen(false);
          setViewCard(null);
        }
      } finally {
        setDeletingId(null);
      }
    },
    [viewCard],
  );

  if (authLoading || !user || isLoading) {
    return <PageSpinner />;
  }

  const viewLogoSrc = viewCard?.logoSrc ?? "";

  const empty = cards.length === 0;
  const fabVisible = !empty && !isEditMode && !snackbarMessage;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-gradient-to-b from-[var(--blue-100)] to-[var(--white)] px-[16px]">
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col pt-[calc(52px+env(safe-area-inset-top,0px))]",
          "pb-[calc(100px+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-[956px] flex-1 flex-col">
          {!empty ? (
            <div className="mb-0 flex shrink-0 flex-col gap-6">
              {/* Figma 1096:6757 — titel + potlood (sp-8); 1096:7436 — titel + Gereed met vinkje (sp-16) */}
              <div
                className={cn(
                  "flex min-h-8 items-center",
                  isEditMode ? "gap-4" : "min-h-9 gap-3",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <h1 className="min-w-0 truncate text-page-title font-bold leading-32 tracking-normal text-text-primary">
                    Klantenkaarten
                  </h1>
                  {!isEditMode ? (
                    <button
                      type="button"
                      aria-label="Bewerken"
                      onClick={() => setIsEditMode(true)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <PencilIcon className="size-6" />
                    </button>
                  ) : null}
                </div>
                {isEditMode ? (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--blue-500)] px-2 py-1 text-sm font-normal leading-20 text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    <CheckmarkIcon className="size-6 shrink-0" />
                    Gereed
                  </button>
                ) : null}
              </div>

              <div
                className="grid grid-cols-3 items-start overflow-visible"
                style={
                  isEditMode && !prefersReducedMotion
                    ? ({
                        columnGap: GRID_GAP_PX,
                        // scaleY(1.04) + origin-top eet visuele rijruimte; compenseer zodat ≈ kolom 16px
                        rowGap: GRID_GAP_PX + GRID_ROW_GAP_EXTRA_SCALE_Y_PX,
                      } as React.CSSProperties)
                    : ({ gap: GRID_GAP_PX } as React.CSSProperties)
                }
              >
                {cards.map((card) => (
                  <LoyaltyCardGridTile
                    key={card.id}
                    card={card}
                    isEditMode={isEditMode}
                    prefersReducedMotion={prefersReducedMotion}
                    onOpen={() => {
                      setViewCard(card);
                      setViewOpen(true);
                    }}
                    onRequestEdit={() => setEditorCard(card)}
                    onRequestDelete={() => {
                      if (cardListMap.has(card.id)) {
                        setConfirmDeleteCard(card);
                      } else {
                        void handleDeleteCard(card);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {empty ? (
            <section
              className="flex min-h-[min(520px,calc(100dvh-12rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] flex-1 flex-col items-center justify-center"
              aria-label="Geen klantenkaarten"
            >
              <div className="flex w-full max-w-[358px] flex-col items-center gap-0 text-center">
                <div className="relative size-24 shrink-0 overflow-hidden">
                  <Image
                    src="/images/ui/klantenkaart_320.webp"
                    alt=""
                    width={320}
                    height={320}
                    className="size-full object-contain"
                    priority
                  />
                </div>
                <p className="mt-0 w-full text-base font-medium leading-24 tracking-normal text-[var(--gray-500)]">
                  Je hebt nog geen klantenkaarten
                </p>
                <MiniButton
                  type="button"
                  variant="primary"
                  aria-label="Klantenkaart toevoegen"
                  className="mt-6"
                  onClick={() => router.push("/klantenkaarten/toevoegen")}
                >
                  Voeg kaart toe
                </MiniButton>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {fabVisible ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-20",
            APP_FAB_BOTTOM_CLASS,
          )}
        >
          <div className="px-[16px]">
            <div className="mx-auto flex w-full max-w-[956px] justify-end">
              <FloatingActionButton
                aria-label="Klantenkaart toevoegen"
                className="pointer-events-auto"
                onClick={() => router.push("/klantenkaarten/toevoegen")}
              />
            </div>
          </div>
        </div>
      ) : null}

      <LoyaltyCardEditorSlideIn
        card={editorCard}
        onClose={() => setEditorCard(null)}
        logoSrc={
          editorCard?.logoSrc ?? ""
        }
        onSaveDecoded={async (result) => {
          if (!editorCard || !user) return;
          await db.transact(
            db.tx.loyaltyCards[editorCard.id].update({
              codeType: result.codeType,
              codeFormat: result.codeFormat,
              rawValue: result.rawValue,
              cardName: editorCard.cardName,
              createdAtIso: editorCard.createdAtIso,
              ownerId: user.id,
            }),
          );
        }}
      />

      <SlideInModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewCard(null);
        }}
        title={viewCard?.cardName ?? "Klantenkaart"}
        titleId="view-card-slide-title"
        footer={
          <Button
            type="button"
            variant="tertiary"
            disabled={deletingId === viewCard?.id}
            onClick={() => {
              if (viewCard) void handleDeleteCard(viewCard);
            }}
            className="!text-[var(--error-400)] hover:!text-[var(--error-600)]"
          >
            {deletingId === viewCard?.id
              ? "Verwijderen…"
              : "Klantenkaart verwijderen"}
          </Button>
        }
      >
        {viewCard ? (
          <div className="flex flex-col items-center gap-6 px-4">
            <div className="flex items-center justify-center rounded-xl bg-white p-4 shadow-sm">
              <LoyaltyCardDisplay
                codeType={viewCard.codeType as "qr" | "barcode"}
                codeFormat={viewCard.codeFormat}
                rawValue={viewCard.rawValue}
              />
            </div>
            {viewLogoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
              <img
                src={viewLogoSrc}
                alt=""
                width={64}
                height={64}
                className="pointer-events-none size-16 shrink-0 object-contain"
              />
            ) : null}
          </div>
        ) : null}
      </SlideInModal>

      {snackbarMessage ? (
        <div
          className={APP_SNACKBAR_FIXTURE_CLASS}
          role="region"
          aria-label="Melding"
        >
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDeleteCard}
          />
        </div>
      ) : null}

      {confirmDeleteCard ? (
        <ConfirmDeleteDialog
          cardName={confirmDeleteCard.cardName}
          listName={cardListMap.get(confirmDeleteCard.id) ?? ""}
          deleting={deletingId === confirmDeleteCard.id}
          onConfirm={() => {
            const card = confirmDeleteCard;
            setConfirmDeleteCard(null);
            void handleDeleteCard(card);
          }}
          onCancel={() => setConfirmDeleteCard(null)}
        />
      ) : null}
    </div>
  );
}
