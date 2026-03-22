"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShareListModalProps {
  open: boolean;
  onClose: () => void;
  /** Volledige uitnodigings-URL; leeg zolang token nog wordt aangemaakt */
  shareUrl: string;
  /** True zodra shareUrl klaar is om te tonen/kopiëren */
  urlReady: boolean;
}

/**
 * Deel een lijstje: kopiëren, systeemdeel-sheet, WhatsApp, e-mail.
 */
export function ShareListModal({
  open,
  onClose,
  shareUrl,
  urlReady,
}: ShareListModalProps) {
  const [copyHint, setCopyHint] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setCopyHint(null);
  }, [open]);

  const shareText = React.useMemo(
    () =>
      shareUrl
        ? `Schrijf mee op dit lijstje in Shopping list:\n${shareUrl}`
        : "",
    [shareUrl],
  );

  const handleCopy = async () => {
    if (!shareUrl || !urlReady) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyHint("Link gekopieerd");
      window.setTimeout(() => setCopyHint(null), 2500);
    } catch {
      setCopyHint("Kopiëren mislukt");
      window.setTimeout(() => setCopyHint(null), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl || !urlReady) return;
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: "Lijstje delen",
        text: "Schrijf mee op dit lijstje:",
        url: shareUrl,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      await handleCopy();
    }
  };

  const openWhatsApp = () => {
    if (!shareUrl || !urlReady) return;
    const u = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const openEmail = () => {
    if (!shareUrl || !urlReady) return;
    const subject = encodeURIComponent("Uitnodiging: meeschrijven op een lijstje");
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Lijstje delen"
      compact
      className="max-h-[min(520px,90dvh)]"
    >
      <div className="mx-auto flex w-full max-w-[956px] flex-col gap-4 px-4">
        <p className="text-sm leading-20 text-[var(--text-secondary)]">
          Iedereen met deze link kan meeschrijven zodra ze inloggen. Wijzigingen
          verschijnen realtime voor iedereen.
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            Uitnodigingslink
          </span>
          <div
            className={cn(
              "rounded-md border border-[var(--gray-100)] bg-[var(--gray-50)] px-3 py-2 text-xs break-all text-[var(--text-primary)]",
              !urlReady && "text-[var(--text-tertiary)]",
            )}
          >
            {urlReady ? shareUrl : "Link wordt aangemaakt…"}
          </div>
          {copyHint ? (
            <p className="text-xs text-[var(--blue-500)]" role="status">
              {copyHint}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={!urlReady}
            onClick={handleCopy}
          >
            Link kopiëren
          </Button>
          {"share" in navigator && typeof navigator.share === "function" ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!urlReady}
              onClick={handleNativeShare}
            >
              Delen…
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!urlReady}
            onClick={openWhatsApp}
          >
            Delen via WhatsApp
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!urlReady}
            onClick={openEmail}
          >
            Delen via e-mail
          </Button>
        </div>
      </div>
    </SlideInModal>
  );
}
