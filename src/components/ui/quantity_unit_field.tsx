"use client";

import * as React from "react";
import { Stepper } from "@/components/ui/stepper";
import { FilterChip } from "@/components/ui/filter_chip";
import { InputField } from "@/components/ui/input_field";

export const DEFAULT_UNIT_OPTIONS = ["stuk", "pak", "fles", "kg", "g"] as const;

/**
 * Design system «Aantal + eenheid»: formulier-stepper met eenheidschips (+ «Andere…» → vrij veld).
 * Mobiel: chips onder de stepper. Tablet+: compacte stepper (176px) met de chips ernaast.
 * Zonder `onUnitChange` toont het alleen de stepper (bv. aantal porties).
 */
export function QuantityUnitField({
  value,
  onValueChange,
  unit,
  onUnitChange,
  units = DEFAULT_UNIT_OPTIONS,
  min = 1,
}: {
  value: number;
  onValueChange: (next: number) => void;
  unit?: string;
  onUnitChange?: (next: string) => void;
  units?: readonly string[];
  min?: number;
}) {
  const [custom, setCustom] = React.useState(
    () => unit != null && unit !== "" && !units.includes(unit),
  );

  // Volg een eenheid die van buitenaf gezet wordt (bv. bij bewerken van een bestaand item).
  React.useEffect(() => {
    if (unit == null || unit === "") return;
    setCustom(!units.includes(unit));
  }, [unit, units]);

  return (
    <div>
      <div className="md:flex md:items-center md:gap-3.5">
        <div className="md:w-[176px] md:shrink-0">
          <Stepper value={value} min={min} onValueChange={onValueChange} />
        </div>
        {onUnitChange ? (
          <div role="group" aria-label="Eenheid" className="mt-2.5 flex flex-wrap gap-1.5 md:mt-0">
            {units.map((u) => (
              <FilterChip
                key={u}
                selected={!custom && unit === u}
                onClick={() => {
                  setCustom(false);
                  onUnitChange(u);
                }}
              >
                {u}
              </FilterChip>
            ))}
            <FilterChip
              selected={custom}
              onClick={() => {
                setCustom(true);
                onUnitChange("");
              }}
            >
              Andere…
            </FilterChip>
          </div>
        ) : null}
      </div>
      {onUnitChange && custom ? (
        <InputField
          className="mt-2.5"
          value={unit ?? ""}
          onChange={(e) => onUnitChange(e.target.value)}
          placeholder="Eenheid, bv. doos"
          aria-label="Eenheid"
          autoFocus
        />
      ) : null}
    </div>
  );
}
