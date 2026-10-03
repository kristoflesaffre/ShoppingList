"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp_input";
import { cn, getSafeInternalPath } from "@/lib/utils";

function getPostAuthDestination(): string {
  if (typeof window === "undefined") return "/";
  return (
    getSafeInternalPath(new URLSearchParams(window.location.search).get("next")) ??
    "/"
  );
}
import { db } from "@/lib/db";
import { fileToAvatarDataUrl, hashPasswordForProfile } from "@/lib/profile_crypto";
import { uploadUserImageDataUrl } from "@/lib/image-storage";

type AuthStep =
  | "landing"
  | "login-credentials"
  | "email"
  | "code"
  | "password"
  | "photo";

type AuthFlow = "login" | "register";

const PROFILE_SETUP_STEPS: AuthStep[] = ["password", "photo"];

const authShell =
  "flex min-h-dvh w-full flex-col bg-[var(--bg-app)]";
/** 24px boven de onderkant; safe-area voor iOS erbovenop */
const authFooterPad =
  "pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-4";

/* ── Bouwstenen login/registratie (canvas «Login 5b» en «Account aanmaken») ── */

/** Volle breedte, 50px; disabled blijft zichtbaar lavendelblauw op het verloop. */
function authPrimaryButtonClass(enabled: boolean) {
  return cn(
    "!h-[50px] w-full !max-w-none !font-semibold",
    !enabled && "!bg-[var(--blue-200)] !text-[var(--white)]",
  );
}

const authSoftFieldShell =
  "flex h-[58px] w-full items-center gap-2 rounded-lg bg-[var(--white)] pl-4 pr-2 shadow-card transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--blue-500)]";
const authSoftFieldLabel = "text-xs font-medium leading-4 text-[var(--blue-400)]";
const authSoftFieldInput =
  "w-full min-w-0 bg-transparent text-base leading-[22px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none";

/** Wit invoerveld met het label klein in het veld (invoerstijl 5). */
function AuthSoftField({
  label,
  trailing,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; trailing?: React.ReactNode }) {
  return (
    <label className={authSoftFieldShell}>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={authSoftFieldLabel}>{label}</span>
        <input {...inputProps} className={authSoftFieldInput} />
      </span>
      {trailing}
    </label>
  );
}

/** 92px witte tegel met een icoon (@, envelop, slot) boven de titel. */
function AuthIconTile({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-[92px] items-center justify-center rounded-[28px] bg-[var(--white)] text-[var(--blue-500)] shadow-[0_0_0_1px_var(--border-subtle),0_14px_30px_-14px_rgba(79,85,241,0.45)]">
      {children}
    </span>
  );
}

/** Desktop (lg): inhoud in een halftransparante witte kaart op het verloop (canvas «Desktop login 3»). */
const authDesktopCard =
  "lg:relative lg:my-auto lg:flex-none lg:rounded-[28px] lg:bg-[rgba(255,255,255,0.82)] lg:px-9 lg:pb-8 lg:shadow-[0_0_0_1px_rgba(230,232,240,0.9),0_30px_60px_-30px_rgba(79,85,241,0.45)] lg:backdrop-blur-sm [[data-theme=dark]_&]:lg:bg-[rgba(31,34,56,0.82)]";

const REGISTER_STEP_COUNT = 4;

/**
 * Registratiestap: lavendel verloop met licht midden, terugknop + voortgang (n/4) bovenaan,
 * icoon/visual met gecentreerde titel en uitleg, en de invoer + knop onderaan.
 */
function RegisterStepShell({
  stepNumber,
  onBack,
  visual,
  title,
  subtitle,
  children,
}: {
  stepNumber: number;
  onBack: () => void;
  visual: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        authShell,
        "bg-[radial-gradient(circle_at_50%_210px,var(--white)_0px,var(--blue-25)_110px,var(--blue-50)_280px,var(--blue-100)_560px)] pt-[env(safe-area-inset-top,0px)] lg:bg-[radial-gradient(circle_at_50%_42%,var(--white)_0px,var(--blue-25)_180px,var(--blue-50)_480px,var(--blue-100)_900px)] lg:py-16",
      )}
    >
      <div className={cn("mx-auto flex w-full max-w-[420px] flex-1 flex-col px-5 lg:max-w-[480px] lg:pt-3", authDesktopCard)}>
        <div className="flex items-center gap-3.5 pt-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Terug"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-card transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px]">
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
          </button>
          <div
            className="flex flex-1 gap-1.5"
            role="progressbar"
            aria-label="Account aanmaken"
            aria-valuemin={1}
            aria-valuemax={REGISTER_STEP_COUNT}
            aria-valuenow={stepNumber}
          >
            {Array.from({ length: REGISTER_STEP_COUNT }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i < stepNumber ? "bg-[var(--blue-500)]" : "bg-[rgba(79,85,241,0.18)]",
                )}
              />
            ))}
          </div>
          <span className="w-10 text-right text-xs font-semibold text-[var(--blue-400)] tabular-nums" aria-hidden>
            {stepNumber}/{REGISTER_STEP_COUNT}
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 pt-10 text-center lg:pt-8">
          {visual}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-bold leading-8 tracking-tight text-[var(--text-primary)]">{title}</h1>
            <p className="text-[15px] leading-[21px] text-[var(--text-secondary)]">{subtitle}</p>
          </div>
        </div>

        <div className="flex-1 lg:hidden" />
        <div className={cn("flex flex-col gap-3 pt-8 lg:pb-0 lg:pt-7", authFooterPad)}>{children}</div>
      </div>
    </div>
  );
}

/** Paswoord zichtbaar → invisible.svg (klik om te verbergen); verborgen → visible.svg */
function PasswordVisibilityIcon({ passwordVisible }: { passwordVisible: boolean }) {
  const src = passwordVisible ? "/icons/invisible.svg" : "/icons/visible.svg";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statisch icoon uit /public
    <img src={src} alt="" width={24} height={24} className="size-6 shrink-0" />
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { isLoading, user } = db.useAuth();

  const [step, setStep] = React.useState<AuthStep>("landing");
  const [flow, setFlow] = React.useState<AuthFlow>("login");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  /** Registratie stap “Naam en profielfoto”; verplicht voor Volgende (Figma 760:3202 / 760:3250). */
  const [firstName, setFirstName] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = React.useState(false);
  const [isPasswordSigningIn, setIsPasswordSigningIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const profileIdRef = React.useRef<string | null>(null);
  /** Voorkomt redirect naar / tijdens registratie: user is al true vóór step → password. */
  const registerCodeCompletingRef = React.useRef(false);

  const { data: profileData } = db.useQuery({
    profiles: {
      $: { where: { instantUserId: user?.id ?? "__no_user__" } },
    },
  });
  const existingProfile = profileData?.profiles?.[0];
  React.useEffect(() => {
    if (existingProfile?.id) profileIdRef.current = existingProfile.id;
  }, [existingProfile?.id]);

  React.useEffect(() => {
    if (!user) return;
    if (PROFILE_SETUP_STEPS.includes(step)) return;
    if (registerCodeCompletingRef.current) return;
    if (
      step === "landing" ||
      step === "login-credentials" ||
      step === "email" ||
      step === "code"
    ) {
      router.replace(getPostAuthDestination());
    }
  }, [user, step, router]);

  React.useEffect(() => {
    if (step === "password" || step === "photo") {
      registerCodeCompletingRef.current = false;
    }
  }, [step]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-app)]">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--blue-300)] border-t-[var(--blue-500)]" />
      </div>
    );
  }

  if (
    user &&
    step !== "landing" &&
    step !== "login-credentials" &&
    step !== "email" &&
    step !== "code" &&
    !PROFILE_SETUP_STEPS.includes(step)
  ) {
    return null;
  }

  const handleStartRegister = () => {
    setFlow("register");
    setStep("email");
    setEmail("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setAvatarPreview(null);
    setFirstName("");
    setError(null);
  };

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setStep("code");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "body" in err
          ? (err as { body?: { message?: string } }).body?.message
          : "Er ging iets mis bij het versturen van de code.";
      setError(msg ?? "Onbekende fout.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async (codeValue?: string) => {
    const c = codeValue ?? code;
    if (!c || c.length < 6) return;
    setIsVerifying(true);
    setError(null);
    if (flow === "register") {
      registerCodeCompletingRef.current = true;
    }
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: c });
      if (flow === "register") {
        setStep("password");
      }
    } catch (err: unknown) {
      registerCodeCompletingRef.current = false;
      const msg =
        err && typeof err === "object" && "body" in err
          ? (err as { body?: { message?: string } }).body?.message
          : "Ongeldige code. Probeer opnieuw.";
      setError(msg ?? "Onbekende fout.");
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setCode("");
    setIsSending(true);
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
    } catch {
      setError("Kon geen nieuwe code versturen.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLoginWithPassword = async () => {
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || !password) return;
    setIsPasswordSigningIn(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password-sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password }),
      });
      const raw = await res.text();
      let data: {
        error?: unknown;
        message?: unknown;
        token?: unknown;
        refresh_token?: unknown;
      } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setError(
          raw
            ? `Serverantwoord ongeldig (${res.status}).`
            : "Inloggen mislukt. Probeer opnieuw.",
        );
        return;
      }

      const errMsg = [data.error, data.message].find(
        (v): v is string => typeof v === "string" && v.length > 0,
      );
      if (!res.ok) {
        setError(errMsg ?? `Inloggen mislukt (${res.status}).`);
        return;
      }

      const authToken = [data.token, data.refresh_token].find(
        (v): v is string => typeof v === "string" && v.length > 0,
      );
      if (!authToken) {
        setError(
          errMsg ??
            "Inloggen mislukt: geen token van de server. Controleer INSTANT_APP_ADMIN_TOKEN en de serverlogs.",
        );
        return;
      }
      await db.auth.signInWithToken(authToken);
      router.replace(getPostAuthDestination());
    } catch {
      setError("Netwerkfout. Probeer opnieuw.");
    } finally {
      setIsPasswordSigningIn(false);
    }
  };

  const handleGoBack = async () => {
    setError(null);
    if (step === "login-credentials") {
      setStep("landing");
    } else if (step === "email") {
      setStep("landing");
    } else if (step === "code") {
      setStep("email");
      setCode("");
    } else if (step === "password") {
      await db.auth.signOut();
      setStep("code");
      setCode("");
      setPassword("");
      setConfirmPassword("");
    } else if (step === "photo") {
      setStep("password");
    }
  };

  const handleSavePassword = async () => {
    if (!user?.id) return;
    if (password.length < 8) {
      setError("Gebruik minstens 8 tekens voor je paswoord.");
      return;
    }
    if (password !== confirmPassword) {
      setError("De paswoorden komen niet overeen.");
      return;
    }
    setIsSavingPassword(true);
    setError(null);
    try {
      const { passwordHash, passwordSalt } = await hashPasswordForProfile(
        password,
        email.trim(),
      );
      const pid = existingProfile?.id ?? profileIdRef.current ?? iid();
      profileIdRef.current = pid;
      await db.transact(
        db.tx.profiles[pid].update({
          instantUserId: user.id,
          passwordHash,
          passwordSalt,
        }),
      );
      setStep("photo");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Opslaan van paswoord mislukt.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) {
      setError("Kies een afbeeldingsbestand.");
      return;
    }
    setError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarPreview(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Afbeelding kon niet geladen worden.",
      );
    }
  };

  const upsertProfileNameAndAvatarAndGoHome = async () => {
    if (!user?.id) return;
    const name = firstName.trim();
    if (!name) return;
    setIsSavingAvatar(true);
    setError(null);
    try {
      const pid = existingProfile?.id ?? profileIdRef.current ?? iid();
      profileIdRef.current = pid;
      const storedAvatar = avatarPreview
        ? await uploadUserImageDataUrl({
            dataUrl: avatarPreview,
            ownerId: user.id,
            kind: "profile-avatar",
          })
        : null;
      await db.transact(
        db.tx.profiles[pid].update({
          instantUserId: user.id,
          firstName: name,
          ...(storedAvatar ? { avatarUrl: storedAvatar.url } : {}),
        }),
      );
      router.replace(getPostAuthDestination());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Profiel opslaan mislukt.",
      );
    } finally {
      setIsSavingAvatar(false);
    }
  };

  /* ── Landing + inloggen in één scherm (canvas «Login 5b»): mand en logo in het lichte
     midden van een lavendel verloop, e-mail + paswoord en «Account aanmaken» eronder. ── */
  if (step === "landing" || step === "login-credentials") {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const canSubmit = emailOk && password.length > 0 && !isPasswordSigningIn;
    const fieldShell =
      "flex h-[58px] w-full items-center gap-2 rounded-lg bg-[var(--white)] pl-4 pr-2 shadow-card transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--blue-500)]";
    const fieldLabel = "text-xs font-medium leading-4 text-[var(--blue-400)]";
    const fieldInput =
      "w-full min-w-0 bg-transparent text-base leading-[22px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none";
    return (
      <div
        className={cn(
          authShell,
          "bg-[radial-gradient(circle_at_50%_38%,var(--white)_0px,var(--blue-25)_120px,var(--blue-50)_300px,var(--blue-100)_560px)] pt-[env(safe-area-inset-top,0px)] lg:bg-[radial-gradient(circle_at_50%_42%,var(--white)_0px,var(--blue-25)_180px,var(--blue-50)_480px,var(--blue-100)_900px)] lg:py-16",
        )}
      >
        <div className={cn("mx-auto flex w-full max-w-[420px] flex-1 flex-col px-5 lg:max-w-[440px] lg:pt-24", authDesktopCard)}>
          {/* Mobiel: logo boven de mand in het lichte midden. Desktop: mand steekt boven de kaart uit, logo in de kaart. */}
          <div className="flex flex-1 flex-col items-center justify-center gap-[22px] py-10 lg:flex-none lg:py-0 lg:pb-4">
            <Image
              src="/images/ui/logo.png"
              alt="Shopping list"
              width={136}
              height={28}
              className="h-7 w-auto [[data-theme=dark]_&]:invert"
              priority
            />
            <Image
              src="/images/ui/basket.png"
              alt=""
              width={200}
              height={200}
              className="h-auto w-[200px] lg:absolute lg:left-1/2 lg:top-[-110px] lg:w-[190px] lg:-translate-x-1/2"
              priority
            />
          </div>

          <form
            id="auth-login-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLoginWithPassword();
            }}
            className={cn("flex flex-col gap-3 lg:pb-0", authFooterPad)}
          >
            <label className={fieldShell}>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className={fieldLabel}>E-mailadres</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="naam@voorbeeld.be"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className={fieldInput}
                />
              </span>
            </label>
            <label className={fieldShell}>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className={fieldLabel}>Paswoord</span>
                <input
                  id="auth-login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Paswoord"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className={fieldInput}
                />
              </span>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                aria-label={showPassword ? "Verberg paswoord" : "Toon paswoord"}
              >
                <PasswordVisibilityIcon passwordVisible={showPassword} />
              </button>
            </label>

            {error && <p className="text-sm text-[var(--error-600)]">{error}</p>}

            <Button
              variant="primary"
              type="submit"
              disabled={!canSubmit}
              /* Login 5b: volle breedte, 50px hoog; disabled blijft zichtbaar blauw op het lavendel verloop. */
              className={cn("mt-1", authPrimaryButtonClass(canSubmit))}
            >
              {isPasswordSigningIn ? "Inloggen…" : "Inloggen"}
            </Button>
            <p className="text-center text-sm leading-5 text-[var(--text-secondary)]">
              Nog geen account?{" "}
              <button
                type="button"
                onClick={handleStartRegister}
                className="rounded font-semibold text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                Account aanmaken
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  /* ── Registratie 1: e-mailadres (→ magic code) ── */
  if (step === "email") {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const canNext = isValid && !isSending;

    return (
      <RegisterStepShell
        stepNumber={1}
        onBack={handleGoBack}
        visual={
          <AuthIconTile>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-11">
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" />
            </svg>
          </AuthIconTile>
        }
        title="Geef e-mailadres in"
        subtitle={
          <>
            We sturen je een code om je
            <br />
            e-mailadres te bevestigen.
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canNext) void handleSendCode();
          }}
          className="flex flex-col gap-3"
        >
          <AuthSoftField
            label="E-mailadres"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="naam@voorbeeld.be"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-sm text-[var(--error-600)]">{error}</p>}
          <Button variant="primary" type="submit" disabled={!canNext} className={cn("mt-1", authPrimaryButtonClass(canNext))}>
            {isSending ? "Versturen…" : "Volgende"}
          </Button>
        </form>
      </RegisterStepShell>
    );
  }

  /* ── Registratie 2: code (gaat automatisch verder bij het 6e cijfer) ── */
  if (step === "code") {
    return (
      <RegisterStepShell
        stepNumber={2}
        onBack={handleGoBack}
        visual={
          <AuthIconTile>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-11">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4 7 8 6 8-6" />
            </svg>
          </AuthIconTile>
        }
        title="Check je mailbox"
        subtitle={
          <>
            Geef de code van 6 cijfers in die we stuurden naar{" "}
            <span className="font-semibold text-[var(--text-primary)]">{email}</span>
          </>
        }
      >
        <OtpInput
          length={6}
          autoFocus
          disabled={isVerifying}
          onChange={(v) => {
            setCode(v);
            setError(null);
          }}
          onComplete={(v) => handleVerifyCode(v)}
          className="justify-between gap-2"
          cellClassName="h-[58px] w-0 min-w-0 max-w-[52px] flex-1 rounded-[14px] bg-[var(--white)] text-center text-2xl font-semibold text-[var(--text-primary)] shadow-card transition-shadow focus-visible:shadow-[inset_0_0_0_1.5px_var(--blue-500),0_0_0_4px_var(--blue-50)] focus-visible:outline-none disabled:opacity-60"
        />
        {error ? (
          <p className="text-center text-sm text-[var(--error-600)]">{error}</p>
        ) : (
          <p className="text-center text-[13px] text-[var(--gray-400)]" aria-live="polite">
            {isVerifying ? "Code controleren…" : "We gaan automatisch verder zodra de code klopt."}
          </p>
        )}
        <p className="pb-2 pt-1 text-center text-sm text-[var(--text-secondary)]">
          Geen code ontvangen?{" "}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isSending}
            className="rounded font-semibold text-action-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            {isSending ? "Versturen…" : "Nieuwe code versturen"}
          </button>
        </p>
      </RegisterStepShell>
    );
  }

  /* ── Registratie 3: paswoord ── */
  if (step === "password" && user) {
    const longEnough = password.length >= 8;
    const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
    const canNext = longEnough && confirmPassword.length >= 8 && password === confirmPassword && !isSavingPassword;

    return (
      <RegisterStepShell
        stepNumber={3}
        onBack={handleGoBack}
        visual={
          <AuthIconTile>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[42px]">
              <rect x="5" y="10" width="14" height="10" rx="2.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              <circle cx="12" cy="15" r="1.2" fill="currentColor" />
            </svg>
          </AuthIconTile>
        }
        title="Kies een paswoord"
        subtitle="Hiermee log je voortaan in."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canNext) void handleSavePassword();
          }}
          className="flex flex-col gap-3"
        >
          <AuthSoftField
            label="Paswoord"
            id="auth-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Paswoord"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            trailing={              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                aria-label={showPassword ? "Verberg paswoord" : "Toon paswoord"}
              >
                <PasswordVisibilityIcon passwordVisible={showPassword} />
              </button>}
          />
          <AuthSoftField
            label="Bevestig paswoord"
            id="auth-password-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Paswoord opnieuw"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
          />
          <p
            className={cn(
              "flex items-center gap-2 px-1 text-[13px]",
              mismatch ? "text-[var(--error-600)]" : longEnough ? "text-[var(--success-soft-fg)]" : "text-[var(--gray-400)]",
            )}
            aria-live="polite"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 items-center justify-center rounded-full",
                longEnough && !mismatch ? "bg-[var(--success-soft-bg)]" : "bg-[var(--gray-100)]",
              )}
            >
              {longEnough && !mismatch ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : null}
            </span>
            {mismatch ? "De paswoorden zijn niet gelijk" : "Minstens 8 tekens"}
          </p>
          {error && <p className="text-sm text-[var(--error-600)]">{error}</p>}
          <Button variant="primary" type="submit" disabled={!canNext} className={cn("mt-1", authPrimaryButtonClass(canNext))}>
            {isSavingPassword ? "Opslaan…" : "Volgende"}
          </Button>
        </form>
      </RegisterStepShell>
    );
  }

  /* ── Registratie 4: naam en foto ── */
  if (step === "photo" && user) {
    const canNext = firstName.trim().length > 0 && !isSavingAvatar;

    return (
      <RegisterStepShell
        stepNumber={4}
        onBack={handleGoBack}
        visual={
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
            <button
              type="button"
              onClick={handlePickPhoto}
              aria-label={avatarPreview ? "Profielfoto wijzigen" : "Profielfoto toevoegen"}
              className="relative flex size-[92px] items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-200)] shadow-[0_0_0_4px_var(--white),0_0_0_5px_var(--border-subtle),0_14px_30px_-14px_rgba(79,85,241,0.45)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-4"
            >
              <span className="flex size-full items-center justify-center overflow-hidden rounded-full">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- gebruiker-upload, dynamische data-URL
                  <img src={avatarPreview} alt="" className="size-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-11">
                    <circle cx="12" cy="9" r="4" />
                    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                  </svg>
                )}
              </span>
              <span
                aria-hidden
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] shadow-[0_0_0_3px_var(--white)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
            </button>
          </>
        }
        title="Naam en foto"
        subtitle={
          <>
            Zo zien de mensen met wie je lijstjes
            <br />
            deelt wie iets toevoegde.
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canNext) void upsertProfileNameAndAvatarAndGoHome();
          }}
          className="flex flex-col gap-3"
        >
          <AuthSoftField
            label="Je voornaam"
            autoComplete="given-name"
            autoFocus
            placeholder="Voornaam"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-center text-sm text-[var(--error-600)]">{error}</p>}
          <Button variant="primary" type="submit" disabled={!canNext} className={cn("mt-1", authPrimaryButtonClass(canNext))}>
            {isSavingAvatar ? "Opslaan…" : "Account aanmaken"}
          </Button>
        </form>
      </RegisterStepShell>
    );
  }

  return null;
}
