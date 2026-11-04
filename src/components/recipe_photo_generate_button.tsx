"use client";
import * as React from "react";
import { db } from "@/lib/db";
import { MiniButton } from "@/components/ui/mini_button";

/** Manual only: mounting, navigating and realtime recipe updates never generate an image. */
export function RecipePhotoGenerateButton({
  recipeId,
  disabled,
  onBusyChange,
}: {
  recipeId: string;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { user } = db.useAuth();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const active = React.useRef(false);
  const requestId = React.useRef<string | null>(null);
  async function generate() {
    if (!user || active.current || disabled) return;
    active.current = true;
    requestId.current ??= crypto.randomUUID();
    setBusy(true);
    onBusyChange(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/recipes/generate-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.refresh_token}`,
        },
        body: JSON.stringify({ recipeId, requestId: requestId.current }),
      });
      const data = (await response.json()) as {
        error?: string;
        imageUrl?: string;
        estimatedCost?: number;
        retrySameRequest?: boolean;
      };
      if (!response.ok || !data.imageUrl) {
        if (!data.retrySameRequest) requestId.current = null;
        throw Error(
          data.error ||
            "Foto maken is mislukt. Je huidige foto blijft behouden.",
        );
      }
      requestId.current = null;
      setMessage(
        `Foto toegepast${typeof data.estimatedCost === "number" ? ` · $${data.estimatedCost.toFixed(3).replace(".", ",")}` : ""}`,
      );
    } catch (err) {
      // An interrupted connection keeps the request id: checking again cannot bill twice.
      setError(
        err instanceof TypeError || err instanceof SyntaxError
          ? "Verbinding onderbroken. Klik opnieuw om dezelfde fotoaanvraag te controleren."
          : err instanceof Error
            ? err.message
            : "Controleer je verbinding en probeer opnieuw.",
      );
    } finally {
      active.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="mt-3 flex max-w-sm flex-col items-center gap-1.5 text-center">
      <MiniButton
        variant="secondary"
        disabled={busy || disabled || !user}
        onClick={generate}
        aria-busy={busy}
      >
        {busy ? "Foto wordt gemaakt…" : "Maak gerechtfoto"}
      </MiniButton>
      <p
        aria-live="polite"
        role={error ? "alert" : "status"}
        className={`text-xs ${error ? "text-[var(--error-600)]" : "text-[var(--text-secondary)]"}`}
      >
        {error ||
          message ||
          (busy
            ? "Even geduld. Je foto verschijnt hier vanzelf."
            : "Rond bord in jouw stijl · ± $0,06 per foto")}
      </p>
    </div>
  );
}
