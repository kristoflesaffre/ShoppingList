import { readFile } from "fs/promises";
import { join } from "path";
import { normalizeForMatch } from "@/lib/item-photo-matching";
import {
  listStaticImageFiles,
  type StaticImageDir,
} from "@/lib/server/static-image-files";

async function listImageBases(dir: StaticImageDir): Promise<string[]> {
  try {
    const files = (await listStaticImageFiles(dir)).map((f) => f.name);
    return Array.from(
      new Set(
        files
          .filter((file) => /\.(webp|jpe?g|png)$/i.test(file))
          .map((file) =>
            file
              .replace(/\.[^.]+$/, "")
              .replace(/_(160|240|320)$/i, ""),
          ),
      ),
    ).sort();
  } catch {
    return [];
  }
}

export async function loadItemImageSlugs(): Promise<string[]> {
  const [items, vakantie] = await Promise.all([
    listImageBases("items"),
    listImageBases("vakantie"),
  ]);
  return Array.from(
    new Set([...items, ...vakantie].map(normalizeForMatch).filter(Boolean)),
  ).sort();
}

export async function loadIngredientImageSlugs(): Promise<string[]> {
  const rawBases = await listImageBases("ingredients");
  return Array.from(
    new Set(
      rawBases
        .map((base) =>
          base
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
        )
        .filter(Boolean),
    ),
  ).sort();
}

export async function loadIngredientSynonyms(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(
      join(process.cwd(), "public/ingredient-synonyms.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const synonyms: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("_") || typeof value !== "string") continue;
      synonyms[normalizeForMatch(key)] = value;
    }
    return synonyms;
  } catch {
    return {};
  }
}
