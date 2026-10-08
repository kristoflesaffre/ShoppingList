"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface ShareListModalFutureShare {
  /** Soortnaam, bv. «Supermarkt». */
  label: string;
  imageSrc: string;
  /** Achtergrondkleur van de soorttegel. */
  tint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export interface ShareListModalProps {
  open: boolean;
  onClose: () => void;
  /** Volledige uitnodigings-URL; leeg zolang token nog wordt aangemaakt */
  shareUrl: string;
  /** True zodra shareUrl klaar is om te kopiëren / mailen */
  urlReady: boolean;
  /** Foto of illustratie van het lijstje in de kop; zonder → twee-personen-icoon. */
  listImageSrc?: string | null;
  /** True als `listImageSrc` een eigen foto is (vult de cirkel) i.p.v. een illustratie. */
  listImageIsPhoto?: boolean;
  /** «Ook toekomstige lijstjes»-kaart; enkel voor de eigenaar van een gewoon lijstje. */
  futureShare?: ShareListModalFutureShare | null;
  /** Teksten voor hergebruik (bv. algemene uitnodiging vanuit «Samen delen»). */
  title?: string;
  heading?: string;
  description?: string;
  /** Tekst bij de link in WhatsApp/e-mail. */
  shareMessage?: string;
  emailSubject?: string;
  /** Extra inhoud onderaan het blad (bv. soorten kiezen). */
  extra?: React.ReactNode;
  /** Eigen beeld in de kop i.p.v. lijstfoto met twee mensen (bv. het bord van een recept). */
  headerMedia?: React.ReactNode;
}

const AVATARS = ["/images/delen/avatar-man-160.jpg", "/images/delen/avatar-vrouw-160.jpg"] as const;

/** WhatsApp-logo in zijn eigen groen (zoals de app het kent). */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6">
      <path
        fill="#25d366"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.5 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .6l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"
      />
    </svg>
  );
}

/** Gevulde envelop in zacht lavendel met witte klep, in dezelfde stijl als het WhatsApp-logo. */
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6">
      <rect x="1.5" y="4" width="21" height="16" rx="3.4" fill="#a9adf4" />
      <path d="M5 7.9 12 12.9l7-5" fill="none" stroke="#fff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Drie puntjes: het deelmenu van het toestel. */
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-6">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-10">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M16.5 14c3 .2 5 2.3 5 5.5" />
    </svg>
  );
}

function ShareOption({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-[84px] flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-[var(--white)] text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_var(--border-subtle)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:group-active:scale-95 [@media(hover:hover)]:group-hover:bg-[var(--gray-25)]">
        {icon}
      </span>
      <span className="text-[12.5px] font-semibold leading-4 text-[var(--text-secondary)]">{label}</span>
    </button>
  );
}

/**
 * Slide-in «Lijstje delen» (niet-iPhone; op iPhone opent de parent de native share-sheet).
 * Kop: lijstfoto met twee mensen eronder · deelknoppen · link met Kopieer ·
 * optioneel «Ook toekomstige lijstjes».
 */
export function ShareListModal({
  open,
  onClose,
  shareUrl,
  urlReady,
  listImageSrc,
  listImageIsPhoto = false,
  futureShare,
  title = "Lijstje delen",
  heading = "Samen op één lijstje",
  description = "Stuur de link naar je partner of huisgenoot. Jullie zien allebei meteen wat erbij komt en wat al in de kar ligt.",
  shareMessage = "Schrijf mee op dit lijstje in Shopping list:",
  emailSubject = "Uitnodiging: meeschrijven op een lijstje",
  extra,
  headerMedia,
}: ShareListModalProps) {
  const [copied, setCopied] = React.useState<"ok" | "fail" | null>(null);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  React.useEffect(() => {
    if (!open) setCopied(null);
  }, [open]);

  React.useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const shareText = shareUrl ? `${shareMessage}\n${shareUrl}` : "";
  const ready = urlReady && Boolean(shareUrl);

  const handleCopy = async () => {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied(null), 2500);
  };

  const openWhatsApp = () => {
    if (!ready) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };

  const openEmail = () => {
    if (!ready) return;
    const subject = encodeURIComponent(emailSubject);
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(shareText)}`;
  };

  const openNativeShare = async () => {
    if (!ready) return;
    try {
      await navigator.share({ title: title || heading, text: shareMessage, url: shareUrl });
    } catch {
      /* geannuleerd */
    }
  };

  const displayUrl = shareUrl.replace(/^https?:\/\//, "");

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={title}
      bodyFullWidth
      className="!bg-[var(--bg-app)] md:!max-w-[540px]"
      bodyClassName="pt-2"
    >
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-[calc(30px+env(safe-area-inset-bottom,0px))] md:px-6 md:pb-6">
        <div className="flex flex-col items-center gap-2.5 pb-0.5 pt-1.5 text-center">
          {headerMedia ?? (
          <div className="relative h-[110px] w-24">
            <span className="mx-auto flex size-[88px] items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]">
              {listImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- lijstfoto of illustratie
                <img
                  src={listImageSrc}
                  alt=""
                  className={listImageIsPhoto ? "size-full object-cover" : "size-[54px] object-contain"}
                />
              ) : (
                <PeopleIcon />
              )}
            </span>
            <span className="absolute bottom-0 left-1/2 flex w-max -translate-x-1/2">
              {AVATARS.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- decoratieve avatar
                <img
                  key={src}
                  src={src}
                  alt=""
                  width={40}
                  height={40}
                  className={cn(
                    "size-10 rounded-full object-cover shadow-[0_0_0_3px_var(--white)]",
                    i > 0 && "-ml-2",
                  )}
                />
              ))}
            </span>
          </div>
          )}
          <h3 className="mt-1 text-[17px] font-bold leading-6 text-[var(--text-primary)]">{heading}</h3>
          <p className="max-w-[310px] text-[13.5px] leading-[19px] text-[var(--text-secondary)]">{description}</p>
        </div>

        <div className="flex justify-center gap-1">
          <ShareOption icon={<WhatsAppIcon />} label="WhatsApp" onClick={openWhatsApp} disabled={!ready} />
          <ShareOption icon={<MailIcon />} label="E-mail" onClick={openEmail} disabled={!ready} />
          {canNativeShare ? (
            <ShareOption icon={<MoreIcon />} label="Meer…" onClick={() => void openNativeShare()} disabled={!ready} />
          ) : null}
        </div>

        <div className="flex h-[52px] items-center gap-2.5 rounded-[16px] bg-[var(--white)] pl-3.5 pr-1.5 shadow-[0_0_0_1px_var(--border-subtle)]">
          <span className="flex text-[var(--text-tertiary)]">
            <LinkIcon />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">
            {ready ? displayUrl : "Link aanmaken…"}
          </span>
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!ready}
            className={cn(
              "inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-bold transition-[background-color,color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:opacity-50",
              copied === "ok"
                ? "bg-[var(--white)] text-[var(--blue-500)] shadow-[inset_0_0_0_1.5px_var(--blue-300)]"
                : copied === "fail"
                  ? "bg-[var(--white)] text-[var(--error-600)] shadow-[inset_0_0_0_1.5px_var(--error-300)]"
                  : "bg-[var(--action-primary)] text-[var(--white)]",
            )}
          >
            {copied === "ok" ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                Gekopieerd
              </>
            ) : copied === "fail" ? (
              "Mislukt"
            ) : (
              "Kopieer"
            )}
          </button>
        </div>
        <span className="sr-only" role="status">
          {copied === "ok" ? "Link gekopieerd" : copied === "fail" ? "Kopiëren mislukt" : ""}
        </span>

        {futureShare ? (
          <div className="flex items-center gap-3 rounded-[18px] bg-[var(--white)] px-3.5 py-3 shadow-[0_0_0_1px_var(--border-subtle)]">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: futureShare.tint }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- soortillustratie */}
              <img src={futureShare.imageSrc} alt="" className="size-[29px] object-contain" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p id="future-share-label" className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                Ook toekomstige lijstjes
              </p>
              <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
                Elk nieuw {futureShare.label}-lijstje automatisch delen met wie meedoet
              </p>
            </div>
            <Switch
              checked={futureShare.checked}
              onCheckedChange={futureShare.onCheckedChange}
              aria-labelledby="future-share-label"
            />
          </div>
        ) : null}
        {extra}
      </div>
    </SlideInModal>
  );
}
