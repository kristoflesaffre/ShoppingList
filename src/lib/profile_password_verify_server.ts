/**
 * Alleen voor Node (API routes). Geen gedeelde bundel met browser-avatarcode.
 * Zelfde algoritme als `profile_crypto.verifyPasswordForProfile`.
 */
function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

const PBKDF2_ITERATIONS = 120_000;

function hexToBytes(hex: string): Uint8Array {
  const h = hex.trim().toLowerCase();
  if (h.length % 2 !== 0) throw new Error("invalid hex length");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("invalid hex");
    out[i] = byte;
  }
  return out;
}

export async function verifyProfilePasswordServer(
  password: string,
  emailNormalizedLowerTrim: string,
  storedHashHex: string,
  saltHex: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  let salt: Uint8Array;
  try {
    salt = hexToBytes(saltHex);
  } catch {
    return false;
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  const pepper = enc.encode(emailNormalizedLowerTrim);
  const combined = new Uint8Array(pepper.length + bits.byteLength);
  combined.set(pepper, 0);
  combined.set(new Uint8Array(bits), pepper.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", combined));
  const computedHex = toHex(digest);
  const stored = storedHashHex.trim().toLowerCase();
  const computed = computedHex.trim().toLowerCase();
  if (computed.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return diff === 0;
}
