/**
 * Voegt ontbrekende vakantie-items toe aan het SS Rotterdam-vakantielijstje.
 *
 * Gebruik: node scripts/add-sokken-rotterdam.mjs
 *          node scripts/add-sokken-rotterdam.mjs --dry-run
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { init } from "@instantdb/admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

// Reguliere items (tripPerson-tab)
const TAB_ITEMS = [
  { name: "Airtag",       tripPerson: "Noë",    itemCategory: "Elektronica",    section: "Algemeen" },
  { name: "Fluitje",      tripPerson: "Noë",    itemCategory: "Andere",         section: "Algemeen" },
  { name: "Handtas",      tripPerson: "Noë",    itemCategory: "Accessoires",    section: "Algemeen" },
  { name: "Handtas",      tripPerson: "Chloé",  itemCategory: "Accessoires",    section: "Algemeen" },
  { name: "Portefeuille", tripPerson: "Chloé",  itemCategory: "Accessoires",    section: "Algemeen" },
  { name: "Rijstwafels",  tripPerson: "Samen",  itemCategory: "Eten & drinken", section: "Algemeen" },
  { name: "Snack onderweg", tripPerson: "Samen", itemCategory: "Eten & drinken", section: "Algemeen" },
  { name: "Sokken",       tripPerson: "Kristof",itemCategory: "Kleding",        section: "Algemeen" },
  { name: "Sokken",       tripPerson: "Chloé",  itemCategory: "Kleding",        section: "Algemeen" },
  { name: "Tandpasta",    tripPerson: "Kristof",itemCategory: "Toiletartikelen",section: "Algemeen" },
  { name: "Tandpasta",    tripPerson: "Chloé",  itemCategory: "Toiletartikelen",section: "Algemeen" },
  { name: "Tekentablet",  tripPerson: "Noë",    itemCategory: "Speelgoed",      section: "Algemeen" },
  { name: "Tekenspullen", tripPerson: "Noë",    itemCategory: "Speelgoed",      section: "Algemeen" },
  { name: "Thermos koffie", tripPerson: "Chloé", itemCategory: "Eten & drinken", section: "Algemeen" },
  { name: "Tijgerbalsem", tripPerson: "Chloé",  itemCategory: "Toiletartikelen",section: "Algemeen" },
];

// Voor-vertrek items (section: "Voor vertrek", geen tripPerson)
const VOOR_VERTREK_ITEMS = [
  { name: "Planten water geven", itemCategory: "Te regelen" },
  { name: "Waterbak Puddy bijvullen", itemCategory: "Te regelen" },
  { name: "Kattenbak leegscheppen", itemCategory: "Te regelen" },
  { name: "Kattenkorrels aanvullen", itemCategory: "Te regelen" },
];

async function main() {
  console.log(`Modus: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  const { $users, lists } = await db.query({
    $users: {},
    lists: { items: {} },
  });

  const me = $users.find(
    (u) => String(u.email ?? "").toLowerCase() === "lesaffrekristof@gmail.com",
  );
  if (!me?.id) {
    console.error("Gebruiker lesaffrekristof@gmail.com niet gevonden.");
    process.exit(1);
  }

  const rotterdamList = lists.find(
    (l) =>
      l.ownerId === me.id &&
      String(l.name ?? "").toLowerCase().includes("rotterdam"),
  );

  if (!rotterdamList) {
    console.error('Geen lijst met "Rotterdam" gevonden voor deze gebruiker.');
    process.exit(1);
  }

  console.log(
    `Lijst: "${rotterdamList.name}" (${rotterdamList.id}), ${rotterdamList.items?.length ?? 0} items`,
  );

  const txs = [];

  for (const candidate of TAB_ITEMS) {
    const existingItem = (rotterdamList.items ?? []).find(
      (i) =>
        String(i.name ?? "").trim().toLowerCase() === candidate.name.toLowerCase() &&
        String(i.tripPerson ?? "").trim() === candidate.tripPerson,
    );
    if (existingItem) {
      const storedCategory = String(existingItem.itemCategory ?? "").trim();
      if (storedCategory !== candidate.itemCategory) {
        console.log(
          `  ~ ${candidate.name} (${candidate.tripPerson}) categorie: ${storedCategory || "(leeg)"} → ${candidate.itemCategory}`,
        );
        txs.push(
          db.tx.items[existingItem.id].update({
            itemCategory: candidate.itemCategory,
            tripPerson: candidate.tripPerson,
          }),
        );
      } else {
        console.log(`  Reeds aanwezig: ${candidate.name} (${candidate.tripPerson})`);
      }
      continue;
    }
    const newId = randomUUID();
    console.log(`  + ${candidate.name} (${candidate.tripPerson} / ${candidate.itemCategory}) → ${newId}`);
    txs.push(
      db.tx.items[newId]
        .update({
          name: candidate.name,
          quantity: "",
          checked: false,
          tripPerson: candidate.tripPerson,
          itemCategory: candidate.itemCategory,
          section: candidate.section,
          order: Date.now(),
        })
        .link({ list: rotterdamList.id }),
    );
  }

  for (const candidate of VOOR_VERTREK_ITEMS) {
    const existingItem = (rotterdamList.items ?? []).find(
      (i) => String(i.name ?? "").trim().toLowerCase() === candidate.name.toLowerCase(),
    );
    if (existingItem) {
      const storedCategory = String(existingItem.itemCategory ?? "").trim();
      const storedSection = String(existingItem.section ?? "").trim();
      if (storedCategory !== candidate.itemCategory || storedSection !== "Voor vertrek") {
        console.log(
          `  ~ ${candidate.name} (Voor vertrek) categorie/sectie corrigeren`,
        );
        txs.push(
          db.tx.items[existingItem.id].update({
            itemCategory: candidate.itemCategory,
            section: "Voor vertrek",
          }),
        );
      } else {
        console.log(`  Reeds aanwezig: ${candidate.name} (Voor vertrek)`);
      }
      continue;
    }
    const newId = randomUUID();
    console.log(`  + ${candidate.name} (Voor vertrek) → ${newId}`);
    txs.push(
      db.tx.items[newId]
        .update({
          name: candidate.name,
          quantity: "",
          checked: false,
          section: "Voor vertrek",
          itemCategory: candidate.itemCategory,
          order: Date.now(),
        })
        .link({ list: rotterdamList.id }),
    );
  }

  if (txs.length === 0) {
    console.log("Niets toe te voegen.");
    return;
  }

  if (DRY_RUN) {
    console.log(`DRY RUN — ${txs.length} wijziging(en) niet opgeslagen.`);
    return;
  }

  await db.transact(txs);
  console.log(`✓ ${txs.length} wijziging(en) verwerkt voor SS Rotterdam.`);
}

main().catch((err) => {
  console.error("Fout:", err);
  process.exit(1);
});
