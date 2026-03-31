"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";

export type ExtractedRecipeData = {
  name: string | null;
  persons: number | null;
  steps: string;
  ingredients: Array<{ name: string; quantity: string }>;
};

type SelectedImage = { file: File; preview: string };

export function RecipePhotoUploadSlideIn({
  open,
  onClose,
  onBack,
  onExtracted,
}: {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onExtracted: (data: ExtractedRecipeData) => void;
}) {
  const [images, setImages] = React.useState<SelectedImage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setImages([]);
    setLoading(false);
    setError(null);
  }, [open]);

  // Revoke object URLs when component unmounts or images are removed
  const prevImagesRef = React.useRef<SelectedImage[]>([]);
  React.useEffect(() => {
    const prev = prevImagesRef.current;
    const current = images;
    prev.forEach((img) => {
      if (!current.includes(img)) URL.revokeObjectURL(img.preview);
    });
    prevImagesRef.current = current;
  }, [images]);

  const addFiles = React.useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    if (newImages.length === 0) return;
    setImages((prev) => {
      const combined = [...prev, ...newImages];
      return combined.slice(0, 10);
    });
    setError(null);
  }, []);

  const removeImage = React.useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleExtract = React.useCallback(async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const base64Images = await Promise.all(
        images.map(
          (img) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Lezen mislukt"));
              reader.readAsDataURL(img.file);
            }),
        ),
      );

      const res = await fetch("/api/extract-recipe-from-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Onbekende fout" }));
        throw new Error(typeof err?.error === "string" ? err.error : "Onbekende fout");
      }
      const data = (await res.json()) as ExtractedRecipeData;
      onExtracted(data);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Kon recept niet extraheren. Probeer het opnieuw.",
      );
    } finally {
      setLoading(false);
    }
  }, [images, onExtracted, onClose]);

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      onBack={onBack}
      title="Foto's opladen"
      titleId="recipe-photo-upload-slide-title"
      containerClassName="z-[70]"
      footer={
        <div className="flex w-full flex-col items-center gap-3">
          {error ? (
            <p className="text-center text-xs text-[var(--color-error,#ef4444)]">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            onClick={handleExtract}
            disabled={images.length === 0 || loading}
          >
            {loading ? "Bezig met extraheren…" : "Extraheer recept"}
          </Button>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col gap-6 px-4">
        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-12 text-center transition-colors hover:border-[var(--blue-500)] hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <UploadIcon />
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium leading-24 text-[var(--text-primary)]">
                Tik om foto&apos;s te kiezen
              </p>
              <p className="text-sm leading-20 text-[var(--text-secondary)]">
                Kies één of meerdere foto&apos;s (max. 10)
              </p>
            </div>
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-20 text-[var(--text-secondary)]">
              {images.length} foto{images.length > 1 ? "s" : ""} geselecteerd
            </p>
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div
                  key={img.preview}
                  className="relative aspect-square overflow-hidden rounded-lg bg-[var(--bg-elevated)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt={`Foto ${i + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Foto ${i + 1} verwijderen`}
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <SmallCrossIcon />
                  </button>
                </div>
              ))}
              {images.length < 10 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Meer foto's toevoegen"
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] transition-colors hover:border-[var(--blue-500)] hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <PlusIcon />
                </button>
              ) : null}
            </div>
          </div>
        )}

        <p className="text-center text-xs leading-18 text-[var(--text-tertiary)]">
          AI herkent ingrediënten, bereidingsstappen en de receptnaam. Amerikaanse
          maateenheden worden automatisch omgezet naar metrisch.
        </p>
      </div>
    </SlideInModal>
  );
}

function UploadIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-[var(--blue-500)]"
    >
      <path
        d="M12 16V8M12 8L9 11M12 8L15 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SmallCrossIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 6L6 18M6 6L18 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-[var(--blue-500)]"
    >
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
