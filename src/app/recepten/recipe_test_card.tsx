"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChoiceRow } from "@/components/ui/choice_row";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { RECIPE_CATEGORIES, type RecipeCategory } from "@/lib/recipe_library";

const FLASK = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 9V3" />
    <path d="M7.5 14h9" />
  </svg>
);

const PLUS = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const KEEP_CATEGORIES = RECIPE_CATEGORIES.filter((c) => c.id !== "nog_te_testen");

/**
 * Kaart «Nog te testen» tussen de titel en het recept (canvas «Recept nog te testen» B):
 * rond icoon · titel + één regel uitleg · «Recept verwijderen» (tekst, rood) · «Recept toevoegen» (blauw).
 * Toevoegen opent een blad om de categorie te kiezen; verwijderen gebruikt de bestaande bevestiging.
 */
export function RecipeTestCard({
  onKeep,
  onDelete,
}: {
  /** Zet het recept in de gekozen categorie (weg uit «Nog te testen»). */
  onKeep: (category: RecipeCategory) => Promise<void>;
  onDelete: () => void;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  return (
    <>
      <section
        aria-label="Nog te testen"
        className="flex flex-col gap-3.5 rounded-[20px] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(16,17,48,0.04)] md:flex-row md:items-center md:gap-[18px] md:py-4 md:pl-[18px] md:pr-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]">{FLASK}</span>
          <div className="min-w-0">
            <p className="text-[17px] font-bold leading-[22px] text-[var(--text-primary)]">Nog te testen</p>
            <p className="mt-0.5 text-sm leading-5 text-[var(--text-secondary)]">Gemaakt en lekker? Zet het bij je recepten. Niet goed? Verwijder het.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="tertiary" tertiaryTone="danger" size="md" onClick={onDelete} className="flex-1 !no-underline md:w-auto md:flex-none">
            Recept verwijderen
          </Button>
          <Button type="button" size="md" onClick={() => setSheetOpen(true)} className="flex-1 gap-2 md:w-auto md:flex-none">
            {PLUS}
            Recept toevoegen
          </Button>
        </div>
      </section>
      {sheetOpen ? <RecipeKeepSheet onClose={() => setSheetOpen(false)} onKeep={onKeep} /> : null}
    </>
  );
}

/** Blad «Recept toevoegen»: kies bij welke soort recepten het hoort. */
function RecipeKeepSheet({ onClose, onKeep }: { onClose: () => void; onKeep: (category: RecipeCategory) => Promise<void> }) {
  const [category, setCategory] = React.useState<RecipeCategory>("hoofdgerecht");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const keep = async () => {
    setBusy(true);
    setError("");
    try {
      await onKeep(category);
      onClose();
    } catch {
      setError("Toevoegen mislukt. Probeer opnieuw.");
      setBusy(false);
    }
  };
  return (
    <SlideInModal
      open
      onClose={onClose}
      title="Recept toevoegen"
      titleId="recipe-keep-title"
      footer={
        <Button type="button" disabled={busy} onClick={() => void keep()}>
          {busy ? "Toevoegen…" : "Toevoegen"}
        </Button>
      }
    >
      <p className="mb-3 text-sm leading-5 text-[var(--text-secondary)]">Bij welke recepten hoort het?</p>
      <div role="radiogroup" aria-labelledby="recipe-keep-title" className="flex flex-col gap-1">
        {KEEP_CATEGORIES.map((c) => (
          <ChoiceRow
            key={c.id}
            selected={category === c.id}
            onSelect={() => setCategory(c.id)}
            media={<span aria-hidden className="ml-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.dot }} />}
            title={c.label}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--error-600)]">
          {error}
        </p>
      ) : null}
    </SlideInModal>
  );
}
