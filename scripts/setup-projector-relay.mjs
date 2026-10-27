/** Provision only the projector namespaces and generate a private HA package. */
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { init } from "@instantdb/admin";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const directory = path.resolve(".cache/projector-relay");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const appId = "c63df57f-510a-46bc-8687-912d030c9359";
const token = process.env.INSTANT_APP_ADMIN_TOKEN;
if (!token || !process.argv[2]) throw new Error("Admin token and official platform module path are required");
const { PlatformApi, i } = await import(pathToFileURL(process.argv[2]));
const namespaces = {
  projectorBridges: i.entity({ ownerId: i.string().unique().indexed(), tokenHash: i.string().unique().indexed(), enabled: i.boolean(), lastSeenAt: i.number(), reportedState: i.string() }),
  projectorCommands: i.entity({ bridgeId: i.string().indexed(), action: i.string(), createdAt: i.number().indexed(), expiresAt: i.number(), state: i.string(), error: i.string().optional() }),
  projectorLocks: i.entity({ key: i.string().unique().indexed(), commandId: i.string(), expiresAt: i.number().indexed() }),
};
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const permsUrl = `https://api.instantdb.com/superadmin/apps/${appId}/perms`;
const before = await fetch(permsUrl, { headers, signal: AbortSignal.timeout(15_000) });
const current = await before.json();
if (!before.ok || !current.perms) throw new Error("Cannot read permissions");
const backup = path.join(directory, "permissions-before.json");
if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(current.perms, null, 2), { mode: 0o600, flag: "wx" });
const rules = { ...current.perms };
for (const name of Object.keys(namespaces)) rules[name] = { allow: { $default: "false" } };
const saved = await fetch(permsUrl, { method: "POST", headers, body: JSON.stringify({ code: rules }), signal: AbortSignal.timeout(15_000) });
if (!saved.ok) throw new Error("Cannot secure projector namespaces");
const api = new PlatformApi({ auth: { token } });
// Additive push deliberately excludes unrelated schema drift.
await api.schemaPush(appId, { schema: i.schema({ entities: namespaces }) });
const db = init({ appId, adminToken: token });
const ownerId = JSON.parse(fs.readFileSync(".cache/projector/projector.json", "utf8")).ownerId;
if (typeof ownerId !== "string" || !ownerId) throw new Error("Missing verified projector owner");
const credentialsPath = path.join(directory, "bridge.json");
let credentials;
if (fs.existsSync(credentialsPath)) credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
else {
  credentials = { bridgeId: randomUUID(), ownerId, token: randomBytes(32).toString("base64url") };
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials), { mode: 0o600, flag: "wx" });
}
if (credentials.ownerId !== ownerId) throw new Error("Owner changed; explicit reconfiguration required");
const existing = await db.query({ projectorBridges: { $: { where: { ownerId } } } });
if (existing.projectorBridges.some(row => row.id !== credentials.bridgeId)) throw new Error("Another bridge already exists");
await db.transact(db.tx.projectorBridges[credentials.bridgeId].update({ ownerId, tokenHash: createHash("sha256").update(credentials.token).digest("hex"), enabled: true, lastSeenAt: 0, reportedState: "unknown" }));
// Read the already-linked Netlify site, without printing its credential.
const netlify = JSON.parse(fs.readFileSync(path.join(process.env.HOME, "Library/Preferences/netlify/config.json"), "utf8"));
const auth = netlify.users[netlify.userId].auth.token;
const siteId = JSON.parse(fs.readFileSync(".netlify/state.json", "utf8")).siteId;
const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers: { authorization: `Bearer ${auth}` }, signal: AbortSignal.timeout(15_000) });
if (!siteResponse.ok) throw new Error("Cannot read linked Netlify site");
const site = await siteResponse.json();
const origin = site.ssl_url || site.url;
if (!origin?.startsWith("https://")) throw new Error("An HTTPS application origin is required");
const endpoint = `${origin}/api/projector/bridge`;
const authorization = JSON.stringify(`Bearer ${credentials.token}`);
const yaml = `sensor:
  - platform: rest
    name: ShoppingList Projector Queue
    unique_id: shoppinglist_projector_queue
    resource: ${JSON.stringify(endpoint)}
    params:
      state: "{{ states('media_player.woonkamer_tv_2') }}"
    headers:
      Authorization: ${authorization}
    scan_interval: 10
    timeout: 8
    value_template: "{{ value_json.id }}"
    json_attributes:
      - action
      - expiresAt

rest_command:
  shoppinglist_projector_receipt:
    url: ${JSON.stringify(endpoint)}
    method: POST
    headers:
      Authorization: ${authorization}
    content_type: application/json
    payload: '{{ {"commandId": command_id, "stage": stage, "ok": ok | default(false)} | to_json }}'
    timeout: 8

automation:
  - id: shoppinglist_projector_outbound
    alias: ShoppingList projectoropdrachten
    mode: single
    max_exceeded: silent
    triggers:
      - trigger: state
        entity_id: sensor.shoppinglist_projector_queue
    conditions:
      - condition: template
        value_template: >-
          {{ trigger.to_state is not none and
             trigger.to_state.state not in ['idle', 'unknown', 'unavailable', ''] and
             trigger.to_state.attributes.get('action') in ['on', 'off'] and
             trigger.to_state.attributes.get('expiresAt', 0) | float > as_timestamp(now()) * 1000 }}
    actions:
      - variables:
          command_id: "{{ trigger.to_state.state }}"
          command_action: "{{ trigger.to_state.attributes.action }}"
          command_deadline: "{{ trigger.to_state.attributes.expiresAt }}"
      - action: rest_command.shoppinglist_projector_receipt
        data:
          command_id: "{{ command_id }}"
          stage: claim
        response_variable: claim_response
      - condition: template
        value_template: "{{ claim_response.status == 200 and command_deadline | float > as_timestamp(now()) * 1000 }}"
      - choose:
          - conditions: "{{ command_action == 'on' }}"
            sequence:
              - action: rest_command.xgimi_wake_atom
                response_variable: wake_response
              - action: rest_command.shoppinglist_projector_receipt
                data:
                  command_id: "{{ command_id }}"
                  stage: complete
                  ok: "{{ wake_response.status == 200 }}"
          - conditions: "{{ command_action == 'off' }}"
            sequence:
              - condition: template
                value_template: "{{ states('media_player.woonkamer_tv_2') not in ['unknown', 'unavailable'] }}"
              - action: media_player.turn_off
                target:
                  entity_id: media_player.woonkamer_tv_2
              - action: rest_command.shoppinglist_projector_receipt
                data:
                  command_id: "{{ command_id }}"
                  stage: complete
                  ok: true
`;
fs.writeFileSync(path.join(directory, "shoppinglist-projector.yaml"), yaml, { mode: 0o600 });
fs.writeFileSync(path.join(directory, "site.json"), JSON.stringify({ siteId, origin }), { mode: 0o600 });
console.log(`Projector namespaces secured. Private Pi package prepared for ${origin}. No keys printed.`);
