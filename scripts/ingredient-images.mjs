import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
export const sizes = [160, 240, 320];
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function validSlug(slug) {
  if (typeof slug !== "string" || !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(slug) || /_(160|240|320)$/.test(slug)) {
    throw new Error("Use a catalog slug such as baking_soda, without a size suffix.");
  }
}

export async function inspectImage(input) {
  const metadata = await sharp(input).metadata();
  if (!metadata.hasAlpha) throw new Error("Image must have real transparent alpha.");
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
      if (alpha <= 16) { transparent++; continue; }
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error("Image is fully transparent.");
  if (transparent / (info.width * info.height) < 0.01) throw new Error("Image needs a transparent background, not an opaque alpha channel.");
  if (left === 0 || top === 0 || right === info.width - 1 || bottom === info.height - 1) {
    throw new Error("Subject touches a canvas edge; inspect for clipping and regenerate with margins.");
  }
  return { width: info.width, height: info.height, box: { left, top, width: right - left + 1, height: bottom - top + 1 } };
}

export function previewHtml(slug, referenceUrl) {
  const photo = (url, size) => `<img src="${escape(url)}" width="${size}" height="${size}" alt="${escape(slug)}">`;
  const rows = [48, 160].map((size) => `<section><h2>${size}px</h2><div class="row">${["light", "dark"].map((theme) => `<div class="sample ${theme}"><figure>${photo(referenceUrl, size)}<figcaption>Referentie</figcaption></figure><figure>${photo(`${slug}_${size === 48 ? 160 : size}.webp`, size)}<figcaption>Proef</figcaption></figure></div>`).join("")}</div></section>`).join("");
  return `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(slug)} - beeldcontrole</title><style>body{font:16px system-ui;margin:24px;background:#eee;color:#181818}h1{font-size:24px}h2{font-size:18px}.row{display:flex;gap:16px;flex-wrap:wrap}.sample{display:flex;gap:24px;padding:24px;border-radius:8px}.light{background:#fff}.dark{background:#252529;color:#fff}figure{margin:0;text-align:center}img{object-fit:contain;display:block;margin:auto}figcaption{font-size:12px;margin-top:8px}</style><h1>${escape(slug)}</h1><p>Proef, nog niet toegevoegd aan de catalogus.</p>${rows}</html>`;
}

export async function prepareIngredient({ slug, source, reference, projectRoot = root }) {
  validSlug(slug);
  if (!source || !reference) throw new Error("Source and category reference are required.");
  const dir = path.join(projectRoot, "outputs/ingredient-images", slug);
  const input = await fs.readFile(source);
  await fs.access(reference);
  const inspection = await inspectImage(input);
  if (Math.min(inspection.width, inspection.height) < 320) throw new Error("Source must be at least 320px in each dimension.");
  const cropped = await sharp(input).extract(inspection.box).png().toBuffer();
  const variants = [];
  for (const size of sizes) {
    const contentSize = Math.round(size * 0.94);
    const fitted = await sharp(cropped).resize(contentSize, contentSize, { fit: "contain", background: clear }).png().toBuffer();
    const padding = size - contentSize;
    const bytes = await sharp(fitted).extend({ top: Math.floor(padding / 2), bottom: Math.ceil(padding / 2), left: Math.floor(padding / 2), right: Math.ceil(padding / 2), background: clear }).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
    variants.push({ file: `${slug}_${size}.webp`, bytes });
  }
  await fs.mkdir(path.dirname(dir), { recursive: true });
  await fs.mkdir(dir); // Deliberately refuses to replace an earlier candidate.
  await fs.copyFile(reference, path.join(dir, "reference" + path.extname(reference)));
  await fs.writeFile(path.join(dir, "original" + path.extname(source)), input, { flag: "wx" });
  for (const variant of variants) await fs.writeFile(path.join(dir, variant.file), variant.bytes, { flag: "wx" });
  const manifest = { version: 1, slug, status: "pending-approval", sourceSha256: hash(input), reference: path.relative(projectRoot, reference), preparedAt: new Date().toISOString(), variants: variants.map(({ file, bytes }) => ({ file, sha256: hash(bytes) })) };
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  await fs.writeFile(path.join(dir, "preview.html"), previewHtml(slug, "reference" + path.extname(reference)), { flag: "wx" });
  return dir;
}

export async function publishIngredient({ slug, approved = false, projectRoot = root }) {
  validSlug(slug);
  if (!approved) throw new Error("User approval is required before publishing.");
  const dir = path.join(projectRoot, "outputs/ingredient-images", slug);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
  if (manifest.version !== 1 || manifest.slug !== slug || manifest.status !== "pending-approval" || manifest.variants?.length !== sizes.length) throw new Error("Invalid candidate manifest.");
  const prepared = [];
  for (const size of sizes) {
    const file = `${slug}_${size}.webp`;
    const entry = manifest.variants.find((variant) => variant.file === file);
    const bytes = await fs.readFile(path.join(dir, file));
    if (!entry || hash(bytes) !== entry.sha256) throw new Error("Candidate changed since preparation; prepare and review again.");
    const image = await inspectImage(bytes);
    const metadata = await sharp(bytes).metadata();
    if (metadata.format !== "webp" || image.width !== size || image.height !== size) throw new Error("Invalid image dimensions or format.");
    prepared.push({ file, bytes });
  }
  const destination = path.join(projectRoot, "public/images/ingredients");
  await fs.mkdir(destination, { recursive: true });
  const existing = await fs.readdir(destination);
  if (existing.some((file) => new RegExp(`^${slug}(?:_(?:160|240|320))?\\.(?:webp|png|jpe?g)$`, "i").test(file))) throw new Error("Ingredient already exists; replacement is not permitted.");
  const created = [];
  try {
    for (const { file, bytes } of prepared) {
      const target = path.join(destination, file);
      await fs.writeFile(target, bytes, { flag: "wx" });
      created.push(target);
    }
  } catch (error) {
    for (const target of created) await fs.unlink(target);
    throw error;
  }
  return created;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ options: { slug: { type: "string" }, source: { type: "string" }, reference: { type: "string" }, approved: { type: "boolean" } }, allowPositionals: true });
    if (positionals.length !== 1 || !["prepare", "publish"].includes(positionals[0])) throw new Error("Usage: ingredient-images.mjs prepare --slug NAME --source FILE --reference FILE | publish --slug NAME --approved");
    const result = positionals[0] === "prepare" ? await prepareIngredient(values) : await publishIngredient(values);
    console.log(result);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
