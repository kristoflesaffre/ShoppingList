import { expect, it } from "vitest";
import { sealStremio, stremioConnectionId, unsealStremio } from "./server/stremio-session";
it("encrypts sessions with owner binding and random IVs", () => {
  const secret = "s".repeat(40), session = { ownerId: "owner", authKey: "private-token".repeat(3) };
  const sealed = sealStremio(session, secret);
  expect(sealed).not.toContain(session.authKey);
  expect(unsealStremio(sealed, secret, "owner")).toEqual(session);
  expect(sealStremio(session, secret)).not.toBe(sealed);
  expect(unsealStremio(sealed, secret, "other")).toBeNull();
  expect(unsealStremio(sealed, "x".repeat(40), "owner")).toBeNull();
  expect(unsealStremio(sealed.slice(5), secret, "owner")).toBeNull();
  expect(() => sealStremio(session, "short")).toThrow();
  expect(stremioConnectionId("owner")).not.toBe(stremioConnectionId("other"));
});
