"use client";

import * as React from "react";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Stepper } from "@/components/ui/stepper";
import { ItemNameAutocomplete } from "@/components/ui/item_name_autocomplete";
import { Button } from "@/components/ui/button";
import { parseRecipeIngredientQuantity } from "@/lib/recipe_ingredient_quantity";

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
  titleId = "recipe-ingredient-form-slide-title",
  containerClassName,
  slideClassName,
}: {
  open: boolean;
  onClose: () => void;
  /** null/undefined = nieuw ingrediënt */
  initial?: { id: string; name: string; quantity: string } | null;
  onSubmit: (draft: RecipeIngredientFormDraft) => void | Promise<void>;
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
      setIngQtyDesc(qd);
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
          quantity: `${ingStepper} ${ingQtyDesc}`,
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
        />
        <div className="flex flex-col gap-2">
          <Stepper
            label="Hoeveelheid"
            value={ingStepper}
            onValueChange={setIngStepper}
            min={1}
          />
          <InputField
            value={ingQtyDesc}
            className="text-center"
            onFocus={(e) => {
              const input = e.target;
              requestAnimationFrame(() => input.select());
            }}
            onChange={(e) => setIngQtyDesc(e.target.value)}
          />
        </div>
      </div>
    </SlideInModal>
  );
}
