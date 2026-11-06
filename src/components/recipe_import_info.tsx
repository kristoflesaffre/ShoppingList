"use client";
import * as React from "react";
import { db } from "@/lib/db";
import { MiniButton } from "@/components/ui/mini_button";
type ImportInfo = {
  id: string;
  description: string;
  servings: number | null;
  missing: string[];
  conflicts: { field: string; sources: { source: string; value: string }[] }[];
  images: {
    id: string;
    timestamp: number;
    step: number | null;
    kind: string;
  }[];
  usage: {
    estimatedUsd: number | null;
    input: number;
    output: number;
    thinking: number;
    requests: number;
  };
  model: string;
};
function ImportImage({ id, token }: { id: string; token: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    let active = true,
      url = "";
    fetch(`/api/recipe-importer/media/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob) return;
        url = URL.createObjectURL(blob);
        if (active) setSrc(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, token]);
  return src ? (
    <img
      src={src}
      alt="Echt beeld uit de oorspronkelijke kookvideo"
      className="max-h-[320px] w-full rounded-[16px] object-contain"
    />
  ) : null;
}
export function RecipeImportInfo({ recipeId }: { recipeId: string }) {
  const { user } = db.useAuth();
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  React.useEffect(() => setOpen(false), [recipeId]);
  const [data, setData] = React.useState<ImportInfo | null>(null);
  React.useEffect(() => {
    if (!user) return;
    let active = true;
    fetch(`/api/recipe-importer/recipes/${recipeId}`, {
      headers: { Authorization: `Bearer ${user.refresh_token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [recipeId, user]);
  if (!data || !user) return null;
  return (
    <div className="mb-4">
      <MiniButton
        variant="secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Bronmateriaal verbergen" : "Bronmateriaal bekijken"}
      </MiniButton>
      {open && (
        <section
          id={panelId}
          aria-label="Bronmateriaal uit de kookvideo"
          className="mt-4 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-4"
        >
          <h2 className="text-xl font-bold">Uit je kookvideo</h2>
          {data.description && (
            <p className="text-sm text-[var(--text-secondary)]">
              {data.description}
            </p>
          )}
          {data.servings === null && (
            <p className="text-sm text-[var(--text-secondary)]">
              Het aantal porties is onbekend. De portiekeuze gebruikt 1 als
              rekenbasis; controleer dit voor je schaalt.
            </p>
          )}
          {(data.missing.length > 0 || data.conflicts.length > 0) && (
            <div className="rounded-[16px] bg-[var(--gray-25)] p-4">
              <h3 className="font-semibold">Nog te controleren</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {data.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
                {data.conflicts.map((c, i) => (
                  <li key={"c" + i}>
                    {c.field}:{" "}
                    {c.sources
                      .map((s) => `${s.source}: ${s.value}`)
                      .join(" / ")}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                Je kunt ingrediënten, hoeveelheden en stappen aanpassen met de
                bestaande bewerkknop.
              </p>
            </div>
          )}
          {data.images
            .filter((image) => image.kind !== "cover")
            .map((image) => (
              <figure key={image.id}>
                <ImportImage id={image.id} token={user.refresh_token} />
                <figcaption className="mt-2 text-xs text-[var(--text-secondary)]">
                  {image.step
                    ? `Bereidingsstap ${image.step}`
                    : "Ingrediënten in beeld"}{" "}
                  · {image.timestamp} seconden in de bronvideo
                </figcaption>
              </figure>
            ))}
          <p className="text-xs text-[var(--text-secondary)]">
            Geschatte AI-kost:{" "}
            {data.usage.estimatedUsd == null
              ? "onbekend"
              : `$${data.usage.estimatedUsd.toFixed(4)}`}{" "}
            · {data.model} · {data.usage.requests} aanvragen ·{" "}
            {data.usage.input} inputtokens, {data.usage.output} outputtokens,{" "}
            {data.usage.thinking} thinkingtokens.
          </p>
        </section>
      )}
    </div>
  );
}
