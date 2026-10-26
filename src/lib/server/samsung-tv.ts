import { randomBytes, randomUUID } from "node:crypto";
import dgram from "node:dgram";
import { readFile } from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import { dialScreenId, encodeTextFrame, magicPacket, parseFrames, parseLoungeBind } from "@/lib/samsung-tv-protocol";

/**
 * Samsung TV (Tizen, 2019 Q60R) on the home network, driven from the Mac:
 * Wake-on-LAN → YouTube cold start → profile «Chloé» (leftmost) → video via YouTube's Lounge API,
 * the same route the YouTube phone app uses for casting. Config + pairing token live in
 * `.cache/samsung-tv/` (config.json: host, mac, ownerId; token.json from the one-time «Toestaan»).
 */

const YOUTUBE_APP_ID = "111299001912";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type TvConfig = { host: string; mac: string; ownerId: string; token: string };

export async function readTvConfig(): Promise<TvConfig | null> {
  try {
    const dir = path.join(process.cwd(), ".cache/samsung-tv");
    const config = JSON.parse(await readFile(path.join(dir, "config.json"), "utf8"));
    const { token } = JSON.parse(await readFile(path.join(dir, "token.json"), "utf8"));
    if (typeof config.host !== "string" || typeof config.mac !== "string" || typeof config.ownerId !== "string" || typeof token !== "string") return null;
    return { host: config.host, mac: config.mac, ownerId: config.ownerId, token };
  } catch {
    return null;
  }
}

/** "on", "standby" (network standby) or "off" (no answer). */
export async function tvPower(host: string): Promise<"on" | "standby" | "off"> {
  try {
    const response = await fetch(`http://${host}:8001/api/v2/`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    const state = (await response.json())?.device?.PowerState;
    return state === "on" ? "on" : state === "standby" ? "standby" : "off";
  } catch {
    return "off";
  }
}

function sendMagicPacket(host: string, mac: string): Promise<void> {
  const packet = magicPacket(mac);
  const broadcast = host.split(".").slice(0, 3).concat("255").join(".");
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    socket.on("error", () => { socket.close(); resolve(); });
    socket.bind(() => {
      socket.setBroadcast(true);
      let sent = 0;
      for (const target of [broadcast, host]) socket.send(packet, 9, target, () => { if (++sent === 2) { socket.close(); resolve(); } });
    });
  });
}

/** Wake the TV and wait until it reports "on" (max ~25 s). Returns whether it was already on. */
async function wakeTv(config: TvConfig): Promise<boolean> {
  if ((await tvPower(config.host)) === "on") return true;
  for (let i = 0; i < 25; i++) {
    if (i % 3 === 0) await sendMagicPacket(config.host, config.mac);
    await sleep(1000);
    if ((await tvPower(config.host)) === "on") return false;
  }
  throw new Error("tv-not-waking");
}

/** Press remote keys over the paired WebSocket (wss://host:8002, self-signed certificate on the TV). */
function pressKeys(config: TvConfig, keys: string[], gapMs = 400): Promise<void> {
  return new Promise((resolve, reject) => {
    const name = Buffer.from("ShoppingList").toString("base64");
    const socket = tls.connect({ host: config.host, port: 8002, rejectUnauthorized: false });
    let buffer: Buffer = Buffer.alloc(0);
    let upgraded = false;
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => finish(new Error("tv-remote-timeout")), 15_000);
    const send = (data: unknown) => socket.write(encodeTextFrame(JSON.stringify(data), randomBytes(4)));
    socket.on("secureConnect", () => {
      const pathname = `/api/v2/channels/samsung.remote.control?name=${encodeURIComponent(name)}&token=${encodeURIComponent(config.token)}`;
      socket.write(`GET ${pathname} HTTP/1.1\r\nHost: ${config.host}:8002\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${randomBytes(16).toString("base64")}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
    });
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const end = buffer.indexOf("\r\n\r\n");
        if (end < 0) return;
        if (!/^HTTP\/1\.1 101/.test(buffer.subarray(0, end).toString())) return finish(new Error("tv-remote-refused"));
        upgraded = true;
        buffer = buffer.subarray(end + 4);
      }
      const { texts, closed, rest } = parseFrames(buffer);
      buffer = rest;
      for (const text of texts) {
        let event: string | undefined;
        try { event = JSON.parse(text)?.event; } catch { /* ignore */ }
        if (event === "ms.channel.unauthorized" || event === "ms.channel.timeOut") return finish(new Error("tv-remote-unauthorized"));
        if (event === "ms.channel.connect") {
          void (async () => {
            for (const key of keys) {
              send({ method: "ms.remote.control", params: { Cmd: "Click", DataOfCmd: key, Option: "false", TypeOfRemote: "SendRemoteKey" } });
              await sleep(gapMs);
            }
            finish();
          })();
        }
      }
      if (closed) finish(new Error("tv-remote-closed"));
    });
    socket.on("error", (error) => finish(error));
  });
}

/** Close YouTube completely and start it again, so it always opens on «Wie kijkt er?». */
async function restartYoutube(host: string): Promise<void> {
  const url = `http://${host}:8001/api/v2/applications/${YOUTUBE_APP_ID}`;
  await fetch(url, { method: "DELETE", signal: AbortSignal.timeout(5000) }).catch(() => undefined);
  await sleep(2000);
  const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("youtube-not-started");
}

/** One command to the TV's YouTube app through the Lounge API (like the phone app as a remote). */
async function loungeSend(host: string, command: Record<string, string>): Promise<void> {
  const screenId = dialScreenId(await (await fetch(`http://${host}:8080/ws/apps/YouTube`, { signal: AbortSignal.timeout(5000) })).text());
  if (!screenId) throw new Error("youtube-no-screen");
  const tokens = await (await fetch("https://www.youtube.com/api/lounge/pairing/get_lounge_token_batch", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ screen_ids: screenId }),
  })).json();
  const loungeToken = tokens?.screens?.[0]?.loungeToken;
  if (typeof loungeToken !== "string") throw new Error("youtube-no-lounge-token");
  const base = "https://www.youtube.com/api/lounge/bc/bind";
  const common = { device: "REMOTE_CONTROL", id: randomUUID(), name: "ShoppingList", app: "youtube-desktop", "mdx-version": "3", loungeIdToken: loungeToken, VER: "8", v: "2", CVER: "1", theme: "cl", capabilities: "", ui: "", t: "1" };
  let rid = 10_000 + Math.floor(Math.random() * 80_000);
  const form = { "Content-Type": "application/x-www-form-urlencoded" };
  const bind = await fetch(`${base}?${new URLSearchParams({ ...common, RID: String(rid++), zx: randomBytes(6).toString("hex") })}`, { method: "POST", headers: form, body: "count=0" });
  const session = parseLoungeBind(await bind.text());
  if (!bind.ok || !session) throw new Error("youtube-bind-failed");
  const body = new URLSearchParams({ count: "1", ofs: "0", ...Object.fromEntries(Object.entries(command).map(([k, v]) => [k === "_sc" ? "req0__sc" : `req0_${k}`, v])) });
  const sent = await fetch(`${base}?${new URLSearchParams({ ...common, SID: session.sid, gsessionid: session.gsessionid, RID: String(rid++), AID: "5", zx: randomBytes(6).toString("hex") })}`, { method: "POST", headers: form, body });
  if (!sent.ok) throw new Error("youtube-command-failed");
}

/** Play one video (replaces whatever is playing). */
function loungePlay(host: string, videoId: string): Promise<void> {
  return loungeSend(host, { _sc: "setPlaylist", videoId, currentTime: "0", currentIndex: "0", listId: "", videoIds: videoId, audioOnly: "false", params: "", playerParams: "" });
}

/** Pause or resume what YouTube is playing on the TV. Fails with `tv-off` when the TV is not on. */
export async function tvPlayback(config: TvConfig, action: "pause" | "resume"): Promise<void> {
  if ((await tvPower(config.host)) !== "on") throw new Error("tv-off");
  await loungeSend(config.host, { _sc: action === "pause" ? "pause" : "play" });
}

let running = false;

/** The full ambience sequence. One at a time; takes ~15–30 s. */
export async function startAmbience(config: TvConfig, videoId: string): Promise<{ wasOn: boolean }> {
  if (running) throw new Error("busy");
  running = true;
  try {
    const wasOn = await wakeTv(config);
    if (!wasOn) await sleep(3000); // Tizen answers before its app framework is ready.
    await restartYoutube(config.host);
    await sleep(7000); // Until «Wie kijkt er?» is on screen.
    await pressKeys(config, ["KEY_LEFT", "KEY_LEFT", "KEY_LEFT", "KEY_LEFT", "KEY_ENTER"]); // Chloé = first (leftmost) profile.
    await sleep(4000);
    await loungePlay(config.host, videoId);
    return { wasOn };
  } finally {
    running = false;
  }
}
