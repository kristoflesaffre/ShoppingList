import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";

export const TODOIST_STATE_COOKIE = "shopping_todoist_state";
export const TODOIST_AUTH_COOKIE = "shopping_todoist_auth";
export const TODOIST_SCOPE = "data:read_write";
export const todoistCookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export type TodoistState = { ownerId: string; state: string; verifier: string; expiresAt: number; returnTo?: string };
/** `scope`: toegekend bij het koppelen (oudere koppelingen zonder dit veld zijn alleen-lezen gekoppeld). */
export type TodoistConnection = { ownerId: string; clientId: string; accessToken: string; refreshToken?: string; expiresAt: number; scope?: string };
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
  return data && data.ownerId === ownerId && data.clientId === clientId && typeof data.accessToken === "string" && data.accessToken.length > 0 && typeof data.expiresAt === "number" && Number.isFinite(data.expiresAt) && (data.refreshToken === undefined || (typeof data.refreshToken === "string" && data.refreshToken.length > 0)) && (data.scope === undefined || typeof data.scope === "string") ? data as TodoistConnection : null;
}
export function todoistJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
/** Mag deze koppeling schrijven (taken afvinken)? Enkel als ze met lezen + schrijven gekoppeld is. */
export function todoistCanWrite(connection: TodoistConnection): boolean {
  return typeof connection.scope === "string" && connection.scope.split(/[ ,]+/).includes("data:read_write");
}
/** Terugkeerpad na het koppelen: enkel een eigen pad («/todo»), nooit een andere site. */
export function safeTodoistReturn(value: unknown): string | undefined {
  return typeof value === "string" && /^\/[A-Za-z0-9/_-]{0,64}$/.test(value) && !value.startsWith("//") ? value : undefined;
}
export class TodoistReconnectRequired extends Error {}
/**
 * Todoist weigerde het vernieuwingstoken. Meestal is het net verbruikt door een parallelle aanvraag (een andere
 * route of serverinstantie vernieuwde eerst en zette het nieuwe cookie): dan eerst opnieuw laten proberen.
 */
export class TodoistRefreshRefused extends TodoistReconnectRequired {}
/** De client stuurt dit mee bij de tweede poging na «retry»; weigert Todoist dan nog, dan echt ontkoppelen. */
export const TODOIST_RETRY_HEADER = "x-todoist-retry";
/** 401 van de Todoist-API: het toegangstoken is verlopen of ingetrokken (eerst vernieuwen, dan pas ontkoppelen). */
export class TodoistUnauthorized extends Error {}
export class TodoistUpstreamError extends Error {
  constructor(public status: number, public retryAfter: string | null = null) { super("Todoist request failed"); }
}
/** Fouten van het tokeneindpunt die aan onze configuratie liggen: opnieuw koppelen helpt dan niet. */
const TODOIST_CONFIG_ERRORS = new Set(["invalid_client", "incorrect_application_credentials", "unsupported_grant_type", "invalid_request"]);
/**
 * Tokens ophalen of vernieuwen. Todoist geeft toegangstokens van één uur met een roterend vernieuwingstoken
 * (`expires_in` 3600); oude «legacy» apps krijgen een token van tien jaar zonder vernieuwingstoken.
 * `requireScope`: enkel bij het koppelen eisen we lezen + schrijven; een vernieuwing mag nooit stranden op de scope,
 * want het oude vernieuwingstoken is dan al verbruikt.
 */
export async function todoistTokens(params: URLSearchParams, config: ReturnType<typeof todoistConfig>, { requireScope = false } = {}) {
  params.set("client_id", config.clientId);
  params.set("client_secret", config.clientSecret);
  const response = await fetch("https://api.todoist.com/oauth/access_token", { method: "POST", body: params, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      const body = await response.json().catch(() => null) as { error?: unknown } | null;
      if (typeof body?.error === "string" && TODOIST_CONFIG_ERRORS.has(body.error)) throw new TodoistUpstreamError(response.status);
      throw new TodoistReconnectRequired();
    }
    throw new TodoistUpstreamError(response.status, response.headers.get("retry-after"));
  }
  const data = await response.json() as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; scope?: unknown };
  const lifetime = Number(data.expires_in);
  if (typeof data.access_token !== "string" || !data.access_token || !Number.isFinite(lifetime) || lifetime <= 0 || (data.refresh_token !== undefined && (typeof data.refresh_token !== "string" || !data.refresh_token))) throw new Error("Invalid Todoist token response");
  if (requireScope && typeof data.scope === "string" && !data.scope.split(/[ ,]+/).includes(TODOIST_SCOPE)) throw new Error("Unexpected Todoist scope");
  return { accessToken: data.access_token, ...(typeof data.refresh_token === "string" ? { refreshToken: data.refresh_token } : {}), expiresAt: Date.now() + lifetime * 1000, ...(typeof data.scope === "string" && data.scope ? { scope: data.scope } : {}) };
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
type Refreshed = { connection: TodoistConnection; persist: boolean };
const refreshes = new Map<string, Promise<Refreshed>>();
/** Recent geroteerde tokens per (verbruikt) vernieuwingstoken, voor aanvragen die nog met het oude cookie binnenkomen. */
const rotated = new Map<string, { result: Refreshed; until: number }>();
const ROTATED_TTL = 120_000;
async function refresh(connection: TodoistConnection, config: ReturnType<typeof todoistConfig>): Promise<Refreshed> {
  if (!connection.refreshToken) throw new TodoistReconnectRequired();
  const id = createHash("sha256").update(`${config.clientId}:${connection.ownerId}:${connection.refreshToken}`).digest("hex");
  const now = Date.now();
  rotated.forEach((v, k) => { if (v.until <= now) rotated.delete(k); });
  const recent = rotated.get(id);
  if (recent) return recent.result;
  const pending = refreshes.get(id);
  if (pending) return pending;
  const job = todoistTokens(new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refreshToken }), config).then(({ refreshToken, ...tokens }): Refreshed => {
    // Todoist roteert het vernieuwingstoken bij elke vernieuwing. Zonder nieuw token was het oude al verbruikt
    // (een parallelle aanvraag, bv. op een andere serverinstantie, kreeg het nieuwe): dit toegangstoken gebruiken
    // we enkel voor deze aanvraag en het cookie laten we staan, anders overschrijft het verbruikte token het goede.
    if (!refreshToken) return { connection: { ...connection, ...tokens }, persist: false };
    const result = { connection: { ...connection, ...tokens, refreshToken }, persist: true };
    rotated.set(id, { result, until: Date.now() + ROTATED_TTL });
    return result;
  });
  refreshes.set(id, job);
  try { return await job; } finally { refreshes.delete(id); }
}
/** Enkel voor tests: geheugen van lopende en recente vernieuwingen leegmaken. */
export function resetTodoistRefreshesForTests() { refreshes.clear(); rotated.clear(); }
/** Body als tekst, gestreamd en begrensd (Content-Length is niet betrouwbaar bij chunked aanvragen); null = te groot. */
async function readBoundedBody(request: NextRequest, max: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let body = "";
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > max) { await reader.cancel(); return null; }
    body += decoder.decode(chunk.value, { stream: true });
  }
  return body + decoder.decode();
}
/** Na een herkoppelvereiste blijft dit (eigenaargebonden) merkteken staan, zodat de app «Opnieuw koppelen» toont. */
export const TODOIST_RECONNECT_COOKIE = "shopping_todoist_reconnect";
function reconnectMark(ownerId: string, secret: string) { return createHash("sha256").update(`todoist-reconnect:${secret}:${ownerId}`).digest("base64url"); }
export function todoistNeedsReconnect(request: NextRequest, ownerId: string, secret: string) {
  return request.cookies.get(TODOIST_RECONNECT_COOKIE)?.value === reconnectMark(ownerId, secret);
}
export function clearTodoistReconnect(response: NextResponse) {
  response.cookies.set(TODOIST_RECONNECT_COOKIE, "", { ...todoistCookieOptions, maxAge: 0 });
}
/**
 * Voert `run` uit met een geldige koppeling. Verloopt het toegangstoken (of antwoordt de API toch met 401),
 * dan wordt het eerst vernieuwd en één keer opnieuw geprobeerd. Enkel als Todoist de koppeling echt weigert
 * (vernieuwing ook bij de tweede poging geweigerd, of 401 met een vers token) wordt het cookie gewist; tijdelijke
 * fouten laten het staan. Een eerste geweigerde vernieuwing geeft 425 «retry» (zie TodoistRefreshRefused).
 * `run` krijgt de (begrensde) body als tekst mee: een aanvraagstroom is maar één keer leesbaar, een nieuwe poging niet.
 */
export async function withTodoistConnection(request: NextRequest, run: (connection: TodoistConnection, body: string) => Promise<NextResponse>) {
  const { config, error, ownerId } = await todoistGuard(request);
  if (error) return error;
  if (!config.configured) return todoistJson({ error: "not-configured" }, 503);
  let connection = readTodoistConnection(request.cookies.get(TODOIST_AUTH_COOKIE)?.value, config.secret, ownerId!, config.clientId);
  if (!connection) return todoistJson({ error: "not-connected", reconnect: todoistNeedsReconnect(request, ownerId!, config.secret) }, 409);
  const body = await readBoundedBody(request, 8192);
  if (body === null) return todoistJson({ error: "invalid-request" }, 400);
  let refreshed = false;
  let persist = false;
  const renew = async () => {
    const result = await refresh(connection!, config).catch((cause) => {
      throw cause instanceof TodoistReconnectRequired && connection!.refreshToken ? new TodoistRefreshRefused() : cause;
    });
    connection = result.connection;
    refreshed = true;
    persist ||= result.persist;
  };
  const save = (response: NextResponse) => { if (persist) setTodoistConnection(response, connection!, config.secret); return response; };
  try {
    if (connection.expiresAt <= Date.now() + 60_000) await renew();
    try {
      return save(await run(connection, body));
    } catch (cause) {
      if (!(cause instanceof TodoistUnauthorized) || refreshed || !connection.refreshToken) throw cause;
      await renew();
      return save(await run(connection, body));
    }
  } catch (cause) {
    let response: NextResponse;
    // Geweigerde vernieuwing bij de eerste poging: het cookie niet wissen (het kan intussen al vervangen zijn
    // door het antwoord van de parallelle aanvraag die wél vernieuwde), maar de client opnieuw laten proberen.
    if (cause instanceof TodoistRefreshRefused && request.headers.get(TODOIST_RETRY_HEADER) !== "1") {
      return todoistJson({ error: "retry" }, 425);
    }
    if (cause instanceof TodoistReconnectRequired || cause instanceof TodoistUnauthorized) {
      response = todoistJson({ error: "not-connected", reconnect: true }, 409);
      response.cookies.set(TODOIST_AUTH_COOKIE, "", { ...todoistCookieOptions, maxAge: 0 });
      response.cookies.set(TODOIST_RECONNECT_COOKIE, reconnectMark(ownerId!, config.secret), { ...todoistCookieOptions, maxAge: 60 * 60 * 24 * 90 });
      return response;
    }
    if (cause instanceof TodoistUpstreamError && cause.status === 429) {
      response = todoistJson({ error: "rate-limited" }, 429);
      if (cause.retryAfter && /^\d{1,8}$/.test(cause.retryAfter)) response.headers.set("Retry-After", cause.retryAfter);
    } else response = todoistJson({ error: "temporarily-unavailable" }, 503);
    // Preserve rotated refresh tokens even when the subsequent task request fails.
    return save(response);
  }
}
/** Eén taak afvinken (POST /tasks/{id}/close). Het id is vooraf gecontroleerd; geen vrije paden. */
export async function todoistCloseTask(connection: TodoistConnection, taskId: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(taskId)) throw new Error("Invalid Todoist task id");
  const response = await fetch(`https://api.todoist.com/api/v1/tasks/${encodeURIComponent(taskId)}/close`, { method: "POST", headers: { authorization: `Bearer ${connection.accessToken}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (response.status === 401) throw new TodoistUnauthorized();
  if (!response.ok) throw new TodoistUpstreamError(response.status, response.headers.get("retry-after"));
}
export async function todoistGet(connection: TodoistConnection, path: "tasks" | "tasks/filter" | "projects", params: URLSearchParams) {
  const response = await fetch(`https://api.todoist.com/api/v1/${path}?${params}`, { headers: { authorization: `Bearer ${connection.accessToken}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (response.status === 401) throw new TodoistUnauthorized();
  if (!response.ok) throw new TodoistUpstreamError(response.status, response.headers.get("retry-after"));
  return response.json() as Promise<{ results: Record<string, unknown>[]; next_cursor: string | null }>;
}
