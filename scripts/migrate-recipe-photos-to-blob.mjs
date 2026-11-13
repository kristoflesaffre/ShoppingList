/**
 * Receptfoto's die nog als data-URL in `recipes.photoUrl` staan, verhuizen naar Vercel Blob (zoals nieuwe foto's
 * via /api/images/upload). Zo'n data-URL zit in elk recept-record en dus in elke query die recepten leest: 245
 * foto's = ± 16 MB die de startpagina bij elke start downloadde. Het beeld blijft byte voor byte hetzelfde.
 *
 *   node --env-file=.env.local scripts/migrate-recipe-photos-to-blob.mjs            # enkel tellen
 *   node --env-file=.env.local scripts/migrate-recipe-photos-to-blob.mjs --apply    # backup + verhuizen
 *
 * Backup (id → oude photoUrl) in .cache/recipe-photo-backup-<tijd>.json (niet in Git); terugzetten met
 *   node --env-file=.env.local scripts/migrate-recipe-photos-to-blob.mjs --restore <backup.json>
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { init } from "@instantdb/admin";
import { put } from "@vercel/blob";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const restoreIdx = process.argv.indexOf("--restore");
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359";
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
if (!adminToken) throw new Error("INSTANT_APP_ADMIN_TOKEN ontbreekt (draai met --env-file=.env.local).");
const db = init({ appId, adminToken });

function parseDataUrl(value) {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(value);
  if (!match || !match[1].startsWith("image/")) return null;
  const mime = match[1];
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
  return { mime, ext, bytes: Buffer.from(match[2], "base64") };
}

if (restoreIdx !== -1) {
  const backup = JSON.parse(await fs.readFile(process.argv[restoreIdx + 1], "utf8"));
  const txs = backup.map((row) => db.tx.recipes[row.id].update({ photoUrl: row.photoUrl }));
  for (let i = 0; i < txs.length; i += 20) await db.transact(txs.slice(i, i + 20));
  console.log(`${backup.length} receptfoto's teruggezet.`);
  process.exit(0);
}

const { recipes } = await db.query({ recipes: {} });
const todo = recipes.filter((r) => typeof r.photoUrl === "string" && r.photoUrl.startsWith("data:"));
const kb = Math.round(todo.reduce((n, r) => n + r.photoUrl.length, 0) / 1024);
console.log(`${todo.length} van ${recipes.length} recepten hebben nog een data-URL-foto (± ${kb} KB).`);
if (!apply || todo.length === 0) process.exit(0);
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN ontbreekt.");

await fs.mkdir(path.join(root, ".cache"), { recursive: true });
const backupFile = path.join(root, ".cache", `recipe-photo-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await fs.writeFile(backupFile, JSON.stringify(todo.map((r) => ({ id: r.id, photoUrl: r.photoUrl }))), { mode: 0o600 });
console.log(`Backup: ${path.relative(root, backupFile)}`);

let done = 0;
let failed = 0;
for (const r of todo) {
  const parsed = parseDataUrl(r.photoUrl);
  if (!parsed || !r.ownerId) {
    failed++;
    console.warn(`overgeslagen: ${r.name} (${!r.ownerId ? "geen eigenaar" : "geen beeld-data-URL"})`);
    continue;
  }
  try {
    const assetId = crypto.randomUUID();
    const storageKey = `user-images/${r.ownerId}/recipe-photo/${assetId}.${parsed.ext}`;
    const blob = await put(storageKey, parsed.bytes, { access: "public", contentType: parsed.mime });
    // Eerst controleren dat de blob echt bereikbaar is, pas dan het recept omzetten.
    const check = await fetch(blob.url, { method: "HEAD" });
    if (!check.ok) throw new Error(`blob niet bereikbaar (${check.status})`);
    await db.transact([
      db.tx.imageAssets[assetId].update({
        ownerId: r.ownerId,
        kind: "recipe-photo",
        url: blob.url,
        storageKey,
        mimeType: parsed.mime,
        size: parsed.bytes.length,
        createdAtIso: new Date().toISOString(),
      }),
      db.tx.recipes[r.id].update({ photoUrl: blob.url }),
    ]);
    done++;
    if (done % 25 === 0) console.log(`${done}/${todo.length}`);
  } catch (err) {
    failed++;
    console.warn(`mislukt: ${r.name}: ${err instanceof Error ? err.message : err}`);
  }
}
console.log(`Klaar: ${done} verhuisd, ${failed} niet.`);
process.exit(failed ? 1 : 0);
