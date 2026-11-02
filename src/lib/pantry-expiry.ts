import { toIsoDate } from "@/lib/calendar-utils";

/** Optionele vervaldatum van een voorraadkastproduct: `freezerItems.expiryDate` als "YYYY-MM-DD". */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isPantryExpired(expiryDate: string | null | undefined, today: Date = new Date()): boolean {
  return Boolean(expiryDate && ISO_DATE.test(expiryDate) && expiryDate < toIsoDate(today));
}

/** «tot 12 mrt 2027», of «vervallen op …» als de datum voorbij is; null zonder geldige datum. */
export function pantryExpiryLabel(expiryDate: string | null | undefined, today: Date = new Date()): string | null {
  if (!expiryDate || !ISO_DATE.test(expiryDate)) return null;
  const date = formatExpiryDate(expiryDate, true);
  return isPantryExpired(expiryDate, today) ? `vervallen op ${date}` : `tot ${date}`;
}

/** Datumpil in de rij: «12 mrt 2027», of korter «vervallen 3 okt» en van een vorig jaar «vervallen 2025», zodat het past op een gsm. */
export function pantryExpiryPillLabel(expiryDate: string | null | undefined, today: Date = new Date()): string | null {
  if (!expiryDate || !ISO_DATE.test(expiryDate)) return null;
  if (!isPantryExpired(expiryDate, today)) return formatExpiryDate(expiryDate, true);
  const year = Number(expiryDate.slice(0, 4));
  return `vervallen ${year === today.getFullYear() ? formatExpiryDate(expiryDate, false) : year}`;
}

function formatExpiryDate(expiryDate: string, withYear: boolean): string {
  const [y, m, d] = expiryDate.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: withYear ? "numeric" : undefined })
    .replace(".", "");
}
