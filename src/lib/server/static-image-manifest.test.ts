import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import manifest from "@/lib/data/static-image-manifest.json";

// Deze mappen zitten niet in de deployment; de server leest het manifest.
// Faalt deze test, draai dan `npm run sync:images` en commit het manifest.
describe("static-image-manifest", () => {
  for (const dir of Object.keys(manifest) as (keyof typeof manifest)[]) {
    it(`bevat alle bestanden in public/images/${dir}`, () => {
      const tracked = execFileSync(
        "git",
        ["-c", "core.quotePath=false", "ls-files", "--", `public/images/${dir}/`],
        { encoding: "utf8" },
      )
        .split("\n")
        .filter(Boolean)
        .map((f) => f.slice(`public/images/${dir}/`.length))
        .filter((f) => !f.includes("/"))
        .sort();
      expect(Object.keys(manifest[dir]).sort()).toEqual(tracked);
    });
  }
});
