/**
 * Zorgt dat Landal-gezinlijstjes voor beide vaste gezinsleden zichtbaar zijn
 * via listMembers (zonder expliciete deellink).
 *
 * Gebruik: node scripts/ensure-landal-gezin-household.mjs
 *          node scripts/ensure-landal-gezin-household.mjs --dry-run
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

const HOUSEHOLD_EMAILS = ["lesaffrekristof@gmail.com", "claes_cc@live.be"];

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

function inferLandalTripLabel(list) {
  const explicit = String(list.landalTripLabel ?? "").trim();
  if (explicit) return explicit;
  const icon = String(list.customIconUrl ?? "").toLowerCase();
  if (icon.includes("/gezin_") || icon.includes("gezin_160")) return "Gezin";
  const name = String(list.name ?? "");
  if (/\bgezin\b/i.test(name) && !/\bvrienden\b/i.test(name)) return "Gezin";
  return "Vrienden";
}

function isLandalListCard(customIconUrl) {
  const u = String(customIconUrl ?? "").toLowerCase();
  return u.includes("landal") || u.includes("/gezin_") || u.includes("/vrienden_");
}

function isLandalGezinList(list) {
  return isLandalListCard(list.customIconUrl) && inferLandalTripLabel(list) === "Gezin";
}

async function main() {
  console.log(`Modus: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  const { $users, lists } = await db.query({
    $users: {},
    lists: { memberships: {} },
  });

  const householdIds = HOUSEHOLD_EMAILS.map((email) => {
    const user = $users.find(
      (row) => String(row.email ?? "").toLowerCase() === email,
    );
    if (!user?.id) {
      throw new Error(`Gebruiker niet gevonden: ${email}`);
    }
    return user.id;
  });

  const gezinLists = lists.filter(
    (list) =>
      isLandalGezinList(list) &&
      typeof list.ownerId === "string" &&
      householdIds.includes(list.ownerId),
  );

  console.log(`${gezinLists.length} Landal-gezinlijstje(s) voor het vaste gezin.`);

  const txs = [];
  for (const list of gezinLists) {
    const memberIds = new Set(
      (list.memberships ?? [])
        .map((row) => row.instantUserId)
        .filter((id) => typeof id === "string" && id.length > 0),
    );

    for (const householdUserId of householdIds) {
      if (householdUserId === list.ownerId) continue;
      if (memberIds.has(householdUserId)) continue;
      const memberId = randomUUID();
      console.log(
        `  ${list.name} (${list.id}): membership voor ${householdUserId}`,
      );
      txs.push(
        db.tx.listMembers[memberId]
          .update({ instantUserId: householdUserId })
          .link({ list: list.id }),
      );
    }
  }

  if (txs.length === 0) {
    console.log("Geen ontbrekende memberships.");
    return;
  }

  if (DRY_RUN) {
    console.log(`Zou ${txs.length} membership(s) toevoegen.`);
    return;
  }

  await db.transact(txs);
  console.log(`✓ ${txs.length} membership(s) toegevoegd.`);
}

main().catch((err) => {
  console.error("Fout:", err);
  process.exit(1);
});
