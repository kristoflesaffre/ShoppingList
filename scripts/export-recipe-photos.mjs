/** Incremental, local-only recipe photo backup. No database writes. */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { init } from "@instantdb/admin";
import nextEnv from "@next/env";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 20 * 1024 * 1024;
export function photoFileBase(name, id) {
  const slug = String(name || "recept").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "recept";
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeId) throw new Error("Recipe ID missing");
  return `${slug}__${safeId}`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function atomicWrite(file, contents) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, contents); fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function readManifest(directory) {
  try { return JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")); }
  catch { return { items: [] }; }
}
function managedFile(directory, name) {
  return typeof name === "string" && path.basename(name) === name && !name.startsWith(".") ? path.join(directory, name) : null;
}
function archive(directory, name) {
  const file = managedFile(directory, name);
  if (!file || !fs.existsSync(file)) return;
  const history = path.join(directory, "_previous");
  fs.mkdirSync(history, { recursive: true });
  fs.renameSync(file, path.join(history, `${Date.now()}-${randomUUID().slice(0, 8)}__${name}`));
}
export function galleryHtml(manifest) {
  const items = manifest.items.filter(item => item.file).sort((a, b) => a.name.localeCompare(b.name, "nl"));
  return `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receptfoto’s</title>
<style>body{margin:0;background:#f7f6f3;color:#242622;font:16px system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:40px 24px}h1{margin:0 0 8px;font-size:36px}p{line-height:1.6}input{box-sizing:border-box;width:min(100%,460px);padding:14px;border:1px solid #787b74;border-radius:8px;font:inherit;background:white}ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:24px;margin-top:28px}li{min-width:0}img{display:block;width:100%;height:220px;object-fit:contain;background:white;border-radius:12px}a{color:inherit;text-decoration:none}a:focus-visible,input:focus-visible{outline:3px solid #416749;outline-offset:4px}h2{font-size:18px;margin:12px 0 6px}small{display:block;color:#52564f;overflow-wrap:anywhere;line-height:1.5}.warning{color:#93451b}#empty{display:none}</style>
<main><h1>Receptfoto’s</h1><p>${items.length} foto’s · Laatst bijgewerkt: ${escapeHtml(new Date(manifest.exportedAt).toLocaleString("nl-BE", { timeZone: "Europe/Brussels" }))}<br>Lokale kopieën; de app blijft de online foto’s gebruiken.</p>
${manifest.failedOrSkipped ? `<p class="warning">${manifest.failedOrSkipped} foto’s konden niet bijgewerkt worden. Bestaande kopieën zijn behouden.</p>` : ""}
<label for="search">Zoek een recept</label><br><input id="search" type="search" placeholder="Bijvoorbeeld bloemkoolpuree" autocomplete="off"><p id="count" aria-live="polite"></p><ul>${items.map(item => `<li data-name="${escapeHtml(item.name.toLocaleLowerCase("nl"))}"><a href="${encodeURIComponent(item.file)}"><img src="${encodeURIComponent(item.file)}" alt="${escapeHtml(item.name)}" loading="lazy"><h2>${escapeHtml(item.name)}</h2></a><small>${escapeHtml(item.file)}</small>${item.status !== "ok" ? '<small class="warning">Vorige kopie · bijwerken mislukt</small>' : ""}</li>`).join("")}</ul><p id="empty">Geen recepten gevonden.</p><p>Eerdere versies en foto’s van verwijderde recepten staan in <code>_previous</code>. Vernieuw deze pagina om een nieuwe synchronisatie te zien.</p></main>
<script>const input=document.getElementById('search');const items=[...document.querySelectorAll('li[data-name]')];input.addEventListener('input',()=>{const query=input.value.toLocaleLowerCase('nl');let count=0;for(const item of items){item.hidden=!item.dataset.name.includes(query);if(!item.hidden)count++}document.getElementById('count').textContent=count+(count===1?' recept':' recepten');document.getElementById('empty').style.display=count?'none':'block'});</script></html>`;
}
async function fetchPhoto(source) {
  let buffer;
  if (source.startsWith("data:")) {
    const match = /^data:image\/[^;,]+;base64,([\s\S]+)$/.exec(source);
    if (!match) throw new Error("Unsupported image data");
    if (match[1].length > MAX_BYTES * 1.4) throw new Error("Image too large");
    buffer = Buffer.from(match[1], "base64");
  } else if (source.startsWith("/") && !source.startsWith("//")) {
    const publicRoot = path.join(root, "public");
    const file = path.resolve(publicRoot, `.${decodeURIComponent(source.split("?")[0])}`);
    if (!file.startsWith(`${publicRoot}${path.sep}`)) throw new Error("Invalid local image path");
    buffer = fs.readFileSync(file);
  } else {
    const url = new URL(source);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("Unsupported image address");
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Image download: HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("Image too large");
    const chunks = []; let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > MAX_BYTES) { throw new Error("Image too large"); }
      chunks.push(chunk);
    }
    buffer = Buffer.concat(chunks);
  }
  if (!buffer.length || buffer.length > MAX_BYTES) throw new Error("Invalid image size");
  // Identify the real format, without recompressing or changing the original photo.
  const metadata = await sharp(buffer, { limitInputPixels: 100_000_000 }).metadata();
  const extension = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif", avif: "avif", heif: "heif", tiff: "tiff" }[metadata.format];
  if (!extension) throw new Error("Unsupported image format");
  return { buffer, extension };
}

/** Export current photos; archive only files recorded in the previous manifest. */
export async function syncRecipePhotos({ recipes, outputDir, appId, download = fetchPhoto }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const previous = readManifest(outputDir);
  if (previous.appId && previous.appId !== appId) throw new Error("Output directory belongs to another Instant app");
  const oldById = new Map((previous.items ?? []).map(item => [item.id, item]));
  const items = []; let changed = 0; let unchanged = 0; let failed = 0;
  const withPhoto = recipes.filter(recipe => typeof recipe.photoUrl === "string" && recipe.photoUrl.trim());
  for (const recipe of withPhoto) {
    const old = oldById.get(recipe.id);
    const source = recipe.photoUrl.trim();
    const fingerprint = createHash("sha256").update(source).digest("hex");
    const base = photoFileBase(recipe.name, recipe.id);
    const oldPath = managedFile(outputDir, old?.file);
    try {
      let file; let bytes;
      if (old?.fingerprint === fingerprint && oldPath && fs.existsSync(oldPath)) {
        file = `${base}${path.extname(old.file)}`; bytes = fs.statSync(oldPath).size;
        if (old.file !== file) { archive(outputDir, file); fs.renameSync(oldPath, path.join(outputDir, file)); changed++; }
        else unchanged++;
      } else {
        const result = await download(source);
        file = `${base}.${result.extension}`; bytes = result.buffer.length;
        // Stage a validated download before moving any existing copy to history.
        const staged = path.join(outputDir, `.${randomUUID()}.tmp`);
        try {
          fs.writeFileSync(staged, result.buffer);
          archive(outputDir, file);
          if (old?.file !== file) archive(outputDir, old?.file);
          fs.renameSync(staged, path.join(outputDir, file));
        } finally { if (fs.existsSync(staged)) fs.unlinkSync(staged); }
        changed++;
      }
      items.push({ id: recipe.id, name: recipe.name || "Recept", status: "ok", file, bytes, fingerprint });
    } catch {
      failed++;
      // Do not record source URLs/data URLs or credentials in the local index/log.
      items.push({ id: recipe.id, name: recipe.name || "Recept", status: "error", ...(oldPath && fs.existsSync(oldPath) ? { file: old.file, bytes: old.bytes, fingerprint: old.fingerprint } : {}) });
      console.warn(`[recipe photos] Foto niet bijgewerkt: ${recipe.name || recipe.id}`);
    }
  }
  const currentIds = new Set(withPhoto.map(recipe => recipe.id));
  for (const item of previous.items ?? []) if (!currentIds.has(item.id)) archive(outputDir, item.file);
  const manifest = { exportedAt: new Date().toISOString(), appId, totalRecipes: recipes.length, withPhotoUrl: withPhoto.length, saved: items.filter(item => item.file).length, changed, unchanged, failedOrSkipped: failed, items };
  atomicWrite(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  atomicWrite(path.join(outputDir, "index.html"), galleryHtml(manifest));
  return manifest;
}

function acquireLock(directory) {
  const lock = path.join(directory, ".sync.lock");
  try {
    const fd = fs.openSync(lock, "wx"); fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd);
    return () => { try { if (fs.readFileSync(lock, "utf8") === String(process.pid)) fs.unlinkSync(lock); } catch {} };
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    try { const pid = Number(fs.readFileSync(lock, "utf8")); if (pid) process.kill(pid, 0); return null; }
    catch (stale) { if (stale.code !== "ESRCH") return null; fs.unlinkSync(lock); return acquireLock(directory); }
  }
}

async function main() {
  nextEnv.loadEnvConfig(root, true);
  const args = process.argv.slice(2); const outIndex = args.indexOf("--out");
  const outputDir = outIndex >= 0 && args[outIndex + 1] ? path.resolve(args[outIndex + 1]) : path.join(root, "exported-recipe-photos");
  const watch = args.includes("--watch");
  if (!process.env.INSTANT_APP_ADMIN_TOKEN) {
    console.warn("[recipe photos] Geen INSTANT_APP_ADMIN_TOKEN; lokale fotosync overgeslagen.");
    if (!watch) process.exitCode = 1;
    return;
  }
  const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "c63df57f-510a-46bc-8687-912d030c9359";
  const db = init({ appId, adminToken: process.env.INSTANT_APP_ADMIN_TOKEN });
  const stop = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => stop.abort());
  do {
    fs.mkdirSync(outputDir, { recursive: true });
    const release = acquireLock(outputDir);
    if (release) {
      try {
        const result = await db.query({ recipes: {} });
        const summary = await syncRecipePhotos({ recipes: result.recipes ?? [], outputDir, appId });
        if (!watch || summary.changed || summary.failedOrSkipped) console.info(`[recipe photos] ${summary.saved} foto’s · ${summary.changed} bijgewerkt · ${summary.unchanged} ongewijzigd · ${summary.failedOrSkipped} mislukt. Overzicht: ${path.join(outputDir, "index.html")}`);
        if (summary.failedOrSkipped && !watch) process.exitCode = 1;
      } catch { console.warn("[recipe photos] Synchronisatie niet gelukt; bestaande lokale foto’s blijven behouden."); if (!watch) process.exitCode = 1; }
      finally { release(); }
    } else if (!watch) console.info("[recipe photos] Er loopt al een synchronisatie.");
    if (watch && !stop.signal.aborted) await delay(60_000, undefined, { signal: stop.signal }).catch(() => {});
  } while (watch && !stop.signal.aborted);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error("[recipe photos] Lokale fotosync gestopt."); process.exitCode = 1; });
