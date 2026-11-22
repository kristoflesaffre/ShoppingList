/**
 * Safely attach reviewed, generated dish photos to photo-less “Nog te testen” recipes.
 * Default is read-only. Use --apply only after the image contact sheet has passed review.
 * Usage: node --env-file=.env.local scripts/attach-generated-recipe-photos.mjs --manifest .cache/recipe-photo-batch/manifest.json [--apply]
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { init } from "@instantdb/admin";
import { put } from "@vercel/blob";
import sharp from "sharp";
import nextEnv from "@next/env";
import { normalizeRecipeImage } from "../src/lib/server/normalize-recipe-image.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, true);
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const manifestIndex = args.indexOf("--manifest");
if (manifestIndex < 0 || !args[manifestIndex + 1]) {
  throw new Error("Geef --manifest <bestand> op.");
}
const manifestPath = path.resolve(root, args[manifestIndex + 1]);
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
if (!Array.isArray(manifest) || !manifest.length) throw new Error("Manifest bevat geen afbeeldingen.");
if (!process.env.INSTANT_APP_ADMIN_TOKEN) throw new Error("INSTANT_APP_ADMIN_TOKEN ontbreekt.");
if (apply && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN ontbreekt.");
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359";
const db = init({ appId, adminToken: process.env.INSTANT_APP_ADMIN_TOKEN });
const imageDirectory = path.dirname(manifestPath);
const results = [];

for (const entry of manifest) {
  if (typeof entry.id !== "string" || typeof entry.file !== "string" || path.basename(entry.file) !== entry.file) {
    throw new Error("Ongeldige recept-ID of afbeeldingsnaam in manifest.");
  }
  const imagePath = path.join(imageDirectory, "images", entry.file);
  const original = await fs.readFile(imagePath);
  const metadata = await sharp(original).metadata();
  if (metadata.format !== "png" || !metadata.hasAlpha || !metadata.width || metadata.width !== metadata.height) {
    throw new Error(`Afbeelding moet vierkant PNG met alpha zijn: ${entry.file}`);
  }
  const normalized = await normalizeRecipeImage(original, { size: 512 });
  const optimizedMetadata = await sharp(normalized).metadata();
  if (optimizedMetadata.format !== "webp" || !optimizedMetadata.hasAlpha || optimizedMetadata.width !== 512) {
    throw new Error(`Normalisatie gaf geen 512px WebP met alpha: ${entry.file}`);
  }
  const { recipes = [] } = await db.query({ recipes: { $: { where: { id: entry.id } } } });
  const recipe = recipes[0];
  if (!recipe || recipe.category !== "nog_te_testen") {
    results.push({ name: entry.name, status: "overgeslagen: geen testrecept" });
    continue;
  }
  if (recipe.photoUrl?.trim()) {
    results.push({ name: recipe.name, status: "overgeslagen: heeft intussen al een foto" });
    continue;
  }
  if (!recipe.ownerId) {
    results.push({ name: recipe.name, status: "overgeslagen: eigenaar ontbreekt" });
    continue;
  }
  if (!apply) {
    results.push({ name: recipe.name, status: "klaar voor toevoegen", bytes: normalized.length });
    continue;
  }

  const assetId = crypto.randomUUID();
  const storageKey = `user-images/${recipe.ownerId}/recipe-photo/${assetId}.webp`;
  const blob = await put(storageKey, normalized, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  });
  const head = await fetch(blob.url, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
  if (!head.ok) throw new Error(`Afbeelding niet bereikbaar na upload: ${recipe.name} (HTTP ${head.status}).`);

  // Recheck immediately before commit. Existing photos always win; never overwrite.
  const { recipes: currentRows = [] } = await db.query({ recipes: { $: { where: { id: entry.id } } } });
  const current = currentRows[0];
  if (!current || current.category !== "nog_te_testen" || current.ownerId !== recipe.ownerId || current.photoUrl?.trim()) {
    results.push({ name: entry.name, status: "niet gekoppeld: recept veranderde tijdens upload; blob blijft ongekoppeld" });
    continue;
  }
  await db.transact([
    db.tx.imageAssets[assetId].update({
      ownerId: recipe.ownerId,
      kind: "recipe-photo",
      url: blob.url,
      storageKey,
      mimeType: "image/webp",
      size: normalized.length,
      createdAtIso: new Date().toISOString(),
    }),
    db.tx.recipes[entry.id].update({ photoUrl: blob.url }),
  ]);
  results.push({ name: recipe.name, status: "toegevoegd", bytes: normalized.length });
  console.log(`${recipe.name}: toegevoegd`);
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", results }, null, 2));
