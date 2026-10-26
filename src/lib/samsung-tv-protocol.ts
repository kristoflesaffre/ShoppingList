/** Pure helpers for the Samsung TV + YouTube ambience flow (no network, so they can be tested). */

/** YouTube video ids are exactly 11 URL-safe base64 characters. */
export function isYoutubeVideoId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

/** Wake-on-LAN magic packet: 6 × 0xff followed by the MAC address 16 times. */
export function magicPacket(mac: string): Buffer {
  const bytes = mac.split(/[:-]/).map((h) => parseInt(h, 16));
  if (bytes.length !== 6 || bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) throw new Error("invalid-mac");
  const macBuffer = Buffer.from(bytes);
  return Buffer.concat([Buffer.alloc(6, 0xff), ...Array.from({ length: 16 }, () => macBuffer)]);
}

/** One masked WebSocket text frame (clients must mask, RFC 6455 §5.3). */
export function encodeTextFrame(text: string, mask: Buffer): Buffer {
  const payload = Buffer.from(text, "utf8");
  const length = payload.length;
  if (length > 0xffff) throw new Error("frame-too-large");
  const header = length < 126 ? Buffer.from([0x81, 0x80 | length]) : Buffer.from([0x81, 0x80 | 126, length >> 8, length & 0xff]);
  const masked = Buffer.alloc(length);
  for (let i = 0; i < length; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}

/** Splits unmasked server frames off the front of `buffer`; text frames come back as strings, `close` on opcode 8. */
export function parseFrames(buffer: Buffer): { texts: string[]; closed: boolean; rest: Buffer } {
  const texts: string[] = [];
  let offset = 0;
  let closed = false;
  while (buffer.length - offset >= 2) {
    const opcode = buffer[offset] & 0x0f;
    let length = buffer[offset + 1] & 0x7f;
    let header = 2;
    if (length === 126) {
      if (buffer.length - offset < 4) break;
      length = buffer.readUInt16BE(offset + 2);
      header = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) break;
      length = Number(buffer.readBigUInt64BE(offset + 2));
      header = 10;
    }
    if (buffer.length - offset < header + length) break;
    const payload = buffer.subarray(offset + header, offset + header + length);
    if (opcode === 1) texts.push(payload.toString("utf8"));
    if (opcode === 8) closed = true;
    offset += header + length;
  }
  return { texts, closed, rest: buffer.subarray(offset) };
}

/** SID and gsessionid from a YouTube Lounge `bind` response (chunks of JSON arrays). */
export function parseLoungeBind(text: string): { sid: string; gsessionid: string } | null {
  const sid = /\["c","([^"]+)"/.exec(text)?.[1];
  const gsessionid = /\["S","([^"]+)"/.exec(text)?.[1];
  return sid && gsessionid ? { sid, gsessionid } : null;
}

/** YouTube's screenId from the DIAL app description. */
export function dialScreenId(xml: string): string | null {
  return /<screenId>([^<]+)<\/screenId>/.exec(xml)?.[1] ?? null;
}

/** ISO 8601 duration (PT10H2M5S) → "10:02:05" / "4:05"; live streams (P0D) → "Live". */
export function formatYoutubeDuration(iso: string | undefined): string | null {
  if (!iso) return null;
  if (iso === "P0D") return "Live";
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const hours = Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0);
  const minutes = Number(m[3] ?? 0);
  const seconds = Number(m[4] ?? 0);
  const two = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`;
}
