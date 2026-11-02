import { toIsoDate } from "@/lib/calendar-utils";

/** Optionele vervaldatum van een voorraadkastproduct: `freezerItems.expiryDate` als "YYYY-MM-DD". */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isPantryExpired(expiryDate: string | null | undefined, today: Date = new Date()): boolean {
  return Boolean(expiryDate && ISO_DATE.test(expiryDate) && expiryDate < toIsoDate(today));
}

/** «tot 12 mrt 2027», of «vervallen op …» als de datum voorbij is; null zonder geldige datum. */
export function pantryExpiryLabel(expiryDate: string | null | undefined, today: Date = new Date()): string | null {
  if (!expiryDate || !ISO_DATE.test(expiryDate)) return null;
  const [y, m, d] = expiryDate.split("-").map(Number);
  const date = new Date(y, m - 1, d)
    .toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "");
  return isPantryExpired(expiryDate, today) ? `vervallen op ${date}` : `tot ${date}`;
}
