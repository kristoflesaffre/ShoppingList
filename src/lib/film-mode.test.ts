import { afterEach, expect, it, vi } from "vitest";
import { filmMessage, runFilmMode } from "./film-mode";

type Call = { path: string; body: Record<string, unknown> };
function stubFetch(replies: Record<string, { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : {} });
    const reply = replies[path] ?? { status: 500, json: {} };
    return new Response(JSON.stringify(reply.json), { status: reply.status ?? 200 });
  }));
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

const ok = {
  "/api/projector": { json: { configured: true, accepted: true } },
  "/api/broadlink": { json: { accepted: true } },
  "/api/hue/scene": { json: { ok: true } },
  "/api/hue/rooms": { json: { rooms: [{ id: "a", name: "Keuken" }, { id: "b", name: "Woonkamer" }] } },
  "/api/hue/light": { json: { ok: true } },
};

it("starts with one guarded Pi command and no local screen or scene fallback", async () => {
  const calls = stubFetch(ok);
  expect(await runFilmMode(true, "t")).toEqual({ projector: true, screen: true, light: true });
  expect(calls.map((c) => c.path)).toEqual(["/api/projector"]);
  expect(calls[0].body).toEqual({ action: "cinema" });
});

it("stops: projector off, screen down, living room at 20 %", async () => {
  const calls = stubFetch(ok);
  expect(await runFilmMode(false, "t")).toEqual({ projector: true, screen: true, light: true });
  expect(calls.find((c) => c.path === "/api/projector")?.body).toEqual({ action: "off" });
  expect(calls.find((c) => c.path === "/api/broadlink")?.body).toEqual({ action: "down", projector: false });
  expect(calls.find((c) => c.path === "/api/hue/light")?.body).toEqual({ id: "b", on: true, brightness: 20 });
});

it("fails closed without local fallback or retries when the Pi rejects cinema", async () => {
  const calls = stubFetch({ ...ok, "/api/projector": { status: 503, json: { error: "bridge-offline" } } });
  const result = await runFilmMode(true, "t");
  expect(result).toEqual({ projector: false, screen: false, light: false });
  expect(calls).toHaveLength(1);
  expect(filmMessage(true, result)).toBe("Niets bevestigd. Controleer projector, scherm en licht voor je opnieuw probeert.");
});

it("does not dim a room it cannot find", async () => {
  const calls = stubFetch({ ...ok, "/api/hue/rooms": { json: { rooms: [{ id: "a", name: "Keuken" }] } } });
  expect((await runFilmMode(false, "t")).light).toBe(false);
  expect(calls.some((c) => c.path === "/api/hue/light")).toBe(false);
});

it("summarises a full success", () => {
  expect(filmMessage(false, { projector: true, screen: true, light: true })).toBe("Film gestopt: projector uit, scherm omlaag, woonkamer op 20 %.");
});
