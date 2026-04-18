/**
 * Exporteert alle receptfoto's uit InstantDB (`recipes.photoUrl`) naar schijf.
 *
 * Vereist:
 *   - INSTANT_APP_ADMIN_TOKEN (zelfde als in .env.local voor je Next API)
 *   - Optioneel: NEXT_PUBLIC_INSTANT_APP_ID (default = zelfde app-id als in src/lib/instant_app_id.ts)
 *
 * Gebruik (vanaf projectroot):
 *   node scripts/export-recipe-photos.mjs
 *   node scripts/export-recipe-photos.mjs --out ./mijn-export
 *
 * Laadt automatisch .env.local indien aanwezig (zelfde keys als Next).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "@instantdb/admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const DEFAULT_APP_ID =
  process.env.NEXT_PUBLIC_INSTANT_APP_ID ??
  "c63df57f-510a-46bc-8687-912d030c9359";

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
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
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const out = { outputDir: path.join(root, "exported-recipe-photos") };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) {
      out.outputDir = path.resolve(argv[++i]);
    }
  }
  return out;
}

function extFromMime(mime) {
  const m = (mime || "").toLowerCase().split(";")[0].trim();
  if (m === "image/png") return "png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  return "bin";
}

/** @returns {{ mime: string, buffer: Buffer } | null} */
function parseDataUrl(s) {
  if (typeof s !== "string" || !s.startsWith("data:")) return null;
  const comma = s.indexOf(",");
  if (comma === -1) return null;
  const meta = s.slice(5, comma);
  const payload = s.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  const mimeMatch = meta.match(/^([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1].trim() : "application/octet-stream";
  try {
    if (isBase64) {
      return { mime, buffer: Buffer.from(payload, "base64") };
    }
    return { mime, buffer: Buffer.from(decodeURIComponent(payload)) };
  } catch {
    return null;
  }
}

function safeFilePart(name) {
  return String(name || "recept")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "recept";
}

async function fetchAsBuffer(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function main() {
  loadEnvLocal();
  const { outputDir } = parseArgs(process.argv);

  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!adminToken) {
    console.error(
      "Ontbrekende INSTANT_APP_ADMIN_TOKEN. Zet die in .env.local of exporteer hem in de shell.",
    );
    process.exit(1);
  }

  const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID || DEFAULT_APP_ID;
  const db = init({ appId, adminToken });

  console.info("Instant query: alle recipes …");
  const result = await db.query({ recipes: {} });
  const recipes = result.recipes ?? [];

  const withPhoto = recipes.filter(
    (r) => typeof r.photoUrl === "string" && r.photoUrl.trim().length > 0,
  );

  console.info(
    `Totaal ${recipes.length} recepten, ${withPhoto.length} met photoUrl.`,
  );

  fs.mkdirSync(outputDir, { recursive: true });

  const manifest = [];
  let ok = 0;
  let fail = 0;

  for (const r of withPhoto) {
    const photoUrl = String(r.photoUrl).trim();
    const base = `${safeFilePart(r.name)}__${r.id}`;
    let buffer;
    let ext;

    try {
      const data = parseDataUrl(photoUrl);
      if (data) {
        buffer = data.buffer;
        ext = extFromMime(data.mime);
      } else if (/^https?:\/\//i.test(photoUrl)) {
        buffer = await fetchAsBuffer(photoUrl);
        const u = new URL(photoUrl);
        const pathExt = path.extname(u.pathname).replace(".", "").toLowerCase();
        ext =
          pathExt && pathExt.length <= 5 ? pathExt : "bin";
      } else {
        console.warn(`[skip] ${r.id}: photoUrl is geen data-URL of http(s).`);
        manifest.push({
          id: r.id,
          name: r.name,
          status: "skipped_unsupported_scheme",
          preview: photoUrl.slice(0, 80),
        });
        fail++;
        continue;
      }

      const filePath = path.join(outputDir, `${base}.${ext}`);
      fs.writeFileSync(filePath, buffer);
      ok++;
      manifest.push({
        id: r.id,
        name: r.name,
        status: "ok",
        file: path.basename(filePath),
        bytes: buffer.length,
      });
      console.info(`  ok  ${filePath}`);
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ERR ${r.id} (${r.name}): ${msg}`);
      manifest.push({ id: r.id, name: r.name, status: "error", error: msg });
    }
  }

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        appId,
        totalRecipes: recipes.length,
        withPhotoUrl: withPhoto.length,
        saved: ok,
        failedOrSkipped: fail,
        items: manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.info(`\nKlaar. Bestanden in: ${outputDir}`);
  console.info(`manifest.json bevat metadata per recept.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
