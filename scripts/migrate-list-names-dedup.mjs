/**
 * Eenmalige migratie: hernummer kalender-lijstjes zodat elke naam uniek is.
 * Lijstjes met patroon "{Maand} week {n}" worden per maand gesorteerd op datum
 * en opnieuw genummerd als week 1, 2, 3 …
 *
 * Gebruik: node scripts/migrate-list-names-dedup.mjs
 *          node scripts/migrate-list-names-dedup.mjs --dry-run
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

const DUTCH_MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

// Herkent exact "{Nederlandse maand} week {n}" — geen prefix toegestaan.
const CALENDAR_PATTERN = /^(.+?)\s+week\s+(\d+)\s*$/i;

function isCalendarName(name) {
  const m = CALENDAR_PATTERN.exec(name.trim());
  if (!m) return false;
  return DUTCH_MONTHS.includes(m[1].trim().toLowerCase());
}

// Parseer "d-m-yyyy" (nl-NL toLocaleDateString) naar een timestamp voor sortering.
// Valt terug op 0 als het formaat onbekend is.
function parseDutchDate(dateStr) {
  if (!dateStr) return 0;
  // nl-NL levert "22-4-2026" of "22/4/2026" afhankelijk van platform
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d).getTime();
}

async function main() {
  console.log(`Modus: ${DRY_RUN ? "DRY RUN (geen wijzigingen)" : "LIVE"}`);
  console.log("Lijstjes ophalen…");

  const { lists } = await db.query({ lists: {} });

  if (!lists || lists.length === 0) {
    console.log("Geen lijstjes gevonden.");
    return;
  }

  console.log(`${lists.length} lijstjes gevonden.`);

  // Filter: alleen echte kalender-lijstjes (exact "{Maand} week {n}")
  const calendarLists = lists.filter((l) =>
    isCalendarName(String(l.name ?? "")),
  );

  console.log(`${calendarLists.length} kalender-lijstjes (patroon "{Maand} week {n}").`);

  if (calendarLists.length === 0) {
    console.log("Niets te migreren.");
    return;
  }

  // Groepeer per maand-token (genormaliseerd naar kleine letters)
  const byMonth = new Map();
  for (const l of calendarLists) {
    const name = String(l.name ?? "").trim();
    const m = CALENDAR_PATTERN.exec(name);
    const monthKey = m[1].trim().toLowerCase();
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey).push(l);
  }

  const txns = [];
  let totalRenamed = 0;
  let totalUnchanged = 0;

  for (const [monthKey, group] of byMonth) {
    // Herstel de hoofdletter van de maand zoals opgeslagen
    const originalMonth = String(group[0].name ?? "")
      .trim()
      .replace(CALENDAR_PATTERN, "$1")
      .trim();
    const capitalized =
      originalMonth.charAt(0).toUpperCase() + originalMonth.slice(1).toLowerCase();

    // Controleer of er duplicaten zijn binnen deze maand
    const nameSet = new Set(group.map((l) => String(l.name ?? "").trim()));
    const hasDuplicates = nameSet.size < group.length;

    if (!hasDuplicates) {
      console.log(`  ✓ ${capitalized}: geen duplicaten, overgeslagen.`);
      totalUnchanged += group.length;
      continue;
    }

    // Sorteer op datum oplopend (oudste → laagste nummer),
    // bij gelijkspel op `order` aflopend (hogere order = ouder).
    group.sort((a, b) => {
      const dateDiff = parseDutchDate(a.date) - parseDutchDate(b.date);
      if (dateDiff !== 0) return dateDiff;
      return (b.order ?? 0) - (a.order ?? 0);
    });

    for (let i = 0; i < group.length; i++) {
      const l = group[i];
      const newName = `${capitalized} week ${i + 1}`;
      const oldName = String(l.name ?? "").trim();

      if (oldName === newName) {
        console.log(`  ✓ onveranderd: "${oldName}" (id=${l.id})`);
        totalUnchanged++;
      } else {
        console.log(`  → hernoemd: "${oldName}" → "${newName}" (id=${l.id})`);
        totalRenamed++;
        if (!DRY_RUN) {
          txns.push(db.tx.lists[l.id].update({ name: newName }));
        }
      }
    }
  }

  console.log(`\nSamenvatting: ${totalRenamed} te hernoemen, ${totalUnchanged} onveranderd.`);

  if (DRY_RUN) {
    console.log("DRY RUN — geen wijzigingen opgeslagen. Voer zonder --dry-run uit om toe te passen.");
    return;
  }

  if (txns.length === 0) {
    console.log("Niets te wijzigen.");
    return;
  }

  await db.transact(txns);
  console.log(`✓ ${txns.length} lijstjes hernoemd.`);
}

main().catch((err) => {
  console.error("Fout:", err);
  process.exit(1);
});
