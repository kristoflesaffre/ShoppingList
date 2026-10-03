import { promises as fs } from "node:fs";
import path from "node:path";
import type { ReferenceImageInput } from "@/lib/image-generation/types";

const REFERENCE_FILES = [
  "reference_image_1.png",
  "reference_image_2.png",
  "reference_image_3.png",
  "reference_image_4.png",
] as const;

function mimeTypeFromFileName(fileName: string): string {
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function loadReferenceImages(): Promise<ReferenceImageInput[]> {
  const baseDir = path.join(process.cwd(), "public", "images", "reference_images");
  const refs: ReferenceImageInput[] = [];

  for (const fileName of REFERENCE_FILES) {
    const abs = path.join(baseDir, fileName);
    const bytes = await fs.readFile(abs);
    refs.push({
      fileName,
      mimeType: mimeTypeFromFileName(fileName),
      bytes,
    });
  }

  return refs;
}
