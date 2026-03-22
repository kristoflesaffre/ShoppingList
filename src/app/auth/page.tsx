"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input_field";
import { MiniButton } from "@/components/ui/mini_button";
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

type AuthStep = "landing" | "email" | "code" | "password" | "photo";

type AuthFlow = "login" | "register";

const PROFILE_SETUP_STEPS: AuthStep[] = ["password", "photo"];

const authShell =
  "flex min-h-dvh w-full flex-col bg-gradient-to-b from-[var(--blue-100)] to-[var(--white)]";
const authContentWrap = "mx-auto flex w-full max-w-[768px] flex-1 flex-col px-4";
/** 24px boven de onderkant; safe-area voor iOS erbovenop */
const authFooterPad =
  "pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-4";

/** public/icons/arrow.svg – kleur primary 500 via mask */
function ArrowBackIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-6 shrink-0 bg-[var(--blue-500)]",
        className,
      )}
      style={{
        maskImage: "url(/icons/arrow.svg)",
        WebkitMaskImage: "url(/icons/arrow.svg)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
      aria-hidden
    />
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

function StepHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--gray-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        aria-label="Terug"
      >
        <ArrowBackIcon />
      </button>
      <h1 className="flex-1 text-2xl font-bold leading-8 text-[var(--text-primary)]">
        {title}
      </h1>
    </div>
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
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = React.useState(false);
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
    if (step === "landing" || step === "email" || step === "code") {
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
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[var(--blue-100)] to-[var(--white)]">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--blue-300)] border-t-[var(--blue-500)]" />
      </div>
    );
  }

  if (
    user &&
    step !== "landing" &&
    step !== "email" &&
    step !== "code" &&
    !PROFILE_SETUP_STEPS.includes(step)
  ) {
    return null;
  }

  const handleStartLogin = () => {
    setFlow("login");
    setStep("email");
    setEmail("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setAvatarPreview(null);
    setError(null);
  };

  const handleStartRegister = () => {
    setFlow("register");
    setStep("email");
    setEmail("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setAvatarPreview(null);
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

  const handleGoBack = async () => {
    setError(null);
    if (step === "email") {
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

  const upsertAvatarAndGoHome = async () => {
    if (!user?.id) return;
    setIsSavingAvatar(true);
    setError(null);
    try {
      const pid = existingProfile?.id ?? profileIdRef.current ?? iid();
      profileIdRef.current = pid;
      await db.transact(
        db.tx.profiles[pid].update({
          instantUserId: user.id,
          ...(avatarPreview ? { avatarUrl: avatarPreview } : {}),
        }),
      );
      router.replace(getPostAuthDestination());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Profielfoto opslaan mislukt.",
      );
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleSkipPhoto = () => {
    router.replace(getPostAuthDestination());
  };

  /* ── Landing ── */
  if (step === "landing") {
    return (
      <div className={cn(authShell, "relative items-center")}>
        <div
          className={cn(
            authContentWrap,
            "items-center justify-center gap-12 pb-40",
          )}
        >
          <Image
            src="/images/ui/logo.png"
            alt="Shopping list"
            width={174}
            height={36}
            className="h-9 w-auto"
            priority
          />
          <Image
            src="/images/ui/basket.png"
            alt=""
            width={256}
            height={237}
            className="h-auto w-[256px]"
            priority
          />
        </div>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[768px] flex-col items-center gap-3 px-4",
            authFooterPad,
          )}
        >
          <Button
            variant="secondary"
            onClick={handleStartLogin}
            className="w-full max-w-[320px]"
          >
            Inloggen
          </Button>
          <Button
            variant="primary"
            onClick={handleStartRegister}
            className="w-full max-w-[320px]"
          >
            Account aanmaken
          </Button>
        </div>
      </div>
    );
  }

  /* ── Email step ── */
  if (step === "email") {
    const title = flow === "login" ? "Inloggen" : "Account aanmaken";
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    return (
      <div
        className={cn(authShell, "pt-[env(safe-area-inset-top,0px)]")}
      >
        <div className={cn(authContentWrap, "gap-6 pt-12")}>
          <StepHeader title={title} onBack={handleGoBack} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCode();
            }}
            className="flex flex-col gap-6"
          >
            <InputField
              label="Je e-mailadres"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="E-mailadres"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />

            {error && (
              <p className="text-sm text-[var(--error-600)]">{error}</p>
            )}
          </form>
        </div>

        <div
          className={cn(
            "mx-auto flex w-full max-w-[768px] justify-center px-4",
            authFooterPad,
          )}
        >
          <Button
            variant="primary"
            disabled={!isValid || isSending}
            onClick={handleSendCode}
            className="w-full max-w-[320px]"
          >
            {isSending ? "Versturen…" : "Volgende"}
          </Button>
        </div>
      </div>
    );
  }

  /* ── Code step ── */
  if (step === "code") {
    return (
      <div
        className={cn(authShell, "pt-[env(safe-area-inset-top,0px)]")}
      >
        <div className={cn(authContentWrap, "gap-6 pt-12")}>
          <StepHeader title="Verificatiecode ingeven" onBack={handleGoBack} />

          <p className="text-base font-light leading-6 text-[var(--text-primary)]">
            Geef de verificatiecode van 6 cijfers in die verstuurd werd naar
            het e-mailadres <span className="font-medium">{email}</span>
          </p>

          <OtpInput
            length={6}
            autoFocus
            disabled={isVerifying}
            onChange={(v) => setCode(v)}
            onComplete={(v) => handleVerifyCode(v)}
          />

          {error && (
            <p className="text-sm text-[var(--error-600)]">{error}</p>
          )}
        </div>

        <div
          className={cn(
            "mx-auto flex w-full max-w-[768px] flex-col items-center gap-3 px-4",
            authFooterPad,
          )}
        >
          <Button
            variant="tertiary"
            onClick={handleResendCode}
            disabled={isSending}
            className="w-full max-w-[320px]"
          >
            {isSending ? "Versturen…" : "Nieuwe code versturen"}
          </Button>
          <Button
            variant="primary"
            disabled={code.length < 6 || isVerifying}
            onClick={() => handleVerifyCode()}
            className="w-full max-w-[320px]"
          >
            {isVerifying ? "Verifiëren…" : "Code verifiëren"}
          </Button>
        </div>
      </div>
    );
  }

  /* ── Password step (register only) ── */
  if (step === "password" && user) {
    const canNext =
      password.length >= 8 &&
      confirmPassword.length >= 8 &&
      password === confirmPassword;

    return (
      <div
        className={cn(authShell, "pt-[env(safe-area-inset-top,0px)]")}
      >
        <div className={cn(authContentWrap, "gap-6 pt-12")}>
          <StepHeader title="Account aanmaken" onBack={handleGoBack} />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="auth-password"
              className="text-sm font-normal leading-5 text-[var(--text-primary)]"
            >
              Je paswoord
            </label>
            <div className="relative flex w-full items-center">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Paswoord"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className={cn(
                  "h-12 w-full rounded-md border border-[var(--border-default)] bg-[var(--white)] py-2 pl-4 pr-12 text-base leading-6 text-[var(--text-primary)]",
                  "placeholder:text-[var(--text-placeholder)] focus-visible:border-[var(--border-focus)] focus-visible:outline-none",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                aria-label={showPassword ? "Verberg paswoord" : "Toon paswoord"}
              >
                <PasswordVisibilityIcon passwordVisible={showPassword} />
              </button>
            </div>
          </div>

          <InputField
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

          {error && (
            <p className="text-sm text-[var(--error-600)]">{error}</p>
          )}
        </div>

        <div
          className={cn(
            "mx-auto flex w-full max-w-[768px] justify-center px-4",
            authFooterPad,
          )}
        >
          <Button
            variant="primary"
            disabled={!canNext || isSavingPassword}
            onClick={handleSavePassword}
            className="w-full max-w-[320px]"
          >
            {isSavingPassword ? "Opslaan…" : "Volgende"}
          </Button>
        </div>
      </div>
    );
  }

  /* ── Profile photo step (register only) ── */
  if (step === "photo" && user) {
    return (
      <div
        className={cn(authShell, "pt-[env(safe-area-inset-top,0px)]")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
        <div className={cn(authContentWrap, "gap-6 pt-12")}>
          <StepHeader title="Profielfoto" onBack={handleGoBack} />

          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="flex size-[160px] items-center justify-center overflow-hidden rounded-full bg-[var(--white)] ring-1 ring-[var(--gray-100)]">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- gebruiker-upload, dynamische data-URL
                <img
                  src={avatarPreview}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <svg
                  className="size-[106px] text-[var(--blue-300)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                </svg>
              )}
            </div>
            <MiniButton variant="secondary" type="button" onClick={handlePickPhoto}>
              Profielfoto toevoegen
            </MiniButton>
          </div>

          {error && (
            <p className="text-center text-sm text-[var(--error-600)]">{error}</p>
          )}
        </div>

        <div
          className={cn(
            "mx-auto flex w-full max-w-[768px] flex-col items-center gap-3 px-4",
            authFooterPad,
          )}
        >
          <Button
            variant="tertiary"
            onClick={handleSkipPhoto}
            disabled={isSavingAvatar}
            className="w-full max-w-[320px]"
          >
            Overslaan
          </Button>
          <Button
            variant="primary"
            disabled={!avatarPreview || isSavingAvatar}
            onClick={upsertAvatarAndGoHome}
            className="w-full max-w-[320px]"
          >
            {isSavingAvatar ? "Opslaan…" : "Volgende"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
