/**
 * Zet de grote statische afbeeldingsmappen uit public/images op Vercel Blob
 * en schrijft het manifest dat de server-API's gebruiken (die mappen zitten
 * niet meer in de deployment, zie .vercelignore).
 *
 * Vereist: BLOB_READ_WRITE_TOKEN (staat in .env.local na `vercel env pull`).
 *
 * Gebruik (vanaf projectroot):
 *   npm run sync:images                 # uploaden wat nieuw/gewijzigd is + manifest
 *   npm run sync:images -- --manifest   # enkel het manifest opnieuw schrijven
 *
 * Alleen bestanden die in git staan worden meegenomen: commit nieuwe
 * afbeeldingen eerst, draai dan dit script en commit het manifest.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { list, put } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Mappen onder public/images die op Blob staan i.p.v. in de deployment. */
const OFFLOADED_DIRS = [
  "dranken",
  "frituur",
  "ingredients",
  "items",
  "reference_images",
  "vakantie",
];
/** Mappen waarvan de server de bestandslijst nodig heeft. */
const MANIFEST_DIRS = ["ingredients", "items", "vakantie"];
const MANIFEST_PATH = path.join(root, "src/lib/data/static-image-manifest.json");

const CONTENT_TYPES = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function git(args) {
  return execFileSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function trackedFiles() {
  const dirs = OFFLOADED_DIRS.map((d) => `public/images/${d}`);
  return git(["ls-files", "-z", "--", ...dirs])
    .split("\0")
    .filter(Boolean)
    .filter((f) => fs.existsSync(path.join(root, f)));
}

/** Laatste committijd (unix s) per bestand, als stabiele cache-buster. */
function commitTimes(dirs) {
  const out = git([
    "log",
    "--format=@%ct",
    "--name-only",
    "--",
    ...dirs.map((d) => `public/images/${d}`),
  ]);
  const times = new Map();
  let current = 0;
  for (const line of out.split("\n")) {
    if (line.startsWith("@")) current = Number(line.slice(1));
    else if (line && !times.has(line)) times.set(line, current);
  }
  return times;
}

function writeManifest(files) {
  const times = commitTimes(MANIFEST_DIRS);
  const manifest = {};
  for (const dir of MANIFEST_DIRS) {
    const prefix = `public/images/${dir}/`;
    const entries = files
      .filter((f) => f.startsWith(prefix) && !f.slice(prefix.length).includes("/"))
      .map((f) => [f.slice(prefix.length), times.get(f) ?? 0])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    manifest[dir] = Object.fromEntries(entries);
  }
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 1)}\n`);
  const count = Object.values(manifest).reduce(
    (n, m) => n + Object.keys(m).length,
    0,
  );
  console.log(`Manifest geschreven: ${count} bestanden → ${path.relative(root, MANIFEST_PATH)}`);
}

async function existingBlobs() {
  const sizes = new Map();
  let cursor;
  do {
    const res = await list({ prefix: "images/", cursor, limit: 1000 });
    for (const b of res.blobs) sizes.set(b.pathname, b.size);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return sizes;
}

async function upload(files) {
  const remote = await existingBlobs();
  const todo = files.filter((f) => {
    const pathname = f.replace(/^public\//, "");
    return remote.get(pathname) !== fs.statSync(path.join(root, f)).size;
  });
  console.log(`${files.length} bestanden, ${todo.length} te uploaden.`);

  let done = 0;
  const queue = [...todo];
  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      const pathname = f.replace(/^public\//, "");
      const body = fs.readFileSync(path.join(root, f));
      await put(pathname, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: CONTENT_TYPES[path.extname(f).toLowerCase()],
        cacheControlMaxAge: 60 * 60 * 24 * 30,
      });
      done += 1;
      if (done % 250 === 0 || done === todo.length) {
        console.log(`  ${done}/${todo.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker));
}

async function main() {
  loadEnvLocal();
  const files = trackedFiles();
  if (!process.argv.includes("--manifest")) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN ontbreekt (vercel env pull).");
    }
    await upload(files);
  }
  writeManifest(files);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
