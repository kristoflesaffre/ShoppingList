import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** @param {string} ownerId */
export function panasonicConnectionId(ownerId) {
  const h = createHash("sha256").update(`panasonic:${ownerId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
/** @param {unknown} value @param {string} secret */
export function sealPanasonic(value, secret) {
  if (secret.length < 32) throw new Error("Panasonic encryption is not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(`panasonic:${secret}`).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
/** @param {string} value @param {string} secret @param {string} ownerId */
export function unsealPanasonic(value, secret, ownerId) {
  try {
    if (secret.length < 32) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(`panasonic:${secret}`).digest(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const session = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    return session.ownerId === ownerId && typeof session.accessToken === "string" && session.accessToken && typeof session.refreshToken === "string" && session.refreshToken && typeof session.clientId === "string" && session.clientId && typeof session.version === "string" && /^\d+\.\d+\.\d+$/.test(session.version) && Number.isFinite(session.expiresAt) ? session : null;
  } catch { return null; }
}
