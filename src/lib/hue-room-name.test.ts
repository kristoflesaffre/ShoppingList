import { describe, expect, it } from "vitest";
import { splitRoomName } from "@/lib/hue-room-name";

describe("splitRoomName", () => {
  it("zet de verdieping om in een nummer", () => {
    expect(splitRoomName("Badkamer eerste verdieping")).toEqual({ base: "Badkamer", badge: { kind: "number", value: "1" } });
    expect(splitRoomName("Badkamer tweede verdieping")).toEqual({ base: "Badkamer", badge: { kind: "number", value: "2" } });
    expect(splitRoomName("Badkamer 1e verdieping")).toEqual({ base: "Badkamer", badge: { kind: "number", value: "1" } });
    expect(splitRoomName("Badkamer 2de verdieping")).toEqual({ base: "Badkamer", badge: { kind: "number", value: "2" } });
    expect(splitRoomName("Badkamer (verdieping 2)")).toEqual({ base: "Badkamer", badge: { kind: "number", value: "2" } });
    expect(splitRoomName("Badkamer 1")).toEqual({ base: "Badkamer", badge: { kind: "number", value: "1" } });
  });

  it("zet boven/beneden om in een pijl", () => {
    expect(splitRoomName("Gang boven")).toEqual({ base: "Gang", badge: { kind: "up" } });
    expect(splitRoomName("Gang beneden")).toEqual({ base: "Gang", badge: { kind: "down" } });
    expect(splitRoomName("Gang bovenverdieping")).toEqual({ base: "Gang", badge: { kind: "up" } });
    expect(splitRoomName("Hal gelijkvloers")).toEqual({ base: "Hal", badge: { kind: "down" } });
  });

  it("laat gewone namen staan", () => {
    expect(splitRoomName("Gastenkamer")).toEqual({ base: "Gastenkamer", badge: null });
    expect(splitRoomName("Bureau")).toEqual({ base: "Bureau", badge: null });
    expect(splitRoomName("Boven")).toEqual({ base: "Boven", badge: null });
  });
});
