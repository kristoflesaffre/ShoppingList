import { NextResponse } from "next/server";
import ingredientCategories from "@/lib/data/ingredient_categories.json";
import { normalizeForMatch } from "@/lib/item-photo-matching";

export async function GET() {
  const raw = (ingredientCategories as { synonymToCanonical?: Record<string, string> })
    .synonymToCanonical ?? {};

  // Normalize both key and value so lookups match the same normalizeForMatch used in photo matching
  const normalized: Record<string, string> = {};
  for (const [syn, canonical] of Object.entries(raw)) {
    const k = normalizeForMatch(syn);
    const v = normalizeForMatch(canonical);
    if (k && v) normalized[k] = v;
  }

  return NextResponse.json(normalized);
}
