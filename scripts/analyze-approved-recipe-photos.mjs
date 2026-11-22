/** Read-only style audit of approved recipes. Downloads their current photos locally, then creates a contact sheet. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "@instantdb/admin";
import sharp from "sharp";
import nextEnv from "@next/env";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, true);
if (!process.env.INSTANT_APP_ADMIN_TOKEN) throw new Error("INSTANT_APP_ADMIN_TOKEN ontbreekt.");
const out = path.resolve(root, process.argv[2] ?? ".cache/recipe-photo-style");
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359";
const db = init({ appId, adminToken: process.env.INSTANT_APP_ADMIN_TOKEN });
const { recipes = [] } = await db.query({ recipes: {} });
const approved = recipes.filter((r) => r.category !== "nog_te_testen" && r.photoUrl?.trim());
await fs.mkdir(path.join(out, "images"), { recursive: true });
const cards = [];
const manifest = [];
for (const recipe of approved) {
  let bytes;
  if (recipe.photoUrl.startsWith("data:image/")) {
    const match = /^data:image\/[^;,]+;base64,([\s\S]+)$/.exec(recipe.photoUrl);
    if (!match) continue;
    bytes = Buffer.from(match[1], "base64");
  } else {
    const url = new URL(recipe.photoUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com")) {
      throw new Error(`Niet-toegestane fotobron voor ${recipe.name}.`);
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Foto ophalen mislukt voor ${recipe.name} (HTTP ${response.status}).`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const slug = String(recipe.name || "recept").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "recept";
  const file = `${slug}__${recipe.id}.png`;
  const imagePath = path.join(out, "images", file);
  const image = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const png = await image.png().toBuffer();
  await fs.writeFile(imagePath, png);
  const thumb = await sharp(png).resize(180, 180, { fit: "contain", background: "#faf9f6" }).flatten({ background: "#faf9f6" }).jpeg({ quality: 82 }).toBuffer();
  cards.push({ name: recipe.name, image: thumb });
  manifest.push({ id: recipe.id, name: recipe.name, file, width: meta.width ?? null, height: meta.height ?? null, hasAlpha: Boolean(meta.hasAlpha), format: meta.format ?? null, bytes: png.length });
}
const cols = 6, cell = 220, rows = Math.ceil(cards.length / cols);
const composites = [];
for (let i = 0; i < cards.length; i++) {
  const x = (i % cols) * cell + 20;
  const y = Math.floor(i / cols) * cell;
  composites.push({ input: cards[i].image, left: x, top: y + 10 });
  const label = Buffer.from(`<svg width="190" height="30"><text x="0" y="20" font-family="Arial" font-size="12" fill="#222">${cards[i].name.replace(/[&<>"']/g," ").slice(0,28)}</text></svg>`);
  composites.push({ input: label, left: x, top: y + 192 });
}
const sheet = await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: "#f4f2ed" } }).composite(composites).jpeg({ quality: 88 }).toBuffer();
await fs.writeFile(path.join(out, "contact-sheet.jpg"), sheet);
await fs.writeFile(path.join(out, "manifest.json"), JSON.stringify({ analyzedAt: new Date().toISOString(), count: manifest.length, items: manifest }, null, 2));
console.log(JSON.stringify({ approvedWithPhoto: manifest.length, directory: out, contactSheet: path.join(out, "contact-sheet.jpg"), rawUrlsSaved: false }));
