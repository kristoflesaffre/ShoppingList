"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { findMasterStoreBySlug } from "@/lib/master-stores";
import { SelectTile } from "@/components/ui/select_tile";
import { CameraBarcodeScannerSlideIn } from "@/components/camera_barcode_scanner_slide_in";
import { LoyaltyCardScanResultSlideIn } from "@/components/loyalty_card_scan_result_slide_in";
import { decodeLoyaltyCard } from "@/lib/decode_loyalty_card";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import type { DecodeResult } from "@/lib/loyalty_card";

type SuccessDecodeResult = Extract<DecodeResult, { ok: true }>;

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function KlantenkaartToevoegenScanPage() {
  const router = useRouter();
  const params = useParams();
  const storeSlug = typeof params.storeSlug === "string" ? params.storeSlug : "";

  const { isLoading: authLoading, user } = db.useAuth();

  const store = React.useMemo(() => {
    const s = findMasterStoreBySlug(storeSlug);
    if (!s || s.slug === "lidl-delhaize") return null;
    return s;
  }, [storeSlug]);

  const [addCameraOpen, setAddCameraOpen] = React.useState(false);
  const [addResultOpen, setAddResultOpen] = React.useState(false);
  const [decodeResult, setDecodeResult] =
    React.useState<SuccessDecodeResult | null>(null);
  const [decodeError, setDecodeError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  React.useEffect(() => {
    if (authLoading || !user) return;
    if (!storeSlug) return;
    if (!store) router.replace("/klantenkaarten/toevoegen");
  }, [authLoading, user, store, storeSlug, router]);

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
      setAddResultOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!decodeResult || !user || !store) return;
    setSaving(true);
    try {
      const cardId = iid();
      await db.transact(
        db.tx.loyaltyCards[cardId].update({
          codeType: decodeResult.codeType,
          codeFormat: decodeResult.codeFormat,
          rawValue: decodeResult.rawValue,
          cardName: store.label,
          createdAtIso: new Date().toISOString(),
          ownerId: user.id,
        }),
      );
      setAddResultOpen(false);
      setDecodeResult(null);
      router.push("/klantenkaarten");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || !store) {
    return <PageSpinner />;
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-gradient-to-b from-[var(--blue-100)] to-[var(--white)] px-[16px]">
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full min-w-0 max-w-[956px] flex-1 flex-col gap-4">
          <header className="flex min-h-10 items-center gap-3">
            <Link
              href="/klantenkaarten/toevoegen"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              aria-label="Terug naar winkelkeuze"
            >
              <BackArrowIcon className="size-6" />
            </Link>
            <h1 className="min-w-0 flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Klantenkaart {store.label}
            </h1>
          </header>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setDecodeError(null);
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

          {decodeError ? (
            <p className="text-center text-sm text-[var(--error-400)]">
              {decodeError}
            </p>
          ) : null}
        </div>
      </div>

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

      <CameraBarcodeScannerSlideIn
        open={addCameraOpen}
        onClose={() => setAddCameraOpen(false)}
        onDecoded={(result) => {
          setAddCameraOpen(false);
          setDecodeResult(result);
          setAddResultOpen(true);
        }}
      />

      <LoyaltyCardScanResultSlideIn
        open={addResultOpen}
        onClose={() => {
          setAddResultOpen(false);
          setDecodeResult(null);
        }}
        onBack={() => {
          setAddResultOpen(false);
          setDecodeResult(null);
        }}
        decodeResult={decodeResult}
        saving={saving}
        onSave={() => void handleSave()}
      />
    </div>
  );
}
