import { readdir, stat } from "fs/promises";
import { join } from "path";
import manifest from "@/lib/data/static-image-manifest.json";

export type StaticImageDir = keyof typeof manifest;

export type StaticImageFile = {
  name: string;
  /** Unix-seconden; gebruikt als cache-buster. */
  version: number;
};

/**
 * Bestanden in public/images/<dir>. Lokaal staan ze op schijf; in productie
 * zitten deze mappen niet in de deployment (ze staan op Blob) en valt dit
 * terug op het manifest dat `npm run sync:images` schrijft.
 */
export async function listStaticImageFiles(
  dir: StaticImageDir,
): Promise<StaticImageFile[]> {
  const abs = join(process.cwd(), "public/images", dir);
  try {
    const names = await readdir(abs);
    return Promise.all(
      names.map(async (name) => {
        let version = 0;
        try {
          version = Math.floor((await stat(join(abs, name))).mtimeMs / 1000);
        } catch {
          /* ignore */
        }
        return { name, version };
      }),
    );
  } catch {
    return Object.entries(manifest[dir] as Record<string, number>).map(
      ([name, version]) => ({ name, version }),
    );
  }
}
