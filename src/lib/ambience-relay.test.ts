import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  bridge: vi.fn(),
  enqueue: vi.fn(),
  command: vi.fn(),
  query: vi.fn(),
  transact: vi.fn(),
}));
vi.mock("@/lib/server/google-connection-store", () => ({ verifiedUserId: mocks.verify }));
vi.mock("@/lib/server/projector-relay", () => ({
  ownerBridge: mocks.bridge,
  bridgeOnline: () => true,
  enqueueProjector: mocks.enqueue,
  relayCommand: mocks.command,
}));
vi.mock("@/lib/server/instant-admin", () => ({
  getInstantAdminDb: () => ({ query: mocks.query, transact: mocks.transact, tx: { cinemaCompanionData: new Proxy({}, { get: () => ({ update: (v: unknown) => v }) }) } }),
}));
vi.mock("@/lib/server/cinema-companion", () => ({ companionId: (k: string) => k }));

import { ambienceSetAction, ambienceViaPi } from "./server/ambience-relay";
import { DEFAULT_MASK } from "./ambience-projector";

const request = (body: unknown) =>
  new NextRequest("https://shoppinglist-azure.vercel.app/api/tv/ambience", { method: "POST", headers: { origin: "https://shoppinglist-azure.vercel.app", "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue("owner");
  mocks.bridge.mockResolvedValue({ id: "b", enabled: true, lastSeenAt: Date.now() });
  mocks.enqueue.mockImplementation(async (_b: unknown, action: string) => ({ id: "c1", action }));
  mocks.command.mockResolvedValue({ state: "sent" });
  mocks.query.mockResolvedValue({ cinemaCompanionData: [] });
});

describe("ambience via de Pi", () => {
  it("valt terug op de Mac als er geen Pi is", async () => {
    mocks.bridge.mockResolvedValue(null);
    expect(await ambienceViaPi(request({ action: "status" }), { action: "status" })).toBeNull();
  });

  it("speelt een video via de Pi en wacht op de Pi", async () => {
    const res = await ambienceViaPi(request({ action: "play", videoId: "uOquG6prOPY" }), { action: "play", videoId: "uOquG6prOPY" });
    expect(res?.status).toBe(200);
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), "tv-play:uOquG6prOPY");
  });

  it("geeft de fout van de Pi door", async () => {
    mocks.command.mockResolvedValue({ state: "failed", error: "tv-not-waking" });
    const res = await ambienceViaPi(request({ action: "play", videoId: "uOquG6prOPY" }), { action: "play", videoId: "uOquG6prOPY" });
    expect(await res?.json()).toEqual({ error: "tv-not-waking" });
  });

  it("bewaart de schakelaar en stuurt instellingen mee", async () => {
    await ambienceViaPi(request({ action: "projector", enabled: true }), { action: "projector", enabled: true });
    const action = mocks.enqueue.mock.calls[0][1] as string;
    expect(action.startsWith("ambience-set:")).toBe(true);
    const payload = JSON.parse(Buffer.from(action.slice("ambience-set:".length), "base64url").toString());
    expect(payload).toMatchObject({ enabled: true, open: "show-if-tv" });
    expect(mocks.transact).toHaveBeenCalled();
  });

  it("weigert een andere herkomst en wie niet aangemeld is", async () => {
    const evil = new NextRequest("https://shoppinglist-azure.vercel.app/api/tv/ambience", { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" });
    expect((await ambienceViaPi(evil, { action: "status" }))?.status).toBe(403);
    mocks.verify.mockResolvedValue(null);
    expect((await ambienceViaPi(request({ action: "status" }), { action: "status" }))?.status).toBe(401);
  });
});

describe("ambienceSetAction", () => {
  it("is URL-veilig en kort genoeg voor de wachtrij", () => {
    const action = ambienceSetAction({ enabled: true, calibrating: false, mask: DEFAULT_MASK }, "push");
    expect(action).toMatch(/^ambience-set:[A-Za-z0-9_-]+$/);
    expect(action.length).toBeLessThan(1500);
  });
});
