import { describe, expect, it } from "vitest";
import { isRateLimited, retryRateLimited } from "@/lib/server/instant-admin";

describe("retryRateLimited", () => {
  it("probeert een geweigerd verzoek opnieuw", async () => {
    let calls = 0;
    const value = await retryRateLimited(async () => {
      calls++;
      if (calls < 3) throw new Error("Your request exceeded the rate limit.");
      return "ok";
    }, [0, 0]);
    expect(value).toBe("ok");
    expect(calls).toBe(3);
  });
  it("geeft na de laatste poging de fout door", async () => {
    let calls = 0;
    await expect(retryRateLimited(async () => { calls++; throw new Error("Your request exceeded the rate limit."); }, [0, 0])).rejects.toThrow(/rate limit/);
    expect(calls).toBe(3);
  });
  it("herhaalt andere fouten nooit", async () => {
    let calls = 0;
    await expect(retryRateLimited(async () => { calls++; throw new Error("validation failed"); }, [0, 0])).rejects.toThrow("validation failed");
    expect(calls).toBe(1);
    expect(isRateLimited(new Error("Your request exceeded the rate limit."))).toBe(true);
  });
});
