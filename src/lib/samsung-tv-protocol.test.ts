import { describe, expect, it } from "vitest";
import { dialScreenId, encodeTextFrame, formatYoutubeDuration, isYoutubeVideoId, magicPacket, parseFrames, parseLoungeBind } from "./samsung-tv-protocol";

describe("Samsung TV protocol helpers", () => {
  it("accepts only real YouTube video ids", () => {
    expect(isYoutubeVideoId("5uY3OMRulVo")).toBe(true);
    for (const v of ["5uY3OMRulV", "5uY3OMRulVo1", "5uY3OMRul/o", "", null, 42]) expect(isYoutubeVideoId(v)).toBe(false);
  });
  it("builds a 102-byte Wake-on-LAN packet", () => {
    const packet = magicPacket("a4:30:7a:32:47:51");
    expect(packet.length).toBe(102);
    expect(Array.from(packet.subarray(0, 6))).toEqual([255, 255, 255, 255, 255, 255]);
    expect(packet.subarray(96).toString("hex")).toBe("a4307a324751");
    expect(() => magicPacket("zz:30:7a:32:47:51")).toThrow();
  });
  it("masks client frames and reads server frames back", () => {
    const mask = Buffer.from([1, 2, 3, 4]);
    const frame = encodeTextFrame("hallo", mask);
    expect(frame[0]).toBe(0x81);
    expect(frame[1]).toBe(0x80 | 5);
    const unmasked = Buffer.from(Array.from(frame.subarray(6)).map((b, i) => b ^ mask[i % 4])).toString();
    expect(unmasked).toBe("hallo");
    const long = "x".repeat(300);
    expect(encodeTextFrame(long, mask).length).toBe(4 + 4 + 300);
    const server = Buffer.concat([Buffer.from([0x81, 3]), Buffer.from("abc"), Buffer.from([0x81, 126, 1, 44]), Buffer.from(long), Buffer.from([0x81, 5, 0x61])]);
    const { texts, rest, closed } = parseFrames(server);
    expect(texts).toEqual(["abc", long]);
    expect(rest.length).toBe(3);
    expect(closed).toBe(false);
    expect(parseFrames(Buffer.from([0x88, 0])).closed).toBe(true);
  });
  it("parses the Lounge bind response and DIAL screen id", () => {
    expect(parseLoungeBind('123\n[[0,["c","SID1","",8]],[1,["S","GS1"]]]')).toEqual({ sid: "SID1", gsessionid: "GS1" });
    expect(parseLoungeBind("[]")).toBeNull();
    expect(dialScreenId("<x><screenId>abc123</screenId></x>")).toBe("abc123");
    expect(dialScreenId("<x/>")).toBeNull();
  });
  it("formats YouTube durations", () => {
    expect(formatYoutubeDuration("PT10H2M5S")).toBe("10:02:05");
    expect(formatYoutubeDuration("PT4M5S")).toBe("4:05");
    expect(formatYoutubeDuration("P1DT1H")).toBe("25:00:00");
    expect(formatYoutubeDuration("P0D")).toBe("Live");
    expect(formatYoutubeDuration(undefined)).toBeNull();
  });
});
