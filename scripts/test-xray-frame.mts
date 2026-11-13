/**
 * Eén echt screenshot via de volledige route: app-server → wachtrij → Pi-bridge (≥ 1.21.0) → «xray-frame».
 * Bewaart het beeld enkel lokaal in .cache/xray-frame-test.jpg (niet in Git).
 *   npx tsx scripts/test-xray-frame.mts
 */
import fs from "node:fs";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { requestFrame } = await import("../src/lib/server/xray-scene");
const owner = JSON.parse(fs.readFileSync(".cache/projector-relay/bridge.json", "utf8")).ownerId as string;
const t0 = Date.now();
const f = await requestFrame(owner, 0);
fs.mkdirSync(".cache", { recursive: true });
fs.writeFileSync(".cache/xray-frame-test.jpg", Buffer.from(f.jpeg, "base64"), { mode: 0o600 });
console.log(JSON.stringify({ ms: Date.now() - t0, width: f.width, height: f.height, brightness: f.brightness, kb: Math.round(f.jpeg.length * 0.75 / 1024) }));
process.exit(0);
