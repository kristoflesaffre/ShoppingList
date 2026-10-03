import { NextResponse } from "next/server";
import { listStaticImageFiles } from "@/lib/server/static-image-files";

export async function GET() {
  try {
    const files = (await listStaticImageFiles("ingredients")).map((f) => f.name);
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
              .replace(/[̀-ͯ]/g, ""),
          ),
      ),
    );
    return NextResponse.json(slugs);
  } catch {
    return NextResponse.json([]);
  }
}
