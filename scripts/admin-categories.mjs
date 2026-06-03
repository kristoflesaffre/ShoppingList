#!/usr/bin/env node
/**
 * Admin tool for managing ingredient categories.
 * Run: node scripts/admin-categories.mjs
 * Then open: http://localhost:3456
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'src/lib/data/ingredient_categories.json');
const IMAGES_DIR = path.join(ROOT, 'public/images/items');
const PORT = 3456;

// Build case-insensitive image lookup: normalized_name -> actual filename
function buildImageLookup() {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('_240.webp'));
  const lookup = new Map();
  for (const file of files) {
    const key = file.replace('_240.webp', '').toLowerCase();
    lookup.set(key, file);
  }
  return lookup;
}

function ingredientToImageKey(name) {
  return name.toLowerCase().replace(/ /g, '_');
}

const HTML = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Item Categorieën Beheer</title>
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
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    header h1 {
      font-size: 1.2rem;
      font-weight: 600;
      flex: 1;
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

    #count {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.6);
      white-space: nowrap;
    }

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
    }
    #save-btn:hover { background: #22c55e; }
    #save-btn:disabled { background: #6b7280; color: #9ca3af; cursor: not-allowed; }

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

    main {
      padding: 20px 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .category-section {
      margin-bottom: 32px;
    }

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
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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

    .card.deleted {
      opacity: 0.3;
      pointer-events: none;
    }

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

    .card-body {
      padding: 10px;
    }

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
  <h1>🛒 Item Categorieën</h1>
  <input id="search" type="search" placeholder="Zoeken…" autocomplete="off">
  <select id="cat-filter"><option value="">Alle categorieën</option></select>
  <span id="count"></span>
  <button id="save-btn">💾 Bewaren</button>
</header>

<main>
  <div id="content"></div>
  <div id="no-results">Geen items gevonden.</div>
</main>

<div id="toast"></div>

<script>
let data = null;
let deletedKeys = new Set();
let changedCategories = {};

async function load() {
  const res = await fetch('/api/data');
  data = await res.json();
  render();
}

function categoryEmoji(cat) {
  const map = {
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
  return map[cat] || '📦';
}

function render() {
  const search = document.getElementById('search').value.toLowerCase();
  const catFilter = document.getElementById('cat-filter').value;

  // Populate category filter dropdown (once)
  const catFilterEl = document.getElementById('cat-filter');
  if (catFilterEl.options.length === 1) {
    for (const cat of data.categoryOrder) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = categoryEmoji(cat) + ' ' + cat;
      catFilterEl.appendChild(opt);
    }
  }

  // Group items by effective category
  const grouped = {};
  for (const cat of data.categoryOrder) grouped[cat] = [];

  let totalVisible = 0;

  for (const [name, origCat] of Object.entries(data.ingredientToCategory)) {
    if (deletedKeys.has(name)) continue;
    const effectiveCat = changedCategories[name] ?? origCat;

    const matchesSearch = !search || name.includes(search);
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
        \${categoryEmoji(cat)} \${cat}
        <span class="category-count">\${items.length}</span>
      </div>
      <div class="grid"></div>
    \`;

    const grid = section.querySelector('.grid');
    for (const item of items) {
      grid.appendChild(makeCard(item));
    }

    content.appendChild(section);
  }

  document.getElementById('no-results').style.display = hasAny ? 'none' : 'block';
}

function makeCard({ name, cat, origCat }) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.name = name;

  const img = data.images[name];
  const imageHtml = img
    ? \`<img src="/images/items/\${img}" alt="\${name}" loading="lazy">\`
    : \`<div class="no-image">🛒</div>\`;

  const options = data.categoryOrder.map(c =>
    \`<option value="\${c}" \${c === cat ? 'selected' : ''}>\${c}</option>\`
  ).join('');

  const isChanged = changedCategories[name] !== undefined && changedCategories[name] !== origCat;

  card.innerHTML = \`
    \${imageHtml}
    <button class="delete-btn" title="Verwijderen">✕</button>
    <div class="card-body">
      <div class="card-name">\${name}</div>
      <select class="\${isChanged ? 'changed' : ''}">\${options}</select>
    </div>
  \`;

  card.querySelector('select').addEventListener('change', (e) => {
    changedCategories[name] = e.target.value;
    e.target.classList.add('changed');
    // Re-render to move card to correct category section
    setTimeout(render, 0);
  });

  card.querySelector('.delete-btn').addEventListener('click', () => {
    if (confirm(\`"\${name}" verwijderen?\`)) {
      deletedKeys.add(name);
      render();
    }
  });

  return card;
}

async function save() {
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Bezig…';

  // Build final ingredientToCategory
  const result = {};
  for (const [name, cat] of Object.entries(data.ingredientToCategory)) {
    if (deletedKeys.has(name)) continue;
    result[name] = changedCategories[name] ?? cat;
  }

  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientToCategory: result }),
    });
    const json = await res.json();
    if (json.ok) {
      // Update local data
      data.ingredientToCategory = result;
      changedCategories = {};
      showToast('Opgeslagen!', 'success');
      render();
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve item images
  if (url.pathname.startsWith('/images/items/')) {
    const filename = decodeURIComponent(url.pathname.replace('/images/items/', ''));
    const filePath = path.join(IMAGES_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'max-age=3600' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // API: get data
  if (url.pathname === '/api/data' && req.method === 'GET') {
    const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    const imageLookup = buildImageLookup();

    // Map each ingredient to its image filename (if exists)
    const images = {};
    for (const name of Object.keys(raw.ingredientToCategory)) {
      const key = ingredientToImageKey(name);
      if (imageLookup.has(key)) {
        images[name] = imageLookup.get(key);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...raw, images }));
    return;
  }

  // API: save data
  if (url.pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { ingredientToCategory } = JSON.parse(body);
        const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
        const updated = {
          ...existing,
          generatedAt: new Date().toISOString(),
          ingredientToCategory,
        };
        fs.writeFileSync(JSON_PATH, JSON.stringify(updated, null, 2) + '\n');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Serve HTML
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✅ Admin categorieën: http://localhost:${PORT}`);
  console.log(`   Stop met Ctrl+C`);
});
