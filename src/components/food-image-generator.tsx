"use client";

import * as React from "react";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FoodImageGenerationResult = {
  generationId: string | null;
  imageUrl: string;
  estimatedCost: number;
  provider: "openai" | "mock";
  model: string;
  mock: boolean;
  mockDetail?: string;
};

export function FoodImageGenerator({
  ownerId,
  initialDishName = "",
  initialDishDescription = "",
  embedMode = false,
  onGenerationComplete,
}: {
  ownerId: string;
  initialDishName?: string;
  initialDishDescription?: string;
  /** Compacte layout voor slide-in (minder meta onder de knop). */
  embedMode?: boolean;
  /** Na succesvolle API: download → opslaan; bij fout blijft preview zichtbaar. */
  onGenerationComplete?: (
    result: FoodImageGenerationResult,
  ) => Promise<void>;
}) {
  const [dishName, setDishName] = React.useState(initialDishName);
  const [dishDescription, setDishDescription] = React.useState(
    initialDishDescription,
  );
  const [loading, setLoading] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<FoodImageGenerationResult | null>(
    null,
  );

  const busy = loading || applying;
  const canGenerate = dishName.trim().length > 0 && !busy;

  const handleGenerate = React.useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    setApplying(false);
    setError(null);

    try {
      const res = await fetch("/api/generate-food-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId,
          dishName: dishName.trim(),
          dishDescription: dishDescription.trim(),
        }),
      });

      const json = (await res.json()) as
        | FoodImageGenerationResult
        | { error?: string };
      if (!res.ok || !("imageUrl" in json)) {
        throw new Error(
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Genereren van afbeelding is mislukt.",
        );
      }

      setLoading(false);

      if (onGenerationComplete) {
        setApplying(true);
        try {
          await onGenerationComplete(json);
          setResult(null);
        } catch (applyErr) {
          setResult(json);
          setError(
            applyErr instanceof Error
              ? applyErr.message
              : "Foto kon niet op het recept worden gezet.",
          );
        } finally {
          setApplying(false);
        }
      } else {
        setResult(json);
      }
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Onbekende fout tijdens genereren.",
      );
      setResult(null);
    }
  }, [canGenerate, ownerId, dishName, dishDescription, onGenerationComplete]);

  return (
    <div
      className={
        embedMode
          ? "mx-auto flex w-full max-w-[768px] flex-col gap-4"
          : "mx-auto flex w-full max-w-[768px] flex-col gap-6"
      }
    >
      <InputField
        label={embedMode ? "Naam ingrediënt" : "Gerechtnaam"}
        placeholder="Bijv. Chicken tikka masala"
        value={dishName}
        onChange={(e) => setDishName(e.target.value)}
      />

      <div className="flex w-full flex-col gap-2">
        <label className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
          {embedMode ? "Extra context" : "Optionele beschrijving"}
        </label>
        <textarea
          value={dishDescription}
          onChange={(e) => setDishDescription(e.target.value)}
          placeholder={
            embedMode
              ? "Extra context (optioneel)"
              : "Extra context voor het gerecht (optioneel)"
          }
          rows={embedMode ? 3 : 4}
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--white)] px-4 py-3 text-base leading-24 text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </div>

      <div
        className={cn("flex flex-col gap-2", embedMode && "items-center")}
      >
        <Button
          type="button"
          variant="primary"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className={embedMode ? "self-center" : "w-full max-w-none"}
        >
          {loading
            ? embedMode
              ? "Genereren…"
              : "Afbeelding genereren..."
            : applying
              ? embedMode
                ? "Foto op recept zetten…"
                : "Foto op recept zetten..."
              : embedMode
                ? "Genereer afbeelding"
                : "Genereer food image"}
        </Button>
        {!embedMode ? (
          <p className="text-sm leading-20 text-[var(--text-secondary)]">
            Geschatte kost:{" "}
            {result ? `$${result.estimatedCost}` : "berekend na generatie"}
          </p>
        ) : !onGenerationComplete ? (
          <p className="text-sm leading-20 text-[var(--text-secondary)]">
            Geschatte kost:{" "}
            {result ? `$${result.estimatedCost}` : "berekend na generatie"}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-[var(--error-600)] bg-[var(--error-25)] px-4 py-3 text-sm text-[var(--error-600)]">
          {error}
        </div>
      ) : null}

      {result && !onGenerationComplete ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span>Provider: {result.provider}</span>
            <span>Model: {result.model}</span>
            <span>Estimated cost: ${result.estimatedCost}</span>
          </div>
          {result.mock ? (
            <div className="flex flex-col gap-1 text-sm text-[var(--text-tertiary)]">
              <p>
                Fallback actief: echte generatie is mislukt (zie details
                hieronder).
              </p>
              {result.mockDetail ? (
                <pre className="whitespace-pre-wrap break-words rounded-md border border-[var(--border-subtle)] bg-[var(--gray-25)] p-3 font-mono text-xs text-[var(--text-secondary)]">
                  {result.mockDetail}
                </pre>
              ) : null}
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamische image route uit API */}
          <img
            src={result.imageUrl}
            alt={`Gegenereerde premium food image van ${dishName}`}
            className="w-full max-w-[420px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] object-cover shadow-[var(--shadow-drop)]"
          />
        </div>
      ) : null}

      {result && onGenerationComplete ? (
        <div className="flex flex-col gap-3">
          {result.mock && result.mockDetail ? (
            <div className="flex flex-col gap-1 text-sm text-[var(--text-tertiary)]">
              <p>
                Fallback actief: echte generatie is mislukt (zie details
                hieronder).
              </p>
              <pre className="whitespace-pre-wrap break-words rounded-md border border-[var(--border-subtle)] bg-[var(--gray-25)] p-3 font-mono text-xs text-[var(--text-secondary)]">
                {result.mockDetail}
              </pre>
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt={`Preview ${dishName}`}
            className="w-full max-w-[420px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] object-cover shadow-[var(--shadow-drop)]"
          />
        </div>
      ) : null}
    </div>
  );
}
