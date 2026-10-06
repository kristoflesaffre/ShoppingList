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
}

const AVATARS = ["/images/delen/avatar-man-160.jpg", "/images/delen/avatar-vrouw-160.jpg"] as const;

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <path d="M12 4v11M8 8l4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
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
      className="group flex flex-1 flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:group-active:scale-95 [@media(hover:hover)]:group-hover:bg-[var(--blue-100)]">
        {icon}
      </span>
      <span className="text-[12.5px] font-semibold leading-4 text-[var(--text-primary)]">{label}</span>
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
}: ShareListModalProps) {
  const [copied, setCopied] = React.useState<"ok" | "fail" | null>(null);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  React.useEffect(() => {
    if (!open) setCopied(null);
  }, [open]);

  React.useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const shareText = shareUrl ? `Schrijf mee op dit lijstje in Shopping list:\n${shareUrl}` : "";
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
    const subject = encodeURIComponent("Uitnodiging: meeschrijven op een lijstje");
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(shareText)}`;
  };

  const openNativeShare = async () => {
    if (!ready) return;
    try {
      await navigator.share({ title: "Lijstje delen", text: "Schrijf mee op dit lijstje:", url: shareUrl });
    } catch {
      /* geannuleerd */
    }
  };

  const displayUrl = shareUrl.replace(/^https?:\/\//, "");

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Lijstje delen"
      bodyFullWidth
      className="!bg-[var(--bg-app)] md:!max-w-[540px]"
      bodyClassName="pt-2"
    >
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-[calc(30px+env(safe-area-inset-bottom,0px))] md:px-6 md:pb-6">
        <div className="flex flex-col items-center gap-2.5 pb-0.5 pt-1.5 text-center">
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
            <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2">
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
          <h3 className="mt-1 text-[17px] font-bold leading-6 text-[var(--text-primary)]">Samen op één lijstje</h3>
          <p className="max-w-[310px] text-[13.5px] leading-[19px] text-[var(--text-secondary)]">
            Stuur de link naar je partner of huisgenoot. Jullie zien allebei meteen wat erbij komt en wat al in de kar
            ligt.
          </p>
        </div>

        <div className="flex gap-2 px-2.5">
          <ShareOption icon={<ChatIcon />} label="WhatsApp" onClick={openWhatsApp} disabled={!ready} />
          <ShareOption icon={<MailIcon />} label="E-mail" onClick={openEmail} disabled={!ready} />
          {canNativeShare ? (
            <ShareOption icon={<ShareIcon />} label="Meer…" onClick={() => void openNativeShare()} disabled={!ready} />
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
            className="inline-flex h-[38px] shrink-0 items-center rounded-pill bg-[var(--action-primary)] px-4 text-sm font-bold text-[var(--white)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {copied === "ok" ? "Gekopieerd ✓" : copied === "fail" ? "Mislukt" : "Kopieer"}
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
      </div>
    </SlideInModal>
  );
}
