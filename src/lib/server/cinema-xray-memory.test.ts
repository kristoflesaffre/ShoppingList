import { describe, expect, it } from "vitest";
import { HI_NAME, memoryText, parseMemory, sdhShare } from "./cinema-xray";
import type { Cue } from "../cinema-companion";

const cue = (text: string, speaker: string | null = null): Cue => ({ id: "cue-0", startMs: 0, endMs: 1000, text, speaker });

describe("HI_NAME", () => {
  it("herkent ondertitels voor doven en slechthorenden aan de bestandsnaam", () => {
    expect(HI_NAME.test("Mayor.of.Kingstown.S01E04.REMUX-FraMeSToR-HI.srt")).toBe(true);
    expect(HI_NAME.test("Show.S01E01.WEB.sdh.srt")).toBe(true);
    expect(HI_NAME.test("Show.S01E01.Hearing.Impaired.srt")).toBe(true);
  });
  it("ziet gewone namen niet als SDH", () => {
    expect(HI_NAME.test("Mayor.of.Kingstown.S01E04.1080p.WEB.H264-GGEZ.srt")).toBe(false);
    expect(HI_NAME.test("Hitman.S01E01.srt")).toBe(false);
  });
});

describe("sdhShare", () => {
  it("telt regels met een spreker of een geluid", () => {
    expect(sdhShare([cue("[gunshot]"), cue("Hello", "MIKE"), cue("Hi"), cue("Bye")])).toBe(0.5);
    expect(sdhShare([])).toBe(0);
  });
});

describe("parseMemory", () => {
  it("leest het geheugen van een aflevering en maakt er tekst van", () => {
    const m = parseMemory('```json\n{"story":"Mike zoekt Iris.","ending":"Iris vlucht.","people":[{"name":"Iris","note":"op de vlucht"},{"name":""}],"open":["Waar is Iris?"]}\n```');
    expect(m).toEqual({ story: "Mike zoekt Iris.", ending: "Iris vlucht.", people: [{ name: "Iris", note: "op de vlucht" }], open: ["Waar is Iris?"] });
    expect(memoryText(m!)).toBe("Mike zoekt Iris.\nEinde: Iris vlucht.\nWie: Iris (op de vlucht)\nOpen: Waar is Iris?");
  });
  it("geeft niets terug zonder verhaal of bij ongeldige JSON", () => {
    expect(parseMemory('{"story":""}')).toBeNull();
    expect(parseMemory("geen json")).toBeNull();
  });
});
