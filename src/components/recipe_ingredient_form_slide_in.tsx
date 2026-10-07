"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { QuantityUnitField } from "@/components/ui/quantity_unit_field";
import { ItemNameAutocomplete } from "@/components/ui/item_name_autocomplete";
import { Button } from "@/components/ui/button";
import { normalizeQuantity, parseRecipeIngredientQuantity } from "@/lib/recipe_ingredient_quantity";

/** Eenheden die in recepten het vaakst voorkomen; «Andere…» geeft een vrij veld. */
export const RECIPE_UNIT_OPTIONS = ["stuk", "g", "kg", "ml", "l", "el", "tl", "snuifje"] as const;

export type RecipeIngredientFormDraft = {
  id?: string;
  name: string;
  quantity: string;
};

export function RecipeIngredientFormSlideIn({
  open,
  onClose,
  initial,
  onSubmit,
  onDelete,
  titleId = "recipe-ingredient-form-slide-title",
  containerClassName,
  slideClassName,
}: {
  open: boolean;
  onClose: () => void;
  /** null/undefined = nieuw ingrediënt */
  initial?: { id: string; name: string; quantity: string } | null;
  onSubmit: (draft: RecipeIngredientFormDraft) => void | Promise<void>;
  /** Bij wijzigen: knop «Ingrediënt verwijderen» onderaan. */
  onDelete?: (id: string) => void;
  titleId?: string;
  containerClassName?: string;
  slideClassName?: string;
}) {
  const [ingName, setIngName] = React.useState("");
  const [ingStepper, setIngStepper] = React.useState(1);
  const [ingQtyDesc, setIngQtyDesc] = React.useState("stuk");
  const [submitting, setSubmitting] = React.useState(false);

  const initialKey = initial?.id ?? "new";

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setIngName(initial.name);
      const { stepperValue: sv, quantityDesc: qd } =
        parseRecipeIngredientQuantity(initial.quantity);
      setIngStepper(sv);
      // «2 stuks» → chip «stuk»; bij bewaren zet normalizeQuantity het meervoud terug.
      setIngQtyDesc(qd.toLowerCase() === "stuks" ? "stuk" : qd);
    } else {
      setIngName("");
      setIngStepper(1);
      setIngQtyDesc("stuk");
    }
  }, [open, initialKey, initial?.name, initial?.quantity]);

  const handleSubmit = React.useCallback(async () => {
    if (!ingName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit({
          id: initial?.id,
          name: ingName.trim(),
          quantity: normalizeQuantity(`${ingStepper} ${ingQtyDesc.trim() || "stuk"}`),
        }),
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [
    ingName,
    ingStepper,
    ingQtyDesc,
    initial?.id,
    onSubmit,
    onClose,
    submitting,
  ]);

  const isEdit = Boolean(initial?.id);

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Ingrediënt wijzigen" : "Ingrediënt toevoegen"}
      titleId={titleId}
      containerClassName={containerClassName}
      className={slideClassName}
      footer={
        <Button
          variant="primary"
          disabled={!ingName.trim() || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "Bezig…" : isEdit ? "Bewaren" : "Toevoegen"}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <ItemNameAutocomplete
          label="Naam ingrediënt"
          placeholder="Naam ingrediënt"
          value={ingName}
          onChange={setIngName}
          photoCatalog="ingredients"
          slideInTitle="Ingrediënt"
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-normal leading-20 text-[var(--text-primary)]">Hoeveelheid</span>
          <QuantityUnitField
            value={ingStepper}
            onValueChange={setIngStepper}
            unit={ingQtyDesc}
            onUnitChange={setIngQtyDesc}
            units={RECIPE_UNIT_OPTIONS}
            stacked
          />
        </div>
        {isEdit && onDelete && initial ? (
          <button
            type="button"
            onClick={() => {
              onDelete(initial.id);
              onClose();
            }}
            className="mx-auto inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-[14.5px] font-semibold text-[var(--error-600)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:bg-[var(--error-25)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
            Ingrediënt verwijderen
          </button>
        ) : null}
      </div>
    </SlideInModal>
  );
}
