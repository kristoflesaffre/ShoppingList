import { describe, expect, it } from "vitest";
import { findStepDurations, formatRemaining, parseStoredTimers } from "./recipe-timers";

const labels = (text: string) => findStepDurations(text).map((d) => d.label);

describe("findStepDurations", () => {
  it("herkent minuten, uren en seconden", () => {
    expect(labels("Laat 20 minuten zachtjes sudderen.")).toEqual(["20 min"]);
    expect(labels("Bak 5 min aan elke kant.")).toEqual(["5 min"]);
    expect(labels("Laat 2 uur rijzen.")).toEqual(["2 u"]);
    expect(labels("Mix 30 seconden.")).toEqual(["30 sec"]);
    expect(labels("Kook 1,5 uur.")).toEqual(["1 u 30 min"]);
  });

  it("telt «1 uur en 15 minuten» als één tijd", () => {
    expect(labels("Stoof 1 uur en 15 minuten op een laag vuur.")).toEqual(["1 u 15 min"]);
  });

  it("neemt bij een bereik de kortste tijd", () => {
    expect(labels("Bak 20 à 25 minuten in de oven.")).toEqual(["20 min"]);
    expect(labels("Kook 8-10 min.")).toEqual(["8 min"]);
  });

  it("herkent woorden als kwartier en half uur", () => {
    expect(labels("Laat een kwartier rusten.")).toEqual(["15 min"]);
    expect(labels("Zet een half uur in de koelkast.")).toEqual(["30 min"]);
    expect(labels("Bak anderhalf uur.")).toEqual(["1 u 30 min"]);
  });

  it("geeft meerdere tijden in volgorde, zonder dubbels", () => {
    expect(labels("Bak 5 minuten, voeg de room toe en laat nog 10 minuten koken. Daarna 5 minuten rusten.")).toEqual(["5 min", "10 min"]);
  });

  it("negeert getallen die geen tijd zijn", () => {
    expect(labels("Verwarm de oven voor op 180 °C en gebruik 2 eieren.")).toEqual([]);
    expect(labels("Snij in stukken van 2 cm.")).toEqual([]);
  });
});

describe("formatRemaining", () => {
  it("toont minuten en seconden, en uren vanaf een uur", () => {
    expect(formatRemaining(872_000)).toBe("14:32");
    expect(formatRemaining(3_725_000)).toBe("1:02:05");
    expect(formatRemaining(-5_000)).toBe("0:00");
    expect(formatRemaining(400)).toBe("0:01");
  });
});

describe("parseStoredTimers", () => {
  it("houdt enkel geldige wekkers over", () => {
    const ok = { id: "2-1200000", stepIndex: 2, durationMs: 1_200_000, label: "20 min", endsAt: 1 };
    expect(parseStoredTimers(JSON.stringify([ok, { id: 3 }, null]))).toEqual([ok]);
    expect(parseStoredTimers("geen json")).toEqual([]);
    expect(parseStoredTimers(null)).toEqual([]);
  });
});
