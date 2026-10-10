/**
 * Volgorde van categorieën per winkel (zoals de winkel ingedeeld is), bewaard op het
 * favorietenlijstje als JSON: `{ "lidl": ["Groenten & Fruit", …], "delhaize": […] }`.
 */
export type CategoryOrderByStore = Record<string, string[]>;

export function parseCategoryOrderByStore(raw: string | null | undefined): CategoryOrderByStore {
  if (!raw || typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: CategoryOrderByStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const titles = value.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
      if (titles.length > 0) out[key] = titles;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeCategoryOrderByStore(map: CategoryOrderByStore): string {
  return JSON.stringify(map);
}

/**
 * Nieuwe volgorde van de zichtbare categorieën in de volledige bewaarde volgorde verwerken.
 * Categorieën die nu niet op het lijstje staan, blijven achter dezelfde voorganger staan als voorheen
 * (zodat een lijstje met minder categorieën de rest van de winkelvolgorde niet door elkaar haalt).
 */
export function mergeCategoryOrder(previousFull: string[], visibleNew: string[]): string[] {
  const visible = new Set(visibleNew);
  const result = [...visibleNew];
  let lastAnchor: string | null = null;
  for (const title of previousFull) {
    if (visible.has(title)) {
      lastAnchor = title;
      continue;
    }
    if (result.includes(title)) continue;
    if (lastAnchor == null) {
      // Stond vóór alle zichtbare categorieën: vooraan houden (na eerder ingevoegde verborgen titels).
      const firstVisibleIndex = result.findIndex((t) => visible.has(t));
      result.splice(firstVisibleIndex < 0 ? result.length : firstVisibleIndex, 0, title);
    } else {
      // Direct na de voorganger en de verborgen titels die er al achter staan.
      let at = result.indexOf(lastAnchor) + 1;
      while (at < result.length && !visible.has(result[at])) at += 1;
      result.splice(at, 0, title);
    }
    lastAnchor = title;
  }
  return result;
}
