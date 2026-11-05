#!/usr/bin/env node
/**
 * Bouwt `public/data/series-taste-catalog.json`: alle series van de laatste 20 jaar met IMDb ≥ 7,5,
 * met wat de smaakmodule nodig heeft (poster, genres, makers, trefwoorden, …).
 *
 * Bronnen: IMDb-datasets (https://datasets.imdbws.com, persoonlijk niet-commercieel gebruik) voor
 * score en stemmen, TMDB voor de rest. De grote IMDb-bestanden horen niet in de repo.
 *
 *   curl -O https://datasets.imdbws.com/title.ratings.tsv.gz
 *   curl -O https://datasets.imdbws.com/title.basics.tsv.gz
 *   node scripts/build-series-taste-catalog.mjs <map-met-die-bestanden>
 *
 * Tussenresultaten staan in die map (`tmdb-cache.json`), zodat je het script kan hervatten.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import path from "node:path";

const MIN_RATING = 7.5;
const MIN_VOTES = 1000;
/** Nederlandstalige series halen zelden 1000 stemmen; daarvoor geldt een lagere drempel. */
const MIN_VOTES_DUTCH = 100;
const YEARS_BACK = 20;
const EXCLUDED_IMDB_GENRES = new Set(["Talk-Show", "News", "Reality-TV", "Game-Show", "Adult"]);
/** TMDB: Talk, News, Reality. */
const EXCLUDED_TMDB_GENRES = new Set([10767, 10763, 10764]);
const MAX_KEYWORDS = 12;
const WORKERS = 8;

const dir = process.argv[2];
if (!dir) {
  console.error("Gebruik: node scripts/build-series-taste-catalog.mjs <map-met-imdb-bestanden>");
  process.exit(1);
}

function readToken() {
  if (process.env.TMDB_ACCESS_TOKEN) return process.env.TMDB_ACCESS_TOKEN.trim();
  const fromEnv = existsSync(".env.local") && /^TMDB_ACCESS_TOKEN=(.+)$/m.exec(readFileSync(".env.local", "utf8"));
  if (fromEnv) return fromEnv[1].trim().replace(/^["']|["']$/g, "");
  const fromCode = /"(eyJ[^"]+)"/.exec(readFileSync("src/lib/tmdb.ts", "utf8"));
  if (fromCode) return fromCode[1];
  throw new Error("Geen TMDB-token gevonden");
}
const token = readToken();

async function* tsv(file) {
  const lines = createInterface({ input: createReadStream(path.join(dir, file)).pipe(createGunzip()), crlfDelay: Infinity });
  let header = true;
  for await (const line of lines) {
    if (header) {
      header = false;
      continue;
    }
    yield line.split("\t");
  }
}

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

const ratings = new Map();
for await (const [id, rating, votes] of tsv("title.ratings.tsv.gz")) {
  const v = Number(votes);
  if (Number(rating) >= MIN_RATING && v >= MIN_VOTES_DUTCH) ratings.set(id, { rating: Number(rating), votes: v });
}

const firstYear = new Date().getFullYear() - YEARS_BACK;
const candidates = [];
for await (const [id, type, , , , startYear, , , genres] of tsv("title.basics.tsv.gz")) {
  if (type !== "tvSeries" && type !== "tvMiniSeries") continue;
  if (!ratings.has(id) || startYear === "\\N" || Number(startYear) < firstYear) continue;
  if (genres.split(",").some((g) => EXCLUDED_IMDB_GENRES.has(g))) continue;
  candidates.push({ imdbId: id, ...ratings.get(id) });
}
candidates.sort((a, b) => b.votes - a.votes);
console.log(`${candidates.length} kandidaten uit IMDb`);

const cachePath = path.join(dir, "tmdb-cache.json");
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
let index = 0;
let done = 0;

function toEntry(c, d) {
  return {
    id: d.id,
    n: d.name,
    y: Number((d.first_air_date ?? "").slice(0, 4)) || null,
    p: d.poster_path,
    r: c.rating,
    v: c.votes,
    s: d.number_of_seasons ?? null,
    l: d.original_language ?? null,
    g: (d.genres ?? []).map((x) => x.name),
    gi: (d.genres ?? []).map((x) => x.id),
    c: (d.created_by ?? []).map((x) => x.name).slice(0, 4),
    w: (d.networks ?? []).map((x) => x.name).slice(0, 2),
    k: (d.keywords?.results ?? []).map((x) => x.name),
  };
}

async function worker() {
  while (index < candidates.length) {
    const c = candidates[index++];
    if (!(c.imdbId in cache)) {
      const found = await tmdb(`/find/${c.imdbId}?external_source=imdb_id`);
      const hit = found?.tv_results?.[0];
      // Onder de gewone stemmendrempel enkel Nederlandstalig: dat staat al in het zoekresultaat.
      if (!hit || (c.votes < MIN_VOTES && hit.original_language !== "nl")) {
        cache[c.imdbId] = null;
      } else {
        const d = await tmdb(`/tv/${hit.id}?language=nl-NL&append_to_response=keywords`);
        cache[c.imdbId] = d ? toEntry(c, d) : null;
      }
    }
    if (++done % 500 === 0) {
      console.log(`${done}/${candidates.length}`);
      writeFileSync(cachePath, JSON.stringify(cache));
    }
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
writeFileSync(cachePath, JSON.stringify(cache));

// Zelfde regels als src/lib/recommendation-filter.ts: anime en buitenlands zonder Engelse titel krijgen
// `x: 1` en worden niet voorgesteld. Heeft een buitenlandse serie wel een Engelse titel, dan tonen we die
// als TMDB enkel de oorspronkelijke kent.
const ANIMATION_GENRE = 16;
const sameTitle = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const isForeign = (e) => !["en", "nl"].includes(e.l);
const englishPath = path.join(dir, "tmdb-english.json");
const english = existsSync(englishPath) ? JSON.parse(readFileSync(englishPath, "utf8")) : {};
const foreignIds = Array.from(new Set(Object.values(cache).filter((e) => e && isForeign(e)).map((e) => e.id))).filter((id) => !(id in english));
let foreignIndex = 0;
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    while (foreignIndex < foreignIds.length) {
      const id = foreignIds[foreignIndex++];
      const d = await tmdb(`/tv/${id}?language=en-US`);
      if (d) english[id] = { name: d.name ?? null, original: d.original_name ?? "" };
    }
  }),
);
writeFileSync(englishPath, JSON.stringify(english));

function withRecommendationFlag(e) {
  const anime =
    e.gi.includes(ANIMATION_GENRE) && (["ja", "zh", "ko", "cn"].includes(e.l) || e.k.some((k) => /\b(anime|manga|donghua)\b/i.test(k)));
  if (!isForeign(e)) return anime ? { ...e, x: 1 } : e;
  const titles = english[e.id];
  // Zonder gegevens: niet voorstellen, net als de filter op de server.
  const noEnglishTitle =
    !titles || !titles.name || (sameTitle(titles.name, titles.original) && !/\b(the|of|and|to|how|for|with|my|your)\b/i.test(titles.original));
  if (noEnglishTitle) return { ...e, x: 1 };
  return { ...e, n: sameTitle(e.n, titles.original) ? titles.name : e.n, ...(anime ? { x: 1 } : {}) };
}

const seen = new Set();
const entries = [];
for (const c of candidates) {
  const cached = cache[c.imdbId];
  if (!cached || !cached.p || !cached.n || seen.has(cached.id)) continue;
  if (cached.gi.some((g) => EXCLUDED_TMDB_GENRES.has(g))) continue;
  seen.add(cached.id);
  // Score en stemmen altijd vers uit IMDb, ook bij een hervatte run.
  entries.push(withRecommendationFlag({ ...cached, r: c.rating, v: c.votes }));
}

// Trefwoorden die maar één serie heeft, zeggen niets over gelijkenis.
const keywordCount = new Map();
for (const e of entries) for (const k of e.k) keywordCount.set(k, (keywordCount.get(k) ?? 0) + 1);

const series = entries.map(({ gi: _genreIds, ...e }) => ({
  ...e,
  k: e.k
    .filter((k) => (keywordCount.get(k) ?? 0) >= 2)
    .slice(0, MAX_KEYWORDS),
}));

const out = path.join("public", "data", "series-taste-catalog.json");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), firstYear, series }));
console.log(`${series.length} series naar ${out}`);
