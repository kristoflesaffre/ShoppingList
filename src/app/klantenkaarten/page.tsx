"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { MASTER_STORE_OPTIONS } from "@/lib/master-stores";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import { SelectTile } from "@/components/ui/select_tile";
import { LogoTile } from "@/components/ui/logo_tile";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { CameraBarcodeScannerSlideIn } from "@/components/camera_barcode_scanner_slide_in";
import { LoyaltyCardScanResultSlideIn } from "@/components/loyalty_card_scan_result_slide_in";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import { decodeLoyaltyCard } from "@/lib/decode_loyalty_card";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import {
  APP_FAB_BOTTOM_CLASS,
  APP_FAB_INNER_FLUSH_CLASS,
} from "@/lib/app-layout";
import type { DecodeResult } from "@/lib/loyalty_card";

type SuccessDecodeResult = Extract<DecodeResult, { ok: true }>;

type LoyaltyCardRow = {
  id: string;
  codeType: string;
  codeFormat: string;
  rawValue: string;
  cardName: string;
  createdAtIso: string;
};

/** Individuele winkelopties — geen combi-slug (standalone kaarten hebben altijd één code). */
const STANDALONE_STORE_OPTIONS = MASTER_STORE_OPTIONS.filter(
  (s) => s.slug !== "lidl-delhaize",
);

function logoSrcForCardName(cardName: string): string {
  return MASTER_STORE_OPTIONS.find((s) => s.label === cardName)?.logoSrc ?? "";
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
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

function StoreLogoImg({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      className="size-10 max-h-full max-w-full object-contain"
      aria-hidden
    />
  );
}

function CardListRow({
  card,
  onClick,
}: {
  card: LoyaltyCardRow;
  onClick: () => void;
}) {
  const logoSrc = logoSrcForCardName(card.cardName);
  const codeLabel =
    card.codeType === "qr" ? "QR-code" : `Barcode · ${card.codeFormat}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-4 rounded-[12px] bg-[var(--white)] px-4 py-3 text-left shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-[var(--gray-25)] active:bg-[var(--gray-50)]"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-50)] p-1">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos
          <img
            src={logoSrc}
            alt=""
            width={40}
            height={40}
            className="size-10 object-contain"
          />
        ) : (
          <CardIcon className="size-6 text-[var(--gray-400)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-5 tracking-normal text-[var(--text-primary)]">
          {card.cardName}
        </p>
        <p className="truncate text-xs font-normal text-[var(--text-secondary)]">
          {codeLabel}
        </p>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-[var(--gray-400)]" />
    </button>
  );
}

export default function KlantenKaartenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, data } = db.useQuery(
    user
      ? { loyaltyCards: { $: { where: { ownerId } } } }
      : null,
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  // ── Add flow ──────────────────────────────────────────────────────────────
  const [addStoreOpen, setAddStoreOpen] = React.useState(false);
  const [addScanMethodOpen, setAddScanMethodOpen] = React.useState(false);
  const [addCameraOpen, setAddCameraOpen] = React.useState(false);
  const [addResultOpen, setAddResultOpen] = React.useState(false);
  const [selectedStore, setSelectedStore] = React.useState<
    (typeof MASTER_STORE_OPTIONS)[number] | null
  >(null);
  const [decodeResult, setDecodeResult] =
    React.useState<SuccessDecodeResult | null>(null);
  const [decodeError, setDecodeError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // ── View / delete flow ────────────────────────────────────────────────────
  const [viewCard, setViewCard] = React.useState<LoyaltyCardRow | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const cards: LoyaltyCardRow[] = React.useMemo(() => {
    if (!data?.loyaltyCards) return [];
    return [...data.loyaltyCards]
      .sort(
        (a, b) =>
          new Date(b.createdAtIso).getTime() -
          new Date(a.createdAtIso).getTime(),
      )
      .map((c) => ({
        id: c.id,
        codeType: String(c.codeType ?? ""),
        codeFormat: String(c.codeFormat ?? ""),
        rawValue: String(c.rawValue ?? ""),
        cardName: String(c.cardName ?? ""),
        createdAtIso: String(c.createdAtIso ?? ""),
      }));
  }, [data]);

  const handleStoreSelect = (store: (typeof MASTER_STORE_OPTIONS)[number]) => {
    setSelectedStore(store);
    setAddStoreOpen(false);
    setDecodeError(null);
    setDecodeResult(null);
    setAddScanMethodOpen(true);
  };

  const handlePhotoFile = async (file: File) => {
    setDecodeError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const result = await decodeLoyaltyCard(dataUrl);
      if (!result.ok) {
        setDecodeError(result.error);
        return;
      }
      setDecodeResult(result);
      setAddScanMethodOpen(false);
      setAddResultOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!decodeResult || !user || !selectedStore) return;
    setSaving(true);
    try {
      const cardId = iid();
      await db.transact(
        db.tx.loyaltyCards[cardId].update({
          codeType: decodeResult.codeType,
          codeFormat: decodeResult.codeFormat,
          rawValue: decodeResult.rawValue,
          cardName: selectedStore.label,
          createdAtIso: new Date().toISOString(),
          ownerId: user.id,
        }),
      );
      setAddResultOpen(false);
      setDecodeResult(null);
      setSelectedStore(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    setDeletingId(id);
    try {
      await db.transact(db.tx.loyaltyCards[id].delete());
      setViewOpen(false);
      setViewCard(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || !user || isLoading) {
    return <PageSpinner />;
  }

  const viewLogoSrc = viewCard ? logoSrcForCardName(viewCard.cardName) : "";

  const empty = cards.length === 0;

  return (
    <div
      className={
        empty
          ? "relative flex min-h-dvh w-full flex-col bg-gradient-to-b from-[var(--blue-100)] to-[var(--white)] px-[16px]"
          : "relative flex min-h-dvh w-full flex-col px-[16px]"
      }
    >
      <div className="flex flex-1 flex-col pb-[96px] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          <div className="mb-6 flex items-center gap-4">
            <h1 className="flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Klantenkaarten
            </h1>
          </div>

          {empty ? (
            <section
              className="flex min-h-[min(520px,calc(100dvh-12rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] flex-1 flex-col items-center justify-center"
              aria-label="Geen klantenkaarten"
            >
              <div className="flex w-full max-w-[358px] flex-col items-center gap-6 text-center">
                <div className="relative size-24 shrink-0 overflow-hidden">
                  <Image
                    src="/images/ui/klantenkaart.png"
                    alt=""
                    width={96}
                    height={96}
                    className="size-full object-contain"
                    priority
                  />
                </div>
                <p className="w-full text-base font-medium leading-24 tracking-normal text-[var(--gray-500)]">
                  Je hebt nog geen klantenkaarten
                </p>
                <MiniButton
                  type="button"
                  variant="primary"
                  aria-label="Klantenkaart toevoegen"
                  onClick={() => setAddStoreOpen(true)}
                >
                  Voeg kaart toe
                </MiniButton>
              </div>
            </section>
          ) : (
            <div className="flex flex-col gap-3">
              {cards.map((card) => (
                <CardListRow
                  key={card.id}
                  card={card}
                  onClick={() => {
                    setViewCard(card);
                    setViewOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div
        className={`fixed right-4 z-10 ${APP_FAB_BOTTOM_CLASS}`}
        style={{ right: "max(16px, env(safe-area-inset-right, 16px))" }}
      >
        <div className={APP_FAB_INNER_FLUSH_CLASS}>
          <FloatingActionButton
            aria-label="Klantenkaart toevoegen"
            onClick={() => setAddStoreOpen(true)}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          void handlePhotoFile(file);
        }}
      />

      {/* ── Stap 1: Kies winkel ─────────────────────────────────────────── */}
      <SlideInModal
        open={addStoreOpen}
        onClose={() => setAddStoreOpen(false)}
        title="Kies een winkel"
        titleId="add-card-store-title"
      >
        <div className="grid w-full grid-cols-3 gap-3 px-4 pb-2 sm:gap-4">
          {STANDALONE_STORE_OPTIONS.map((store) => (
            <button
              key={store.slug}
              type="button"
              aria-label={`Selecteer ${store.label}`}
              onClick={() => handleStoreSelect(store)}
              className="flex h-full min-h-[6.5rem] min-w-0 flex-col items-stretch rounded-md border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <LogoTile
                className="h-full min-h-[6.5rem] w-full min-w-0 justify-between"
                label={store.label}
                logo={<StoreLogoImg src={store.logoSrc} />}
              />
            </button>
          ))}
        </div>
      </SlideInModal>

      {/* ── Stap 2: Scan methode ─────────────────────────────────────────── */}
      <SlideInModal
        open={addScanMethodOpen}
        onClose={() => setAddScanMethodOpen(false)}
        onBack={() => {
          setAddScanMethodOpen(false);
          setAddStoreOpen(true);
        }}
        title={selectedStore ? `Klantenkaart ${selectedStore.label}` : "Klantenkaart toevoegen"}
        titleId="add-card-method-title"
        disableEscapeClose={addCameraOpen}
        footer={
          decodeError ? (
            <p className="text-center text-xs text-[var(--color-error,#ef4444)]">
              {decodeError}
            </p>
          ) : null
        }
      >
        <div className="flex w-full flex-col gap-4 px-4">
          <button
            type="button"
            onClick={() => {
              setDecodeError(null);
              setAddScanMethodOpen(false);
              setAddCameraOpen(true);
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Scan met camera"
              subtitle="Richt je camera op de code"
              icon={
                <span
                  role="img"
                  aria-label="Camera"
                  className="inline-block size-10 shrink-0 bg-[var(--action-primary)]"
                  style={{
                    WebkitMaskImage: 'url("/icons/camera.svg")',
                    maskImage: 'url("/icons/camera.svg")',
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                />
              }
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setDecodeError(null);
              photoInputRef.current?.click();
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Screenshot toevoegen"
              subtitle="Upload een afbeelding"
              icon={
                <span
                  role="img"
                  aria-label="QR-code"
                  className="inline-block size-10 shrink-0 bg-[var(--action-primary)]"
                  style={{
                    WebkitMaskImage: 'url("/icons/qr.svg")',
                    maskImage: 'url("/icons/qr.svg")',
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                />
              }
            />
          </button>
        </div>
      </SlideInModal>

      {/* ── Stap 3a: Camera scanner ──────────────────────────────────────── */}
      <CameraBarcodeScannerSlideIn
        open={addCameraOpen}
        onClose={() => {
          setAddCameraOpen(false);
          setAddScanMethodOpen(true);
        }}
        onDecoded={(result) => {
          setAddCameraOpen(false);
          setDecodeResult(result);
          setAddResultOpen(true);
        }}
      />

      {/* ── Stap 4: Bevestiging & opslaan ───────────────────────────────── */}
      <LoyaltyCardScanResultSlideIn
        open={addResultOpen}
        onClose={() => setAddResultOpen(false)}
        onBack={() => {
          setAddResultOpen(false);
          setAddScanMethodOpen(true);
        }}
        decodeResult={decodeResult}
        saving={saving}
        onSave={() => void handleSave()}
      />

      {/* ── Kaart bekijken ───────────────────────────────────────────────── */}
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
              if (viewCard) void handleDeleteCard(viewCard.id);
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
    </div>
  );
}
