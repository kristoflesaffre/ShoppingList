#!/usr/bin/env node
/**
 * Beheerswebsite voor itemcategorieën per lijsttype.
 * Run: npm run admin  (of: node scripts/admin-categories.mjs)
 * Open: http://localhost:3456
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 3456;

const PATHS = {
  boodschappen: path.join(ROOT, 'src/lib/data/ingredient_categories.json'),
  vakantie: path.join(ROOT, 'src/lib/data/vacation_item_categories.json'),
  cafe: path.join(ROOT, 'src/lib/data/cafe_item_categories.json'),
  frituur: path.join(ROOT, 'src/lib/data/frituur_item_categories.json'),
};

const TABS = [
  { id: 'boodschappen', label: 'Boodschappen', emoji: '🛒' },
  { id: 'vakantie', label: 'Vakantie', emoji: '🏖️' },
  { id: 'landal', label: 'Landal', emoji: '🏡', aliasOf: 'vakantie' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'frituur', label: 'Frituur', emoji: '🍟' },
];

const CAFE_CATEGORY_ORDER = [
  'frisdranken', 'warm', 'bieren', 'aperitieven', 'wijnen',
  'cocktails', 'sterk', 'snacks', 'ijsjes',
];

const CAFE_CATEGORY_LABELS = {
  frisdranken: 'Frisdranken',
  warm: 'Warme dranken',
  bieren: 'Bieren',
  aperitieven: 'Aperitieven',
  wijnen: 'Wijnen',
  cocktails: 'Cocktails',
  sterk: 'Sterke dranken',
  snacks: 'Snacks',
  ijsjes: 'IJsjes',
};

const FRITUUR_CATEGORY_ORDER = ['frieten', 'snacks', 'sauzen'];
const FRITUUR_CATEGORY_LABELS = {
  frieten: 'Frieten',
  snacks: 'Snacks',
  sauzen: 'Sauzen',
};

const VACATION_CATEGORY_EMOJI = {
  'Te regelen': '📋',
  'Toiletartikelen': '🧴',
  'Kleding': '👕',
  'Eten & drinken': '🍽️',
  'Gekoelde eten en drank': '🧊',
  'Elektronica': '📱',
  'Slaapspullen': '🛏️',
  'Documenten': '📄',
  'Medicijnen': '💊',
  'Huishouden': '🏠',
  'Strand': '🏖️',
  'Speelgoed': '🧸',
  'Accessoires': '👜',
  'Andere': '📦',
};

const BOODSCHAPPEN_CATEGORY_EMOJI = {
  'Groenten & Fruit': '🥦',
  'Vlees & Charcuterie': '🥩',
  'Vis & Zeevruchten': '🐟',
  'Zuivel, Kaas & Eieren': '🧀',
  'Brood': '🍞',
  'Beleg': '🍯',
  'Droogwaren & Bakproducten': '🌾',
  'Conserven, Sauzen, Olie & Kruiden': '🫙',
  'Zoute Snacks': '🍿',
  'Snoep & Chocolade': '🍫',
  'Warme Dranken': '☕',
  'Koude Dranken': '🥤',
  'Diepvries': '❄️',
  'Huishouden & Schoonmaak': '🧹',
  'Persoonlijke Verzorging': '🧴',
  'Dierenvoeding': '🐾',
  'Overig': '📦',
};

const CAFE_CATEGORY_EMOJI = {
  frisdranken: '🥤',
  warm: '☕',
  bieren: '🍺',
  aperitieven: '🍸',
  wijnen: '🍷',
  cocktails: '🍹',
  sterk: '🥃',
  snacks: '🥨',
  ijsjes: '🍦',
};

const FRITUUR_CATEGORY_EMOJI = {
  frieten: '🍟',
  snacks: '🌭',
  sauzen: '🫙',
};

function normalizeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeItemKey(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function resolveDomainId(domainId) {
  const tab = TABS.find((t) => t.id === domainId);
  if (!tab) return null;
  return tab.aliasOf ?? tab.id;
}

/** Alle gangbare sleutelvarianten voor een bestandsnaam (streepje ↔ underscore). */
function imageLookupKeys(baseName) {
  const lower = normalizeDiacritics(String(baseName).toLowerCase());
  return new Set([
    lower,
    lower.replace(/-/g, '_'),
    lower.replace(/_/g, '-'),
  ]);
}

function buildImageLookup(imagesDir, suffix = '_240.webp') {
  if (!fs.existsSync(imagesDir)) return new Map();
  const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith(suffix));
  const lookup = new Map();
  for (const file of files) {
    const base = file.replace(suffix, '');
    for (const key of imageLookupKeys(base)) {
      if (!lookup.has(key)) lookup.set(key, file);
    }
  }
  return lookup;
}

function resolveImageFromLookup(slug, lookup, aliases = {}) {
  const candidates = new Set(imageLookupKeys(slug));
  const alias = aliases[slug] ?? aliases[normalizeDiacritics(slug.toLowerCase())];
  if (alias) {
    for (const key of imageLookupKeys(alias)) candidates.add(key);
  }
  for (const key of candidates) {
    if (lookup.has(key)) return lookup.get(key);
  }
  return null;
}

/** Slugs zonder eigen afbeelding → bestaand bestand in vakantie-map. */
const VACATION_IMAGE_ALIASES = {
  t_shirt: 't-shirt',
  t_shirt_kind: 't-shirt_kind',
  e_reader: 'e-reader',
  sokken: 'sokken_man',
  snack_onderweg: 'ovenhapjes',
};

const VACATION_ADMIN_SKIP_SLUGS = new Set(['totaal_per_lijst']);

function ingredientToImageKey(name) {
  return normalizeDiacritics(name.toLowerCase().replace(/ /g, '_'));
}

function parseCafeItemsFromSource() {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/cafe-venue-wizard.ts'), 'utf8');
  const items = [];
  const re = /\{\s*id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*category:\s*"([^"]+)"[\s\S]*?iconSrc:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(src)) !== null) {
    items.push({
      id: match[1],
      name: match[2],
      category: match[3],
      iconSrc: match[4],
    });
  }
  return items;
}

function frituurNameToImageKey(name) {
  return normalizeDiacritics(name.toLowerCase().replace(/ /g, '_'));
}

function parseFrituurItemsFromSource() {
  const src = fs.readFileSync(path.join(ROOT, 'src/app/lijstje/[id]/page.tsx'), 'utf8');
  const start = src.indexOf('const FRITUUR_WIZARD_ITEMS_RAW');
  if (start < 0) return [];
  const slice = src.slice(start, start + 120000);
  const items = [];
  const re = /\{\s*id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*category:\s*"([^"]+)"[\s\S]*?(?:iconSrc:\s*"([^"]+)")?/g;
  let match;
  while ((match = re.exec(slice)) !== null) {
    items.push({
      id: match[1],
      name: match[2],
      category: match[3],
      iconSrc: match[4] ?? null,
    });
  }
  return items;
}

function ensureCafeData() {
  if (fs.existsSync(PATHS.cafe)) {
    return JSON.parse(fs.readFileSync(PATHS.cafe, 'utf8'));
  }
  const items = parseCafeItemsFromSource();
  const itemToCategory = {};
  for (const item of items) {
    itemToCategory[normalizeItemKey(item.name)] = item.category;
  }
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'src/lib/cafe-venue-wizard.ts',
    categoryOrder: CAFE_CATEGORY_ORDER,
    categoryLabels: CAFE_CATEGORY_LABELS,
    itemToCategory,
    synonymToCanonical: {},
    items,
  };
  fs.mkdirSync(path.dirname(PATHS.cafe), { recursive: true });
  fs.writeFileSync(PATHS.cafe, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`📝 Aangemaakt: ${PATHS.cafe} (${items.length} items)`);
  return payload;
}

function ensureFrituurData() {
  if (fs.existsSync(PATHS.frituur)) {
    return JSON.parse(fs.readFileSync(PATHS.frituur, 'utf8'));
  }
  const items = parseFrituurItemsFromSource();
  const itemToCategory = {};
  for (const item of items) {
    itemToCategory[normalizeItemKey(item.name)] = item.category;
  }
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'src/app/lijstje/[id]/page.tsx',
    categoryOrder: FRITUUR_CATEGORY_ORDER,
    categoryLabels: FRITUUR_CATEGORY_LABELS,
    itemToCategory,
    synonymToCanonical: {},
    items,
  };
  fs.mkdirSync(path.dirname(PATHS.frituur), { recursive: true });
  fs.writeFileSync(PATHS.frituur, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`📝 Aangemaakt: ${PATHS.frituur} (${items.length} items)`);
  return payload;
}

function slugToDisplayName(slug) {
  return slug.replace(/_/g, ' ');
}

function vacationDisplayName(slug) {
  const labels = {
    t_shirt: 'T-shirt',
    t_shirt_kind: 'T-shirt kind',
    e_reader: 'E-reader',
    snack_onderweg: 'Snack onderweg',
  };
  if (labels[slug]) return labels[slug];
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function loadBoodschappenData() {
  const raw = JSON.parse(fs.readFileSync(PATHS.boodschappen, 'utf8'));
  const imageLookup = buildImageLookup(path.join(ROOT, 'public/images/items'));
  const images = {};
  for (const name of Object.keys(raw.ingredientToCategory)) {
    const key = ingredientToImageKey(name);
    if (imageLookup.has(key)) images[name] = `/images/items/${imageLookup.get(key)}`;
  }
  return {
    domain: 'boodschappen',
    label: 'Boodschappen',
    itemToCategory: raw.ingredientToCategory,
    categoryOrder: raw.categoryOrder,
    categoryEmoji: BOODSCHAPPEN_CATEGORY_EMOJI,
    synonymToCanonical: raw.synonymToCanonical ?? {},
    images,
    hasSynonyms: true,
    infoBanner: null,
    placeholderEmoji: '🛒',
  };
}

function loadVakantieData() {
  const raw = JSON.parse(fs.readFileSync(PATHS.vakantie, 'utf8'));
  const imageLookup = buildImageLookup(path.join(ROOT, 'public/images/vakantie'));
  const itemToCategory = {};
  const images = {};
  for (const [slug, cat] of Object.entries(raw.slugToCategory ?? {})) {
    if (VACATION_ADMIN_SKIP_SLUGS.has(slug)) continue;
    const name = vacationDisplayName(slug);
    itemToCategory[name] = cat;
    const imageFile = resolveImageFromLookup(slug, imageLookup, VACATION_IMAGE_ALIASES);
    if (imageFile) {
      images[name] = `/images/vakantie/${imageFile}`;
    }
  }
  return {
    domain: 'vakantie',
    label: 'Vakantie',
    itemToCategory,
    categoryOrder: raw.categoryOrder,
    categoryEmoji: VACATION_CATEGORY_EMOJI,
    synonymToCanonical: raw.synonymToCanonical ?? {},
    images,
    hasSynonyms: true,
    infoBanner: null,
    placeholderEmoji: '🏖️',
    _slugKeys: Object.fromEntries(
      Object.keys(raw.slugToCategory ?? {}).map((slug) => [slugToDisplayName(slug), slug]),
    ),
    _rawVacation: raw,
  };
}

function loadCafeData() {
  const raw = ensureCafeData();
  const images = {};
  for (const item of raw.items ?? []) {
    if (item.iconSrc) images[item.name] = item.iconSrc.startsWith('/') ? item.iconSrc : `/${item.iconSrc}`;
  }
  const itemToCategory = {};
  for (const item of raw.items ?? []) {
    itemToCategory[item.name] = raw.itemToCategory?.[normalizeItemKey(item.name)] ?? item.category;
  }
  return {
    domain: 'cafe',
    label: 'Café',
    itemToCategory,
    categoryOrder: raw.categoryOrder,
    categoryLabels: raw.categoryLabels ?? CAFE_CATEGORY_LABELS,
    categoryEmoji: CAFE_CATEGORY_EMOJI,
    synonymToCanonical: raw.synonymToCanonical ?? {},
    images,
    hasSynonyms: true,
    infoBanner: null,
    placeholderEmoji: '☕',
    _cafeItems: raw.items ?? [],
  };
}

function loadFrituurData() {
  const raw = ensureFrituurData();
  const sourceById = new Map(
    parseFrituurItemsFromSource().map((item) => [item.id, item]),
  );
  const imageLookup = buildImageLookup(
    path.join(ROOT, 'public/images/frituur'),
    '_160.webp',
  );
  const images = {};
  for (const item of raw.items ?? []) {
    const fromJson = item.iconSrc
      ? (item.iconSrc.startsWith('/') ? item.iconSrc : `/${item.iconSrc}`)
      : null;
    const fromSource = sourceById.get(item.id)?.iconSrc ?? null;
    const imageKey = frituurNameToImageKey(item.name);
    const fromDisk = imageLookup.has(imageKey)
      ? `/images/frituur/${imageLookup.get(imageKey)}`
      : null;
    images[item.name] = fromJson ?? fromSource ?? fromDisk ?? null;
  }
  const itemToCategory = {};
  for (const item of raw.items ?? []) {
    itemToCategory[item.name] = raw.itemToCategory?.[normalizeItemKey(item.name)] ?? item.category;
  }
  return {
    domain: 'frituur',
    label: 'Frituur',
    itemToCategory,
    categoryOrder: raw.categoryOrder,
    categoryLabels: raw.categoryLabels ?? FRITUUR_CATEGORY_LABELS,
    categoryEmoji: FRITUUR_CATEGORY_EMOJI,
    synonymToCanonical: raw.synonymToCanonical ?? {},
    images,
    hasSynonyms: true,
    infoBanner: null,
    placeholderEmoji: '🍟',
    _frituurItems: raw.items ?? [],
  };
}

function loadDomainData(requestedDomain) {
  const dataDomain = resolveDomainId(requestedDomain);
  if (!dataDomain) return null;

  let data;
  if (dataDomain === 'boodschappen') data = loadBoodschappenData();
  else if (dataDomain === 'vakantie') data = loadVakantieData();
  else if (dataDomain === 'cafe') data = loadCafeData();
  else if (dataDomain === 'frituur') data = loadFrituurData();
  else return null;

  const tab = TABS.find((t) => t.id === requestedDomain);
  if (tab?.aliasOf) {
    data = {
      ...data,
      domain: requestedDomain,
      label: tab.label,
      infoBanner: 'Landal-lijstjes gebruiken dezelfde paklijst-items als vakantie. Wijzigingen gelden voor beide.',
    };
  }

  const { _slugKeys, _rawVacation, _cafeItems, _frituurItems, ...clientData } = data;
  return {
    ...clientData,
    tabs: TABS.map(({ id, label, emoji }) => ({ id, label, emoji })),
  };
}

function saveBoodschappen({ itemToCategory, synonymToCanonical }) {
  const existing = JSON.parse(fs.readFileSync(PATHS.boodschappen, 'utf8'));
  const updated = {
    ...existing,
    generatedAt: new Date().toISOString(),
    ingredientToCategory: itemToCategory,
    synonymToCanonical,
  };
  fs.writeFileSync(PATHS.boodschappen, `${JSON.stringify(updated, null, 2)}\n`);
}

function pruneSynonymsForDeleted(synonymToCanonical, deletedKeys) {
  const deleted = new Set(deletedKeys);
  const pruned = {};
  for (const [syn, canonical] of Object.entries(synonymToCanonical ?? {})) {
    if (deleted.has(canonical)) continue;
    pruned[syn] = canonical;
  }
  return pruned;
}

function saveVakantie({ itemToCategory, synonymToCanonical, deletedKeys }) {
  const existing = JSON.parse(fs.readFileSync(PATHS.vakantie, 'utf8'));
  const slugToCategory = { ...(existing.slugToCategory ?? {}) };
  const newItemToCategory = { ...(existing.itemToCategory ?? {}) };

  for (const name of deletedKeys) {
    const slug = name.replace(/ /g, '_').toLowerCase();
    delete slugToCategory[slug];
    const norm = normalizeItemKey(name);
    delete newItemToCategory[norm];
    delete newItemToCategory[norm.replace(/\s/g, '_')];
  }

  for (const [name, cat] of Object.entries(itemToCategory)) {
    const slug = name.replace(/ /g, '_').toLowerCase();
    slugToCategory[slug] = cat;
    const norm = normalizeItemKey(name);
    newItemToCategory[norm] = cat;
    const underscored = norm.replace(/\s/g, '_');
    if (underscored !== norm) newItemToCategory[underscored] = cat;
  }

  const updated = {
    ...existing,
    generatedAt: new Date().toISOString(),
    slugToCategory,
    itemToCategory: newItemToCategory,
    synonymToCanonical: pruneSynonymsForDeleted(synonymToCanonical, deletedKeys),
  };
  fs.writeFileSync(PATHS.vakantie, `${JSON.stringify(updated, null, 2)}\n`);
}

function saveCafe({ itemToCategory, synonymToCanonical, deletedKeys }) {
  const existing = ensureCafeData();
  const items = (existing.items ?? []).filter((item) => !deletedKeys.includes(item.name));
  const newItemToCategory = {};
  for (const item of items) {
    const cat = itemToCategory[item.name] ?? item.category;
    item.category = cat;
    newItemToCategory[normalizeItemKey(item.name)] = cat;
  }
  const updated = {
    ...existing,
    generatedAt: new Date().toISOString(),
    itemToCategory: newItemToCategory,
    synonymToCanonical: pruneSynonymsForDeleted(synonymToCanonical, deletedKeys),
    items,
  };
  fs.writeFileSync(PATHS.cafe, `${JSON.stringify(updated, null, 2)}\n`);
}

function saveFrituur({ itemToCategory, synonymToCanonical, deletedKeys }) {
  const existing = ensureFrituurData();
  const sourceById = new Map(
    parseFrituurItemsFromSource().map((item) => [item.id, item]),
  );
  const items = (existing.items ?? [])
    .filter((item) => !deletedKeys.includes(item.name))
    .map((item) => ({
      ...item,
      iconSrc: item.iconSrc ?? sourceById.get(item.id)?.iconSrc ?? null,
    }));
  const newItemToCategory = {};
  for (const item of items) {
    const cat = itemToCategory[item.name] ?? item.category;
    item.category = cat;
    newItemToCategory[normalizeItemKey(item.name)] = cat;
  }
  const updated = {
    ...existing,
    generatedAt: new Date().toISOString(),
    itemToCategory: newItemToCategory,
    synonymToCanonical: pruneSynonymsForDeleted(synonymToCanonical, deletedKeys),
    items,
  };
  fs.writeFileSync(PATHS.frituur, `${JSON.stringify(updated, null, 2)}\n`);
}

function saveDomainData(requestedDomain, payload) {
  const dataDomain = resolveDomainId(requestedDomain);
  if (dataDomain === 'boodschappen') {
    saveBoodschappen(payload);
  } else if (dataDomain === 'vakantie') {
    saveVakantie(payload);
  } else if (dataDomain === 'cafe') {
    saveCafe(payload);
  } else if (dataDomain === 'frituur') {
    saveFrituur(payload);
  } else {
    throw new Error(`Onbekend domein: ${requestedDomain}`);
  }
}

const HTML = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lijstbeheer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0f2f5;
      color: #1a1a2e;
    }

    header {
      background: #1a1a2e;
      color: white;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .header-top {
      padding: 14px 24px 10px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    header h1 { font-size: 1.2rem; font-weight: 600; flex: 1; min-width: 160px; }

    .tabs {
      display: flex;
      gap: 4px;
      padding: 0 24px 0;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .tab-btn {
      padding: 10px 16px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.65);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      white-space: nowrap;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover { color: rgba(255,255,255,0.9); }
    .tab-btn.active {
      color: white;
      border-bottom-color: #4ade80;
    }

    .header-controls {
      padding: 10px 24px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    #search {
      padding: 8px 14px;
      border-radius: 8px;
      border: none;
      background: rgba(255,255,255,0.15);
      color: white;
      font-size: 0.9rem;
      width: 220px;
      outline: none;
    }
    #search::placeholder { color: rgba(255,255,255,0.5); }
    #search:focus { background: rgba(255,255,255,0.25); }

    #cat-filter {
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      background: rgba(255,255,255,0.15);
      color: white;
      font-size: 0.9rem;
      cursor: pointer;
      outline: none;
    }
    #cat-filter option { color: #1a1a2e; background: white; }

    #count { font-size: 0.85rem; color: rgba(255,255,255,0.6); white-space: nowrap; }

    #save-btn {
      padding: 8px 20px;
      background: #4ade80;
      color: #1a1a2e;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
      margin-left: auto;
    }
    #save-btn:hover { background: #22c55e; }
    #save-btn:disabled { background: #6b7280; color: #9ca3af; cursor: not-allowed; }

    #info-banner {
      display: none;
      margin: 16px 24px 0;
      padding: 12px 16px;
      background: #dbeafe;
      color: #1e40af;
      border-radius: 10px;
      font-size: 0.88rem;
      max-width: 1600px;
      margin-left: auto;
      margin-right: auto;
    }

    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      z-index: 999;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
    }
    #toast.show { opacity: 1; transform: translateY(0); }
    #toast.success { background: #4ade80; color: #1a1a2e; }
    #toast.error { background: #f87171; color: white; }

    main { padding: 20px 24px; max-width: 1600px; margin: 0 auto; }

    .category-section { margin-bottom: 32px; }

    .category-header {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      padding: 6px 0 10px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-count {
      background: #e5e7eb;
      color: #6b7280;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 0.75rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }

    .card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      transition: box-shadow 0.15s;
      position: relative;
    }
    .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); }

    .card img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      background: #f9fafb;
      display: block;
    }

    .card .no-image {
      width: 100%;
      aspect-ratio: 1;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }

    .card-body { padding: 10px; }

    .card-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 8px;
      line-height: 1.3;
      min-height: 2.2em;
    }

    .card select {
      width: 100%;
      padding: 5px 6px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      font-size: 0.75rem;
      color: #374151;
      background: #f9fafb;
      cursor: pointer;
      outline: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 6px center;
      padding-right: 22px;
    }
    .card select:focus { border-color: #6366f1; background-color: white; }
    .card select.changed { border-color: #f59e0b; background-color: #fffbeb; }

    .synonyms-section {
      margin-top: 8px;
      border-top: 1px solid #f3f4f6;
      padding-top: 8px;
    }

    .synonyms-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #9ca3af;
      margin-bottom: 5px;
    }

    .synonyms-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 5px;
    }

    .synonym-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #ede9fe;
      color: #5b21b6;
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 0.7rem;
      font-weight: 500;
      line-height: 1.4;
    }

    .synonym-chip.new { background: #d1fae5; color: #065f46; }

    .synonym-remove {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 0.7rem;
      padding: 0;
      opacity: 0.6;
      line-height: 1;
      display: flex;
      align-items: center;
    }
    .synonym-remove:hover { opacity: 1; }

    .synonym-add-row {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }

    .synonym-input {
      flex: 1;
      min-width: 0;
      padding: 3px 6px;
      border-radius: 5px;
      border: 1px solid #e5e7eb;
      font-size: 0.72rem;
      outline: none;
      color: #1a1a2e;
    }
    .synonym-input:focus { border-color: #6366f1; }

    .synonym-add-btn {
      padding: 3px 7px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 0.72rem;
      cursor: pointer;
      white-space: nowrap;
      font-weight: 600;
    }
    .synonym-add-btn:hover { background: #4f46e5; }

    .delete-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(0,0,0,0.45);
      color: white;
      border: none;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s, background 0.15s;
      line-height: 1;
    }
    .card:hover .delete-btn { opacity: 1; }
    .delete-btn:hover { background: rgba(220,38,38,0.85); }

    #no-results {
      text-align: center;
      color: #9ca3af;
      padding: 60px 0;
      font-size: 1rem;
      display: none;
    }
  </style>
</head>
<body>

<header>
  <div class="header-top">
    <h1 id="page-title">📋 Lijstbeheer</h1>
    <span id="count"></span>
  </div>
  <nav class="tabs" id="tabs"></nav>
  <div class="header-controls">
    <input id="search" type="search" placeholder="Zoeken op naam of synoniem…" autocomplete="off">
    <select id="cat-filter"><option value="">Alle categorieën</option></select>
    <button id="save-btn">💾 Bewaren</button>
  </div>
</header>

<div id="info-banner"></div>

<main>
  <div id="content"></div>
  <div id="no-results">Geen items gevonden.</div>
</main>

<div id="toast"></div>

<script>
let domain = 'boodschappen';
let data = null;
let deletedKeys = new Set();
let changedCategories = {};
let synonymsByCanonical = {};

function resetState() {
  deletedKeys = new Set();
  changedCategories = {};
  synonymsByCanonical = {};
  document.getElementById('search').value = '';
  document.getElementById('cat-filter').value = '';
  const catFilter = document.getElementById('cat-filter');
  while (catFilter.options.length > 1) catFilter.remove(1);
}

function catLabel(cat) {
  const emoji = data.categoryEmoji?.[cat] || '📦';
  const label = data.categoryLabels?.[cat] ?? cat;
  return emoji + ' ' + label;
}

async function load() {
  const res = await fetch('/api/data?domain=' + encodeURIComponent(domain));
  data = await res.json();

  synonymsByCanonical = {};
  if (data.hasSynonyms) {
    for (const [syn, canonical] of Object.entries(data.synonymToCanonical ?? {})) {
      if (!synonymsByCanonical[canonical]) synonymsByCanonical[canonical] = new Set();
      synonymsByCanonical[canonical].add(syn);
    }
  }

  document.getElementById('page-title').textContent =
    (data.tabs?.find(t => t.id === domain)?.emoji ?? '📋') + ' ' + data.label;

  const banner = document.getElementById('info-banner');
  if (data.infoBanner) {
    banner.textContent = 'ℹ️ ' + data.infoBanner;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }

  renderTabs();
  render();
}

function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = '';
  for (const tab of data.tabs ?? []) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (tab.id === domain ? ' active' : '');
    btn.textContent = tab.emoji + ' ' + tab.label;
    btn.addEventListener('click', () => switchDomain(tab.id));
    tabsEl.appendChild(btn);
  }
}

function synonymsChanged() {
  if (!data?.hasSynonyms) return false;
  const original = data.synonymToCanonical ?? {};
  const current = {};
  for (const [canonical, syns] of Object.entries(synonymsByCanonical)) {
    for (const syn of syns) current[syn] = canonical;
  }
  const origKeys = Object.keys(original).sort().join('|');
  const curKeys = Object.keys(current).sort().join('|');
  if (origKeys !== curKeys) return true;
  return Object.entries(current).some(([syn, canonical]) => original[syn] !== canonical);
}

async function switchDomain(next) {
  if (next === domain) return;
  const hasChanges = deletedKeys.size > 0
    || Object.keys(changedCategories).length > 0
    || synonymsChanged();
  if (hasChanges && !confirm('Niet-opgeslagen wijzigingen gaan verloren. Doorgaan?')) return;
  domain = next;
  resetState();
  await load();
}

function getSynonyms(name) {
  return synonymsByCanonical[name] ?? new Set();
}

function render() {
  const search = document.getElementById('search').value.toLowerCase().trim();
  const catFilter = document.getElementById('cat-filter').value;

  const catFilterEl = document.getElementById('cat-filter');
  if (catFilterEl.options.length === 1) {
    for (const cat of data.categoryOrder) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = catLabel(cat);
      catFilterEl.appendChild(opt);
    }
  }

  const grouped = {};
  for (const cat of data.categoryOrder) grouped[cat] = [];

  let totalVisible = 0;

  for (const [name, origCat] of Object.entries(data.itemToCategory)) {
    if (deletedKeys.has(name)) continue;
    const effectiveCat = changedCategories[name] ?? origCat;

    const synonyms = getSynonyms(name);
    const matchesSearch = !search
      || name.toLowerCase().includes(search)
      || [...synonyms].some(s => s.includes(search));
    const matchesCat = !catFilter || effectiveCat === catFilter;
    if (!matchesSearch || !matchesCat) continue;

    if (!grouped[effectiveCat]) grouped[effectiveCat] = [];
    grouped[effectiveCat].push({ name, cat: effectiveCat, origCat });
    totalVisible++;
  }

  document.getElementById('count').textContent = totalVisible + ' items';

  const content = document.getElementById('content');
  content.innerHTML = '';

  let hasAny = false;
  for (const cat of data.categoryOrder) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;
    hasAny = true;

    items.sort((a, b) => a.name.localeCompare(b.name, 'nl'));

    const section = document.createElement('div');
    section.className = 'category-section';
    section.dataset.cat = cat;
    section.innerHTML = \`
      <div class="category-header">
        \${catLabel(cat)}
        <span class="category-count">\${items.length}</span>
      </div>
      <div class="grid"></div>
    \`;

    const grid = section.querySelector('.grid');
    for (const item of items) grid.appendChild(makeCard(item));
    content.appendChild(section);
  }

  document.getElementById('no-results').style.display = hasAny ? 'none' : 'block';
}

function makeCard({ name, cat, origCat }) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.name = name;

  const imgUrl = data.images[name];
  const imageHtml = imgUrl
    ? \`<img src="\${imgUrl}" alt="\${name}" loading="lazy">\`
    : \`<div class="no-image">\${data.placeholderEmoji ?? '📦'}</div>\`;

  const options = data.categoryOrder.map(c => {
    const label = data.categoryLabels?.[c] ?? c;
    return \`<option value="\${c}" \${c === cat ? 'selected' : ''}>\${label}</option>\`;
  }).join('');

  const isChanged = changedCategories[name] !== undefined && changedCategories[name] !== origCat;

  const synonymsHtml = data.hasSynonyms ? \`
      <div class="synonyms-section">
        <div class="synonyms-label">Synoniemen</div>
        <div class="synonyms-chips"></div>
        <div class="synonym-add-row">
          <input class="synonym-input" type="text" placeholder="Nieuw synoniem…">
          <button class="synonym-add-btn">+</button>
        </div>
      </div>\` : '';

  card.innerHTML = \`
    \${imageHtml}
    <button class="delete-btn" title="Verwijderen">✕</button>
    <div class="card-body">
      <div class="card-name">\${name}</div>
      <select class="\${isChanged ? 'changed' : ''}">\${options}</select>
      \${synonymsHtml}
    </div>
  \`;

  if (data.hasSynonyms) {
    renderChips(card, name);
    const input = card.querySelector('.synonym-input');
    const addBtn = card.querySelector('.synonym-add-btn');
    function addSynonym() {
      const val = input.value.trim().toLowerCase();
      if (!val) return;
      if (!synonymsByCanonical[name]) synonymsByCanonical[name] = new Set();
      synonymsByCanonical[name].add(val);
      input.value = '';
      renderChips(card, name);
    }
    addBtn.addEventListener('click', addSynonym);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSynonym(); } });
  }

  card.querySelector('select').addEventListener('change', (e) => {
    changedCategories[name] = e.target.value;
    e.target.classList.add('changed');
    setTimeout(render, 0);
  });

  card.querySelector('.delete-btn').addEventListener('click', () => {
    if (confirm(\`"\${name}" verwijderen?\`)) {
      deletedKeys.add(name);
      delete synonymsByCanonical[name];
      render();
    }
  });

  return card;
}

function renderChips(card, name) {
  const chipsEl = card.querySelector('.synonyms-chips');
  if (!chipsEl) return;
  chipsEl.innerHTML = '';
  const synonyms = getSynonyms(name);
  const originalSyns = new Set(
    Object.entries(data.synonymToCanonical ?? {})
      .filter(([, c]) => c === name)
      .map(([s]) => s)
  );

  for (const syn of [...synonyms].sort()) {
    const isNew = !originalSyns.has(syn);
    const chip = document.createElement('span');
    chip.className = 'synonym-chip' + (isNew ? ' new' : '');
    chip.innerHTML = \`\${syn}<button class="synonym-remove" title="Verwijder synoniem">✕</button>\`;
    chip.querySelector('.synonym-remove').addEventListener('click', () => {
      synonymsByCanonical[name]?.delete(syn);
      renderChips(card, name);
    });
    chipsEl.appendChild(chip);
  }
}

async function save() {
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Bezig…';

  const itemToCategory = {};
  for (const [name, cat] of Object.entries(data.itemToCategory)) {
    if (deletedKeys.has(name)) continue;
    itemToCategory[name] = changedCategories[name] ?? cat;
  }

  const synonymToCanonical = {};
  if (data.hasSynonyms) {
    for (const [canonical, syns] of Object.entries(synonymsByCanonical)) {
      if (deletedKeys.has(canonical)) continue;
      for (const syn of syns) synonymToCanonical[syn] = canonical;
    }
  }

  try {
    const res = await fetch('/api/save?domain=' + encodeURIComponent(domain), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemToCategory,
        synonymToCanonical,
        deletedKeys: [...deletedKeys],
      }),
    });
    const json = await res.json();
    if (json.ok) {
      deletedKeys = new Set();
      changedCategories = {};
      showToast('Opgeslagen!', 'success');
      await load();
    } else {
      showToast('Fout: ' + json.error, 'error');
    }
  } catch (e) {
    showToast('Netwerkfout', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Bewaren';
  }
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  setTimeout(() => { t.className = ''; }, 2800);
}

document.getElementById('save-btn').addEventListener('click', save);
document.getElementById('search').addEventListener('input', render);
document.getElementById('cat-filter').addEventListener('change', render);

load();
</script>
</body>
</html>`;

const MIME = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/images/')) {
    // Decode %C3%A9 etc. zodat «satékruiden» op schijf gevonden wordt
    const decodedPath = decodeURIComponent(url.pathname);
    const filePath = path.join(ROOT, 'public', decodedPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'max-age=3600',
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  if (url.pathname === '/api/data' && req.method === 'GET') {
    const domain = url.searchParams.get('domain') ?? 'boodschappen';
    const payload = loadDomainData(domain);
    if (!payload) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Onbekend domein' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
    return;
  }

  if (url.pathname === '/api/save' && req.method === 'POST') {
    const domain = url.searchParams.get('domain') ?? 'boodschappen';
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        saveDomainData(domain, payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✅ Lijstbeheer: http://localhost:${PORT}`);
  console.log(`   Tabs: ${TABS.map((t) => t.label).join(' · ')}`);
  console.log(`   Stop met Ctrl+C`);
});
