import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";

export const TODOIST_STATE_COOKIE = "shopping_todoist_state";
export const TODOIST_AUTH_COOKIE = "shopping_todoist_auth";
export const TODOIST_SCOPE = "data:read_write";
export const todoistCookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export type TodoistState = { ownerId: string; state: string; verifier: string; expiresAt: number };
export type TodoistConnection = { ownerId: string; clientId: string; accessToken: string; refreshToken?: string; expiresAt: number };
export function todoistConfig() {
  const clientId = process.env.TODOIST_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.TODOIST_CLIENT_SECRET?.trim() ?? "";
  const secret = process.env.TODOIST_OAUTH_SECRET?.trim() ?? "";
  const redirectUri = process.env.TODOIST_REDIRECT_URI?.trim() ?? "";
  let origin = "";
  try {
    const url = new URL(redirectUri);
    if (url.protocol === "https:" && url.pathname === "/api/todoist/callback" && !url.search && !url.hash && !url.username && !url.password) origin = url.origin;
  } catch { /* Incomplete configuration is reported by status. */ }
  return { clientId, clientSecret, secret, redirectUri, origin, configured: Boolean(clientId && clientSecret && secret.length >= 32 && origin) };
}
function key(secret: string) { return createHash("sha256").update(`todoist:${secret}`).digest(); }
export function sealTodoist(value: TodoistState | TodoistConnection, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
function unseal(value: string | undefined, secret: string): Record<string, unknown> | null {
  try {
    if (!value || value.length > 6000 || !secret) return null;
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) return null;
    const cipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    cipher.setAuthTag(bytes.subarray(12, 28));
    const parsed: unknown = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}
export function readTodoistState(value: string | undefined, secret: string): TodoistState | null {
  const data = unseal(value, secret);
  return data && typeof data.ownerId === "string" && typeof data.state === "string" && typeof data.verifier === "string" && typeof data.expiresAt === "number" && Number.isFinite(data.expiresAt) && data.expiresAt > Date.now() ? data as TodoistState : null;
}
export function readTodoistConnection(value: string | undefined, secret: string, ownerId: string, clientId: string): TodoistConnection | null {
  const data = unseal(value, secret);
  return data && data.ownerId === ownerId && data.clientId === clientId && typeof data.accessToken === "string" && data.accessToken.length > 0 && typeof data.expiresAt === "number" && Number.isFinite(data.expiresAt) && (data.refreshToken === undefined || (typeof data.refreshToken === "string" && data.refreshToken.length > 0)) ? data as TodoistConnection : null;
}
export function todoistJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export class TodoistReconnectRequired extends Error {}
export class TodoistUpstreamError extends Error {
  constructor(public status: number, public retryAfter: string | null = null) { super("Todoist request failed"); }
}
export async function todoistTokens(params: URLSearchParams, config: ReturnType<typeof todoistConfig>) {
  params.set("client_id", config.clientId);
  params.set("client_secret", config.clientSecret);
  const response = await fetch("https://api.todoist.com/oauth/access_token", { method: "POST", body: params, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) throw new TodoistReconnectRequired();
    throw new TodoistUpstreamError(response.status, response.headers.get("retry-after"));
  }
  const data = await response.json() as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; scope?: unknown };
  const lifetime = Number(data.expires_in);
  if (typeof data.access_token !== "string" || !data.access_token || !Number.isFinite(lifetime) || lifetime <= 0 || (data.refresh_token !== undefined && (typeof data.refresh_token !== "string" || !data.refresh_token))) throw new Error("Invalid Todoist token response");
  if (typeof data.scope === "string" && !data.scope.split(/[ ,]+/).includes(TODOIST_SCOPE)) throw new Error("Unexpected Todoist scope");
  return { accessToken: data.access_token, ...(typeof data.refresh_token === "string" ? { refreshToken: data.refresh_token } : {}), expiresAt: Date.now() + lifetime * 1000 };
}
export function setTodoistConnection(response: NextResponse, connection: TodoistConnection, secret: string) {
  const sealed = sealTodoist(connection, secret);
  if (sealed.length > 3800) throw new Error("Todoist credential cookie too large");
  response.cookies.set(TODOIST_AUTH_COOKIE, sealed, { ...todoistCookieOptions, maxAge: 60 * 60 * 24 * 90 });
}
export async function todoistGuard(request: NextRequest) {
  const config = todoistConfig();
  // POST requests from the frontend must come from this exact configured deployment.
  if (request.headers.get("origin") !== request.nextUrl.origin || (config.configured && request.nextUrl.origin !== config.origin)) return { config, error: todoistJson({ error: "invalid-origin" }, 403), ownerId: null };
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return { config, error: todoistJson({ error: "not-signed-in" }, 401), ownerId: null };
  return { config, error: null, ownerId };
}
const refreshes = new Map<string, Promise<TodoistConnection>>();
async function refresh(connection: TodoistConnection, config: ReturnType<typeof todoistConfig>): Promise<TodoistConnection> {
  if (!connection.refreshToken) throw new TodoistReconnectRequired();
  const id = createHash("sha256").update(`${config.clientId}:${connection.ownerId}:${connection.refreshToken}`).digest("hex");
  const pending = refreshes.get(id);
  if (pending) return pending;
  const job = todoistTokens(new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refreshToken }), config).then(tokens => ({ ...connection, ...tokens }));
  refreshes.set(id, job);
  try { return await job; } finally { refreshes.delete(id); }
}
export async function withTodoistConnection(request: NextRequest, run: (connection: TodoistConnection) => Promise<NextResponse>) {
  const { config, error, ownerId } = await todoistGuard(request);
  if (error) return error;
  if (!config.configured) return todoistJson({ error: "not-configured" }, 503);
  let connection = readTodoistConnection(request.cookies.get(TODOIST_AUTH_COOKIE)?.value, config.secret, ownerId!, config.clientId);
  if (!connection) return todoistJson({ error: "not-connected", reconnect: true }, 409);
  let refreshed = false;
  try {
    if (connection.expiresAt <= Date.now() + 60_000) {
      connection = await refresh(connection, config);
      refreshed = true;
    }
    const response = await run(connection);
    if (refreshed) setTodoistConnection(response, connection, config.secret);
    return response;
  } catch (cause) {
    let response: NextResponse;
    if (cause instanceof TodoistReconnectRequired) {
      response = todoistJson({ error: "not-connected", reconnect: true }, 409);
      response.cookies.set(TODOIST_AUTH_COOKIE, "", { ...todoistCookieOptions, maxAge: 0 });
      return response;
    }
    if (cause instanceof TodoistUpstreamError && cause.status === 429) {
      response = todoistJson({ error: "rate-limited" }, 429);
      if (cause.retryAfter && /^\d{1,8}$/.test(cause.retryAfter)) response.headers.set("Retry-After", cause.retryAfter);
    } else response = todoistJson({ error: "temporarily-unavailable" }, 503);
    // Preserve rotated refresh tokens even when the subsequent task request fails.
    if (refreshed) setTodoistConnection(response, connection, config.secret);
    return response;
  }
}
export async function todoistGet(connection: TodoistConnection, path: "tasks" | "tasks/filter" | "projects", params: URLSearchParams) {
  const response = await fetch(`https://api.todoist.com/api/v1/${path}?${params}`, { headers: { authorization: `Bearer ${connection.accessToken}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (response.status === 401) throw new TodoistReconnectRequired();
  if (!response.ok) throw new TodoistUpstreamError(response.status, response.headers.get("retry-after"));
  return response.json() as Promise<{ results: Record<string, unknown>[]; next_cursor: string | null }>;
}
