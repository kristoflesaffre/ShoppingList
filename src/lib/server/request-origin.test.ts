import { describe, expect, it } from "vitest";
import { requestOrigin } from "./request-origin";

const request = (url: string, host?: string) =>
  ({ headers: new Headers(host ? { host } : {}), nextUrl: new URL(url) }) as unknown as Parameters<typeof requestOrigin>[0];

describe("requestOrigin", () => {
  it("volgt de Host-header van de browser achter de lokale proxy", () => {
    expect(requestOrigin(request("https://localhost:3012/api/todoist/status", "localhost:3011"))).toBe("https://localhost:3011");
  });

  it("valt terug op nextUrl zonder (geldige) Host-header", () => {
    expect(requestOrigin(request("https://localhost:3012/x"))).toBe("https://localhost:3012");
    expect(requestOrigin(request("https://localhost:3012/x", "bad host/"))).toBe("https://localhost:3012");
  });
});
