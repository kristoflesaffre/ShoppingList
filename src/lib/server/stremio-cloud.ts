import { createHash } from "node:crypto";
import { parseStremioProgress, type StremioProgress } from "../stremio-progress";
import type { StremioSession } from "./stremio-session";
import { readBoundedText } from "./read-bounded-text";

/** Deliberately no arbitrary endpoints, logout, datastorePut, or library mutations. */
async function request(endpoint: "login" | "datastoreGet", body: unknown): Promise<unknown> {
  const response = await fetch(`https://api.strem.io/api/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
  });
  const text = await readBoundedText(response.body, 12_000_000).catch(() => { throw new Error("upstream-unavailable"); });
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("upstream-unavailable"); }
  if (response.status === 401 || response.status === 403 || data?.error) throw new Error(endpoint === "login" ? "login-failed" : "session-expired");
  if (!response.ok || !data || typeof data !== "object" || Array.isArray(data) || !("result" in data)) throw new Error("upstream-unavailable");
  return data.result;
}
export async function loginStremio(email: string, password: string): Promise<string> {
  const result = await request("login", { type: "Login", email, password, facebook: false }) as { authKey?: unknown } | null;
  if (!result || typeof result.authKey !== "string" || result.authKey.length < 16 || result.authKey.length > 4096) throw new Error("login-failed");
  return result.authKey;
}
type Snapshot = { items: StremioProgress[]; syncedAt: number };
const cache = new Map<string, { snapshot?: Snapshot; promise?: Promise<Snapshot>; usedAt: number }>();
export function clearStremioCache() { cache.clear(); }
export async function readStremioProgress(session: StremioSession): Promise<Snapshot> {
  const key = createHash("sha256").update(`${session.ownerId}:${session.authKey}`).digest("hex");
  const entry = cache.get(key);
  if (entry?.snapshot && Date.now() - entry.snapshot.syncedAt < 30_000) return entry.snapshot;
  if (entry?.promise) return entry.promise;
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  const next: { snapshot?: Snapshot; promise?: Promise<Snapshot>; usedAt: number } = { usedAt: Date.now() };
  next.promise = (async () => {
    const result = await request("datastoreGet", { authKey: session.authKey, collection: "libraryItem", ids: [], all: true });
    const snapshot = { items: parseStremioProgress(result), syncedAt: Date.now() };
    next.snapshot = snapshot;
    return snapshot;
  })();
  cache.set(key, next);
  try { return await next.promise; }
  finally { next.promise = undefined; if (!next.snapshot) cache.delete(key); }
}
