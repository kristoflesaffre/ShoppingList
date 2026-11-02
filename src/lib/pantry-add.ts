import { freezerUnitPatch, type FreezerEntry } from "@/lib/freezer-search";

/** Product dat er al is: het aantal komt erbij in de eenheid die er al staat. `expiryDate`: ISO-datum, leeg = geen. */
export function pantryStockPatch(stock: Pick<FreezerEntry, "packages">, quantity: number, expiryDate: string) {
  return { packages: stock.packages + quantity, expiryDate: expiryDate || null };
}

/** Nieuw product; bij gewicht is het aantal het aantal pakken van 500 g / 1 kg. `expiryDate`: ISO-datum, leeg = geen. */
export function pantryNewPatch(quantity: number, unit: string, expiryDate: string) {
  return { ...freezerUnitPatch({ packages: quantity }, unit), packages: quantity, ...(expiryDate ? { expiryDate } : {}) };
}
