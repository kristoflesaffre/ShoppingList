import { addDays, toIsoDate } from "@/lib/calendar-utils";

/**
 * Diepvriesgerechten die op een dag gepland staan: één portie gaat uit de voorraad zodra de dag voorbij is, en
 * de dag ervoor staat er een afvinkbare Todoist-taak «Uit de diepvries halen». Enkel items met `freezerItemId`
 * doen mee; gerechten van vandaag of later zonder koppeling krijgen die via `planFreezerLinks`, voorbije blijven ongemoeid.
 */

export type FreezerPlanItem = {
  id: string;
  name: string;
  itemDate?: string | null;
  fromStock?: boolean | null;
  stockSource?: string | null;
  freezerItemId?: string | null;
  stockDeductedAt?: number | null;
  thawTaskId?: string | null;
};

export type FreezerStock = { id: string; packages: number };
export type ThawTodoistTask = { id: string; description?: string | null };

export type ThawAction =
  | { kind: "create"; itemId: string; content: string; description: string; dueDate: string }
  | { kind: "link"; itemId: string; taskId: string }
  | { kind: "update"; taskId: string; content: string; description: string; dueDate: string }
  | { kind: "close"; taskId: string };

function isPlanned(item: FreezerPlanItem): item is FreezerPlanItem & { itemDate: string; freezerItemId: string } {
  return item.fromStock === true && item.stockSource !== "pantry" && Boolean(item.freezerItemId) && Boolean(item.itemDate);
}

/** Welke porties weg mogen: dag voorbij, nog niet afgeboekt en het diepvriesitem bestaat nog. */
export function planFreezerDeductions(items: FreezerPlanItem[], stock: FreezerStock[], todayIso: string) {
  const left = new Map(stock.map((s) => [s.id, s.packages]));
  const deductedItemIds: string[] = [];
  const touched = new Set<string>();
  for (const item of items) {
    if (!isPlanned(item) || item.stockDeductedAt || item.itemDate >= todayIso) continue;
    const packages = left.get(item.freezerItemId);
    if (packages === undefined) continue;
    left.set(item.freezerItemId, Math.max(0, packages - 1));
    touched.add(item.freezerItemId);
    deductedItemIds.push(item.id);
  }
  const updates = Array.from(touched).map((id) => ({ id, packages: left.get(id)! }));
  return { deductedItemIds, updates: updates.filter((u) => u.packages > 0), deleteIds: updates.filter((u) => u.packages <= 0).map((u) => u.id) };
}

/** De dag vóór het gerecht; te laat gepland (voor vandaag) → vandaag. */
export function thawDueDate(itemDate: string, todayIso: string): string {
  const [y, m, d] = itemDate.split("-").map(Number);
  const before = toIsoDate(addDays(new Date(y, m - 1, d), -1));
  return before < todayIso ? todayIso : before;
}

export function thawTaskContent(name: string): string {
  return `Uit de diepvries halen: ${name.replace(/\s*\(diepvries\)$/, "").trim()}`;
}

/** Herkenning van onze eigen taken in Todoist: zo vinden we ze terug, ook als een gerecht verwijderd of verplaatst werd. */
export function thawTaskDescription(itemId: string, itemDate: string): string {
  return `Gepland in ShoppingList.\n[shoppinglist-thaw:${itemId}:${itemDate}]`;
}

export function parseThawMarker(description: string | null | undefined): { itemId: string; itemDate: string } | null {
  const match = description?.match(/\[shoppinglist-thaw:([^:\]]+):(\d{4}-\d{2}-\d{2})\]/);
  return match ? { itemId: match[1], itemDate: match[2] } : null;
}

/** Staat het gerecht van deze ontdooitaak vandaag op het menu? Dan moet het nu echt uit de diepvries. */
export function isThawDay(description: string | null | undefined, todayIso: string): boolean {
  return parseThawMarker(description)?.itemDate === todayIso;
}

/** Foto voor de ontdooi-post-it: het geplande gerecht via de markering in de taak, anders de foto van het diepvriesitem. */
export function thawPhotoUrl(
  description: string | null | undefined,
  items: { id: string; freezerItemId?: string | null; stockPhotoUrl?: string | null }[],
  freezerItems: { id: string; recipePhotoUrl?: string | null }[],
): string | null {
  const marker = parseThawMarker(description);
  const item = marker ? items.find((it) => it.id === marker.itemId) : undefined;
  if (!item) return null;
  return item.stockPhotoUrl || freezerItems.find((it) => it.id === item.freezerItemId)?.recipePhotoUrl || null;
}

/**
 * Wat er in Todoist moet gebeuren. `items` = enkel gerechten uit de eigen diepvries.
 * Staat er al een `thawTaskId` maar geen open taak meer, dan werd ze afgevinkt: niet opnieuw aanmaken.
 */
export function planThawTaskActions(items: FreezerPlanItem[], openTasks: ThawTodoistTask[], todayIso: string): ThawAction[] {
  const actions: ThawAction[] = [];
  const planned = new Map(items.filter(isPlanned).map((item) => [item.id, item]));
  const taskByItem = new Map<string, { task: ThawTodoistTask; itemDate: string }>();
  for (const task of openTasks) {
    const marker = parseThawMarker(task.description);
    if (!marker) continue;
    const item = planned.get(marker.itemId);
    // Gerecht weg of dag voorbij: de taak heeft geen zin meer.
    if (!item || item.itemDate < todayIso) actions.push({ kind: "close", taskId: task.id });
    else taskByItem.set(marker.itemId, { task, itemDate: marker.itemDate });
  }
  for (const item of Array.from(planned.values())) {
    if (item.itemDate < todayIso) continue;
    const open = taskByItem.get(item.id);
    const fields = { content: thawTaskContent(item.name), description: thawTaskDescription(item.id, item.itemDate), dueDate: thawDueDate(item.itemDate, todayIso) };
    if (open) {
      if (open.itemDate !== item.itemDate) actions.push({ kind: "update", taskId: open.task.id, ...fields });
      if (!item.thawTaskId) actions.push({ kind: "link", itemId: item.id, taskId: open.task.id });
    } else if (!item.thawTaskId) {
      actions.push({ kind: "create", itemId: item.id, ...fields });
    }
  }
  return actions;
}

/**
 * Geplande diepvriesgerechten zonder koppeling (ouder dan deze functie, of gekopieerd van een ander lijstje): koppelen
 * op naam. Enkel vandaag of later, zodat er niets met terugwerkende kracht van de voorraad gaat.
 */
export function planFreezerLinks<T extends { id: string; name?: string }>(
  items: FreezerPlanItem[],
  freezerItems: T[],
  todayIso: string,
): { itemId: string; freezerItemId: string }[] {
  const links: { itemId: string; freezerItemId: string }[] = [];
  for (const item of items) {
    if (item.fromStock !== true || item.stockSource === "pantry" || item.freezerItemId || item.stockDeductedAt) continue;
    if (!item.itemDate || item.itemDate < todayIso) continue;
    const match = findFreezerItemForPlan(freezerItems, { name: item.name.replace(/\s*\(diepvries\)$/, "") });
    if (match) links.push({ itemId: item.id, freezerItemId: match.id });
  }
  return links;
}

/** Eigen diepvriesitem bij een recept of naam, voor de koppeling bij het plannen. */
export function findFreezerItemForPlan<T extends { id: string; name?: string; recipeId?: string }>(freezerItems: T[], match: { name: string; recipeId?: string }): T | undefined {
  const name = match.name.trim().toLowerCase();
  return (match.recipeId ? freezerItems.find((it) => it.recipeId === match.recipeId) : undefined) ?? freezerItems.find((it) => it.name?.trim().toLowerCase() === name);
}
