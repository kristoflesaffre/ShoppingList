/**
 * Eenmalige migratie: zet ownerId op alle recepten die nog geen ownerId hebben.
 * Gebruik: node scripts/migrate-recipe-ownerid.mjs
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359";
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN;
const TARGET_EMAIL = "lesaffrekristof@gmail.com";

if (!ADMIN_TOKEN) {
  console.error("INSTANT_APP_ADMIN_TOKEN ontbreekt in .env.local");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function main() {
  // 1. Zoek de user op via email
  console.log(`Gebruiker opzoeken: ${TARGET_EMAIL}...`);
  const result = await db.query({ "$users": {} });
  const allUsers = result["$users"] ?? [];
  const targetUser = allUsers.find((u) => u.email === TARGET_EMAIL);

  if (!targetUser) {
    console.error(`Geen gebruiker gevonden met email ${TARGET_EMAIL}`);
    process.exit(1);
  }
  console.log(`Gevonden: id=${targetUser.id}, email=${targetUser.email}`);

  // 2. Haal alle recepten op
  console.log("Recepten ophalen...");
  const { recipes } = await db.query({ recipes: {} });

  if (!recipes || recipes.length === 0) {
    console.log("Geen recepten gevonden.");
    return;
  }

  // 3. Filter recepten zonder ownerId
  const toMigrate = recipes.filter((r) => !r.ownerId);
  console.log(`${recipes.length} recepten totaal, ${toMigrate.length} zonder ownerId.`);

  if (toMigrate.length === 0) {
    console.log("Niets te migreren.");
    return;
  }

  // 4. Stel ownerId in op alle recepten zonder ownerId
  const txns = toMigrate.map((r) =>
    db.tx.recipes[r.id].update({ ownerId: targetUser.id })
  );

  await db.transact(txns);
  console.log(`✓ ${toMigrate.length} recepten bijgewerkt met ownerId=${targetUser.id}`);
}

main().catch((err) => {
  console.error("Fout:", err);
  process.exit(1);
});
