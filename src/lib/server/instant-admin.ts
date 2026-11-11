import { init } from "@instantdb/admin";
import schema from "../../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";

export type InstantAdminDb = ReturnType<typeof init<typeof schema>>;

const RATE_LIMITED = /rate limit/i;
/** Wachttijden na «rate limit» van InstantDB: zo'n verzoek werd geweigerd, dus opnieuw proberen is veilig. */
const RETRY_DELAYS_MS = [400, 1200];

export function isRateLimited(error: unknown): boolean {
  return RATE_LIMITED.test(error instanceof Error ? error.message : String(error ?? ""));
}

/** Een geweigerd verzoek («Your request exceeded the rate limit») nog twee keer proberen, met wat wachttijd. */
export async function retryRateLimited<T>(run: () => Promise<T>, delays = RETRY_DELAYS_MS): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= delays.length || !isRateLimited(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

let cached: { token: string; db: InstantAdminDb } | null = null;

export function getInstantAdminDb(): InstantAdminDb | null {
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!adminToken) return null;
  if (cached?.token === adminToken) return cached.db;
  const raw = init({ appId: INSTANT_APP_ID, adminToken, schema });
  // Zelfde client, maar query en transact proberen het opnieuw als InstantDB even te veel verzoeken krijgt.
  const db = Object.assign(Object.create(raw) as InstantAdminDb, {
    query: ((...args: unknown[]) => retryRateLimited(() => (raw.query as (...a: unknown[]) => Promise<unknown>).apply(raw, args))) as unknown as InstantAdminDb["query"],
    transact: ((...args: unknown[]) => retryRateLimited(() => (raw.transact as (...a: unknown[]) => Promise<unknown>).apply(raw, args))) as unknown as InstantAdminDb["transact"],
  });
  cached = { token: adminToken, db };
  return db;
}
