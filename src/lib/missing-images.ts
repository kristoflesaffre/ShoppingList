import { matchIngredientPhotoUrl } from "@/lib/ingredient-photo-matching";
import { matchItemPhotoUrl, normalizeForMatch } from "@/lib/item-photo-matching";

export type MissingImageSourceType =
  | "list-item"
  | "recipe-ingredient"
  | "recipe-photo";

export type MissingImageKind = "product" | "ingredient" | "recipe";

export type MissingImageReportInput = {
  ownerId?: string;
  sourceType: MissingImageSourceType;
  sourceId: string;
  sourceName: string;
  sourceKind?: string;
  itemName: string;
  normalizedName: string;
  imageKind: MissingImageKind;
  sourcePath?: string;
  occurrenceCount: number;
};

export type MissingImageReportRecord = MissingImageReportInput & {
  id: string;
  reportKey: string;
  active: boolean;
  firstSeenAtIso: string;
  lastSeenAtIso: string;
  resolvedAtIso?: string;
};

export type MissingImageListRow = {
  id: string;
  name?: string;
  ownerId?: string;
  isMasterTemplate?: boolean;
  items?: Array<{
    id: string;
    name?: string;
    stockPhotoUrl?: string | null;
    fromStock?: boolean | null;
  }>;
};

export type MissingImageRecipeRow = {
  id: string;
  name?: string;
  ownerId?: string;
  photoUrl?: string | null;
  ingredients?: Array<{
    id: string;
    name?: string;
    quantity?: string;
  }>;
};

export function missingImageReportKey(input: {
  sourceType: MissingImageSourceType;
  sourceId: string;
  imageKind: MissingImageKind;
  normalizedName: string;
}): string {
  return [
    input.sourceType,
    input.sourceId,
    input.imageKind,
    input.normalizedName,
  ].join(":");
}

export function missingImageReportIdFromKey(reportKey: string): string {
  const hashes = [2166136261, 2166136261, 2166136261, 2166136261];
  for (let i = 0; i < reportKey.length; i += 1) {
    const slot = i % hashes.length;
    hashes[slot] ^= reportKey.charCodeAt(i);
    hashes[slot] = Math.imul(hashes[slot], 16777619);
  }

  const hex = hashes
    .map((hash) => (hash >>> 0).toString(16).padStart(8, "0"))
    .join("")
    .slice(0, 32)
    .split("");

  // InstantDB entity ids moeten UUIDs zijn. Behoud determinisme via reportKey,
  // maar zet versie/variant bits zodat de string een geldige UUID-vorm heeft.
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);

  return [
    hex.slice(0, 8).join(""),
    hex.slice(8, 12).join(""),
    hex.slice(12, 16).join(""),
    hex.slice(16, 20).join(""),
    hex.slice(20, 32).join(""),
  ].join("-");
}

export function withMissingImageReportIdentity(
  input: MissingImageReportInput,
  nowIso: string,
): MissingImageReportRecord {
  const reportKey = missingImageReportKey(input);
  return {
    ...input,
    id: missingImageReportIdFromKey(reportKey),
    reportKey,
    active: true,
    firstSeenAtIso: nowIso,
    lastSeenAtIso: nowIso,
  };
}

function hasNonEmptyImageUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function collectMissingImageReports({
  lists,
  recipes,
  itemSlugs,
  ingredientSlugs,
  ingredientSynonyms,
  nowIso,
}: {
  lists: MissingImageListRow[];
  recipes: MissingImageRecipeRow[];
  itemSlugs: string[];
  ingredientSlugs: string[];
  ingredientSynonyms: Record<string, string>;
  nowIso: string;
}): MissingImageReportRecord[] {
  const reports = new Map<string, MissingImageReportRecord>();

  for (const list of lists) {
    const sourceName = list.name?.trim() || "Naamloos lijstje";
    const sourceKind = list.isMasterTemplate ? "master-list" : "list";
    for (const item of list.items ?? []) {
      const itemName = item.name?.trim() ?? "";
      const normalizedName = normalizeForMatch(itemName);
      if (!item.id || !normalizedName) continue;
      if (item.fromStock && hasNonEmptyImageUrl(item.stockPhotoUrl)) continue;
      if (matchItemPhotoUrl(itemName, itemSlugs, 240)) continue;

      const report = withMissingImageReportIdentity(
        {
          ownerId: list.ownerId,
          sourceType: "list-item",
          sourceId: item.id,
          sourceName,
          sourceKind,
          itemName,
          normalizedName,
          imageKind: "product",
          sourcePath: `/lijstje/${list.id}`,
          occurrenceCount: 1,
        },
        nowIso,
      );
      reports.set(report.reportKey, report);
    }
  }

  for (const recipe of recipes) {
    const sourceName = recipe.name?.trim() || "Naamloos recept";

    if (!hasNonEmptyImageUrl(recipe.photoUrl)) {
      const normalizedName = normalizeForMatch(sourceName);
      if (normalizedName) {
        const report = withMissingImageReportIdentity(
          {
            ownerId: recipe.ownerId,
            sourceType: "recipe-photo",
            sourceId: recipe.id,
            sourceName,
            sourceKind: "recipe",
            itemName: sourceName,
            normalizedName,
            imageKind: "recipe",
            sourcePath: `/recepten/${recipe.id}`,
            occurrenceCount: 1,
          },
          nowIso,
        );
        reports.set(report.reportKey, report);
      }
    }

    for (const ingredient of recipe.ingredients ?? []) {
      const itemName = ingredient.name?.trim() ?? "";
      const normalizedName = normalizeForMatch(itemName);
      if (!ingredient.id || !normalizedName) continue;
      if (
        matchIngredientPhotoUrl(
          itemName,
          ingredientSlugs,
          ingredientSynonyms,
          320,
          ingredient.quantity,
        )
      ) {
        continue;
      }

      const report = withMissingImageReportIdentity(
        {
          ownerId: recipe.ownerId,
          sourceType: "recipe-ingredient",
          sourceId: ingredient.id,
          sourceName,
          sourceKind: "recipe",
          itemName,
          normalizedName,
          imageKind: "ingredient",
          sourcePath: `/recepten/${recipe.id}`,
          occurrenceCount: 1,
        },
        nowIso,
      );
      reports.set(report.reportKey, report);
    }
  }

  return Array.from(reports.values());
}
