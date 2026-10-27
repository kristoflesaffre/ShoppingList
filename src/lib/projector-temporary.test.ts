import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { privateIpv4, temporaryProjectorHost } from "./server/projector-temporary";
afterEach(() => vi.unstubAllEnvs());
function request(host: string) { return new NextRequest(`http://${host}/api/projector`, { headers: { host } }); }
it("does not open LAN access without an explicit temporary origin", () => {
  vi.stubEnv("PROJECTOR_LOCAL_ORIGIN", "");
  expect(temporaryProjectorHost(request("192.168.132.183:3000"))).toBe(false);
});
it("permits only the exact configured LAN origin and loopback", () => {
  vi.stubEnv("PROJECTOR_LOCAL_ORIGIN", "http://192.168.132.183:3000");
  expect(temporaryProjectorHost(request("192.168.132.183:3000"))).toBe(true);
  expect(temporaryProjectorHost(request("localhost:3000"))).toBe(true);
  expect(temporaryProjectorHost(request("192.168.132.184:3000"))).toBe(false);
  expect(temporaryProjectorHost(request("192.168.132.183:3001"))).toBe(false);
  expect(temporaryProjectorHost(request("example.com"))).toBe(false);
});
it("never enables temporary access on Netlify or for public targets", () => {
  vi.stubEnv("PROJECTOR_LOCAL_ORIGIN", "http://192.168.132.183:3000");
  vi.stubEnv("NETLIFY", "true");
  expect(temporaryProjectorHost(request("192.168.132.183:3000"))).toBe(false);
  expect(privateIpv4("8.8.8.8")).toBe(false);
  expect(privateIpv4("192.168.1.300")).toBe(false);
});
