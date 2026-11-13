import { describe, expect, it, vi } from "vitest";
import { parseScenePeople } from "./xray-scene";

vi.mock("./cinema-companion", () => ({ current: vi.fn(), getData: vi.fn(), putData: vi.fn() }));
vi.mock("./projector-relay", () => ({ enqueueProjector: vi.fn(), ownerBridge: vi.fn() }));
vi.mock("./cinema-xray", () => ({ gemini: vi.fn(), identify: vi.fn(), titleInfo: vi.fn() }));


const cast = [
  { name: "Gary Oldman", character: "Jackson Lamb", profileUrl: "/a.jpg" },
  { name: "Jack Lowden", character: "River Cartwright", profileUrl: "/b.jpg" },
  { name: "Saskia Reeves", character: "Catherine Standish", profileUrl: null },
];

describe("parseScenePeople", () => {
  it("houdt enkel mensen uit de cast, op naam of personage, gesorteerd van links naar rechts", () => {
    const text = JSON.stringify({ people: [
      { actor: "Jack Lowden", character: "River", position: "rechts" },
      { actor: "Someone Else", character: "Mystery", position: "midden" },
      { actor: "", character: "jackson lamb", position: "links" },
      { actor: "Gary Oldman", character: "Jackson Lamb", position: "links" },
    ] });
    expect(parseScenePeople(text, cast).map(p => [p.name, p.position])).toEqual([["Gary Oldman", "links"], ["Jack Lowden", "rechts"]]);
  });
  it("aanvaardt ook een losse lijst en een onbekende plaats", () => {
    expect(parseScenePeople(JSON.stringify([{ actor: "Saskia Reeves", position: "boven" }]), cast)).toEqual([{ ...cast[2], position: "midden" }]);
  });
  it("weigert iets dat geen JSON is", () => {
    expect(() => parseScenePeople("Gary Oldman", cast)).toThrow("invalid-ai-output");
    expect(() => parseScenePeople("{\"x\":1}", cast)).toThrow("invalid-ai-output");
  });
});
