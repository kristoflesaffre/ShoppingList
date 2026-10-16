import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as rooms } from "@/app/api/hue/rooms/route";
import { POST as light } from "@/app/api/hue/light/route";
import { POST as scene } from "@/app/api/hue/scene/route";
import { HUE_AUTH_COOKIE, sealHue } from "@/lib/server/hue-auth";
import { mapHueRooms } from "@/lib/server/hue-control";

vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: async (r: Request) => (r.headers.get("authorization") === "Bearer good" ? "user-1" : null) }));
const origin = "https://shoppinglist-lesaffre.netlify.app";
const secret = "test-secret-long-enough-for-aes-encryption";
const connection = { ownerId: "user-1", clientId: "client", accessToken: "access", refreshToken: "refresh", applicationKey: "key", expiresAt: Date.now() + 3600_000 };
const GROUP = "0c3a3c55-6a7e-4a8c-9d2b-6f0d8a7a1b2c";
beforeEach(() => {
  vi.stubEnv("HUE_CLIENT_ID", "client"); vi.stubEnv("HUE_CLIENT_SECRET", "client-secret"); vi.stubEnv("HUE_OAUTH_SECRET", secret); vi.stubEnv("HUE_REDIRECT_URI", `${origin}/api/hue/callback`);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function request(path: string, body?: unknown, extra: Record<string, string> = {}) {
  const r = new NextRequest(`${origin}${path}`, { method: "POST", headers: { authorization: "Bearer good", origin, ...extra }, body: body ? JSON.stringify(body) : undefined });
  r.cookies.set(HUE_AUTH_COOKIE, sealHue(connection, secret));
  return r;
}

describe("mapHueRooms", () => {
  it("koppelt kamers aan hun grouped_light en sorteert op naam", () => {
    const out = mapHueRooms(
      [
        { id: "r2", metadata: { name: "Woonkamer", archetype: "living_room" }, services: [{ rid: "g2", rtype: "grouped_light" }] },
        { id: "r1", metadata: { name: "Keuken", archetype: "kitchen" }, services: [{ rid: "g1", rtype: "grouped_light" }] },
        { id: "r3", metadata: { name: "Zonder licht" }, services: [] },
      ],
      [{ id: "g1", on: { on: true }, dimming: { brightness: 54.3 } }, { id: "g2", on: { on: false } }],
    );
    expect(out).toEqual([
      { id: "g1", name: "Keuken", archetype: "kitchen", on: true, brightness: 54 },
      { id: "g2", name: "Woonkamer", archetype: "living_room", on: false, brightness: null },
    ]);
  });
});

describe("Hue light routes", () => {
  it("vereist aanmelding en de geregistreerde origin", async () => {
    expect((await rooms(request("/api/hue/rooms", undefined, { authorization: "Bearer bad" }))).status).toBe(401);
    expect((await rooms(request("/api/hue/rooms", undefined, { origin: "https://attacker.example" }))).status).toBe(403);
  });

  it("leest kamers via de cloud met token en application key", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      new Response(JSON.stringify({ data: url.endsWith("/room") ? [{ id: "r1", metadata: { name: "Keuken" }, services: [{ rid: GROUP, rtype: "grouped_light" }] }] : [{ id: GROUP, on: { on: true } }] })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const data = await (await rooms(request("/api/hue/rooms"))).json();
    expect(data.rooms).toEqual([{ id: GROUP, name: "Keuken", archetype: "other", on: true, brightness: null }]);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }])[1];
    expect(init.headers.authorization).toBe("Bearer access");
    expect(init.headers["hue-application-key"]).toBe("key");
  });

  it("weigert ongeldige opdrachten en stuurt een geldige als PUT", async () => {
    expect((await light(request("/api/hue/light", { id: "../config", on: true }))).status).toBe(400);
    expect((await light(request("/api/hue/light", { id: GROUP }))).status).toBe(400);
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    expect((await light(request("/api/hue/light", { id: GROUP, on: false }))).status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.meethue.com/route/clip/v2/resource/grouped_light/${GROUP}`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ on: { on: false } });
  });
});

describe("Hue scene route", () => {
  const ROOMS = [
    { id: "room-living", metadata: { name: "Woonkamer" }, services: [{ rid: "gl-living", rtype: "grouped_light" }] },
    { id: "room-kitchen", metadata: { name: "Keuken" }, services: [{ rid: "gl-kitchen", rtype: "grouped_light" }] },
    { id: "room-hall", metadata: { name: "Gang beneden" }, services: [{ rid: "gl-hall", rtype: "grouped_light" }] },
  ];
  const SCENES = [
    { id: "sc-read", metadata: { name: "Lezen" }, group: { rid: "room-living", rtype: "room" } },
    { id: "sc-cinema", metadata: { name: "Cinema" }, group: { rid: "room-living", rtype: "room" } },
    { id: "sc-cinema-kitchen", metadata: { name: "Cinema" }, group: { rid: "room-kitchen", rtype: "room" } },
  ];
  const mockBridge = () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/room")) return new Response(JSON.stringify({ data: ROOMS }));
      if (url.endsWith("/scene")) return new Response(JSON.stringify({ data: SCENES }));
      return new Response(JSON.stringify({ data: [], method: init?.method }));
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };
  const puts = (fetchMock: ReturnType<typeof mockBridge>) =>
    (fetchMock.mock.calls as unknown as [string, RequestInit | undefined][]).filter(([, i]) => i?.method === "PUT").map(([u, i]) => [u.split("/resource/")[1], JSON.parse(i!.body as string)]);

  it("roept de cinemascène van de woonkamer op", async () => {
    const fetchMock = mockBridge();
    const res = await scene(request("/api/hue/scene", { room: "woonkamer", scene: "cinema" }));
    expect(res.status).toBe(200);
    expect(puts(fetchMock)).toEqual([["scene/sc-cinema", { recall: { action: "active" } }]]);
  });

  it("zet met othersOff alle andere kamers uit", async () => {
    const fetchMock = mockBridge();
    const data = await (await scene(request("/api/hue/scene", { room: "Woonkamer", scene: "Cinema", othersOff: true }))).json();
    expect(data.switchedOff).toBe(2);
    expect(puts(fetchMock)).toEqual([
      ["scene/sc-cinema", { recall: { action: "active" } }],
      ["grouped_light/gl-kitchen", { on: { on: false } }],
      ["grouped_light/gl-hall", { on: { on: false } }],
    ]);
  });

  it("meldt een ontbrekende scène of kamer en weigert ongeldige invoer", async () => {
    mockBridge();
    expect((await scene(request("/api/hue/scene", { room: "Woonkamer", scene: "Disco" }))).status).toBe(404);
    expect((await scene(request("/api/hue/scene", { room: "Zolder", scene: "Cinema" }))).status).toBe(404);
    expect((await scene(request("/api/hue/scene", { room: "", scene: "Cinema" }))).status).toBe(400);
  });
});
