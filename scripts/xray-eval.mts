/**
 * Testset voor X-Ray: echte vragen op het echte kijkmoment, met wat het antwoord moet bevatten (`expect`) en wat het
 * niet mag verklappen (`forbid`). Naast elk X-Ray-antwoord staat een «gewone chatbot»: hetzelfde model met Google
 * Search, maar zonder X-Ray-context (enkel titel en aflevering), zodat je ziet of X-Ray minstens even goed is.
 *
 *   npx tsx --env-file=.env.local scripts/xray-eval.mts            # alles
 *   npx tsx --env-file=.env.local scripts/xray-eval.mts pizza      # enkel cases waarvan de naam «pizza» bevat
 *   NO_BASELINE=1 …                                                # zonder vergelijking (goedkoper)
 *
 * Werkt via de testmodus (record «xray-test»), raakt de projector niet. Kost een paar cent per case.
 */
import { init } from "@instantdb/admin";
import { putData } from "../src/lib/server/cinema-companion";
import { askXray, gemini, subtitlesFor, warmSummaries } from "../src/lib/server/cinema-xray";
import { clockTime } from "../src/lib/cinema-companion";

type Case = { name: string; imdb: string; title: string; s: number; e: number; atMin: number; q: string; expect?: RegExp[]; forbid?: RegExp[]; unanswered?: boolean };
const CASES: Case[] = [
  { name: "pizza", imdb: "tt11712058", title: "Mayor of Kingstown", s: 1, e: 5, atMin: 1, q: "waarom werd daar op het einde pizza bediende neergeschoten", expect: [/Kyle/, /Ian/] },
  { name: "dug-up", imdb: "tt11712058", title: "Mayor of Kingstown", s: 1, e: 7, atMin: 8, q: "wat hebben Mike en Kyle opgegraven, en wat weten we daar uit vorige afleveringen over?", expect: [/geld|dollar|buit|200/i] },
  { name: "iris", imdb: "tt11712058", title: "Mayor of Kingstown", s: 1, e: 6, atMin: 1, q: "Wie is Iris en hoe is ze bij Mike terechtgekomen?", expect: [/Milo/] },
  { name: "bunny", imdb: "tt11712058", title: "Mayor of Kingstown", s: 1, e: 6, atMin: 1, q: "Wie is Bunny?", expect: [/Crips/i] },
  { name: "afloop", imdb: "tt11712058", title: "Mayor of Kingstown", s: 1, e: 6, atMin: 1, q: "Hoe loopt deze aflevering af voor Mike?", unanswered: true },
  { name: "casey", imdb: "tt11280740", title: "Severance", s: 1, e: 3, atMin: 20, q: "Wie is Ms. Casey eigenlijk? Wat weten we over haar?", forbid: [/Gemma/i, /vrouw van Mark|Marks vrouw|Mark's vrouw|echtgenote/i] },
  { name: "petey", imdb: "tt11280740", title: "Severance", s: 1, e: 2, atMin: 15, q: "Wat is er met Petey gebeurd?", expect: [/Petey/] },
];

const db = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "c63df57f-510a-46bc-8687-912d030c9359", adminToken: process.env.INSTANT_APP_ADMIN_TOKEN! });
const owner = process.env.XRAY_OWNER ?? await (async () => {
  const rows = (await db.query({ cinemaCompanionData: { $: { fields: ["key"] } } }) as { cinemaCompanionData: { key: string }[] }).cinemaCompanionData;
  const hit = rows.find(r => r.key.includes(":xray-history:"));
  if (!hit) throw new Error("Geen X-Ray-gebruiker gevonden; zet XRAY_OWNER.");
  return hit.key.split(":xray-history:")[0];
})();

const filter = process.argv[2];
let passed = 0, total = 0, cost = 0;
const warmed = new Set<string>();
for (const c of CASES.filter(c => !filter || c.name.includes(filter))) {
  total++;
  const videoId = `${c.imdb}:${c.s}:${c.e}`;
  const subs = await subtitlesFor(owner, "series", videoId, 0);
  const durationMs = (subs?.cues.at(-1)?.endMs ?? 3_000_000) + 60_000;
  const positionMs = c.atMin * 60_000 + 20_000;
  const now = Date.now();
  await putData(owner, "xray-test", { sessionId: `eval-${now}`, sequence: 1, mediaKey: `test:${videoId}`, streamFingerprint: "0".repeat(64), imdbId: c.imdb, mediaType: "series", season: c.s, episode: c.e, title: c.title, positionMs, durationMs, speed: 1, state: "paused", observedAt: now, uncertaintyMs: 0, deviceUpdateElapsedMs: null }, 3600_000);
  if (!warmed.has(videoId)) { for (let i = 0; i < 20; i++) if (!(await warmSummaries(owner, true)).left) break; warmed.add(videoId); }

  const t = Date.now();
  let answer = "", note = "";
  try {
    const m = await askXray(owner, "vraag", c.q, true, "normaal");
    answer = m.answer; cost += m.costUsd;
    note = `${((Date.now() - t) / 1000).toFixed(0)} s · $${m.costUsd.toFixed(3)}${m.unanswered ? " · nog niet beantwoord" : ""}`;
    const problems = [
      ...(c.expect ?? []).filter(r => !r.test(answer)).map(r => `mist ${r}`),
      ...(c.forbid ?? []).filter(r => r.test(answer)).map(r => `VERKLAPT ${r}`),
      ...(c.unanswered && !m.unanswered ? ["had niet mogen antwoorden"] : []),
    ];
    if (!problems.length) passed++;
    console.log(`\n${problems.length ? "✗" : "✓"} ${c.name} — ${c.title} S${c.s} A${c.e} @${clockTime(positionMs)} — «${c.q}»\n  X-Ray (${note})${problems.length ? ` → ${problems.join(", ")}` : ""}\n  ${answer.replace(/\n+/g, "\n  ")}`);
  } catch (e) { console.log(`\n✗ ${c.name}: FOUT ${(e as Error).message}`); }

  if (!process.env.NO_BASELINE) {
    const b = await gemini("Je bent een behulpzame assistent. Antwoord in het Nederlands.", `Ik kijk naar ${c.title}, seizoen ${c.s} aflevering ${c.e}, en zit op ${clockTime(positionMs)}. ${c.q}`, 6000, false, true, { search: true }).catch(() => null);
    if (b) console.log(`  Gewone chatbot:\n  ${b.text.trim().replace(/\n+/g, "\n  ").slice(0, 1200)}`);
  }
}
await putData(owner, "xray-test", null, 1);
console.log(`\n${passed}/${total} geslaagd · X-Ray-kosten $${cost.toFixed(3)}`);
process.exit(passed === total ? 0 : 1);
