import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { POST as connect } from "@/app/api/todoist/connect/route";
import { GET as callback } from "@/app/api/todoist/callback/route";
import { POST as status } from "@/app/api/todoist/status/route";
import { POST as disconnect } from "@/app/api/todoist/disconnect/route";
import { POST as tasks } from "@/app/api/todoist/tasks/route";
import { POST as projects } from "@/app/api/todoist/projects/route";
import { TODOIST_AUTH_COOKIE, TODOIST_RECONNECT_COOKIE, TODOIST_STATE_COOKIE, readTodoistConnection, readTodoistState, resetTodoistRefreshesForTests, sealTodoist, type TodoistConnection } from "@/lib/server/todoist-auth";

vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: async (r: Request) => r.headers.get("authorization") === "Bearer good" ? "user-1" : null }));
const origin = "https://shoppinglist-lesaffre.netlify.app";
const secret = "todoist-test-secret-at-least-thirty-two-characters";
const connection = (): TodoistConnection => ({ ownerId: "user-1", clientId: "client", accessToken: "private-access", refreshToken: "private-refresh", expiresAt: Date.now() + 3600_000 });
function request(route: string, body?: unknown, payload = connection()) {
  const r = new NextRequest(`${origin}/api/todoist/${route}`, { method: "POST", headers: { origin, authorization: "Bearer good", "content-type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  r.cookies.set(TODOIST_AUTH_COOKIE, sealTodoist(payload, secret));
  return r;
}
function callbackRequest(query: string, expired = false) {
  const r = new NextRequest(`${origin}/api/todoist/callback?${query}`);
  r.cookies.set(TODOIST_STATE_COOKIE, sealTodoist({ ownerId: "user-1", state: "expected", verifier: "verifier", expiresAt: Date.now() + (expired ? -1 : 600_000) }, secret));
  return r;
}
beforeEach(() => {
  vi.stubEnv("TODOIST_CLIENT_ID", "client"); vi.stubEnv("TODOIST_CLIENT_SECRET", "client-secret"); vi.stubEnv("TODOIST_OAUTH_SECRET", secret); vi.stubEnv("TODOIST_REDIRECT_URI", `${origin}/api/todoist/callback`);
  vi.stubGlobal("fetch", vi.fn());
  resetTodoistRefreshesForTests();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Todoist backend", () => {
  it.each([connect, status, disconnect, tasks, projects])("requires app authentication and the registered origin", async handler => {
    expect((await handler(new NextRequest(`${origin}/api/todoist/test`, { method: "POST", headers: { origin } }))).status).toBe(401);
    expect((await handler(new NextRequest(`${origin}/api/todoist/test`, { method: "POST", headers: { origin: "https://attacker.example", authorization: "Bearer good" } }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requests read and write access, binds state, and protects the cookie", async () => {
    const response = await connect(request("connect"));
    const url = new URL((await response.json()).url);
    expect(url.origin + url.pathname).toBe("https://app.todoist.com/oauth/authorize");
    expect(url.searchParams.get("scope")).toBe("data:read_write");
    expect(url.searchParams.get("redirect_uri")).toBe(`${origin}/api/todoist/callback`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const cookie = response.cookies.get(TODOIST_STATE_COOKIE)!;
    expect(readTodoistState(cookie.value, secret)?.state).toBe(url.searchParams.get("state"));
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("reports missing configuration without pretending to be connected", async () => {
    vi.stubEnv("TODOIST_CLIENT_SECRET", "");
    expect(await (await status(request("status"))).json()).toEqual({ configured: false, connected: false });
    expect((await connect(request("connect"))).status).toBe(503);
  });
  it.each([["state=wrong&code=code", false], ["state=expected&code=code", true], ["state=expected", false]])("rejects invalid callback before network access", async (query, expired) => {
    const response = await callback(callbackRequest(query as string, expired as boolean));
    expect(response.headers.get("location")).toBe(`${origin}/profiel?todoist=connection-failed`);
    expect(response.cookies.get(TODOIST_STATE_COOKIE)?.maxAge).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("handles cancelled consent", async () => {
    expect((await callback(callbackRequest("state=expected&error=access_denied"))).headers.get("location")).toContain("todoist=cancelled");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("exchanges the code server-side and never returns tokens to the frontend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ access_token: "private-access", refresh_token: "private-refresh", expires_in: 3600, scope: "data:read_write" }));
    const response = await callback(callbackRequest("state=expected&code=code"));
    expect(response.headers.get("location")).toBe(`${origin}/profiel?todoist=connected`);
    const cookie = response.cookies.get(TODOIST_AUTH_COOKIE)!;
    expect(cookie.value).not.toContain("private-access");
    expect(readTodoistConnection(cookie.value, secret, "user-1", "client")?.refreshToken).toBe("private-refresh");
    const body = vi.mocked(fetch).mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get("client_secret")).toBe("client-secret");
    expect(body.get("code_verifier")).toBe("verifier");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it.each(["different-user", "tampered"])('does not use credentials from %s', async kind => {
    const r = request("tasks", {}, { ...connection(), ownerId: kind === "different-user" ? "user-2" : "user-1" });
    if (kind === "tampered") r.cookies.set(TODOIST_AUTH_COOKIE, "invalid-cookie");
    expect((await tasks(r)).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("lists a page of tasks with due dates, labels and hierarchy, preserving the cursor", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ results: [{ id: "task-1", content: "Read report", description: "Details", project_id: "p1", parent_id: "parent", section_id: "s1", labels: ["work"], priority: 4, due: { date: "2026-10-18", is_recurring: true }, checked: false }], next_cursor: "next-page" }));
    const response = await tasks(request("tasks", { projectId: "p1", cursor: "page1", limit: 20 }));
    const data = await response.json();
    expect(data.nextCursor).toBe("next-page");
    expect(data.tasks[0]).toMatchObject({ id: "task-1", content: "Read report", projectId: "p1", parentId: "parent", priority: 4, due: { date: "2026-10-18", recurring: true } });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/v1/tasks?");
    expect(String(url)).toContain("cursor=page1");
    expect(String(url)).toContain("project_id=p1");
    expect(options?.headers).toEqual({ authorization: "Bearer private-access" });
    expect(options?.method).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("private-access");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("uses the current filter endpoint for today and overdue", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ results: [], next_cursor: null }));
    expect((await tasks(request("tasks", { filter: "today | overdue" }))).status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/tasks/filter?");
  });
  it.each([{ limit: 201 }, { cursor: 7 }, { filter: "today", projectId: "p1" }, { url: "https://attacker.example" }, { lang: "nl" }])("rejects invalid read options", async body => {
    expect((await tasks(request("tasks", body))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns project names for joining to task.projectId", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ results: [{ id: "p1", name: "Personal", color: "blue" }], next_cursor: null }));
    expect(await (await projects(request("projects"))).json()).toMatchObject({ projects: [{ id: "p1", name: "Personal" }], nextCursor: null });
  });
  it("refreshes expiring tokens before reading tasks", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 })).mockResolvedValueOnce(Response.json({ results: [], next_cursor: null }));
    const response = await tasks(request("tasks", {}, { ...connection(), expiresAt: Date.now() - 1 }));
    expect(response.status).toBe(200);
    expect(readTodoistConnection(response.cookies.get(TODOIST_AUTH_COOKIE)?.value, secret, "user-1", "client")?.refreshToken).toBe("new-refresh");
    expect(vi.mocked(fetch).mock.calls[1][1]?.headers).toEqual({ authorization: "Bearer new-access" });
  });
  it("keeps rotated tokens even if Todoist then rate limits the task request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 })).mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "30" } }));
    const response = await tasks(request("tasks", {}, { ...connection(), expiresAt: Date.now() - 1 }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(readTodoistConnection(response.cookies.get(TODOIST_AUTH_COOKIE)?.value, secret, "user-1", "client")?.refreshToken).toBe("new-refresh");
  });
  it("clears a revoked connection (401, then refresh refused) and requests reconnection", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json({ error: "invalid_grant" }, { status: 400 }));
    const response = await tasks(request("tasks"));
    expect(response.status).toBe(409);
    expect(response.cookies.get(TODOIST_AUTH_COOKIE)?.maxAge).toBe(0);
    expect(response.cookies.get(TODOIST_RECONNECT_COOKIE)?.value).toBeTruthy();
    expect(await response.json()).toEqual({ error: "not-connected", reconnect: true });
  });
  it("handles upstream downtime without exposing error details", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("private-token-should-not-be-returned"));
    const response = await tasks(request("tasks"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "temporarily-unavailable" });
  });
  it("rejects oversized and malformed JSON without requesting Todoist", async () => {
    expect((await tasks(request("tasks", { filter: "x".repeat(9000) }))).status).toBe(400);
    const malformed = new NextRequest(`${origin}/api/todoist/tasks`, { method: "POST", headers: { origin, authorization: "Bearer good" }, body: "{" });
    malformed.cookies.set(TODOIST_AUTH_COOKIE, sealTodoist(connection(), secret));
    expect((await tasks(malformed)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("turns an invalid refresh token into a disconnected status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 400 }));
    const response = await status(request("status", {}, { ...connection(), expiresAt: Date.now() - 1 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: true, connected: false, reconnect: true });
    expect(response.cookies.get(TODOIST_AUTH_COOKIE)?.maxAge).toBe(0);
  });
  it("shares an in-flight refresh between parallel readers", async () => {
    let resolveRefresh!: (value: Response) => void;
    const tokenResult = new Promise<Response>(resolve => { resolveRefresh = resolve; });
    vi.mocked(fetch).mockImplementation(async url => String(url).includes("oauth/access_token") ? tokenResult : Response.json({ results: [], next_cursor: null }));
    const payload = { ...connection(), expiresAt: Date.now() - 1 };
    const first = tasks(request("tasks", {}, payload));
    const second = projects(request("projects", {}, payload));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    resolveRefresh(Response.json({ access_token: "new-access", refresh_token: "rotated", expires_in: 3600 }));
    const responses = await Promise.all([first, second]);
    expect(responses.map(r => r.status)).toEqual([200, 200]);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("oauth/access_token"))).toHaveLength(1);
    for (const response of responses) expect(readTodoistConnection(response.cookies.get(TODOIST_AUTH_COOKIE)?.value, secret, "user-1", "client")?.refreshToken).toBe("rotated");
  });
  it.each(["data:read", "task:add"])("rejects insufficient scope %s instead of saving it", async scope => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ access_token: "access", refresh_token: "refresh", expires_in: 3600, scope }));
    const response = await callback(callbackRequest("state=expected&code=code"));
    expect(response.headers.get("location")).toContain("connection-failed");
    expect(response.cookies.get(TODOIST_AUTH_COOKIE)).toBeUndefined();
  });
  it("disconnects this browser without editing any Todoist task", async () => {
    const response = await disconnect(request("disconnect"));
    expect(response.cookies.get(TODOIST_AUTH_COOKIE)?.maxAge).toBe(0);
    expect(response.cookies.get(TODOIST_STATE_COOKIE)?.maxAge).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Todoist token expiry and refresh", () => {
  const expired = () => ({ ...connection(), expiresAt: Date.now() - 1, scope: "data:read_write" });
  const tokenCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("oauth/access_token"));
  const saved = (response: NextResponse) => readTodoistConnection(response.cookies.get(TODOIST_AUTH_COOKIE)?.value, secret, "user-1", "client");

  it.each([undefined, "data:read", "task:add,data:read_write"])("refreshes regardless of the scope Todoist echoes (%s)", async scope => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600, ...(scope ? { scope } : {}) })).mockResolvedValueOnce(Response.json({ results: [], next_cursor: null }));
    const response = await tasks(request("tasks", {}, expired()));
    expect(response.status).toBe(200);
    expect(saved(response)).toMatchObject({ accessToken: "new-access", refreshToken: "new-refresh", scope: scope ?? "data:read_write" });
    expect(tokenCalls()[0][1]?.body?.toString()).toContain("grant_type=refresh_token");
  });
  it("refreshes and retries once when Todoist rejects a not-yet-expired access token", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json({ results: [], next_cursor: null }));
    const response = await tasks(request("tasks", { limit: 10 }));
    expect(response.status).toBe(200);
    expect(saved(response)?.refreshToken).toBe("new-refresh");
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain("limit=10");
    expect(vi.mocked(fetch).mock.calls[2][1]?.headers).toEqual({ authorization: "Bearer new-access" });
  });
  it("retries a check-off with the same body after refreshing", async () => {
    const { POST: close } = await import("@/app/api/todoist/close/route");
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await close(request("close", { id: "task-1" }, { ...connection(), scope: "data:read_write" }));
    expect(response.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain("/tasks/task-1/close");
  });
  it("only disconnects after a 401 with a freshly refreshed token", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const response = await tasks(request("tasks", {}, expired()));
    expect(response.status).toBe(409);
    expect(tokenCalls()).toHaveLength(1);
    expect(response.cookies.get(TODOIST_AUTH_COOKIE)?.maxAge).toBe(0);
  });
  it.each([
    ["a server error", () => new Response(null, { status: 502 })],
    ["a network failure", () => { throw new Error("offline"); }],
    ["a client configuration error", () => Response.json({ error: "invalid_client" }, { status: 401 })],
  ])("keeps the connection on %s while refreshing", async (_, result) => {
    vi.mocked(fetch).mockImplementationOnce(async () => result());
    const response = await status(request("status", {}, expired()));
    expect(response.status).toBe(503);
    expect(response.cookies.get(TODOIST_AUTH_COOKIE)).toBeUndefined();
    expect(response.cookies.get(TODOIST_RECONNECT_COOKIE)).toBeUndefined();
  });
  it("does not overwrite the cookie with a consumed refresh token when Todoist answers a reused one", async () => {
    // Binnen 60 s hergebruikt: hetzelfde toegangstoken, géén nieuw vernieuwingstoken (een andere aanvraag kreeg het).
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ access_token: "same-access", expires_in: 3590 })).mockResolvedValueOnce(Response.json({ results: [], next_cursor: null }));
    const response = await tasks(request("tasks", {}, expired()));
    expect(response.status).toBe(200);
    expect(vi.mocked(fetch).mock.calls[1][1]?.headers).toEqual({ authorization: "Bearer same-access" });
    expect(response.cookies.get(TODOIST_AUTH_COOKIE)).toBeUndefined();
  });
  it("hands late requests that still carry the old cookie the rotated tokens instead of refreshing twice", async () => {
    vi.mocked(fetch).mockImplementation(async url => String(url).includes("oauth/access_token") ? Response.json({ access_token: "new-access", refresh_token: "rotated", expires_in: 3600 }) : Response.json({ results: [], next_cursor: null }));
    const payload = expired();
    const first = await tasks(request("tasks", {}, payload));
    const late = await projects(request("projects", {}, payload));
    expect(tokenCalls()).toHaveLength(1);
    for (const response of [first, late]) expect(saved(response)?.refreshToken).toBe("rotated");
  });
  it("keeps showing «Opnieuw koppelen» after the cookie is gone, until reconnecting succeeds", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: "invalid_grant" }, { status: 400 }));
    const refused = await status(request("status", {}, expired()));
    expect(await refused.json()).toEqual({ configured: true, connected: false, reconnect: true });
    const mark = refused.cookies.get(TODOIST_RECONNECT_COOKIE)!;
    expect(mark).toMatchObject({ httpOnly: true, secure: true });

    const later = request("status");
    later.cookies.delete(TODOIST_AUTH_COOKIE);
    later.cookies.set(TODOIST_RECONNECT_COOKIE, mark.value);
    expect(await (await status(later)).json()).toEqual({ configured: true, connected: false, reconnect: true });
    // Een andere gebruiker op dezelfde browser ziet gewoon de eerste koppelkaart.
    const other = new NextRequest(`${origin}/api/todoist/status`, { method: "POST", headers: { origin, authorization: "Bearer good" } });
    other.cookies.set(TODOIST_RECONNECT_COOKIE, "forged");
    expect(await (await status(other)).json()).toEqual({ configured: true, connected: false });

    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ access_token: "a", refresh_token: "r", expires_in: 3600, scope: "data:read_write" }));
    expect((await callback(callbackRequest("state=expected&code=code"))).cookies.get(TODOIST_RECONNECT_COOKIE)?.maxAge).toBe(0);
    expect((await disconnect(request("disconnect"))).cookies.get(TODOIST_RECONNECT_COOKIE)?.maxAge).toBe(0);
  });
});

describe("Todoist write access and return path", () => {
  it("only treats read_write connections as writable", async () => {
    const { todoistCanWrite } = await import("@/lib/server/todoist-auth");
    const base = { ownerId: "u", clientId: "c", accessToken: "t", expiresAt: Date.now() + 60_000 };
    expect(todoistCanWrite(base)).toBe(false);
    expect(todoistCanWrite({ ...base, scope: "data:read" })).toBe(false);
    expect(todoistCanWrite({ ...base, scope: "data:read_write" })).toBe(true);
  });

  it("accepts only same-site return paths", async () => {
    const { safeTodoistReturn } = await import("@/lib/server/todoist-auth");
    expect(safeTodoistReturn("/todo")).toBe("/todo");
    expect(safeTodoistReturn("//evil.example")).toBeUndefined();
    expect(safeTodoistReturn("https://evil.example")).toBeUndefined();
    expect(safeTodoistReturn("/todo?x=1")).toBeUndefined();
    expect(safeTodoistReturn(42)).toBeUndefined();
  });
});

describe("Todoist close route", () => {
  it("rejects requests without a signed-in user from another origin", async () => {
    const { POST: close } = await import("@/app/api/todoist/close/route");
    const res = await close(new NextRequest("https://evil.example/api/todoist/close", { method: "POST", body: JSON.stringify({ id: "1" }) }));
    expect([401, 403]).toContain(res.status);
  });
});
