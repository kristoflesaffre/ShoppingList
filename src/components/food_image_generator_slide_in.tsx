"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Button } from "@/components/ui/button";
import { ProgressSteps, useProgressSteps } from "@/components/ui/progress_steps";
import { Shimmer } from "@/components/ui/shimmer";
import type { FoodImageGenerationResult } from "@/components/food-image-generator";

export type { FoodImageGenerationResult } from "@/components/food-image-generator";

type Phase = "form" | "busy" | "result" | "applying";

function AiImageIcon({ className = "size-[30px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M15 5H6.5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-6" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 16l-5-5-8 8" />
      <path d="M20 .9l.85 2.25 2.25.85-2.25.85L20 7.1l-.85-2.25L16.9 4l2.25-.85z" />
    </svg>
  );
}

/** Leeg bord met het AI-foto-icoon (nog geen foto). */
function EmptyPlate() {
  return (
    <span className="mx-auto flex size-[132px] items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_14px_26px_-14px_rgba(16,17,48,0.35),inset_0_0_0_10px_var(--blue-25),inset_0_0_0_11px_var(--blue-50)]">
      <AiImageIcon />
    </span>
  );
}

const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-[var(--text-secondary)]";
const fieldBox =
  "w-full rounded-[16px] bg-[var(--gray-25)] px-3.5 text-[15px] leading-[21px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-shadow focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--blue-300)]";

/**
 * Canvas «26 · AI-foto»: foto van een recept laten maken. Invullen → bezig (stappen) →
 * eerst bekijken → «Op recept zetten» of «Nog eens proberen». Mislukt → duidelijke melding.
 */
export function FoodImageGeneratorSlideIn({
  open,
  onClose,
  onBack,
  ownerId,
  initialDishName = "",
  initialDishDescription = "",
  onGenerationComplete,
}: {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  ownerId: string;
  initialDishName?: string;
  initialDishDescription?: string;
  /** Zet de gekozen foto op het recept (downloaden + opslaan). Gooit bij een fout. */
  onGenerationComplete: (result: FoodImageGenerationResult) => Promise<void>;
}) {
  const [dishName, setDishName] = React.useState(initialDishName);
  const [context, setContext] = React.useState(initialDishDescription);
  const [phase, setPhase] = React.useState<Phase>("form");
  const [result, setResult] = React.useState<FoodImageGenerationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const step = useProgressSteps(phase === "busy", [1200, 9000]);

  // Bij opnieuw openen altijd beginnen bij «invullen».
  React.useEffect(() => {
    if (!open) return;
    setPhase("form");
    setResult(null);
    setError(null);
  }, [open]);

  const canGenerate = dishName.trim().length > 0 && phase === "form";

  async function generate() {
    if (!dishName.trim()) return;
    setPhase("busy");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate-food-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId, dishName: dishName.trim(), dishDescription: context.trim() }),
      });
      const json = (await res.json()) as FoodImageGenerationResult | { error?: string };
      if (!res.ok || !("imageUrl" in json)) {
        throw new Error("error" in json && typeof json.error === "string" ? json.error : "generate failed");
      }
      // Vooraf laden zodat het bord meteen gevuld verschijnt.
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = json.imageUrl;
      });
      setResult(json);
      setPhase("result");
    } catch {
      setError("Het maken van de foto lukte niet. Probeer het nog eens.");
      setPhase("form");
    }
  }

  async function apply() {
    if (!result) return;
    setPhase("applying");
    setError(null);
    try {
      await onGenerationComplete(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "De foto kon niet op het recept gezet worden.");
      setPhase("result");
    }
  }

  const title = "Foto laten maken";
  const footer =
    phase === "form" ? (
      <Button type="button" variant="primary" disabled={!canGenerate} onClick={() => void generate()}>
        {error ? "Opnieuw proberen" : "Foto maken"}
      </Button>
    ) : phase === "result" || phase === "applying" ? (
      <div className="flex w-full flex-col items-center gap-1.5">
        <Button type="button" variant="primary" disabled={phase === "applying"} onClick={() => void apply()} className="w-full max-w-none">
          {phase === "applying" ? "Op recept zetten…" : "Op recept zetten"}
        </Button>
        <button
          type="button"
          disabled={phase === "applying"}
          onClick={() => void generate()}
          className="inline-flex h-11 items-center justify-center gap-1.5 self-center rounded-pill px-4 text-[15px] font-bold text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
            <path d="M4 12a8 8 0 1 0 2.4-5.7" />
            <path d="M4 4v4h4" />
          </svg>
          Nog eens proberen
        </button>
      </div>
    ) : undefined;

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      onBack={phase === "busy" || phase === "applying" ? undefined : onBack}
      title={title}
      titleId="food-image-generator-slide-in-title"
      containerClassName="z-[70]"
      className="md:!max-w-[500px]"
      cancelLabel={null}
      footer={footer}
    >
      <div className="flex w-full flex-col gap-[18px] pb-2">
        {phase === "busy" ? (
          <>
            <Shimmer className="mx-auto size-[132px] rounded-full" />
            <div className="text-center">
              <p className="text-xl font-bold text-[var(--text-primary)]">{dishName.trim()}</p>
              <p className="mt-0.5 text-[13.5px] text-[var(--text-secondary)]">Dit duurt meestal 15 tot 30 seconden.</p>
            </div>
            <ProgressSteps steps={["Gerecht begrijpen", "Foto maken", "Afwerken"]} current={step} />
          </>
        ) : (phase === "result" || phase === "applying") && result ? (
          <>
            <span className="mx-auto block size-[220px] overflow-hidden rounded-full bg-[var(--white)] shadow-[0_22px_40px_-18px_rgba(16,17,48,0.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- gegenereerde afbeelding */}
              <img src={result.imageUrl} alt={`Gemaakte foto van ${dishName.trim()}`} className="size-full scale-[1.08] object-cover" />
            </span>
            <div className="text-center" aria-live="polite">
              <p className="text-xl font-bold text-[var(--text-primary)]">Klaar!</p>
              <p className="mt-0.5 text-[13.5px] text-[var(--text-secondary)]">Zo ziet je {dishName.trim()} eruit.</p>
            </div>
            {error ? (
              <p role="alert" className="rounded-[16px] bg-[var(--error-25)] px-3.5 py-3 text-[13.5px] leading-[19px] text-[var(--error-600)]">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <EmptyPlate />
            {error ? (
              <p role="alert" className="flex gap-2.5 rounded-[16px] bg-[var(--error-25)] px-3.5 py-3 text-[13.5px] leading-[19px] text-[var(--error-600)]">
                <span aria-hidden className="font-extrabold">!</span>
                {error}
              </p>
            ) : null}
            <label className="block">
              <span className={fieldLabel}>Gerecht</span>
              <input value={dishName} onChange={(e) => setDishName(e.target.value)} className={`${fieldBox} h-[52px]`} placeholder="Bv. Chicken wraps" />
            </label>
            <label className="block">
              <span className={fieldLabel}>Extra context (optioneel)</span>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                placeholder="Bv. met verse koriander en limoen, in een wrap gerold"
                className={`${fieldBox} resize-none py-[13px]`}
              />
            </label>
            <p className="flex items-center gap-2.5 rounded-[16px] bg-[var(--blue-25)] px-3.5 py-[11px] text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 shrink-0 text-[var(--blue-500)]">
                <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
              </svg>
              Bovenaanzicht op een wit bord, in dezelfde stijl als je andere receptfoto’s.
            </p>
          </>
        )}
      </div>
    </SlideInModal>
  );
}
