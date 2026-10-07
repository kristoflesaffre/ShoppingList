/**
 * Gedeelde-elementovergang «bord → receptpagina»: bij het tikken op een recept (startpagina,
 * receptenoverzicht) onthouden we waar het bord stond en welke foto erop lag. De receptpagina
 * toont die foto meteen — ook terwijl het recept nog laadt — en laat het bord van daar naar zijn
 * grote plek vliegen.
 */
export type RecipeHeroTransition = {
  recipeId: string;
  src: string;
  /** Positie van het aangetikte bord in de viewport. */
  rect: { left: number; top: number; width: number; height: number };
  at: number;
};

/** Een overgang die niet snel wordt opgepikt (bv. navigatie mislukt) vervalt. */
const MAX_AGE_MS = 4000;

let pending: RecipeHeroTransition | null = null;

export function beginRecipeHeroTransition(recipeId: string, plateEl: Element, src: string) {
  const r = plateEl.getBoundingClientRect();
  pending = { recipeId, src, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, at: Date.now() };
}

/** Lezen zonder te wissen (StrictMode roept initializers twee keer aan); wissen na de vlucht. */
export function peekRecipeHeroTransition(recipeId: string): RecipeHeroTransition | null {
  if (!pending || pending.recipeId !== recipeId || Date.now() - pending.at > MAX_AGE_MS) return null;
  return pending;
}

export function clearRecipeHeroTransition() {
  pending = null;
}

/** Klikhandler voor een link naar `/recepten/<id>` met daarin een element `[data-hero-plate]`. */
export function recipeHeroClickHandler(recipeId: string | null | undefined, src: string | null | undefined) {
  return (e: { currentTarget: Element; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => {
    if (!recipeId || !src || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const plate = e.currentTarget.querySelector("[data-hero-plate]");
    if (plate) beginRecipeHeroTransition(recipeId, plate, src);
  };
}
