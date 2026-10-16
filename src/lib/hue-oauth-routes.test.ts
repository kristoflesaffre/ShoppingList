import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as connect } from "@/app/api/hue/connect/route";
import { GET as callback } from "@/app/api/hue/callback/route";
import { POST as status } from "@/app/api/hue/status/route";
import { POST as disconnect } from "@/app/api/hue/disconnect/route";
import { HUE_AUTH_COOKIE, HUE_STATE_COOKIE, readHueConnection, readHueState, sealHue } from "@/lib/server/hue-auth";

vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: async (r: Request) => r.headers.get("authorization") === "Bearer good" ? "user-1" : null }));
const origin = "https://shoppinglist-lesaffre.netlify.app";
const secret = "test-secret-long-enough-for-aes-encryption";
const headers = { authorization: "Bearer good", origin };
const connection = { ownerId: "user-1", clientId: "client", accessToken: "access", refreshToken: "refresh", applicationKey: "key", expiresAt: Date.now() + 3600_000 };
const state = () => ({ ownerId: "user-1", state: "expected", verifier: "verifier", expiresAt: Date.now() + 600_000 });
beforeEach(() => {
  vi.stubEnv("HUE_CLIENT_ID", "client"); vi.stubEnv("HUE_CLIENT_SECRET", "client-secret"); vi.stubEnv("HUE_OAUTH_SECRET", secret); vi.stubEnv("HUE_REDIRECT_URI", `${origin}/api/hue/callback`);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function callbackRequest(query: string, payload = state()) {
  const request = new NextRequest(`${origin}/api/hue/callback?${query}`);
  request.cookies.set(HUE_STATE_COOKIE, sealHue(payload, secret));
  return request;
}
function statusRequest(payload = connection, auth = "Bearer good") {
  const request = new NextRequest(`${origin}/api/hue/status`, { method: "POST", headers: { ...headers, authorization: auth } });
  request.cookies.set(HUE_AUTH_COOKIE, sealHue(payload, secret));
  return request;
}
describe("Hue OAuth", () => {
  it("requires both authentication and the registered origin", async () => {
    expect((await connect(new NextRequest(`${origin}/api/hue/connect`, { method: "POST", headers: { origin } }))).status).toBe(401);
    expect((await connect(new NextRequest(`${origin}/api/hue/connect`, { method: "POST", headers: { ...headers, origin: "https://attacker.example" } }))).status).toBe(403);
  });
  it("uses the current Hue endpoint, PKCE and a short-lived protected state cookie", async () => {
    const response = await connect(new NextRequest(`${origin}/api/hue/connect`, { method: "POST", headers }));
    const url = new URL((await response.json()).url);
    expect(url.origin + url.pathname).toBe("https://api.meethue.com/v2/oauth2/authorize");
    expect(url.searchParams.get("redirect_uri")).toBe(`${origin}/api/hue/callback`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const cookie = response.cookies.get(HUE_STATE_COOKIE)!;
    expect(readHueState(cookie.value, secret)?.state).toBe(url.searchParams.get("state"));
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
  });
  it.each(["wrong", "expected"])("rejects wrong or expired state before any network request (%s)", async value => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const payload = state(); if (value === "expected") payload.expiresAt = Date.now() - 1;
    const response = await callback(callbackRequest(`state=${value}&code=code`, payload));
    expect(response.headers.get("location")).toContain("connection-failed");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.cookies.get(HUE_STATE_COOKIE)?.maxAge).toBe(0);
  });
  it("handles cancelled consent without token exchange", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await callback(callbackRequest("state=expected&error=access_denied"))).headers.get("location")).toContain("cancelled");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("pairs the bridge and seals credentials without exposing them in the redirect", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ access_token: "access", refresh_token: "refresh", expires_in: "604799" })).mockResolvedValueOnce(Response.json([{ success: true }])).mockResolvedValueOnce(Response.json([{ success: { username: "key" } }]));
    vi.stubGlobal("fetch", fetchMock);
    const response = await callback(callbackRequest("state=expected&code=code"));
    expect(response.headers.get("location")).toBe(`${origin}/profiel/hue?hue=connected`);
    expect(readHueConnection(response.cookies.get(HUE_AUTH_COOKIE)?.value, secret, "user-1", "client")).toMatchObject({ applicationKey: "key", refreshToken: "refresh" });
    expect(fetchMock.mock.calls[0][1].body.get("code_verifier")).toBe("verifier");
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(["https://api.meethue.com/v2/oauth2/token", "https://api.meethue.com/route/api/0/config", "https://api.meethue.com/route/api"]);
  });
  it("does not report connection success when Hue bridge pairing fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ access_token: "access", refresh_token: "refresh", expires_in: 3600 })).mockResolvedValueOnce(new Response(null, { status: 503 })));
    const response = await callback(callbackRequest("state=expected&code=code"));
    expect(response.headers.get("location")).toContain("connection-failed");
    expect(response.cookies.get(HUE_AUTH_COOKIE)).toBeUndefined();
  });
  it("rejects tampered cookies and connections belonging to another app user", async () => {
    expect(readHueConnection(sealHue(connection, secret), "wrong-secret", "user-1", "client")).toBeNull();
    expect(await (await status(statusRequest({ ...connection, ownerId: "other-user" }))).json()).toMatchObject({ connected: false });
    expect((await status(statusRequest(connection, "Bearer forged"))).status).toBe(401);
  });
  it("saves both rotated tokens after expiry and never returns tokens to JavaScript", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 })));
    const response = await status(statusRequest({ ...connection, expiresAt: Date.now() - 1 }));
    expect(await response.json()).toEqual({ configured: true, connected: true });
    expect(readHueConnection(response.cookies.get(HUE_AUTH_COOKIE)?.value, secret, "user-1", "client")).toMatchObject({ accessToken: "new-access", refreshToken: "new-refresh" });
  });
  it("preserves the connection on temporary failures and clears a revoked refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(Response.json({ error: "invalid_grant" }, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const temporary = await status(statusRequest({ ...connection, expiresAt: 1 }));
    expect(temporary.status).toBe(503); expect(temporary.cookies.get(HUE_AUTH_COOKIE)).toBeUndefined();
    const revoked = await status(statusRequest({ ...connection, expiresAt: 1 }));
    expect(await revoked.json()).toMatchObject({ connected: false, reconnect: true });
    expect(revoked.cookies.get(HUE_AUTH_COOKIE)?.maxAge).toBe(0);
  });
  it("disconnects locally without making a lighting command", async () => {
    const response = await disconnect(new NextRequest(`${origin}/api/hue/disconnect`, { method: "POST", headers }));
    expect(response.cookies.get(HUE_AUTH_COOKIE)?.maxAge).toBe(0);
    expect(response.cookies.get(HUE_STATE_COOKIE)?.maxAge).toBe(0);
  });
});
