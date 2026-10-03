import { promises as fs } from "node:fs";
import path from "node:path";
import type { ReferenceImageInput } from "@/lib/image-generation/types";
import { STATIC_IMAGES_BASE_URL } from "@/lib/static-images";

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

/** Lokaal van schijf; in productie van Blob (map zit niet in de deployment). */
async function readReferenceImage(abs: string, fileName: string): Promise<Buffer> {
  try {
    return await fs.readFile(abs);
  } catch {
    const res = await fetch(
      `${STATIC_IMAGES_BASE_URL}/images/reference_images/${fileName}`,
    );
    if (!res.ok) throw new Error(`Referentiebeeld ${fileName} niet gevonden.`);
    return Buffer.from(await res.arrayBuffer());
  }
}

export async function loadReferenceImages(): Promise<ReferenceImageInput[]> {
  const baseDir = path.join(process.cwd(), "public", "images", "reference_images");
  const refs: ReferenceImageInput[] = [];

  for (const fileName of REFERENCE_FILES) {
    const bytes = await readReferenceImage(path.join(baseDir, fileName), fileName);
    refs.push({
      fileName,
      mimeType: mimeTypeFromFileName(fileName),
      bytes,
    });
  }

  return refs;
}
