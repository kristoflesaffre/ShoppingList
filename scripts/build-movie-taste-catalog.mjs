#!/usr/bin/env node
/**
 * Bouwt `public/data/movie-taste-catalog.json`: goede films van alle jaren (TMDB-score ≥ 7 met ≥ 500 stemmen),
 * met wat de smaakmodule nodig heeft. Zelfde vorm als de seriescatalogus; bij een film staan er in `c` de
 * regisseurs, in `w` de hoofdrolspelers, en in `k` ook de filmreeks, zodat delen van een reeks op elkaar lijken.
 * Alles komt uit TMDB (de scores dus ook), er zijn geen losse datasets nodig.
 *
 *   node scripts/build-movie-taste-catalog.mjs <map-voor-tussenresultaten>
 *
 * Tussenresultaten staan in die map (`tmdb-movie-cache.json`), zodat je het script kan hervatten.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MIN_RATING = 7;
const MIN_VOTES = 500;
const MAX_KEYWORDS = 12;
const MAX_CAST = 3;
const WORKERS = 8;

const dir = process.argv[2];
if (!dir) {
  console.error("Gebruik: node scripts/build-movie-taste-catalog.mjs <map-voor-tussenresultaten>");
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

function readToken() {
  if (process.env.TMDB_ACCESS_TOKEN) return process.env.TMDB_ACCESS_TOKEN.trim();
  const fromEnv = existsSync(".env.local") && /^TMDB_ACCESS_TOKEN=(.+)$/m.exec(readFileSync(".env.local", "utf8"));
  if (fromEnv) return fromEnv[1].trim().replace(/^["']|["']$/g, "");
  const fromCode = /"(eyJ[^"]+)"/.exec(readFileSync("src/lib/tmdb.ts", "utf8"));
  if (fromCode) return fromCode[1];
  throw new Error("Geen TMDB-token gevonden");
}
const token = readToken();

async function tmdb(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3${url}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return null;
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      /* Netwerkfout: opnieuw proberen. */
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return null;
}

// De lijst opgedeeld per score: één lange lijst op stemmen schuift tijdens het ophalen en slaat dan films over.
const ids = new Map();
const discover = (page) =>
  tmdb(`/discover/movie?include_adult=false&include_video=false&vote_count.gte=${MIN_VOTES}&vote_average.gte=${MIN_RATING}&sort_by=vote_count.desc&page=${page}`);
const first = await discover(1);
if (!first) throw new Error("TMDB antwoordt niet");
let nextPage = 1;
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    while (nextPage <= first.total_pages) {
      const page = nextPage++;
      const data = await discover(page);
      for (const row of data?.results ?? []) ids.set(row.id, row.vote_count);
    }
  }),
);
console.log(`${ids.size} films uit TMDB (opgegeven: ${first.total_results})`);

const cachePath = path.join(dir, "tmdb-movie-cache.json");
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
const todo = Array.from(ids.keys()).filter((id) => !(id in cache));
let index = 0;
let done = 0;

function toEntry(d, english) {
  const keywords = (d.keywords?.keywords ?? []).map((x) => x.name);
  const collection = d.belongs_to_collection?.name;
  return {
    id: d.id,
    n: d.title,
    y: Number((d.release_date ?? "").slice(0, 4)) || null,
    p: d.poster_path,
    r: Math.round((d.vote_average ?? 0) * 10) / 10,
    v: d.vote_count ?? 0,
    s: null,
    l: d.original_language ?? null,
    g: (d.genres ?? []).map((x) => x.name),
    gi: (d.genres ?? []).map((x) => x.id),
    c: (d.credits?.crew ?? []).filter((x) => x.job === "Director").map((x) => x.name).slice(0, 3),
    w: (d.credits?.cast ?? []).slice(0, MAX_CAST).map((x) => x.name),
    k: collection ? [`reeks: ${collection}`, ...keywords] : keywords,
    en: english?.title ?? null,
    o: d.original_title ?? "",
  };
}

await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    while (index < todo.length) {
      const id = todo[index++];
      const d = await tmdb(`/movie/${id}?language=nl-NL&append_to_response=keywords,credits`);
      const foreign = d && !["en", "nl"].includes(d.original_language);
      const english = foreign ? await tmdb(`/movie/${id}?language=en-US`) : null;
      cache[id] = d ? toEntry(d, english) : null;
      if (++done % 500 === 0) {
        console.log(`${done}/${todo.length}`);
        writeFileSync(cachePath, JSON.stringify(cache));
      }
    }
  }),
);
writeFileSync(cachePath, JSON.stringify(cache));

// Zelfde regels als src/lib/recommendation-filter.ts: anime en buitenlands zonder Engelse titel krijgen `x: 1`
// en worden niet voorgesteld. Heeft een buitenlandse film wel een Engelse titel, dan tonen we die als TMDB
// enkel de oorspronkelijke kent.
const ANIMATION_GENRE = 16;
const sameTitle = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

function withRecommendationFlag(e) {
  const anime = e.gi.includes(ANIMATION_GENRE) && (["ja", "zh", "ko", "cn"].includes(e.l) || e.k.some((k) => /\b(anime|manga|donghua)\b/i.test(k)));
  if (["en", "nl"].includes(e.l)) return anime ? { ...e, x: 1 } : e;
  const noEnglishTitle = !e.en || (sameTitle(e.en, e.o) && !/\b(the|of|and|to|how|for|with|my|your)\b/i.test(e.o));
  if (noEnglishTitle) return { ...e, x: 1 };
  return { ...e, n: sameTitle(e.n, e.o) ? e.en : e.n, ...(anime ? { x: 1 } : {}) };
}

const entries = Array.from(ids.keys())
  .map((id) => cache[id])
  .filter((e) => e && e.p && e.n)
  .map(withRecommendationFlag)
  .sort((a, b) => b.v - a.v);

// Trefwoorden die maar één film heeft, zeggen niets over gelijkenis.
const keywordCount = new Map();
for (const e of entries) for (const k of e.k) keywordCount.set(k, (keywordCount.get(k) ?? 0) + 1);

const movies = entries.map(({ gi: _genreIds, en: _english, o: _original, ...e }) => ({
  ...e,
  k: e.k.filter((k) => (keywordCount.get(k) ?? 0) >= 2).slice(0, MAX_KEYWORDS),
}));

const out = path.join("public", "data", "movie-taste-catalog.json");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), series: movies }));
console.log(`${movies.length} films naar ${out} (${movies.filter((m) => m.x).length} niet voorstellen)`);
