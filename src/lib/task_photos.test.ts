import { describe, expect, it } from "vitest";
import { taskPhotoFor } from "./task_photos";

describe("task photos", () => {
  it.each([
    ["Take medication: concerta 36mg", "concerta"],
    ["Take medication: cymbalta 60mg + 30mg", "cymbalta"],
    ["Diagnose: Perimenopause PMDD invullen", "cyclus_app"],
  ])("%s → %s", (title, file) => {
    expect(taskPhotoFor(title)).toBe(`/images/taken/${file}`);
  });

  it("returns null for other tasks", () => {
    expect(taskPhotoFor("Cadeau kopen voor Huub")).toBeNull();
  });
});
