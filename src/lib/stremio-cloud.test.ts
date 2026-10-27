import { afterEach, expect, it, vi } from "vitest";
import { clearStremioCache, loginStremio, readStremioProgress } from "./server/stremio-cloud";
afterEach(() => { vi.unstubAllGlobals(); clearStremioCache(); });
it("uses only fixed HTTPS login/read endpoints and coalesces reads", async () => {
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify({ result: url.endsWith("login") ? { authKey: "a".repeat(32) } : [] })));
  vi.stubGlobal("fetch", fetcher);
  const authKey = await loginStremio("test@example.com", "not-stored");
  const session = { ownerId: "owner", authKey };
  await Promise.all([readStremioProgress(session), readStremioProgress(session)]);
  await readStremioProgress(session);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls.map(x => x[0])).toEqual(["https://api.strem.io/api/login", "https://api.strem.io/api/datastoreGet"]);
  expect(JSON.parse((fetcher.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ authKey, collection: "libraryItem", ids: [], all: true });
});
it("does not share snapshots between accounts or sessions", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ result: [] })));
  vi.stubGlobal("fetch", fetcher);
  await readStremioProgress({ ownerId: "one", authKey: "a" });
  await readStremioProgress({ ownerId: "two", authKey: "a" });
  await readStremioProgress({ ownerId: "one", authKey: "b" });
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("sanitizes upstream errors and never caches failed reads", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { message: "sensitive detail", code: 1 } })));
  vi.stubGlobal("fetch", fetcher);
  await expect(loginStremio("test@example.com", "secret")).rejects.toThrow("login-failed");
  await expect(readStremioProgress({ ownerId: "one", authKey: "a" })).rejects.toThrow("session-expired");
  await expect(readStremioProgress({ ownerId: "one", authKey: "a" })).rejects.toThrow("session-expired");
  expect(fetcher).toHaveBeenCalledTimes(3);
});
