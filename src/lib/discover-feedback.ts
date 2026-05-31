const DISMISSED_KEY = "watchlist_discover_dismissed";

function getIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveIds(ids: string[]): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export function getDismissedDiscoverIds(): string[] {
  return getIds();
}

export function dismissDiscoverItem(id: string): void {
  const ids = getIds();
  if (!ids.includes(id)) saveIds([...ids, id]);
}

export function restoreDiscoverItem(id: string): void {
  saveIds(getIds().filter((existingId) => existingId !== id));
}
