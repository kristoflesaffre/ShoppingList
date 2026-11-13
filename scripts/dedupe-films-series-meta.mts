/**
 * `filmsSeriesMeta` had door een fout bij elke start een nieuwe kopie per serie gekregen (9.416 rijen voor 45 series),
 * en de startpagina laadt die allemaal (± 7 MB). Dit script houdt één rij per (groep, serie) over, op de vaste id
 * uit `seriesMetaId` (zoals de app nu schrijft), met de meest volledige gegevens; de rest wordt verwijderd.
 *
 *   npx tsx --env-file=.env.local scripts/dedupe-films-series-meta.mts           # enkel tellen
 *   npx tsx --env-file=.env.local scripts/dedupe-films-series-meta.mts --apply   # backup + opruimen
 *
 * Backup van alle rijen in .cache/films-series-meta-backup-<tijd>.json (niet in Git).
 */
import fs from "node:fs/promises";
import { init } from "@instantdb/admin";
import { seriesMetaId } from "../src/lib/stable-uuid";

const apply = process.argv.includes("--apply");
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
if (!adminToken) throw new Error("INSTANT_APP_ADMIN_TOKEN ontbreekt (draai met --env-file=.env.local).");
const db = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359", adminToken });

type Row = { id: string; tmdbId: string; title?: string; year?: string; posterUrl?: string; groupOwnerId: string };
const { filmsSeriesMeta } = (await db.query({ filmsSeriesMeta: {} })) as unknown as { filmsSeriesMeta: Row[] };
const groups = new Map<string, Row[]>();
for (const r of filmsSeriesMeta) {
  if (!r.groupOwnerId || !r.tmdbId) continue;
  const k = `${r.groupOwnerId}\u0000${r.tmdbId}`;
  groups.set(k, [...(groups.get(k) ?? []), r]);
}
const score = (r: Row) => (r.title ? 2 : 0) + (r.year ? 1 : 0) + (r.posterUrl ? 2 : 0);
const writes: unknown[] = [];
let deletes = 0;
for (const rows of groups.values()) {
  const target = seriesMetaId(rows[0].groupOwnerId, rows[0].tmdbId);
  const best = [...rows].sort((a, b) => score(b) - score(a))[0];
  const already = rows.length === 1 && rows[0].id === target;
  if (already) continue;
  writes.push(db.tx.filmsSeriesMeta[target].update({ tmdbId: best.tmdbId, title: best.title ?? "", year: best.year ?? "", posterUrl: best.posterUrl ?? undefined, groupOwnerId: best.groupOwnerId }));
  for (const r of rows) if (r.id !== target) { writes.push(db.tx.filmsSeriesMeta[r.id].delete()); deletes++; }
}
console.log(`${filmsSeriesMeta.length} rijen, ${groups.size} unieke (groep, serie); ${deletes} kopieën te verwijderen.`);
if (!apply || writes.length === 0) process.exit(0);

await fs.mkdir(".cache", { recursive: true });
const backup = `.cache/films-series-meta-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await fs.writeFile(backup, JSON.stringify(filmsSeriesMeta), { mode: 0o600 });
console.log(`Backup: ${backup}`);
for (let i = 0; i < writes.length; i += 200) {
  await db.transact(writes.slice(i, i + 200) as Parameters<typeof db.transact>[0]);
  if ((i / 200) % 10 === 0) console.log(`${Math.min(i + 200, writes.length)}/${writes.length}`);
}
const after = (await db.query({ filmsSeriesMeta: {} })).filmsSeriesMeta.length;
console.log(`Klaar: nu ${after} rijen.`);
process.exit(0);
