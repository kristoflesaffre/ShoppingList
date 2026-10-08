"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { SheetIntro } from "@/components/ui/option_tile";
import { ProgressSteps, useProgressSteps } from "@/components/ui/progress_steps";

export type ExtractedRecipeLinkData = {
  name?: string | null;
  persons?: number | null;
  steps?: string;
  ingredients?: Array<{ name: string; quantity: string }>;
};

export function RecipeLinkSlideIn({
  open,
  onClose,
  onExtracted,
  containerClassName,
}: {
  open: boolean;
  onClose: () => void;
  onExtracted: (data: ExtractedRecipeLinkData) => void;
  containerClassName?: string;
}) {
  const [link, setLink] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setLink("");
      setError(null);
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const hasValidLink = React.useMemo(() => {
    const trimmed = link.trim();
    if (!trimmed) return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [link]);

  const handleSubmit = React.useCallback(async () => {
    if (!hasValidLink || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Onbekende fout" }));
        throw new Error(typeof err?.error === "string" ? err.error : "Onbekende fout");
      }
      const data = (await res.json()) as ExtractedRecipeLinkData;
      onExtracted(data);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon recept niet ophalen. Probeer het opnieuw.",
      );
    } finally {
      setLoading(false);
    }
  }, [link, hasValidLink, loading, onExtracted, onClose]);

  const step = useProgressSteps(loading, [900, 3200]);
  const [canPaste, setCanPaste] = React.useState(false);
  React.useEffect(() => {
    setCanPaste(typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function");
  }, []);
  const pasteFromClipboard = React.useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setLink(text);
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
  }, []);

  /* Canvas «18 · Recept uit link»: kop met icoon, linkveld met «Plakken», stappen tijdens het ophalen. */
  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title=""
      titleId="recipe-link-slide-title"
      containerClassName={containerClassName ?? "z-[70]"}
      className="md:!max-w-[500px]"
      cancelLabel={null}
      footer={
        loading ? undefined : (
          <Button type="button" variant="primary" disabled={!hasValidLink} onClick={handleSubmit}>
            Recept ophalen
          </Button>
        )
      }
    >
      <div className="flex w-full flex-col gap-[18px] pb-2">
        {loading ? (
          <>
            <SheetIntro icon={<LinkIcon className="size-7" />} title="Recept ophalen…" text={link.trim().replace(/^https?:\/\/(www\.)?/, "")} />
            <ProgressSteps steps={["Pagina gelezen", "Ingrediënten herkennen", "Stappen omzetten"]} current={step} />
          </>
        ) : (
          <>
            <SheetIntro
              icon={<LinkIcon className="size-7" />}
              title="Recept uit een link"
              text="Wij halen naam, ingrediënten en stappen van de receptsite."
            />
            <label className="flex h-[54px] items-center gap-2.5 rounded-[16px] bg-[var(--gray-25)] pl-3.5 pr-2 transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--blue-300)]">
              <span aria-hidden className="flex shrink-0 text-[var(--text-secondary)]">
                <LinkIcon className="size-5" />
              </span>
              <input
                ref={inputRef}
                type="url"
                inputMode="url"
                autoComplete="off"
                aria-label="Link van het recept"
                placeholder="Plak de link van het recept"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSubmit();
                }}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none"
              />
              {canPaste && !link ? (
                <button
                  type="button"
                  onClick={() => void pasteFromClipboard()}
                  className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-pill bg-[var(--white)] px-3 text-[13px] font-bold text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                    <rect x="7" y="4" width="10" height="4" rx="1.5" />
                    <path d="M8 6H6.5A1.5 1.5 0 0 0 5 7.5v12A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 17.5 6H16" />
                  </svg>
                  Plakken
                </button>
              ) : null}
            </label>
            {error ? (
              <p role="alert" className="-mt-2 px-1 text-xs text-[var(--error-600)]">
                {error}
              </p>
            ) : null}
            <p className="px-2.5 text-center text-xs leading-[17px] text-[var(--text-tertiary)]">
              Werkt met de meeste receptsites. Amerikaanse maten zetten we om naar gram en liter.
            </p>
          </>
        )}
      </div>
    </SlideInModal>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}
