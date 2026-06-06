import { readdir, stat } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

function slugKeyFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/_(160|240|320)$/i, "");
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function listDir(
  dir: string,
  prefix: string,
): Promise<{ slugs: string[]; versions: Record<string, number> }> {
  try {
    const files = await readdir(dir);
    const slugs = new Set<string>();
    const versions: Record<string, number> = {};

    for (const f of files.filter((file) => /\.(jpe?g|png|webp)$/i.test(file))) {
      slugs.add(`${prefix}/${f.replace(/\.[^.]+$/, "")}`);
      const key = slugKeyFromFilename(f);
      if (!key) continue;
      try {
        const mtime = Math.floor((await stat(join(dir, f))).mtimeMs / 1000);
        versions[key] = Math.max(versions[key] ?? 0, mtime);
      } catch {
        /* ignore */
      }
    }

    return { slugs: Array.from(slugs), versions };
  } catch {
    return { slugs: [], versions: {} };
  }
}

export async function GET() {
  const [items, vakantie] = await Promise.all([
    listDir(join(process.cwd(), "public/images/items"), "items"),
    listDir(join(process.cwd(), "public/images/vakantie"), "vakantie"),
  ]);
  const versions = { ...items.versions, ...vakantie.versions };
  // Vakantie-/Landal-assets achteraan zodat ze reguliere items kunnen overschrijven bij zelfde naam
  return NextResponse.json({
    slugs: [...items.slugs, ...vakantie.slugs],
    versions,
  });
}
