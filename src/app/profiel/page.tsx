"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import { AppBottomNav } from "@/components/app_bottom_nav";
import { fileToAvatarDataUrl } from "@/lib/profile_crypto";
import { cn } from "@/lib/utils";

/**
 * Mijn profiel – Figma 760:3043: grote foto, wijzigen, uitloggen.
 */
export default function ProfielPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, error, data } = db.useQuery({
    profiles: {
      $: { where: { instantUserId: ownerId } },
    },
  });

  const existingProfile = data?.profiles?.[0];
  const profileAvatarUrl = existingProfile?.avatarUrl ?? null;
  const profileFirstName =
    (existingProfile?.firstName ?? "").trim() || null;
  const profileIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (existingProfile?.id) profileIdRef.current = existingProfile.id;
  }, [existingProfile?.id]);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const displayUrl = previewUrl ?? profileAvatarUrl;

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) {
      setLocalError("Kies een afbeeldingsbestand.");
      return;
    }
    if (!user?.id) return;
    setLocalError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setPreviewUrl(dataUrl);
      setIsSaving(true);
      const pid = existingProfile?.id ?? profileIdRef.current ?? iid();
      profileIdRef.current = pid;
      await db.transact(
        db.tx.profiles[pid].update({
          instantUserId: user.id,
          avatarUrl: dataUrl,
        }),
      );
      setPreviewUrl(null);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Foto opslaan mislukt.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setLocalError(null);
    try {
      await db.auth.signOut();
      router.replace("/auth");
    } catch {
      setLocalError("Uitloggen mislukt. Probeer opnieuw.");
    }
  };

  if (authLoading || !user || isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-base text-text-secondary">Laden…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-center text-base text-[var(--error-600)]">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col px-[16px]">
      {/* Zelfde content-padding als Mijn lijstjes (home); geen vaste witte header zoals lijstje-detail */}
      <div className="flex flex-1 flex-col pb-[120px] pt-[86px]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          <div className="mb-6 flex items-center gap-4">
            <h1 className="flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Mijn profiel
            </h1>
          </div>

          <main className="mx-auto flex w-full max-w-[390px] flex-1 flex-col items-center pb-[env(safe-area-inset-bottom,0px)]">
            {/* Figma 760:3415: foto + voornaam (12px gap), daarna acties */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <div
                className="flex size-[200px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--white)] ring-1 ring-[var(--gray-100)]"
                aria-label="Profielfoto"
              >
                {displayUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data-URL
                  <img
                    src={displayUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <svg
                    className="size-[120px] text-[var(--blue-300)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1}
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                  </svg>
                )}
              </div>
              {profileFirstName ? (
                <p className="text-center text-base font-bold leading-32 tracking-normal text-text-primary">
                  {profileFirstName}
                </p>
              ) : null}
            </div>

            <div className="mt-8 flex w-full max-w-[320px] flex-col items-center gap-6">
              <MiniButton
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={handlePickPhoto}
                aria-label="Profielfoto wijzigen"
              >
                {isSaving ? "Bezig met opslaan…" : "Profielfoto wijzigen"}
              </MiniButton>

              {localError ? (
                <p
                  className="text-center text-sm text-[var(--error-600)]"
                  role="alert"
                >
                  {localError}
                </p>
              ) : null}
            </div>

            <div className="mt-auto flex w-full max-w-[320px] flex-col pt-12">
              <Button
                type="button"
                variant="tertiary"
                onClick={() => void handleLogout()}
                className={cn(
                  "w-full max-w-none min-w-0",
                  /* Tertiary zet text-link; cn() merged niet → zonder ! wint stylesheet-volgorde */
                  "!text-[var(--error-400)] hover:!text-[var(--error-600)]",
                )}
              >
                Uitloggen
              </Button>
            </div>
          </main>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      <AppBottomNav
        active="profiel"
        profileAvatarUrl={profileAvatarUrl}
        profileFirstName={profileFirstName}
        onLijstjes={() => router.push("/")}
        onProfiel={() => router.push("/profiel")}
      />
    </div>
  );
}
