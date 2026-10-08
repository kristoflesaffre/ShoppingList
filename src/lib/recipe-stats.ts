import type { DayEntry } from "@/lib/calendar-utils";

/**
 * Hoe vaak elk recept gegeten is, afgeleid uit de kalender (canvas «Recepten · meest gegeten»).
 * Een recept telt één keer per dag waarop het gepland stond, tot en met vandaag. Desserts tellen
 * niet mee: het gaat om maaltijden.
 */
export type RecipeStat = {
  recipeId: string;
  count: number;
  /** Laatste dag (ISO) waarop het recept gegeten is; null = nog nooit. */
  lastIso: string | null;
};

export type RecipeStatsSummary = {
  /** Alle meetellende recepten, meest gegeten eerst (gelijkspel: recentst eerst, dan naam). */
  ranking: RecipeStat[];
  /** Totaal aantal geplande maaltijden (dag × recept). */
  meals: number;
  /** Recepten die nog nooit op de kalender stonden. */
  never: number;
};

type StatRecipe = { id: string; name: string; category?: string | null };

export const EXCLUDED_STAT_CATEGORIES: ReadonlySet<string> = new Set(["dessert"]);

export function computeRecipeStats(
  entries: Map<string, DayEntry>,
  recipes: StatRecipe[],
  todayIso: string,
): RecipeStatsSummary {
  const counted = recipes.filter((r) => !EXCLUDED_STAT_CATEGORIES.has(r.category ?? ""));
  const ids = new Set(counted.map((r) => r.id));
  const byId = new Map<string, RecipeStat>(counted.map((r) => [r.id, { recipeId: r.id, count: 0, lastIso: null }]));

  for (const [iso, entry] of Array.from(entries.entries())) {
    if (iso > todayIso) continue;
    const seen = new Set<string>();
    for (const meal of entry.meals) {
      const id = meal.recipeId;
      if (!id || !ids.has(id) || seen.has(id)) continue;
      seen.add(id);
      const stat = byId.get(id)!;
      stat.count += 1;
      if (!stat.lastIso || iso > stat.lastIso) stat.lastIso = iso;
    }
  }

  const nameOf = new Map(counted.map((r) => [r.id, r.name]));
  const ranking = Array.from(byId.values()).sort(
    (a, b) =>
      b.count - a.count ||
      (b.lastIso ?? "").localeCompare(a.lastIso ?? "") ||
      (nameOf.get(a.recipeId) ?? "").localeCompare(nameOf.get(b.recipeId) ?? "", "nl"),
  );
  return {
    ranking,
    meals: ranking.reduce((sum, s) => sum + s.count, 0),
    never: ranking.filter((s) => s.count === 0).length,
  };
}

/** Recepten die al minstens `minDays` niet meer gegeten zijn, langst geleden eerst. */
export function longAgoRecipes(ranking: RecipeStat[], todayIso: string, minDays = 42, max = 8): RecipeStat[] {
  return ranking
    .filter((s) => s.lastIso != null && daysBetween(s.lastIso, todayIso) >= minDays)
    .sort((a, b) => (a.lastIso ?? "").localeCompare(b.lastIso ?? ""))
    .slice(0, max);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** «vandaag», «gisteren», «4 dagen», «3 weken», «5 maanden», «1 jaar» (zonder «geleden»). */
export function agoLabel(fromIso: string, toIso: string): string {
  const d = daysBetween(fromIso, toIso);
  if (d <= 0) return "vandaag";
  if (d === 1) return "gisteren";
  if (d < 14) return `${d} dagen`;
  if (d < 63) {
    const w = Math.round(d / 7);
    return `${w} weken`;
  }
  if (d < 365) {
    const m = Math.round(d / 30.4);
    return `${m} maanden`;
  }
  const y = Math.round(d / 365);
  return y === 1 ? "1 jaar" : `${y} jaar`;
}

/** «Laatst 3 weken geleden», «Vandaag gegeten», «Nog nooit gegeten». */
export function lastEatenLabel(lastIso: string | null, todayIso: string, prefix = true): string {
  if (!lastIso) return "Nog nooit gegeten";
  const ago = agoLabel(lastIso, todayIso);
  if (ago === "vandaag") return "Vandaag gegeten";
  if (ago === "gisteren") return prefix ? "Laatst gisteren" : "Gisteren";
  return prefix ? `Laatst ${ago} geleden` : `${ago} geleden`;
}
