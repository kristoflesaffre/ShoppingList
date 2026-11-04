import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealTodoist, type TodoistConnection } from "@/lib/server/todoist-auth";
import { brusselsToday, isThawRoundAuthorized, runThawRound } from "./todoist-thaw-round";

const origin = "https://shoppinglist-lesaffre.netlify.app";
const secret = "todoist-test-secret-at-least-thirty-two-characters";
const db = vi.hoisted(() => ({ query: vi.fn(), transact: vi.fn(async () => ({})), tx: new Proxy({}, { get: (_, ns) => new Proxy({}, { get: (_, id) => ({ update: (data: unknown) => ({ ns, id, data }) }) }) }) }));
vi.mock("@/lib/server/instant-admin", () => ({ getInstantAdminDb: () => db }));
vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: async () => null }));

const connection = (over: Partial<TodoistConnection> = {}): TodoistConnection => ({ ownerId: "user-1", clientId: "client", accessToken: "access", refreshToken: "refresh", expiresAt: Date.now() + 3600_000, ...over });
const rows = (over: object = {}) => ({
  todoistConnections: [{ ownerId: "user-1", sealedConnection: sealTodoist(connection(), secret) }],
  items: [
    { id: "i1", name: "Chicken tikka masala", fromStock: true, itemDate: "2026-11-04", list: [{ ownerId: "user-1" }] },
    { id: "i2", name: "Van iemand anders", fromStock: true, itemDate: "2026-11-04", list: [{ ownerId: "user-2" }] },
  ],
  freezerItems: [],
  ...over,
});
const now = new Date("2026-11-04T10:00:00Z");
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

beforeEach(() => {
  vi.stubEnv("TODOIST_CLIENT_ID", "client"); vi.stubEnv("TODOIST_CLIENT_SECRET", "client-secret"); vi.stubEnv("TODOIST_OAUTH_SECRET", secret); vi.stubEnv("TODOIST_REDIRECT_URI", `${origin}/api/todoist/callback`);
  db.query.mockReset(); db.transact.mockClear();
  vi.stubGlobal("fetch", vi.fn());
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("runThawRound", () => {
  it("maakt de taak zonder geopende app en bewaart ze op het gerecht", async () => {
    db.query.mockResolvedValue(rows());
    vi.mocked(fetch).mockResolvedValueOnce(json({ results: [], next_cursor: null })).mockResolvedValueOnce(json({ id: "t1" }));
    expect(await runThawRound(now)).toEqual({ connections: 1, created: 1, failed: 0 });
    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("https://api.todoist.com/api/v1/tasks");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ content: "Uit de diepvries halen: Chicken tikka masala", due_date: "2026-11-04" });
    expect(db.transact).toHaveBeenCalledWith({ ns: "items", id: "i1", data: { thawTaskId: "t1" } });
  });
  it("maakt niets dubbel als de taak al open staat", async () => {
    db.query.mockResolvedValue(rows({ items: [{ id: "i1", name: "X", fromStock: true, itemDate: "2026-11-04", thawTaskId: "t1", list: [{ ownerId: "user-1" }] }] }));
    vi.mocked(fetch).mockResolvedValueOnce(json({ results: [{ id: "t1", description: "[shoppinglist-thaw:i1:2026-11-04]" }], next_cursor: null }));
    expect(await runThawRound(now)).toEqual({ connections: 1, created: 0, failed: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("leest alle pagina's voor het iets beslist", async () => {
    db.query.mockResolvedValue(rows());
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ results: [], next_cursor: "volgende" }))
      .mockResolvedValueOnce(json({ results: [{ id: "t1", description: "[shoppinglist-thaw:i1:2026-11-04]" }], next_cursor: null }));
    expect(await runThawRound(now)).toEqual({ connections: 1, created: 0, failed: 0 });
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("cursor=volgende");
    expect(db.transact).toHaveBeenCalledWith({ ns: "items", id: "i1", data: { thawTaskId: "t1" } });
  });
  it("vernieuwt een verlopen token en bewaart het nieuwe", async () => {
    db.query.mockResolvedValue(rows({ items: [], todoistConnections: [{ ownerId: "user-1", sealedConnection: sealTodoist(connection({ expiresAt: 1, refreshToken: "old-refresh" }), secret) }] }));
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ access_token: "new", refresh_token: "new-refresh", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ results: [], next_cursor: null }));
    expect((await runThawRound(now)).failed).toBe(0);
    expect(db.transact).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({ headers: { authorization: "Bearer new" } });
  });
  it("een fout bij de ene gebruiker houdt de volgende niet tegen", async () => {
    db.query.mockResolvedValue(rows({ todoistConnections: [
      { ownerId: "user-1", sealedConnection: sealTodoist(connection(), secret) },
      { ownerId: "user-2", sealedConnection: sealTodoist(connection({ ownerId: "user-2" }), secret) },
      { ownerId: "user-3", sealedConnection: "onleesbaar" },
    ] }));
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({ results: [], next_cursor: null })).mockResolvedValueOnce(json({ id: "t2" }));
    expect(await runThawRound(now)).toEqual({ connections: 2, created: 1, failed: 1 });
  });
});

describe("toegang en datum", () => {
  it("enkel met de juiste sleutel, en nooit zonder ingestelde sleutel", () => {
    expect(isThawRoundAuthorized("Bearer geheim", "geheim")).toBe(true);
    expect(isThawRoundAuthorized("Bearer fout", "geheim")).toBe(false);
    expect(isThawRoundAuthorized(null, "geheim")).toBe(false);
    expect(isThawRoundAuthorized("Bearer ", "")).toBe(false);
    expect(isThawRoundAuthorized("Bearer undefined", undefined)).toBe(false);
  });
  it("rekent in Belgische tijd", () => {
    expect(brusselsToday(new Date("2026-11-04T23:30:00Z"))).toBe("2026-11-05");
    expect(brusselsToday(new Date("2026-11-04T10:00:00Z"))).toBe("2026-11-04");
  });
});
