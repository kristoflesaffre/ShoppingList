import { NextResponse } from "next/server";
import { init } from "@instantdb/admin";
import schema from "../../../../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";
import { verifyProfilePasswordServer } from "@/lib/profile_password_verify_server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminDb() {
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!adminToken) return null;
  return init({
    appId: INSTANT_APP_ID,
    adminToken,
    schema,
  });
}

/** Instant `getUser({ email })` kan hoofdlettergevoelig zijn; probeer varianten. */
async function getUserByEmailVariants(
  adminDb: ReturnType<typeof init<typeof schema>>,
  emailRaw: string,
): Promise<{ id: string; email?: string | null } | null> {
  const trimmed = emailRaw.trim();
  const variants = Array.from(
    new Set([trimmed, trimmed.toLowerCase()].filter(Boolean)),
  );
  for (const e of variants) {
    try {
      const user = await adminDb.auth.getUser({ email: e });
      if (user?.id) return user;
    } catch {
      /* volgende variant */
    }
  }
  return null;
}

/** Instant kan `profiles` als array óf als map (id → record) teruggeven. */
function profilesToRows(profiles: unknown): Array<Record<string, unknown>> {
  if (profiles == null) return [];
  if (Array.isArray(profiles)) {
    return profiles as Array<Record<string, unknown>>;
  }
  if (typeof profiles === "object") {
    return Object.values(profiles) as Array<Record<string, unknown>>;
  }
  return [];
}

/** Admin query-response: top-level of onder `data`. */
function extractProfilesRow(result: unknown): Array<Record<string, unknown>> {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  const fromTop = profilesToRows(r.profiles);
  if (fromTop.length > 0) return fromTop;
  const data = r.data;
  if (data && typeof data === "object") {
    const nested = profilesToRows((data as Record<string, unknown>).profiles);
    if (nested.length > 0) return nested;
  }
  return [];
}

function rowPasswordHashSalt(row: Record<string, unknown>): {
  hash: string;
  salt: string;
} | null {
  const hash =
    row.passwordHash ?? row.password_hash ?? row["password-hash"];
  const salt =
    row.passwordSalt ?? row.password_salt ?? row["password-salt"];
  const h = hash != null ? String(hash) : "";
  const s = salt != null ? String(salt) : "";
  if (h.length > 0 && s.length > 0) return { hash: h, salt: s };
  return null;
}

export async function POST(req: Request) {
  try {
    return await handlePasswordSignIn(req);
  } catch (err) {
    console.error("[password-sign-in] onafgevangen fout:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Interne serverfout bij inloggen. Controleer serverlogs.",
      },
      { status: 500 },
    );
  }
}

async function handlePasswordSignIn(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      {
        error:
          "Inloggen met paswoord is niet beschikbaar (server mist INSTANT_APP_ADMIN_TOKEN).",
      },
      { status: 503 },
    );
  }

  try {
    const user = await getUserByEmailVariants(adminDb, email);
    const uid = user?.id;
    if (!uid) {
      return NextResponse.json(
        {
          error:
            "Geen account gevonden voor dit e-mailadres. Registreer je eerst of controleer je e-mail.",
        },
        { status: 401 },
      );
    }

    const queryResult = await adminDb.query({
      profiles: {
        $: { where: { instantUserId: uid } },
      },
    });

    const rows = extractProfilesRow(queryResult);

    let hashStr = "";
    let saltStr = "";
    const profile = rows.find((row) => {
      const hs = rowPasswordHashSalt(row);
      if (hs) {
        hashStr = hs.hash;
        saltStr = hs.salt;
        return true;
      }
      return false;
    });

    if (!profile || !hashStr || !saltStr) {
      return NextResponse.json(
        {
          error:
            "Er is nog geen paswoord ingesteld voor dit account. Log een keer in via de registratieflow (code) en stel je paswoord in.",
        },
        { status: 401 },
      );
    }

    const pepperEmail = email.trim().toLowerCase();
    const valid = await verifyProfilePasswordServer(
      password,
      pepperEmail,
      hashStr,
      saltStr,
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Onjuist e-mailadres of paswoord." },
        { status: 401 },
      );
    }

    const token = await adminDb.auth.createToken({ id: uid });
    return NextResponse.json({ token, refresh_token: token });
  } catch (err) {
    console.error("[password-sign-in] Instant-fout:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Inloggen mislukt (Instant API). Probeer later opnieuw.",
      },
      { status: 502 },
    );
  }
}
