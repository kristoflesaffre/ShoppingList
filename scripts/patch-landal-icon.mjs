/**
 * Eenmalige migratie: geef alle lijstjes met "landal" in de naam het Landal-icoon
 * als customIconUrl zodat ze consistent het logo tonen.
 *
 * Gebruik: node scripts/patch-landal-icon.mjs
 *          node scripts/patch-landal-icon.mjs --dry-run
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "@instantdb/admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

loadEnvLocal();

const DRY_RUN = process.argv.includes("--dry-run");
const APP_ID =
  process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359";
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("INSTANT_APP_ADMIN_TOKEN ontbreekt in .env.local");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const LANDAL_ICON_URL = "/images/ui/landal_160.webp";

async function main() {
  console.log(`Modus: ${DRY_RUN ? "DRY RUN (geen wijzigingen)" : "LIVE"}`);
  console.log("Lijstjes ophalen…");

  const { lists } = await db.query({ lists: {} });

  if (!lists || lists.length === 0) {
    console.log("Geen lijstjes gevonden.");
    return;
  }

  const landalLists = lists.filter((l) =>
    String(l.name ?? "").toLowerCase().includes("landal"),
  );

  console.log(`${landalLists.length} Landal-lijstjes gevonden van ${lists.length} totaal.`);

  if (landalLists.length === 0) {
    console.log("Niets te updaten.");
    return;
  }

  for (const l of landalLists) {
    const current = l.customIconUrl ?? "(geen)";
    console.log(`  ${l.name}  →  customIconUrl: ${current} → ${LANDAL_ICON_URL}`);
  }

  if (DRY_RUN) {
    console.log("\nDRY RUN: geen wijzigingen doorgevoerd.");
    return;
  }

  const txns = landalLists.map((l) =>
    db.tx.lists[l.id].update({ customIconUrl: LANDAL_ICON_URL }),
  );

  await db.transact(txns);
  console.log(`\n✓ ${landalLists.length} lijstjes bijgewerkt.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
