"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { useAutoShare } from "@/lib/auto-share";
import { db } from "@/lib/db";
import { PillTab, type PillTabVariant } from "@/components/ui/pill_tab";
import {
  readThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/theme";
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
  icon,
  bare = false,
  onClick,
}: {
  label: string;
  description?: string;
  /** Icoon in een zacht lavendel tegeltje vooraan. */
  icon?: React.ReactNode;
  /** Zonder eigen zijpadding (in het witte blad op desktop). */
  bare?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
        bare ? "rounded-md px-0" : "px-4 [@media(hover:hover)]:hover:bg-[var(--gray-25)] active:bg-[var(--gray-50)]",
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] bg-[var(--blue-25)] text-[var(--blue-500)]"
        >
          {icon}
        </span>
      ) : null}
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
      <ChevronRightIcon className="text-[var(--blue-200)]" />
    </button>
  );
}

const THEME_TO_TAB: Record<ThemePreference, PillTabVariant> = {
  light: "first",
  dark: "second",
  system: "third",
};
const TAB_TO_THEME: Record<PillTabVariant, ThemePreference> = {
  first: "light",
  second: "dark",
  third: "system",
};

/** Weergave: licht (standaard), donker of het systeem volgen. Apparaatvoorkeur (localStorage). */
function ThemeSetting({ inline = false }: { inline?: boolean }) {
  const [pref, setPref] = React.useState<ThemePreference>("light");
  React.useEffect(() => setPref(readThemePreference()), []);
  const titleId = React.useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col", inline ? "gap-3" : "gap-2")}
    >
      {inline ? (
        <h2 id={titleId} className="text-[15px] font-semibold leading-5 text-text-primary">
          Weergave
        </h2>
      ) : (
        <h2 id={titleId} className="px-1 text-sm font-semibold leading-20 tracking-normal text-text-secondary">
          Weergave
        </h2>
      )}
      <PillTab
        aria-label="Weergave"
        value={THEME_TO_TAB[pref]}
        onValueChange={(tab) => {
          const next = TAB_TO_THEME[tab];
          setPref(next);
          setThemePreference(next);
        }}
        labelFirst="Licht"
        labelSecond="Donker"
        labelThird="Systeem"
      />
    </section>
  );
}

/**
 * Mijn profiel – Figma 760:3043: grote foto, wijzigen, uitloggen.
 */
export default function ProfielPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const autoShare = useAutoShare(user?.id);
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

  const shareIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M16.5 14c3 .2 5 2.3 5 5.5" />
    </svg>
  );
  const kindCount = autoShare.enabledKinds.size;
  const partnerCount = autoShare.partnerIds.length;
  const shareDescription =
    partnerCount === 0
      ? "Lijstjes automatisch delen"
      : `${partnerCount === 1 ? "1 persoon" : `${partnerCount} personen`} · ${
          kindCount === 0 ? "niets automatisch" : kindCount === 1 ? "1 soort" : `${kindCount} soorten`
        }`;

  const homeIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
  const imageIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );

  /** Profielfoto als knop met camerabadge (tik = foto wijzigen). */
  const avatar = (size: "md" | "lg") => (
    <button
      type="button"
      onClick={handlePickPhoto}
      disabled={isSaving}
      aria-label="Profielfoto wijzigen"
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] shadow-[0_0_0_4px_var(--white),0_0_0_5px_var(--border-subtle),0_14px_30px_-14px_rgba(79,85,241,0.45)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-4",
        size === "lg" ? "size-28" : "size-[92px]",
      )}
    >
      <span className="flex size-full items-center justify-center overflow-hidden rounded-full">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL of blob
          <img src={displayUrl} alt="" className="size-full object-cover" />
        ) : (
          <svg className="size-1/2 text-[var(--blue-400)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
          </svg>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] shadow-[0_0_0_3px_var(--white)]",
          size === "lg" ? "size-9" : "size-8",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-1/2">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </span>
    </button>
  );

  const identity = (titleClass: string) => (
    <div className="flex min-w-0 w-full flex-col items-center gap-0.5 text-center">
      <h1 className={cn("w-full truncate font-bold tracking-tight text-text-primary", titleClass)}>
        {profileFirstName ?? "Jouw profiel"}
      </h1>
      {adminUser?.email ? (
        <p className="w-full truncate text-sm leading-20 text-text-tertiary">{adminUser.email}</p>
      ) : null}
      {isSaving ? <p className="text-[13px] text-[var(--blue-400)]">Foto opslaan…</p> : null}
      {localError ? (
        <p className="text-sm text-[var(--error-600)]" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );

  const logoutButton = (fullWidth: boolean) => (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-pill px-5 text-[15px] font-semibold text-[var(--error-600)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--error-300)_45%,transparent)] transition-colors [@media(hover:hover)]:hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        fullWidth && "w-full",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
        <path d="M10 16l-4-4 4-4M6 12h10" />
      </svg>
      Uitloggen
    </button>
  );

  const settingsRows = (bare: boolean) => (
    <>
      <li>
        <ProfileSettingsRow
          bare={bare}
          icon={homeIcon}
          label="Homepagina aanpassen"
          description="Kies welke secties je op de startpagina ziet"
          onClick={() => router.push("/beheer-homepagina")}
        />
      </li>
      <li>
        <ProfileSettingsRow
          bare={bare}
          icon={shareIcon}
          label="Lijstjes delen"
          description={shareDescription}
          onClick={() => router.push("/profiel/delen")}
        />
      </li>
      {isAdmin ? (
        <li>
          <ProfileSettingsRow
            bare={bare}
            icon={imageIcon}
            label="Ontbrekende afbeeldingen beheren"
            description="Beheerder: productfoto's aanvullen"
            onClick={() => router.push("/admin/ontbrekende-afbeeldingen")}
          />
        </li>
      ) : null}
    </>
  );

  return (
    <div className="relative flex min-h-dvh w-full flex-col px-4">
      {/* Mobiel (5.1c) en desktop (F3): zachte lavendel band bovenaan die uitloopt in de achtergrond. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[200px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--blue-100)_60%,var(--blue-50))_0%,var(--blue-50)_55%,var(--bg-app)_100%)] md:h-60"
      />

      {/* ── Mobiel: 5.1c ── */}
      <main className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(112px+env(safe-area-inset-top,0px))] motion-safe:animate-fade-up md:hidden">
        <section className="flex flex-col items-center gap-4">
          {avatar("md")}
          {identity("text-[26px] leading-8")}
        </section>

        <ThemeSetting />

        <section aria-labelledby="profiel-instellingen-titel" className="flex flex-col gap-2">
          <h2 id="profiel-instellingen-titel" className="px-1 text-sm font-semibold leading-20 tracking-normal text-text-secondary">
            Instellingen
          </h2>
          <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg bg-[var(--white)] p-0 shadow-card">
            {settingsRows(false)}
          </ul>
        </section>

        {logoutButton(true)}
      </main>

      {/* ── Desktop: F3, één wit blad met de foto half erboven ── */}
      <main className="relative mx-auto hidden w-full max-w-[620px] pb-32 pt-[120px] motion-safe:animate-fade-up md:block">
        <div className="flex flex-col items-center rounded-[28px] bg-[var(--white)] px-10 pb-8 shadow-[0_0_0_1px_var(--border-subtle),0_30px_60px_-30px_rgba(79,85,241,0.4)]">
          <div className="-mt-14">{avatar("lg")}</div>
          <div className="mt-3.5 w-full">{identity("text-[28px] leading-[34px]")}</div>
          <div className="mt-6 w-full border-t border-[var(--border-subtle)] pt-5">
            <ThemeSetting inline />
          </div>
          <ul className="m-0 mt-5 flex w-full list-none flex-col divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] p-0">
            {settingsRows(true)}
          </ul>
          <div className="mt-4">{logoutButton(false)}</div>
        </div>
      </main>

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
