import { describe, expect, it } from "vitest";
import { withRoutineLast, taskPhotoFor } from "./task_photos";

describe("task photos", () => {
  it.each([
    ["Take medication: concerta 36mg", "concerta"],
    ["Take medication: cymbalta 60mg + 30mg", "cymbalta"],
    ["Diagnose: Perimenopause PMDD invullen", "cyclus_app"],
  ])("%s → %s", (title, file) => {
    expect(taskPhotoFor(title)?.src).toBe(`/images/taken/${file}`);
  });

  it("shows the cycle app upright, the pills tilted", () => {
    expect(taskPhotoFor("Diagnose: Perimenopause PMDD invullen")?.upright).toBe(true);
    expect(taskPhotoFor("Take medication: concerta 36mg")?.upright).toBe(false);
  });

  it("adds the 30mg pill next to cymbalta only", () => {
    expect(taskPhotoFor("Take medication: cymbalta 60mg + 30mg")?.extra).toBe("/images/taken/cymbalta_30mg");
    expect(taskPhotoFor("Take medication: concerta 36mg")?.extra).toBeNull();
  });

  it("returns null for other tasks", () => {
    expect(taskPhotoFor("Cadeau kopen voor Huub")).toBeNull();
  });

  it("puts other to-dos first, then the pills, the cycle app always last", () => {
    const items = ["Diagnose: Perimenopause PMDD invullen", "Take medication: concerta 36mg", "Cadeau kopen", "Take medication: cymbalta 60mg + 30mg", "Bel de dokter"]
      .map((content) => ({ task: { content } }));
    expect(withRoutineLast(items).map((i) => i.task.content)).toEqual([
      "Cadeau kopen", "Bel de dokter", "Take medication: concerta 36mg", "Take medication: cymbalta 60mg + 30mg", "Diagnose: Perimenopause PMDD invullen",
    ]);
  });
});
