import { describe, expect, it } from "vitest";
import {
  sealGoogleAuth,
  sealGoogleOAuthState,
  unsealGoogleAuth,
  unsealGoogleOAuthState,
} from "@/lib/google-dashboard-auth";

const secret = "a-local-test-secret-that-is-long-enough";

describe("Google dashboard OAuth cookies", () => {
  it("versleutelt de token samen met de appgebruiker", () => {
    const payload = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 1_900_000_000_000,
      ownerId: "instant-user-1",
    };

    expect(unsealGoogleAuth(sealGoogleAuth(payload, secret), secret)).toEqual(
      payload,
    );
  });

  it("weigert een token die met een andere sleutel werd versleuteld", () => {
    const sealed = sealGoogleAuth(
      {
        accessToken: "access-token",
        expiresAt: 1_900_000_000_000,
        ownerId: "instant-user-1",
      },
      secret,
    );
    const decoded = unsealGoogleAuth(sealed, secret);
    expect(decoded?.ownerId).toBe("instant-user-1");
    expect(unsealGoogleAuth(sealed, "wrong-secret")).toBeNull();
  });

  it("bewaart state en gebruiker samen tegen callback-manipulatie", () => {
    const payload = { state: "random-state", ownerId: "instant-user-1" };

    expect(
      unsealGoogleOAuthState(sealGoogleOAuthState(payload, secret), secret),
    ).toEqual(payload);
  });
});
