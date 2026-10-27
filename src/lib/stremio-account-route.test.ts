import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ owner: vi.fn(), configured: vi.fn(), load: vi.fn(), save: vi.fn(), remove: vi.fn(), login: vi.fn(), read: vi.fn(), clear: vi.fn() }));
vi.mock("./server/google-connection-store", () => ({ verifiedUserId: m.owner }));
vi.mock("./server/stremio-store", () => ({ stremioConfigured: m.configured, loadStremio: m.load, saveStremio: m.save, deleteStremio: m.remove }));
vi.mock("./server/stremio-cloud", () => ({ loginStremio: m.login, readStremioProgress: m.read, clearStremioCache: m.clear }));
import { GET, POST, DELETE } from "../app/api/stremio/route";
const credentials = { email: "test@example.com", password: "test-password" };
const request = (body?: unknown, origin = "https://localhost:3011", method = "POST") => new NextRequest("https://localhost:3011/api/stremio", { method, headers: { host: "localhost:3011", origin, "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => {
  vi.clearAllMocks();
  m.owner.mockResolvedValue(crypto.randomUUID()); m.configured.mockReturnValue(true);
  m.load.mockResolvedValue(null); m.login.mockResolvedValue("private-token".repeat(3));
  m.read.mockResolvedValue({ items: [], syncedAt: 123 });
});
it("requires authentication on every method", async () => {
  m.owner.mockResolvedValue(null);
  for (const route of [GET, POST, DELETE]) expect((await route(request(credentials))).status).toBe(401);
  expect(m.login).not.toHaveBeenCalled(); expect(m.load).not.toHaveBeenCalled();
});
it("rejects cross-origin writes before accessing the account", async () => {
  for (const route of [POST, DELETE]) expect((await route(request(credentials, "https://evil.example"))).status).toBe(403);
  expect(m.owner).not.toHaveBeenCalled();
});
it("does not leak sessions in GET responses", async () => {
  m.load.mockResolvedValue({ ownerId: "owner", authKey: "do-not-return" });
  const response = await GET(request(undefined, undefined, "GET"));
  expect(await response.json()).toEqual({ connected: true, items: [], syncedAt: 123 });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it.each([[], null, {}, { ...credentials, ownerId: "other" }, { ...credentials, password: "" }, { ...credentials, email: "invalid" }])("rejects malformed login payloads: %j", async body => {
  expect((await POST(request(body))).status).toBe(400);
  expect(m.login).not.toHaveBeenCalled(); expect(m.save).not.toHaveBeenCalled();
});
it("validates the read path before replacing a session and never stores a password", async () => {
  m.owner.mockResolvedValue("signed-in-owner");
  const response = await POST(request(credentials));
  expect(response.status).toBe(200);
  expect(m.save).toHaveBeenCalledWith({ ownerId: "signed-in-owner", authKey: "private-token".repeat(3) });
  expect(await response.json()).toEqual({ connected: true, items: [], syncedAt: 123 });
});
it("preserves the previous connection when library access fails", async () => {
  m.read.mockRejectedValueOnce(new Error("session-expired"));
  expect((await POST(request(credentials))).status).toBe(503);
  expect(m.save).not.toHaveBeenCalled();
});
it("disconnects only this app session, without a global Stremio logout", async () => {
  m.owner.mockResolvedValue("owner-to-disconnect");
  expect((await DELETE(request())).status).toBe(200);
  expect(m.remove).toHaveBeenCalledWith("owner-to-disconnect");
  expect(m.clear).toHaveBeenCalledOnce();
  expect(m.login).not.toHaveBeenCalled(); expect(m.read).not.toHaveBeenCalled();
});
it("limits repeated login attempts and hides unknown error details", async () => {
  m.owner.mockResolvedValue("rate-limit-owner");
  m.login.mockRejectedValue(new Error("sensitive-upstream-details"));
  for (let i = 0; i < 5; i++) expect(await (await POST(request(credentials))).json()).toEqual({ error: "upstream-unavailable" });
  expect((await POST(request(credentials))).status).toBe(429);
  expect(m.login).toHaveBeenCalledTimes(5);
});
