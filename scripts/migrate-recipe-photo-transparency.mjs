/**
 * Creates transparent round recipe icons and optionally applies them to InstantDB.
 *
 * Preview only:
 *   node scripts/migrate-recipe-photo-transparency.mjs
 * Apply after inspecting contact-sheet.png:
 *   node scripts/migrate-recipe-photo-transparency.mjs --apply
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "@instantdb/admin";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { normalizeRecipeImage } from "../src/lib/server/normalize-recipe-image.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(root, "outputs", "recipe-photo-transparency", stamp);

function parseDataUrl(value) {
  const comma = value.indexOf(",");
  if (!value.startsWith("data:") || comma < 0) return null;
  return Buffer.from(value.slice(comma + 1), "base64");
}

async function imageBuffer(photoUrl) {
  const inline = parseDataUrl(photoUrl);
  if (inline) return inline;
  const response = await fetch(photoUrl);
  if (!response.ok) throw new Error(`Afbeelding ophalen faalde (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

function safeName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function contactSheet(items) {
  const width = 6 * 220;
  const height = Math.ceil(items.length / 6) * 250;
  const composites = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const x = (index % 6) * 220;
    const y = Math.floor(index / 6) * 250;
    const before = await sharp(item.original).resize(96, 96, { fit: "contain", background: "#ffffff" }).jpeg().toBuffer();
    const after = await sharp(item.processed).resize(96, 96, { fit: "contain" }).png().toBuffer();
    const label = Buffer.from(`<svg width="208" height="42"><style>.t{font:13px Arial,sans-serif;fill:#111}</style><text x="104" y="17" text-anchor="middle" class="t">${item.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</text><text x="104" y="35" text-anchor="middle" class="t">voor  |  na</text></svg>`);
    composites.push({ input: before, left: x + 6, top: y + 48 });
    composites.push({ input: after, left: x + 116, top: y + 48 });
    composites.push({ input: label, left: x + 6, top: y + 4 });
  }
  return sharp({ create: { width, height, channels: 4, background: "#f2f3f8" } })
    .composite(composites)
    .png()
    .toBuffer();
}

async function main() {
  if (!process.env.INSTANT_APP_ADMIN_TOKEN) throw new Error("INSTANT_APP_ADMIN_TOKEN ontbreekt.");
  if (apply && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN ontbreekt.");

  const db = init({ appId, adminToken: process.env.INSTANT_APP_ADMIN_TOKEN });
  const data = await db.query({ recipes: {} });
  const recipes = (data.recipes ?? []).filter((recipe) => typeof recipe.photoUrl === "string" && recipe.photoUrl.length > 0);
  await fs.mkdir(path.join(outputDir, "originals"), { recursive: true });
  await fs.mkdir(path.join(outputDir, "processed"), { recursive: true });

  const items = [];
  for (const recipe of recipes) {
    const original = await imageBuffer(recipe.photoUrl);
    const processed = await normalizeRecipeImage(original);
    const base = `${safeName(recipe.name)}__${recipe.id}`;
    await fs.writeFile(path.join(outputDir, "originals", `${base}.jpg`), original);
    await fs.writeFile(path.join(outputDir, "processed", `${base}.webp`), processed);
    items.push({ id: recipe.id, name: recipe.name, oldPhotoUrl: recipe.photoUrl, original, processed, output: `processed/${base}.webp` });
  }

  await fs.writeFile(path.join(outputDir, "contact-sheet.png"), await contactSheet(items));

  if (apply) {
    for (const item of items) {
      const pathname = `user-images/recipe-photo-transparent/${stamp}/${item.id}.webp`;
      const blob = await put(pathname, item.processed, { access: "public", contentType: "image/webp" });
      item.newPhotoUrl = blob.url;
    }
    await db.transact(
      items.map((item) =>
        db.tx.recipes[item.id].update({ photoUrl: item.newPhotoUrl }),
      ),
    );
  }

  await fs.writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), applied: apply, recipeCount: items.length, items: items.map(({ original, processed, ...item }) => item) }, null, 2),
  );
  console.log(`${items.length} receptfoto's ${apply ? "gemigreerd" : "voorbereid"}.`);
  console.log(`Preview: ${path.join(outputDir, "contact-sheet.png")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
