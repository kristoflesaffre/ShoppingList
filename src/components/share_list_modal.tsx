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
  /** True zodra shareUrl klaar is om te kopiëren / mailen */
  urlReady: boolean;
}

/**
 * Slide-in “Lijstje delen” (niet-iPhone). Figma 759:2537 — intro + e-mail + kopiëren.
 * Op iPhone opent de parent enkel de native share-sheet.
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

  const openEmail = () => {
    if (!shareUrl || !urlReady) return;
    const subject = encodeURIComponent(
      "Uitnodiging: meeschrijven op een lijstje",
    );
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Lijstje delen"
      compact
      bodyFullWidth
      className="rounded-t-[var(--radius-md)]"
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[390px] flex-col items-center",
          "gap-8 px-4 pb-[calc(45px+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <p
          className="w-full max-w-[358px] text-left font-light text-base leading-24 tracking-normal text-[var(--text-primary)]"
        >
          Iedereen met deze link kan items toevoegen en afvinken in dit lijstje.
          Wijzigingen verschijnen realtime voor iedereen.
        </p>

        <div className="flex w-full max-w-[320px] flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={!urlReady}
            onClick={openEmail}
            className={cn(
              "max-w-none min-w-0 w-full py-2.5",
              "border border-[var(--action-primary)] bg-[var(--white)]",
              "text-[var(--action-primary)] hover:bg-[var(--blue-25)]",
            )}
          >
            Link delen via e-mail
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!urlReady}
            onClick={handleCopy}
            className="max-w-none min-w-0 w-full py-2.5"
          >
            Link kopiëren
          </Button>
          {copyHint ? (
            <p className="text-center text-xs text-[var(--blue-500)]" role="status">
              {copyHint}
            </p>
          ) : null}
        </div>
      </div>
    </SlideInModal>
  );
}
