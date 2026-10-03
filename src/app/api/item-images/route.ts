import { NextResponse } from "next/server";
import {
  listStaticImageFiles,
  type StaticImageDir,
} from "@/lib/server/static-image-files";

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
  prefix: StaticImageDir,
): Promise<{ slugs: string[]; versions: Record<string, number> }> {
  try {
    const files = await listStaticImageFiles(prefix);
    const slugs = new Set<string>();
    const versions: Record<string, number> = {};

    for (const { name: f, version } of files.filter((file) =>
      /\.(jpe?g|png|webp)$/i.test(file.name),
    )) {
      slugs.add(`${prefix}/${f.replace(/\.[^.]+$/, "")}`);
      const key = slugKeyFromFilename(f);
      if (!key) continue;
      versions[key] = Math.max(versions[key] ?? 0, version);
    }

    return { slugs: Array.from(slugs), versions };
  } catch {
    return { slugs: [], versions: {} };
  }
}

export async function GET() {
  const [items, vakantie] = await Promise.all([
    listDir("items"),
    listDir("vakantie"),
  ]);
  const versions = { ...items.versions, ...vakantie.versions };
  // Vakantie-/Landal-assets achteraan zodat ze reguliere items kunnen overschrijven bij zelfde naam
  return NextResponse.json({
    slugs: [...items.slugs, ...vakantie.slugs],
    versions,
  });
}
