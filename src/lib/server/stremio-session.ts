import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type StremioSession = { ownerId: string; authKey: string };
export function stremioConnectionId(ownerId: string) {
  const h = createHash("sha256").update(`stremio:${ownerId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const key = (secret: string) => {
  if (secret.length < 32) throw new Error("not-configured");
  return createHash("sha256").update(`stremio:${secret}`).digest();
};
export function sealStremio(session: StremioSession, secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(session.ownerId));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function unsealStremio(value: string, secret: string, ownerId: string): StremioSession | null {
  try {
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(ownerId));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    return result.ownerId === ownerId && typeof result.authKey === "string" && result.authKey.length >= 16 ? result : null;
  } catch { return null; }
}
