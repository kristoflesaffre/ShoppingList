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

/** Rij in `filmsPartnerReactions` voor «komt niet meer terug» bij «Nieuw voor jou». */
export const DISCOVER_DISMISSED_REACTION = "dismissed";

export function discoverDismissMediaId(id: string): string {
  return `discover-${id}`;
}

export function parseDiscoverDismissMediaId(mediaId: string): string | null {
  const m = /^discover-((?:movie|tv)-\d+)$/.exec(mediaId);
  return m ? m[1] : null;
}

function migratedKey(userId: string): string {
  return `${DISMISSED_KEY}_migrated_${userId}`;
}

/** Zijn de keuzes van dit toestel al naar de database van deze gebruiker gegaan? */
export function isDiscoverDismissalsMigrated(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(migratedKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function setDiscoverDismissalsMigrated(userId: string): void {
  try {
    localStorage.setItem(migratedKey(userId), "1");
  } catch {
    // Dan proberen we het de volgende keer opnieuw.
  }
}

/** Series waarover je al iets zei: je keek ze, volgt ze, liet ze vallen of wacht op een seizoen. */
const SERIES_MARK = /^(?:ep-(\d+)-s\d+e\d+|follow-tv-(\d+)|follow-no-tv-(\d+)|follow-added-tv-(\d+)-s\d+|waiting-tv-(\d+)-s\d+)$/;

const JUDGED_REACTIONS = new Set(["up", "down", "seen"]);
const TASTE_REACTIONS = new Set(["no", "good", "great", "top"]);

export type DiscoverExclusionInput = {
  watchlistIds: readonly string[];
  watchedIds: readonly string[];
  dismissedIds: readonly string[];
  /** Eigen rijen uit `filmsPartnerReactions`. */
  ownReactions: readonly { mediaId: string; reaction: string }[];
};

/** Alles wat niet (meer) in «Nieuw voor jou» mag staan omdat je er al over beslist hebt. */
export function buildDiscoverExcludeIds(input: DiscoverExclusionInput): Set<string> {
  const ids = new Set<string>(input.watchlistIds);
  for (const id of input.dismissedIds) ids.add(id);
  for (const id of input.watchedIds) {
    if (id.startsWith("movie-") || id.startsWith("tv-")) {
      ids.add(id);
      continue;
    }
    const m = SERIES_MARK.exec(id);
    const tmdbId = m?.slice(1).find(Boolean);
    if (tmdbId) ids.add(`tv-${tmdbId}`);
  }
  for (const { mediaId, reaction } of input.ownReactions) {
    const dismissed = parseDiscoverDismissMediaId(mediaId);
    if (dismissed) {
      ids.add(dismissed);
      continue;
    }
    const taste = /^taste-(tv|movie)-(\d+)$/.exec(mediaId);
    if (taste) {
      if (TASTE_REACTIONS.has(reaction)) ids.add(`${taste[1]}-${taste[2]}`);
      continue;
    }
    // Duim omhoog, omlaag of «gezien» op een titel van je partner.
    if (/^(?:movie|tv)-\d+$/.test(mediaId) && JUDGED_REACTIONS.has(reaction)) ids.add(mediaId);
  }
  return ids;
}
