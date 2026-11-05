/**
 * Seriesmaak: welke series je goed vond, en wat je daardoor waarschijnlijk ook goed zal vinden.
 *
 * Bewaard als rijen in `filmsPartnerReactions` (per persoon, geen schemawijziging):
 * - `taste-tv-{id}` met reactie `good` | `great` | `top` | `no`: jouw oordeel;
 * - `taste-unseen` met reactie = ids met komma's: wat je niet zag. Eén rij, want dat worden er
 *   duizenden en de bibliotheek leest elke reactie van de groep.
 *
 * Series die je volgt of (deels) zag, tellen vanzelf als «goed», tot je er zelf iets over zegt.
 */

export type TasteLevel = "good" | "great" | "top" | "no";

export const TASTE_LEVELS: readonly { level: TasteLevel; label: string; stars: number }[] = [
  { level: "no", label: "Niet goed", stars: 0 },
  { level: "good", label: "Goed", stars: 1 },
  { level: "great", label: "Heel goed", stars: 2 },
  { level: "top", label: "Topklasse", stars: 3 },
];

export const tasteLabel = (level: TasteLevel) => TASTE_LEVELS.find((l) => l.level === level)?.label ?? "";
export const tasteStars = (level: TasteLevel) => TASTE_LEVELS.find((l) => l.level === level)?.stars ?? 0;

export const TASTE_UNSEEN_ID = "taste-unseen";
export const tasteMediaId = (tmdbId: number) => `taste-tv-${tmdbId}`;

export function parseTasteMediaId(mediaId: string): number | null {
  const m = /^taste-tv-(\d+)$/.exec(mediaId);
  return m ? Number(m[1]) : null;
}

export function isTasteLevel(value: string): value is TasteLevel {
  return value === "good" || value === "great" || value === "top" || value === "no";
}

export const parseUnseenList = (raw: string | null | undefined): number[] =>
  (raw ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

/** Eén serie in de catalogus; korte sleutels houden het bestand klein. */
export type TasteSeries = {
  id: number;
  /** Titel */
  n: string;
  /** Eerste jaar */
  y: number | null;
  /** Posterpad bij TMDB */
  p: string | null;
  /** Score (IMDb in de catalogus, TMDB voor series erbuiten) */
  r: number;
  /** Aantal stemmen */
  v: number;
  /** Seizoenen */
  s: number | null;
  /** Oorspronkelijke taal */
  l: string | null;
  /** Genres */
  g: string[];
  /** Makers */
  c: string[];
  /** Zenders en streamingdiensten */
  w: string[];
  /** Trefwoorden */
  k: string[];
};

export const tastePosterUrl = (s: Pick<TasteSeries, "p">) => (s.p ? `https://image.tmdb.org/t/p/w342${s.p}` : null);
/** Kleinere poster voor de kleine tegels op de muur. */
export const tasteSmallPosterUrl = (s: Pick<TasteSeries, "p">) => (s.p ? `https://image.tmdb.org/t/p/w185${s.p}` : null);

/** Een TMDB-serie (detail met `append_to_response=keywords`) in de vorm van de catalogus. */
export function tasteSeriesFromTmdb(d: Record<string, unknown>): TasteSeries | null {
  const name = d.name as string | undefined;
  if (!name || typeof d.id !== "number") return null;
  const names = (key: string) => ((d[key] as { name: string }[] | undefined) ?? []).map((x) => x.name);
  return {
    id: d.id,
    n: name,
    y: Number(((d.first_air_date as string | undefined) ?? "").slice(0, 4)) || null,
    p: (d.poster_path as string | null | undefined) ?? null,
    r: Math.round(((d.vote_average as number | undefined) ?? 0) * 10) / 10,
    v: (d.vote_count as number | undefined) ?? 0,
    s: (d.number_of_seasons as number | undefined) ?? null,
    l: (d.original_language as string | undefined) ?? null,
    g: names("genres"),
    c: names("created_by").slice(0, 4),
    w: names("networks").slice(0, 2),
    k: ((d.keywords as { results?: { name: string }[] } | undefined)?.results ?? []).map((x) => x.name).slice(0, 12),
  };
}

/**
 * Series die vanzelf meetellen: je volgt ze, ze staan op gezien, of je zag er minstens één aflevering van.
 * `ep-…e0` is enkel een startpunt («ik begin hier»), en wie een serie liet vallen (`follow-no-tv-…`)
 * zonder ze uit te kijken, vond ze niet per se goed.
 */
export function autoLikedSeriesIds(watchedIds: readonly string[]): Set<number> {
  const liked = new Set<number>();
  const watchedEpisodes = new Set<number>();
  const dropped = new Set<number>();
  for (const id of watchedIds) {
    let m = /^(?:follow-tv|tv)-(\d+)$/.exec(id);
    if (m) {
      liked.add(Number(m[1]));
      continue;
    }
    m = /^ep-(\d+)-s\d+e(\d+)$/.exec(id);
    if (m) {
      if (Number(m[2]) > 0) watchedEpisodes.add(Number(m[1]));
      continue;
    }
    m = /^follow-no-tv-(\d+)$/.exec(id);
    if (m) dropped.add(Number(m[1]));
  }
  watchedEpisodes.forEach((tmdbId) => {
    if (!dropped.has(tmdbId)) liked.add(tmdbId);
  });
  return liked;
}

export type TasteRating = { level: TasteLevel; auto: boolean };

/** Je eigen oordeel gaat voor; «niet gezien» haalt een automatische serie eruit (bv. je partner zag ze). */
export function effectiveRatings(
  explicit: ReadonlyMap<number, TasteLevel>,
  auto: ReadonlySet<number>,
  unseen: ReadonlySet<number>,
): Map<number, TasteRating> {
  const out = new Map<number, TasteRating>();
  auto.forEach((id) => {
    if (!unseen.has(id)) out.set(id, { level: "good", auto: true });
  });
  explicit.forEach((level, id) => out.set(id, { level, auto: false }));
  return out;
}

const LEVEL_WEIGHT: Record<TasteLevel, number> = { good: 1, great: 2, top: 3.5, no: -2 };
const FEATURE_WEIGHT = { genre: 0.8, keyword: 1, maker: 2.5, network: 0.6, language: 0.8 } as const;

type Vector = { weights: Map<string, number>; norm: number };

function rawFeatures(s: TasteSeries): [string, number][] {
  const out: [string, number][] = [];
  for (const g of s.g) out.push([`g:${g}`, FEATURE_WEIGHT.genre]);
  for (const k of s.k) out.push([`k:${k}`, FEATURE_WEIGHT.keyword]);
  for (const c of s.c) out.push([`c:${c}`, FEATURE_WEIGHT.maker]);
  for (const w of s.w) out.push([`w:${w}`, FEATURE_WEIGHT.network]);
  if (s.l && s.l !== "en") out.push([`l:${s.l}`, FEATURE_WEIGHT.language]);
  return out;
}

type CatalogIndex = { df: Map<string, number>; total: number; vectors: Map<number, Vector> };

function toVector(s: TasteSeries, df: ReadonlyMap<string, number>, total: number): Vector {
  const weights = new Map<string, number>();
  let sum = 0;
  for (const [f, w] of rawFeatures(s)) {
    // Zeldzame kenmerken zeggen meer over gelijkenis dan «Drama».
    const value = w * Math.log(1 + total / (df.get(f) ?? 1));
    weights.set(f, value);
    sum += value * value;
  }
  return { weights, norm: Math.sqrt(sum) };
}

/** Eén keer per catalogus: elk oordeel herberekent de voorstellen, de kenmerken blijven gelijk. */
const catalogIndexes = new WeakMap<readonly TasteSeries[], CatalogIndex>();

function catalogIndex(catalog: readonly TasteSeries[]): CatalogIndex {
  const cached = catalogIndexes.get(catalog);
  if (cached) return cached;
  const df = new Map<string, number>();
  for (const s of catalog) for (const [f] of rawFeatures(s)) df.set(f, (df.get(f) ?? 0) + 1);
  const vectors = new Map<number, Vector>();
  for (const s of catalog) vectors.set(s.id, toVector(s, df, catalog.length));
  const index = { df, total: catalog.length, vectors };
  catalogIndexes.set(catalog, index);
  return index;
}

export type TasteRecommendation = {
  series: TasteSeries;
  score: number;
  /** De series die jij goed vond en waar deze het meest op lijkt. */
  because: TasteSeries[];
};

const NEIGHBOURS = 8;
/** Vanaf zoveel series die je goed vond, valt er iets zinnigs te voorspellen. */
export const MIN_LIKED_FOR_RECOMMENDATIONS = 3;

/**
 * Wat je waarschijnlijk goed zal vinden: series die lijken op wat je goed vond (hoe hoger je oordeel,
 * hoe zwaarder het telt) en niet op wat je niet goed vond, met een klein voordeel voor een hoge score.
 */
export function recommendSeries(
  catalog: readonly TasteSeries[],
  ratings: ReadonlyMap<number, TasteRating>,
  exclude: ReadonlySet<number>,
  limit: number,
  /** Beoordeelde series buiten de catalogus. */
  extra: readonly TasteSeries[] = [],
): TasteRecommendation[] {
  const index = catalogIndex(catalog);
  const byId = new Map<number, TasteSeries>();
  for (const s of extra) byId.set(s.id, s);
  for (const s of catalog) byId.set(s.id, s);

  const rated: { series: TasteSeries; weight: number; norm: number }[] = [];
  // Per kenmerk welke beoordeelde series het hebben: de meeste paren delen niets en vallen zo meteen af.
  const postings = new Map<string, { rated: number; value: number }[]>();
  ratings.forEach((rating, id) => {
    const series = byId.get(id);
    if (!series) return;
    const vector = index.vectors.get(id) ?? toVector(series, index.df, index.total);
    if (!vector.norm) return;
    const at = rated.push({ series, weight: LEVEL_WEIGHT[rating.level], norm: vector.norm }) - 1;
    vector.weights.forEach((value, feature) => {
      const list = postings.get(feature);
      if (list) list.push({ rated: at, value });
      else postings.set(feature, [{ rated: at, value }]);
    });
  });
  if (rated.filter((r) => r.weight > 0).length < MIN_LIKED_FOR_RECOMMENDATIONS) return [];

  const dots = new Float64Array(rated.length);
  const out: TasteRecommendation[] = [];
  for (const candidate of catalog) {
    if (ratings.has(candidate.id) || exclude.has(candidate.id)) continue;
    const vector = index.vectors.get(candidate.id);
    if (!vector?.norm) continue;
    dots.fill(0);
    vector.weights.forEach((value, feature) => {
      for (const posting of postings.get(feature) ?? []) dots[posting.rated] += value * posting.value;
    });
    const liked: { series: TasteSeries; value: number }[] = [];
    const disliked: number[] = [];
    for (let i = 0; i < rated.length; i++) {
      if (dots[i] <= 0) continue;
      const sim = dots[i] / (vector.norm * rated[i].norm);
      if (rated[i].weight > 0) liked.push({ series: rated[i].series, value: sim * rated[i].weight });
      else disliked.push(sim * -rated[i].weight);
    }
    if (liked.length === 0) continue;
    liked.sort((a, b) => b.value - a.value);
    disliked.sort((a, b) => b - a);
    const positive = liked.slice(0, NEIGHBOURS).reduce((sum, x) => sum + x.value, 0);
    const negative = disliked.slice(0, 3).reduce((sum, x) => sum + x, 0);
    const quality = 0.85 + Math.max(0, candidate.r - 7.5) * 0.1;
    const score = (positive - negative) * quality;
    if (score > 0) out.push({ series: candidate, score, because: liked.slice(0, 2).map((x) => x.series) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type TasteProfile = {
  /** Genres die je goed vindt, vaakst eerst; `size` = hoe groot in de woordwolk. */
  genres: { name: string; size: "lg" | "md" | "sm" }[];
};

/**
 * Welke genres je goed vindt, enkel op wat je goed vond («niet goed» telt niet mee: anders vallen genres die
 * overal in zitten weg). Een genre telt vanaf twee goede series (of één zolang je er nog maar een paar hebt);
 * gewogen naar je oordeel, en de grootte volgt hoe dicht het bij je meest gekeken genre zit.
 */
export function tasteProfile(series: readonly TasteSeries[], ratings: ReadonlyMap<number, TasteRating>): TasteProfile {
  const genres = new Map<string, { weight: number; count: number }>();
  let liked = 0;
  for (const s of series) {
    const rating = ratings.get(s.id);
    if (!rating || rating.level === "no" || s.g.length === 0) continue;
    liked++;
    for (const g of s.g) {
      const cur = genres.get(g) ?? { weight: 0, count: 0 };
      genres.set(g, { weight: cur.weight + LEVEL_WEIGHT[rating.level], count: cur.count + 1 });
    }
  }
  const minCount = liked < 5 ? 1 : 2;
  const ranked = Array.from(genres.entries())
    .filter(([, v]) => v.count >= minCount)
    .sort((x, y) => y[1].weight - x[1].weight || x[0].localeCompare(y[0], "nl"));
  const top = ranked[0]?.[1].weight ?? 0;
  return {
    genres: ranked.map(([name, v]) => ({ name, size: v.weight >= top * 0.6 ? "lg" : v.weight >= top * 0.3 ? "md" : "sm" })),
  };
}

/** Eén poster op de muur van «Jouw seriesmaak». `level` is leeg zolang je niets beoordeelde. */
export type TasteWallTile = {
  key: string;
  series: TasteSeries;
  level: TasteLevel | null;
  big: boolean;
  col: number;
  row: number;
};

export const TASTE_WALL_COLS = 30;
export const TASTE_WALL_ROWS = 3;
/** Plek (kolom, rij) van de grote tegels (2×2): om en om bovenaan en onderaan, gelijk verdeeld over de strook. */
const TASTE_WALL_BIG: readonly (readonly [number, number])[] = [
  [2, 0],
  [7, 1],
  [12, 0],
  [17, 1],
  [22, 0],
  [27, 1],
];

const byVotes = <T extends Pick<TasteSeries, "v">>(a: T, b: T) => b.v - a.v;

/**
 * Vult de strook van 30 × 3 vakken: je beste series groot, daartussen om en om wat je goed vond en
 * wat je niet goed vond, de bekendste eerst. Is er te weinig, dan begint de reeks opnieuw. Zonder
 * oordelen hangt `fallback` (de catalogus) er neutraal: een lege muur die zich nog moet vullen.
 */
export function buildTasteWall(rated: readonly (TasteSeries & { level: TasteLevel })[], fallback: readonly TasteSeries[] = []): TasteWallTile[] {
  const withPoster = rated.filter((s) => s.p);
  const entries: { series: TasteSeries; level: TasteLevel | null }[] = withPoster.map((s) => ({ series: s, level: s.level }));
  if (entries.length === 0) {
    fallback
      .filter((s) => s.p)
      .slice()
      .sort(byVotes)
      .slice(0, 72)
      .forEach((series) => entries.push({ series, level: null }));
  }
  if (entries.length === 0) return [];

  const queue = (level: TasteLevel | null) =>
    entries
      .filter((e) => e.level === level)
      .sort((a, b) => byVotes(a.series, b.series));
  const liked = [queue("top"), queue("great"), queue("good")];
  const rest = [...queue("no"), ...queue(null)];
  const bigPool = liked.flat();

  const taken = new Set<number>();
  const tiles: TasteWallTile[] = [];
  const occupied = new Set<string>();
  TASTE_WALL_BIG.forEach(([col, row], i) => {
    const entry = bigPool.length > 0 ? bigPool[i % bigPool.length] : rest[i % rest.length];
    taken.add(entry.series.id);
    tiles.push({ key: `big-${col}`, ...entry, big: true, col, row });
    for (const c of [col, col + 1]) for (const r of [row, row + 1]) occupied.add(`${c}:${r}`);
  });

  const likedQueues = liked.map((q) => q.filter((e) => !taken.has(e.series.id)));
  const restQueue = rest.filter((e) => !taken.has(e.series.id));
  let turn = 0;
  let level = 0;
  /** Volgende uit wat je goed vond, om en om per oordeel; `null` als die op zijn. */
  const nextLiked = () => {
    for (let i = 0; i < likedQueues.length; i++) {
      const q = likedQueues[(level + i) % likedQueues.length];
      if (q.length > 0) {
        level = (level + i + 1) % likedQueues.length;
        return q.shift()!;
      }
    }
    return null;
  };
  let repeat = 0;
  for (let col = 0; col < TASTE_WALL_COLS; col++) {
    for (let row = 0; row < TASTE_WALL_ROWS; row++) {
      if (occupied.has(`${col}:${row}`)) continue;
      const preferLiked = turn++ % 3 === 0;
      const entry = (preferLiked ? (nextLiked() ?? restQueue.shift()) : (restQueue.shift() ?? nextLiked())) ?? entries[repeat++ % entries.length];
      tiles.push({ key: `${col}-${row}`, ...entry, big: false, col, row });
    }
  }
  return tiles;
}
