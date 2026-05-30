const KEY = "watchlist_films";

export type WatchlistItem = {
  id: string;
  type: "movie" | "tv";
  title: string;
  year: string;
  posterUrl: string | null;
  score?: number | null;
  overview?: string | null;
  order?: number;
  restoreIndex?: number;
};

function hasUsableOrder(item: WatchlistItem): boolean {
  return typeof item.order === "number" && Number.isFinite(item.order);
}

function normalizeWatchlist(items: WatchlistItem[]): WatchlistItem[] {
  if (items.some((item) => !hasUsableOrder(item))) {
    return items.map((item, index) => ({ ...item, order: index }));
  }

  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function toStoredItem(item: WatchlistItem): WatchlistItem {
  const { restoreIndex: _restoreIndex, ...storedItem } = item;
  return storedItem;
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeWatchlist(JSON.parse(localStorage.getItem(KEY) ?? "[]") as WatchlistItem[]);
  } catch {
    return [];
  }
}

function save(items: WatchlistItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToWatchlist(item: WatchlistItem): WatchlistItem[] {
  const current = getWatchlist();
  if (current.some((i) => i.id === item.id)) return current;

  if (typeof item.restoreIndex === "number" && Number.isFinite(item.restoreIndex)) {
    const targetIndex = Math.max(0, Math.floor(item.restoreIndex));
    const sameTypeItems = current.filter((i) => i.type === item.type);
    const insertIndex = Math.min(targetIndex, sameTypeItems.length);
    const reorderedSameType = [
      ...sameTypeItems.slice(0, insertIndex),
      toStoredItem(item),
      ...sameTypeItems.slice(insertIndex),
    ].map((i, index) => ({ ...i, order: index }));
    const reorderedById = new Map(reorderedSameType.map((i) => [i.id, i]));
    const next = normalizeWatchlist([
      ...current.map((i) => reorderedById.get(i.id) ?? i),
      reorderedById.get(item.id)!,
    ]);
    save(next);
    return next;
  }

  const maxOrder = current.reduce((max, i) => Math.max(max, i.order ?? 0), -1);
  const storedItem = toStoredItem(item);
  const itemWithOrder = hasUsableOrder(storedItem) ? storedItem : { ...storedItem, order: maxOrder + 1 };
  const next = normalizeWatchlist([...current, itemWithOrder]);
  save(next);
  return next;
}

export function removeFromWatchlist(id: string): WatchlistItem[] {
  const next = getWatchlist().filter((i) => i.id !== id);
  save(next);
  return next;
}

export function isInWatchlist(id: string): boolean {
  return getWatchlist().some((i) => i.id === id);
}

export function updateWatchlistScore(id: string, score: number): void {
  const current = getWatchlist();
  const next = current.map((i) => (i.id === id ? { ...i, score } : i));
  save(next);
}
