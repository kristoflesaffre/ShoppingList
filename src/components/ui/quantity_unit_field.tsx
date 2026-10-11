"use client";

import * as React from "react";
import { Stepper } from "@/components/ui/stepper";
import { FilterChip } from "@/components/ui/filter_chip";
import { InputField } from "@/components/ui/input_field";

export const DEFAULT_UNIT_OPTIONS = ["stuk", "pak", "fles", "kilogram", "gram"] as const;

/** Afkortingen die als de voluit geschreven chip gelden («g» → «gram»), als die chip bestaat. */
const UNIT_ALIASES: Record<string, string> = { g: "gram", gr: "gram", kg: "kilogram", kilo: "kilogram" };

function canonicalUnit(unit: string | undefined, units: readonly string[]): string | undefined {
  if (unit == null) return unit;
  const target = UNIT_ALIASES[unit.trim().toLowerCase()];
  return target && units.includes(target) ? target : unit;
}

/**
 * Design system «Aantal + eenheid»: formulier-stepper met eenheidschips (+ «Andere…» → vrij veld).
 * Mobiel: chips onder de stepper. Tablet+: compacte stepper (176px) met de chips ernaast;
 * met `stacked` (lange eenhedenlijst) blijven de chips ook op tablet+ onder de stepper.
 * Zonder `onUnitChange` toont het alleen de stepper (bv. aantal porties).
 */
export function QuantityUnitField({
  value,
  onValueChange,
  unit,
  onUnitChange,
  units = DEFAULT_UNIT_OPTIONS,
  min = 1,
  stacked = false,
}: {
  value: number;
  onValueChange: (next: number) => void;
  unit?: string;
  onUnitChange?: (next: string) => void;
  units?: readonly string[];
  min?: number;
  /** Chips altijd onder de stepper, ook op tablet+ (voor veel eenheden). */
  stacked?: boolean;
}) {
  const shownUnit = canonicalUnit(unit, units);
  const [custom, setCustom] = React.useState(
    () => shownUnit != null && shownUnit !== "" && !units.includes(shownUnit),
  );

  // Volg een eenheid die van buitenaf gezet wordt (bv. bij bewerken van een bestaand item);
  // een oude afkorting («g», «kg») wordt meteen de voluit geschreven chip.
  React.useEffect(() => {
    if (unit == null || unit === "") return;
    if (shownUnit !== unit && onUnitChange && shownUnit) {
      onUnitChange(shownUnit);
      return;
    }
    setCustom(!units.includes(unit));
  }, [unit, shownUnit, units, onUnitChange]);

  return (
    <div>
      <div className={stacked ? undefined : "md:flex md:items-center md:gap-3.5"}>
        <div className="md:w-[176px] md:shrink-0">
          <Stepper value={value} min={min} onValueChange={onValueChange} />
        </div>
        {onUnitChange ? (
          <div role="group" aria-label="Eenheid" className={stacked ? "mt-2.5 flex flex-wrap gap-1.5" : "mt-2.5 flex flex-wrap gap-1.5 md:mt-0"}>
            {units.map((u) => (
              <FilterChip
                key={u}
                selected={!custom && shownUnit === u}
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
