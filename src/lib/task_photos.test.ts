import { describe, expect, it } from "vitest";
import { taskPhotoFor } from "./task_photos";

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

  it("returns null for other tasks", () => {
    expect(taskPhotoFor("Cadeau kopen voor Huub")).toBeNull();
  });
});
