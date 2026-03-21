/**
 * Client-side PBKDF2 voor optioneel app-wachtwoord na registratie.
 * InstantDB-inloggen blijft via magic code; dit veld is apart opgeslagen.
 */
function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

const PBKDF2_ITERATIONS = 120_000;

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
      salt,
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
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  bitmap.close();
  if (dataUrl.length > 450_000) {
    throw new Error("Afbeelding is nog te groot na compressie. Kies een kleinere foto.");
  }
  return dataUrl;
}
