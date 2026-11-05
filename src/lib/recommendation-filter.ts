import { TMDB_BASE, tmdbHeaders, type TmdbMediaType } from "@/lib/tmdb";

/**
 * Wat we nooit voorstellen: anime, en buitenlandse titels zonder Engelse titel. Geldt enkel voor
 * voorstellen; wat je zelf opzoekt, volgt of op je watchlist zet, blijft gewoon staan.
 * `scripts/build-series-taste-catalog.mjs` past dezelfde regels toe op de catalogus.
 */
const ANIMATION_GENRE = 16;
const OWN_LANGUAGES = new Set(["en", "nl"]);
const EAST_ASIAN_LANGUAGES = new Set(["ja", "zh", "ko", "cn"]);
const ANIME_KEYWORD = /\b(anime|manga|donghua)\b/i;

/** Animatie uit Oost-Azië, of animatie met een anime-trefwoord («anime inspired» bij Avatar). Rick and Morty valt hier niet onder. */
export function isAnime(s: { genreIds: readonly number[]; language: string | null; keywords?: readonly string[] }): boolean {
  if (!s.genreIds.includes(ANIMATION_GENRE)) return false;
  return EAST_ASIAN_LANGUAGES.has(s.language ?? "") || (s.keywords ?? []).some((k) => ANIME_KEYWORD.test(k));
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Soms is de oorspronkelijke titel al Engels («The Young Pope», een Italiaanse productie). */
const ENGLISH_WORDS = /\b(the|of|and|to|how|for|with|my|your)\b/i;

/** Niet in het Engels of Nederlands gemaakt, en TMDB kent geen andere Engelse titel. */
export function lacksEnglishTitle(s: { language: string | null; originalTitle: string; englishTitle: string | null }): boolean {
  if (OWN_LANGUAGES.has(s.language ?? "")) return false;
  if (!s.englishTitle) return true;
  return sameTitle(s.englishTitle, s.originalTitle) && !ENGLISH_WORDS.test(s.originalTitle);
}

export type RecommendationVerdict = {
  allowed: boolean;
  /** Titel om te tonen als TMDB geen Nederlandse heeft en de oorspronkelijke (bv. in het Koreaans) zou tonen. */
  displayTitle: string | null;
};

const REVALIDATE_SEC = 7 * 24 * 3600;

/** Beoordeelt een TMDB-rij uit een lijst. Vraagt enkel extra gegevens op als taal en genre niet volstaan. */
export async function checkRecommendation(row: Record<string, unknown>, type: TmdbMediaType): Promise<RecommendationVerdict> {
  const language = (row.original_language as string | undefined) ?? null;
  const genreIds = (row.genre_ids as number[] | undefined) ?? [];
  const title = ((type === "movie" ? row.title : row.name) as string | undefined) ?? "";
  const originalTitle = ((type === "movie" ? row.original_title : row.original_name) as string | undefined) ?? "";

  if (isAnime({ genreIds, language })) return { allowed: false, displayTitle: null };
  const foreign = !OWN_LANGUAGES.has(language ?? "");
  if (!foreign && !genreIds.includes(ANIMATION_GENRE)) return { allowed: true, displayTitle: null };

  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${row.id as number}?language=en-US&append_to_response=keywords`, {
      headers: tmdbHeaders,
      next: { revalidate: REVALIDATE_SEC },
    });
    if (!res.ok) return { allowed: false, displayTitle: null };
    const detail = (await res.json()) as {
      title?: string;
      name?: string;
      keywords?: { keywords?: { name: string }[]; results?: { name: string }[] };
    };
    const keywords = (detail.keywords?.keywords ?? detail.keywords?.results ?? []).map((k) => k.name);
    const englishTitle = (type === "movie" ? detail.title : detail.name) ?? null;
    if (isAnime({ genreIds, language, keywords }) || lacksEnglishTitle({ language, originalTitle, englishTitle })) {
      return { allowed: false, displayTitle: null };
    }
    return { allowed: true, displayTitle: foreign && englishTitle && sameTitle(title, originalTitle) ? englishTitle : null };
  } catch {
    // Beter een voorstel minder dan een dat je niet wil zien.
    return { allowed: false, displayTitle: null };
  }
}
