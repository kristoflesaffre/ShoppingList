import { readdir } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const dir = join(process.cwd(), "public/images/ingredients");
  try {
    const files = await readdir(dir);
    // Strip size suffix (_160, _240, _320) and extension, return unique base slugs
    const slugs = Array.from(
      new Set(
        files
          .filter((f) => /\.(webp|jpe?g|png)$/i.test(f))
          .map((f) =>
            f
              .replace(/\.[^.]+$/, "")
              .replace(/_\d+$/, "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
          ),
      ),
    );
    return NextResponse.json(slugs);
  } catch {
    return NextResponse.json([]);
  }
}
