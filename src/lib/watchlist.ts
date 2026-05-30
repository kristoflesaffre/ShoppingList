const KEY = "watchlist_films";

export type WatchlistItem = {
  id: string;
  type: "movie" | "tv";
  title: string;
  year: string;
  posterUrl: string | null;
  score?: number | null;
  overview?: string | null;
};

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as WatchlistItem[];
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
  const next = [...current, item];
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
