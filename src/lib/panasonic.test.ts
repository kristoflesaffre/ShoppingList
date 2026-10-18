import { describe, expect, it } from "vitest";
import { acParameters } from "./panasonic";
import { sealPanasonic, unsealPanasonic, panasonicConnectionId } from "./server/panasonic-session.mjs";
import { mapPanasonicDevice, panasonicHeaders } from "./server/panasonic-cloud";
const session = { ownerId: "owner", accessToken: "access", refreshToken: "refresh", clientId: "client", expiresAt: 123456, version: "1.25.0", scope: "comfortcloud.control" };
describe("Panasonic command allowlist", () => {
  it("does not implicitly power on when changing temperature or fan", () => {
    expect(acParameters({ deviceId: "living", temperature: 21.5 })?.parameters).toEqual({ temperatureSet: 21.5 });
    expect(acParameters({ deviceId: "living", fan: "high" })?.parameters).toEqual({ fanSpeed: 5 });
  });
  it("maps only explicit power and protocol enums", () => {
    expect(acParameters({ deviceId: "living", power: false })?.parameters).toEqual({ operate: 0 });
    expect(acParameters({ deviceId: "living", power: true, mode: "heat" })?.parameters).toEqual({ operate: 1, operationMode: 3 });
  });
  it.each([null, [], {}, { deviceId: "x" }, { deviceId: "x", power: 1 }, { deviceId: "x", temperature: 100 }, { deviceId: "x", temperature: 20.2 }, { deviceId: "x", temperature: NaN }, { deviceId: "x", mode: "toString" }, { deviceId: "x", mode: "invalid" }, { deviceId: "x", fan: "__proto__" }, { deviceId: "x", parameters: { operate: 1 } }])("rejects invalid commands %j", raw => expect(acParameters(raw)).toBeNull());
});
describe("private Panasonic sessions", () => {
  const secret = "s".repeat(48);
  it("encrypts and binds credentials to their owner", () => {
    const sealed = sealPanasonic(session, secret);
    expect(sealed).not.toContain("refresh");
    expect(unsealPanasonic(sealed, secret, "owner")).toEqual(session);
    expect(unsealPanasonic(sealed, secret, "another")).toBeNull();
    expect(unsealPanasonic(sealed, "x".repeat(48), "owner")).toBeNull();
    expect(unsealPanasonic(sealed.slice(0, -8), secret, "owner")).toBeNull();
  });
  it("uses random nonces and rejects missing encryption configuration", () => {
    expect(sealPanasonic(session, secret)).not.toEqual(sealPanasonic(session, secret));
    expect(() => sealPanasonic(session, "")).toThrow();
    expect(panasonicConnectionId("owner")).toEqual(panasonicConnectionId("owner"));
    expect(panasonicConnectionId("owner")).not.toEqual(panasonicConnectionId("other"));
  });
});
describe("status normalization", () => {
  const device = { deviceGuid: "device", deviceName: " Leefruimte ", parameters: {} };
  it("maps readings and supported modes without leaking the session", () => {
    const result = mapPanasonicDevice(device, { heatMode: false, parameters: { operate: 0, temperatureSet: 19, insideTemperature: 21, operationMode: 2, fanSpeed: 5 } });
    expect(result).toMatchObject({ name: "Leefruimte", available: true, on: false, mode: "cool", fan: "high", targetTemperature: 19, insideTemperature: 21 });
    expect(result.modes).not.toContain("heat");
  });
  it("does not invent fresh state for unreachable units or invalid temperatures", () => {
    expect(mapPanasonicDevice(device, null)).toMatchObject({ available: false, on: null, insideTemperature: null });
    expect(mapPanasonicDevice(device, { parameters: { insideTemperature: 126, temperatureSet: -255 } }).insideTemperature).toBeNull();
  });
  it("uses the upstream timestamp/signature format", () => {
    const h = panasonicHeaders(session, new Date("2026-10-18T17:01:02.123Z"));
    expect(h["x-app-timestamp"]).toBe("2026-10-18 17:01:02");
    expect(h["x-cfc-api-key"]).toMatch(/^[a-f0-9]{9}cfc[a-f0-9]{55}$/);
    expect(h["x-client-id"]).toBe("client");
  });
});
