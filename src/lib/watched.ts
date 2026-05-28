const KEY = "watchlist_watched";

function getIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveIds(ids: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(ids));
}

export function isWatched(id: string): boolean {
  return getIds().includes(id);
}

export function markWatched(id: string): void {
  const ids = getIds();
  if (!ids.includes(id)) saveIds([...ids, id]);
}

export function unmarkWatched(id: string): void {
  saveIds(getIds().filter((i) => i !== id));
}
