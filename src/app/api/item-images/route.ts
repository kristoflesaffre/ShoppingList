import { readdir } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const dir = join(process.cwd(), "public/images/items");
  try {
    const files = await readdir(dir);
    const slugs = files
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) =>
        f
          .replace(/\.[^.]+$/, "")
          .replace(/_(160|240|320)$/i, "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
      );
    return NextResponse.json(Array.from(new Set(slugs)).sort());
  } catch {
    return NextResponse.json([]);
  }
}
