import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("node:fs/promises", () => ({ readFile: vi.fn(async () => JSON.stringify({ ownerId: "owner", paired: true, enabled: true })) }));
import { wakeProjector } from "./server/projector-local";
const fetcher = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetcher); vi.stubEnv("PROJECTOR_ATOM_HOST", "192.168.132.177"); fetcher.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("uses the existing Atom endpoint once without claiming lamp status", async () => {
  fetcher.mockResolvedValue(new Response(null, { status: 200 }));
  expect(await wakeProjector("owner")).toMatchObject({ accepted: true, isOn: null });
  expect(fetcher).toHaveBeenCalledExactlyOnceWith("http://192.168.132.177/button/Wake%20projector/press", expect.objectContaining({ method: "POST", body: "", redirect: "manual" }));
});
it("does not send for another owner", async () => {
  expect(await wakeProjector("other")).toMatchObject({ accepted: false, error: "not-configured" });
  expect(fetcher).not.toHaveBeenCalled();
});
it("does not retry a timed out wake command", async () => {
  fetcher.mockRejectedValue(new Error("timeout"));
  expect(await wakeProjector("owner")).toMatchObject({ accepted: false });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("never calls LAN endpoints on a hosted runtime", async () => {
  vi.stubEnv("NETLIFY", "true");
  expect(await wakeProjector("owner")).toMatchObject({ accepted: false });
  expect(fetcher).not.toHaveBeenCalled();
});
