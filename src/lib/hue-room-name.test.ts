import { describe, expect, it } from "vitest";
import { splitRoomNumber } from "@/lib/hue-room-name";

describe("splitRoomNumber", () => {
  it("haalt het nummer achteraan los van de naam", () => {
    expect(splitRoomNumber("Badkamer 1")).toEqual({ base: "Badkamer", number: "1" });
    expect(splitRoomNumber("Badkamer (2)")).toEqual({ base: "Badkamer", number: "2" });
    expect(splitRoomNumber("Kamer2")).toEqual({ base: "Kamer", number: "2" });
  });
  it("laat namen zonder nummer staan", () => {
    expect(splitRoomNumber("Gang boven")).toEqual({ base: "Gang boven", number: null });
    expect(splitRoomNumber("42")).toEqual({ base: "42", number: null });
  });
});
