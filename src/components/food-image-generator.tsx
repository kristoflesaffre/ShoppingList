"use client";

import * as React from "react";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";

type GenerateResponse = {
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
}: {
  ownerId: string;
  initialDishName?: string;
  initialDishDescription?: string;
}) {
  const [dishName, setDishName] = React.useState(initialDishName);
  const [dishDescription, setDishDescription] = React.useState(
    initialDishDescription,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<GenerateResponse | null>(null);

  const canGenerate = dishName.trim().length > 0 && !loading;

  const handleGenerate = React.useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
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

      const json = (await res.json()) as GenerateResponse | { error?: string };
      if (!res.ok || !("imageUrl" in json)) {
        throw new Error(
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Genereren van afbeelding is mislukt.",
        );
      }

      setResult(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Onbekende fout tijdens genereren.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [canGenerate, ownerId, dishName, dishDescription]);

  return (
    <div className="mx-auto flex w-full max-w-[768px] flex-col gap-6">
      <InputField
        label="Gerechtnaam"
        placeholder="Bijv. Chicken tikka masala"
        value={dishName}
        onChange={(e) => setDishName(e.target.value)}
      />

      <div className="flex w-full flex-col gap-2">
        <label className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
          Optionele beschrijving
        </label>
        <textarea
          value={dishDescription}
          onChange={(e) => setDishDescription(e.target.value)}
          placeholder="Extra context voor het gerecht (optioneel)"
          rows={4}
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--white)] px-4 py-3 text-base leading-24 text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className="w-full max-w-none"
        >
          {loading ? "Afbeelding genereren..." : "Genereer food image"}
        </Button>
        <p className="text-sm leading-20 text-[var(--text-secondary)]">
          Geschatte kost: {result ? `$${result.estimatedCost}` : "berekend na generatie"}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-[var(--error-600)] bg-[var(--error-25)] px-4 py-3 text-sm text-[var(--error-600)]">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span>Provider: {result.provider}</span>
            <span>Model: {result.model}</span>
            <span>Estimated cost: ${result.estimatedCost}</span>
          </div>
          {result.mock ? (
            <div className="flex flex-col gap-1 text-sm text-[var(--text-tertiary)]">
              <p>Fallback actief: echte generatie is mislukt (zie details hieronder).</p>
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
    </div>
  );
}
