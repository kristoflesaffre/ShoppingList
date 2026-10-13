import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as connect } from "@/app/api/google/connect/route";
import { GET as callback } from "@/app/api/google/callback/route";
import { GOOGLE_CALENDAR_SCOPES } from "./google-calendar";
import { GOOGLE_STATE_COOKIE, sealGoogleOAuthState } from "./google-dashboard-auth";

// De koppeling hoort bij de ingelogde gebruiker; het Instant-token wordt op de server geverifieerd.
vi.mock("@/lib/server/google-connection-store", () => ({
  verifiedUserId: async (request: Request) => (request.headers.get("authorization") === "Bearer good-token" ? "user-1" : null),
  loadGoogleConnection: async () => null,
  saveGoogleConnection: async () => undefined,
}));

const secret = "a-local-test-secret-that-is-long-enough";
beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
  vi.stubEnv("GOOGLE_OAUTH_COOKIE_SECRET", secret);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Google OAuth routes", () => {
  it("redirects to Google with only read scopes and the exact callback origin", async () => {
    const response = await connect(new NextRequest("http://127.0.0.1:3000/api/google/connect", { method: "POST", headers: { host: "127.0.0.1:3000", authorization: "Bearer good-token" } }));
    const location = new URL(((await response.json()) as { url: string }).url);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("scope")?.split(" ")).toEqual(GOOGLE_CALENDAR_SCOPES);
    expect(location.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3000/api/google/callback");
    expect(response.cookies.get(GOOGLE_STATE_COOKIE)).toBeDefined();
  });

  it("returns to the app when consent is cancelled", async () => {
    const request = new NextRequest("http://127.0.0.1:3000/api/google/callback?state=expected&error=access_denied");
    request.cookies.set(GOOGLE_STATE_COOKIE, sealGoogleOAuthState({ state: "expected", ownerId: "user-1" }, secret));
    const response = await callback(request);
    expect(new URL(response.headers.get("location")!).searchParams.get("google")).toBe("cancelled");
  });

  it("rejects a callback with the wrong state before exchanging a code", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://127.0.0.1:3000/api/google/callback?state=wrong&code=code");
    request.cookies.set(GOOGLE_STATE_COOKIE, sealGoogleOAuthState({ state: "expected", ownerId: "user-1" }, secret));
    const response = await callback(request);
    expect(new URL(response.headers.get("location")!).searchParams.get("google")).toBe("connection-failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not start OAuth without server credentials", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const response = await connect(new NextRequest("http://127.0.0.1:3000/api/google/connect", { method: "POST", headers: { authorization: "Bearer good-token" } }));
    expect(response.status).toBe(503);
  });

  it("does not start OAuth for someone who is not signed in", async () => {
    const response = await connect(new NextRequest("http://127.0.0.1:3000/api/google/connect", { method: "POST", headers: { authorization: "Bearer forged" } }));
    expect(response.status).toBe(401);
    expect(response.cookies.get(GOOGLE_STATE_COOKIE)).toBeUndefined();
  });
});
