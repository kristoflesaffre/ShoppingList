import { isPantryExpired, pantryExpiryPillLabel } from "@/lib/pantry-expiry";
import { cn } from "@/lib/utils";

/** Onderregel van een voorraadkastrij: datumpil (rood als die voorbij is) of gestippeld «vervaldatum». */
export function PantryExpiryNote({ expiryDate }: { expiryDate?: string | null }) {
  const label = pantryExpiryPillLabel(expiryDate);
  if (!label) {
    return (
      <span className="text-[var(--text-tertiary)] underline decoration-[var(--gray-300)] decoration-dotted underline-offset-[3px]">
        vervaldatum
      </span>
    );
  }
  const expired = isPantryExpired(expiryDate);
  return (
    <span
      className={cn(
        "inline-block rounded-full px-[7px] align-top text-[12px] leading-[18px]",
        expired ? "bg-[var(--error-25)] text-[var(--error-400)]" : "bg-[var(--gray-50)] text-[var(--text-secondary)]",
      )}
    >
      {label}
    </span>
  );
}
