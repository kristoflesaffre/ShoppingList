/**
 * Client-side PBKDF2 voor app-wachtwoord na registratie (opgeslagen op `profiles`).
 * Inloggen: magic code (registratie) of e-mail+paswoord via `/api/auth/password-sign-in`.
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

/**
 * Controleert het paswoord tegen hash+zout opgeslagen in `profiles` (zelfde als bij registratie).
 * Zelfde normalisatie als bij `hashPasswordForProfile`: e-mail lowercase + trim.
 */
export async function verifyPasswordForProfile(
  password: string,
  email: string,
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
  const pepper = enc.encode(email.toLowerCase().trim());
  const combined = new Uint8Array(pepper.length + bits.byteLength);
  combined.set(pepper, 0);
  combined.set(new Uint8Array(bits), pepper.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", combined));
  const computedHex = toHex(digest);
  /** DB/API kan hex in hoofdletters teruggeven; vergelijk altijd lowercase. */
  const stored = storedHashHex.trim().toLowerCase();
  const computed = computedHex.trim().toLowerCase();
  if (computed.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPasswordForProfile(
  password: string,
  email: string,
): Promise<{ passwordHash: string; passwordSalt: string }> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
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
  const pepper = enc.encode(email.toLowerCase().trim());
  const combined = new Uint8Array(pepper.length + bits.byteLength);
  combined.set(pepper, 0);
  combined.set(new Uint8Array(bits), pepper.length);
  const hashHex = toHex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", combined)),
  );
  return { passwordHash: hashHex, passwordSalt: toHex(salt) };
}

/** Comprimeer afbeelding naar JPEG data-URL (max ~400px) om DB-limiet te respecteren. */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 400;
  const scale = Math.min(max / bitmap.width, max / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  bitmap.close();
  if (dataUrl.length > 450_000) {
    throw new Error("Afbeelding is nog te groot na compressie. Kies een kleinere foto.");
  }
  return dataUrl;
}
