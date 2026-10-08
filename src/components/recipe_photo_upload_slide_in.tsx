"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { OptionTile, SheetIntro } from "@/components/ui/option_tile";
import { ProgressSteps, useProgressSteps } from "@/components/ui/progress_steps";

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
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

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
        images.map((img) => compressImage(img.file)),
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

  const step = useProgressSteps(loading, [1200, 4500]);
  const hasImages = images.length > 0;

  /* Canvas «18 · Recept uit foto's»: kiezen met twee tegels, daarna genummerde miniaturen. */
  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      onBack={onBack}
      title={hasImages && !loading ? "Recept uit foto's" : ""}
      titleId="recipe-photo-upload-slide-title"
      containerClassName="z-[70]"
      className="md:!max-w-[500px]"
      cancelLabel={null}
      footer={
        hasImages && !loading ? (
          <div className="flex w-full flex-col items-center gap-3">
            {error ? (
              <p role="alert" className="text-center text-xs text-[var(--error-600)]">
                {error}
              </p>
            ) : null}
            <Button type="button" variant="primary" onClick={handleExtract}>
              Recept herkennen
            </Button>
          </div>
        ) : undefined
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex w-full flex-col gap-[18px] pb-2">
        {loading ? (
          <>
            <SheetIntro
              icon={<ImageIcon className="size-7" />}
              title="Recept herkennen…"
              text={`${images.length} foto${images.length > 1 ? "'s" : ""}`}
            />
            <ProgressSteps steps={["Foto's gelezen", "Ingrediënten herkennen", "Stappen omzetten"]} current={step} />
          </>
        ) : !hasImages ? (
          <>
            <SheetIntro
              icon={<ImageIcon className="size-7" />}
              title="Recept uit foto's"
              text="Van een kookboek, een tijdschrift of een handgeschreven briefje."
            />
            <div className="flex gap-2.5">
              <OptionTile
                icon={<CameraIcon className="size-7" />}
                title="Foto nemen"
                subtitle="Met je camera"
                onClick={() => cameraInputRef.current?.click()}
              />
              <OptionTile
                icon={<ImageIcon className="size-7" />}
                title="Uit je foto's"
                subtitle="Tot 10 foto's"
                onClick={() => fileInputRef.current?.click()}
              />
            </div>
            <p className="px-2.5 text-center text-xs leading-[17px] text-[var(--text-tertiary)]">
              Wij herkennen naam, ingrediënten en stappen en vertalen naar het Nederlands.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between px-0.5">
              <span className="text-[15px] font-bold text-[var(--text-primary)]">
                {images.length} foto{images.length > 1 ? "'s" : ""}
              </span>
              {images.length > 1 ? (
                <span className="text-[12.5px] text-[var(--text-secondary)]">In deze volgorde gelezen</span>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {images.map((img, i) => (
                <div key={img.preview} className="relative aspect-square overflow-hidden rounded-[14px] bg-[var(--gray-50)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- lokale preview */}
                  <img src={img.preview} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                  <span
                    aria-hidden
                    className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--white)] text-[11px] font-extrabold text-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                  >
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Foto ${i + 1} verwijderen`}
                    onClick={() => removeImage(i)}
                    className="absolute right-1.5 top-1.5 flex size-[22px] items-center justify-center rounded-full bg-[rgba(16,17,48,0.55)] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:bg-[rgba(16,17,48,0.75)]"
                  >
                    <SmallCrossIcon />
                  </button>
                </div>
              ))}
              {images.length < 10 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] border-[1.6px] border-dashed border-[var(--blue-200)] text-xs font-bold text-[var(--blue-500)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--blue-25)]"
                >
                  <PlusIcon />
                  Foto
                </button>
              ) : null}
            </div>
            <p className="px-2.5 text-center text-xs leading-[17px] text-[var(--text-tertiary)]">
              Tip: één foto per pagina, recht van boven, zonder schaduw.
            </p>
          </>
        )}
      </div>
    </SlideInModal>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 16l-5-5-8 8" />
    </svg>
  );
}

/** Resize naar max 1024px en converteer naar JPEG voor kleinere upload. */
function compressImage(file: File, maxDim = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      let newW = width;
      let newH = height;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          newW = maxDim;
          newH = Math.round((height / width) * maxDim);
        } else {
          newH = maxDim;
          newW = Math.round((width / height) * maxDim);
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas niet beschikbaar")); return; }
      ctx.drawImage(img, 0, 0, newW, newH);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Afbeelding laden mislukt"));
    };
    img.src = objectUrl;
  });
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
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
