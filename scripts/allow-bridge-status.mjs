/**
 * Bridge ≥ 1.20.0 writes what it sees (projector-off · adb-failed · no-stremio-session · stremio · publish-failed) to
 * cinemaCompanionData «{owner}:bridge-status». That table is server-only; this adds one narrow exception: the Pi's scoped
 * account may create/update exactly that one record (fixed id and key, only payload/expiresAt), never read or delete,
 * never any other record. Other rules are kept as they are. Dry run by default; `--apply` installs and tests.
 */
import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { init } from '@instantdb/admin';
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const appId = 'c63df57f-510a-46bc-8687-912d030c9359', adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
if (!adminToken) throw Error('Instant admin configuration missing');
const identity = JSON.parse(await fs.readFile('.cache/projector-relay/cinema-direct.json', 'utf8'));
const bridge = JSON.parse(await fs.readFile('.cache/projector-relay/bridge.json', 'utf8'));
const uuid = /^[a-f0-9-]{36}$/i;
for (const id of [identity.userId, bridge.ownerId]) if (!uuid.test(id)) throw Error('Invalid identity');
const companionId = key => { const h = createHash('sha256').update(key).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const key = `${bridge.ownerId}:bridge-status`, statusId = companionId(key);
const headers = { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' };
const url = `https://api.instantdb.com/superadmin/apps/${appId}/perms`;
const response = await fetch(url, { headers }); const previous = await response.json();
if (!response.ok || !previous.perms) throw Error('Cannot read existing permissions');
const worker = `auth.id == '${identity.userId}'`;
const own = `data.id == '${statusId}' && data.ownerId == '${bridge.ownerId}' && data.key == '${key}'`;
const before = previous.perms.cinemaCompanionData;
const rules = { ...previous.perms, cinemaCompanionData: { allow: {
  $default: 'false', view: 'false', delete: 'false',
  create: `${worker} && ${own}`,
  update: `${worker} && ${own} && newData.ownerId == '${bridge.ownerId}' && newData.key == '${key}' && request.modifiedFields.all(field, field in ['payload', 'expiresAt', 'ownerId', 'key'])`,
} } };
console.log('cinemaCompanionData now:', JSON.stringify(before));
console.log('Other namespaces unchanged:', Object.keys(previous.perms).filter(n => n !== 'cinemaCompanionData').length);
if (!process.argv.includes('--apply')) { console.log('Dry run. Run with --apply to install.'); process.exit(0); }
await fs.mkdir('.cache/cinema-companion', { recursive: true, mode: 0o700 });
await fs.writeFile(`.cache/cinema-companion/permissions-before-${Date.now()}.json`, JSON.stringify(previous.perms), { mode: 0o600 });
const save = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ code: rules }) });
if (!save.ok) throw Error('Cannot install permissions');
const db = init({ appId, adminToken }), guest = init({ appId }).asUser({ guest: true }), workerDb = init({ appId }).asUser({ token: identity.token });
async function denied(name, fn) { try { await fn(); } catch { return; } throw Error(`Forbidden write succeeded: ${name}`); }
const otherId = randomUUID();
try {
  const now = Date.now();
  await workerDb.transact(workerDb.tx.cinemaCompanionData[statusId].update({ ownerId: bridge.ownerId, key, payload: { stage: 'probe', at: now, version: 'setup' }, expiresAt: now + 60_000 }));
  const row = (await db.query({ cinemaCompanionData: { $: { where: { id: statusId } } } })).cinemaCompanionData[0];
  if (row?.payload?.stage !== 'probe') throw Error('Pi status write did not arrive');
  await denied('other record', () => workerDb.transact(workerDb.tx.cinemaCompanionData[otherId].update({ ownerId: bridge.ownerId, key: `${bridge.ownerId}:x`, payload: {}, expiresAt: now })));
  await denied('other key on status id', () => workerDb.transact(workerDb.tx.cinemaCompanionData[statusId].update({ key: `${bridge.ownerId}:x` })));
  await denied('delete', () => workerDb.transact(workerDb.tx.cinemaCompanionData[statusId].delete()));
  await denied('guest', () => guest.transact(guest.tx.cinemaCompanionData[statusId].update({ payload: { stage: 'guest' } })));
  for (const client of [guest, workerDb]) if ((await client.query({ cinemaCompanionData: {} })).cinemaCompanionData.length) throw Error('Private data was readable');
  console.log('Bridge status permission installed and tested: only that record, write-only.');
} finally {
  await db.transact(db.tx.cinemaCompanionData[otherId].delete()).catch(() => {});
}
