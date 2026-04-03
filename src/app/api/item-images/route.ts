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
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
      );
    return NextResponse.json(slugs);
  } catch {
    return NextResponse.json([]);
  }
}
