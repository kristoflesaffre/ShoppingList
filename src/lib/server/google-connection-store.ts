import type { NextRequest } from "next/server";
import { getInstantAdminDb } from "@/lib/server/instant-admin";
import {
  readGoogleAccounts,
  sealGoogleAccounts,
  type GoogleAccountsPayload,
} from "@/lib/google-dashboard-auth";

/**
 * Google-koppeling per gebruiker op de server (entiteit `googleConnections`), zodat één keer koppelen
 * op elke browser en elk toestel werkt. De tokens staan er versleuteld (AES-GCM met
 * GOOGLE_OAUTH_COOKIE_SECRET); enkel deze serverroutes kunnen ze lezen.
 */

const adminDb = getInstantAdminDb;

/** Instant-gebruiker van de aanvraag (token in `Authorization: Bearer …`); null = niet ingelogd. */
export async function verifiedUserId(request: NextRequest | Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  const db = adminDb();
  if (!token || !db) return null;
  try {
    const user = await db.auth.verifyToken(token);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export function googleStoreConfigured(): boolean {
  return Boolean(process.env.INSTANT_APP_ADMIN_TOKEN);
}

export async function loadGoogleConnection(ownerId: string, secret: string): Promise<GoogleAccountsPayload | null> {
  const db = adminDb();
  if (!db) return null;
  const data = await db.query({ googleConnections: { $: { where: { ownerId } } } });
  const row = (data.googleConnections ?? [])[0] as { sealedAccounts?: string } | undefined;
  if (!row?.sealedAccounts) return null;
  const payload = readGoogleAccounts(row.sealedAccounts, secret);
  return payload && payload.ownerId === ownerId ? payload : null;
}

/** Bewaart de accounts van een gebruiker; een lege lijst verwijdert de koppeling. */
export async function saveGoogleConnection(payload: GoogleAccountsPayload, secret: string): Promise<void> {
  const db = adminDb();
  if (!db) return;
  const data = await db.query({ googleConnections: { $: { where: { ownerId: payload.ownerId } } } });
  const rows = (data.googleConnections ?? []) as { id: string }[];
  if (payload.accounts.length === 0) {
    if (rows.length > 0) await db.transact(rows.map((r) => db.tx.googleConnections[r.id].delete()));
    return;
  }
  const id = rows[0]?.id ?? crypto.randomUUID();
  await db.transact(
    db.tx.googleConnections[id].update({
      ownerId: payload.ownerId,
      sealedAccounts: sealGoogleAccounts(payload, secret),
      updatedAt: Date.now(),
    }),
  );
}
