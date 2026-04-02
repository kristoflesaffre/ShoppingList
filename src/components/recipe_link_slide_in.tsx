"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";

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

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title="Recept ophalen uit link"
      titleId="recipe-link-slide-title"
      containerClassName={containerClassName ?? "z-[70]"}
      footer={
        <div className="flex flex-col items-center">
          <Button
            type="button"
            variant="primary"
            disabled={!hasValidLink || loading}
            onClick={handleSubmit}
          >
            {loading ? "Bezig…" : "Haal recept op uit link"}
          </Button>
        </div>
      }
    >
      <div className="flex w-full flex-col gap-8">
        <p className="text-base font-light leading-24 tracking-normal text-[var(--text-primary)]">
          Plak hieronder de link waaruit AI het recept en de ingrediënten kan halen.
        </p>
        <div className="flex flex-col gap-4">
          <InputField
            ref={inputRef}
            label="Link recept"
            placeholder="http://www.recept.com"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            type="url"
            inputMode="url"
            autoComplete="off"
          />
          {error && (
            <p className="text-xs text-[var(--status-error)]">{error}</p>
          )}
        </div>
      </div>
    </SlideInModal>
  );
}
