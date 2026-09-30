"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { MiniButton } from "@/components/ui/mini_button";
import { uploadUserImageFile } from "@/lib/image-storage";
import { cn } from "@/lib/utils";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";

type AuthUserWithEmail = {
  id: string;
  email?: string | null;
};

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5 shrink-0", className)}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

/** Navigatierij in een instellingengroep: label + optionele toelichting, chevron rechts. */
function ProfileSettingsRow({
  label,
  description,
  onClick,
}: {
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-25)] active:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-medium leading-24 tracking-normal text-text-primary">
          {label}
        </span>
        {description ? (
          <span className="truncate text-sm font-normal leading-20 tracking-normal text-text-tertiary">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRightIcon className="text-[var(--gray-400)]" />
    </button>
  );
}

/**
 * Mijn profiel – Figma 760:3043: grote foto, wijzigen, uitloggen.
 */
export default function ProfielPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const adminUser = user as AuthUserWithEmail | null;
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
  const [isAdmin, setIsAdmin] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  React.useEffect(() => {
    if (!adminUser?.id) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void fetch("/api/admin/me", {
      headers: {
        "x-admin-user-id": adminUser.id,
        "x-admin-email": adminUser.email ?? "",
      },
    })
      .then((response) => response.json() as Promise<{ isAdmin?: boolean }>)
      .then((data) => {
        if (!cancelled) setIsAdmin(data.isAdmin === true);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminUser?.email, adminUser?.id]);

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
      setIsSaving(true);
      const image = await uploadUserImageFile({
        file,
        ownerId: user.id,
        kind: "profile-avatar",
      });
      setPreviewUrl(image.url);
      const pid = existingProfile?.id ?? profileIdRef.current ?? iid();
      profileIdRef.current = pid;
      await db.transact(
        db.tx.profiles[pid].update({
          instantUserId: user.id,
          avatarUrl: image.url,
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
    return <PageSpinner />;
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
    <div className="relative flex min-h-dvh w-full flex-col px-[16px]">
      {/* Zelfde content-padding als Mijn lijstjes (home); geen vaste witte header zoals lijstje-detail */}
      <div className="flex flex-1 flex-col pb-[96px] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col motion-safe:animate-fade-up">
          <div className="mb-6 flex items-center gap-4">
            <h1 className="flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Mijn profiel
            </h1>
          </div>

          <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 pb-[env(safe-area-inset-bottom,0px)]">
            {/* Identiteitskaart: avatar + naam + e-mail + fotoactie in één surface */}
            <section
              aria-labelledby="profiel-identiteit-titel"
              className="flex flex-col items-center gap-4 rounded-lg bg-[var(--white)] px-4 pb-5 pt-6 text-center shadow-card"
            >
              <h2 id="profiel-identiteit-titel" className="sr-only">
                Jouw gegevens
              </h2>
              <div
                className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] ring-4 ring-[var(--blue-25)]"
                aria-label="Profielfoto"
                role="img"
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
                    className="size-12 text-[var(--blue-400)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                  </svg>
                )}
              </div>

              <div className="flex min-w-0 w-full flex-col items-center gap-0.5">
                <p className="w-full truncate text-section-title font-semibold leading-24 tracking-tight text-text-primary">
                  {profileFirstName ?? "Jouw profiel"}
                </p>
                {adminUser?.email ? (
                  <p className="w-full truncate text-sm font-normal leading-20 tracking-normal text-text-tertiary">
                    {adminUser.email}
                  </p>
                ) : null}
              </div>

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
            </section>

            {/* Instellingen: gegroepeerde rijen met chevron (één componenttaal voor “ga naar …”) */}
            <section aria-labelledby="profiel-instellingen-titel" className="flex flex-col gap-2">
              <h2
                id="profiel-instellingen-titel"
                className="px-1 text-sm font-semibold leading-20 tracking-normal text-text-secondary"
              >
                Instellingen
              </h2>
              <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg bg-[var(--white)] p-0 shadow-card">
                <li>
                  <ProfileSettingsRow
                    label="Homepagina beheren"
                    description="Kies welke secties je op de startpagina ziet"
                    onClick={() => router.push("/beheer-homepagina")}
                  />
                </li>
                {isAdmin ? (
                  <li>
                    <ProfileSettingsRow
                      label="Ontbrekende afbeeldingen beheren"
                      description="Beheerder: productfoto's aanvullen"
                      onClick={() => router.push("/admin/ontbrekende-afbeeldingen")}
                    />
                  </li>
                ) : null}
              </ul>
            </section>

            <div className="mt-auto flex w-full flex-col items-center pt-8">
              <Button
                type="button"
                variant="tertiary"
                tertiaryTone="danger"
                onClick={() => void handleLogout()}
                className="w-full max-w-none min-w-0"
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

    </div>
  );
}
