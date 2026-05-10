import { readdir } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

async function listDir(dir: string, prefix: string): Promise<string[]> {
  try {
    const files = await readdir(dir);
    return Array.from(
      new Set(
        files
          .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
          .map((f) => `${prefix}/${f.replace(/\.[^.]+$/, "")}`),
      ),
    );
  } catch {
    return [];
  }
}

export async function GET() {
  const [items, landal] = await Promise.all([
    listDir(join(process.cwd(), "public/images/items"), "items"),
    listDir(join(process.cwd(), "public/images/landal"), "landal"),
  ]);
  // Landal achteraan zodat het reguliere items kan overschrijven bij zelfde naam
  return NextResponse.json([...items, ...landal]);
}
