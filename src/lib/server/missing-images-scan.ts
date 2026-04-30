import {
  collectMissingImageReports,
  type MissingImageListRow,
  type MissingImageRecipeRow,
  type MissingImageReportRecord,
} from "@/lib/missing-images";
import { getInstantAdminDb } from "@/lib/server/instant-admin";
import {
  loadIngredientImageSlugs,
  loadIngredientSynonyms,
  loadItemImageSlugs,
} from "@/lib/server/static-image-catalog";

type ExistingMissingImageReport = {
  id: string;
  reportKey?: string;
  firstSeenAtIso?: string;
  active?: boolean;
};

type MissingImagesQueryResult = {
  lists?: MissingImageListRow[];
  recipes?: MissingImageRecipeRow[];
  missingImageReports?: ExistingMissingImageReport[];
};

export type MissingImagesScanResult = {
  createdOrUpdated: number;
  resolved: number;
  active: number;
  scannedAtIso: string;
};

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

export async function scanMissingImages(): Promise<MissingImagesScanResult> {
  const adminDb = getInstantAdminDb();
  if (!adminDb) {
    throw new Error("Server mist INSTANT_APP_ADMIN_TOKEN.");
  }

  const scannedAtIso = new Date().toISOString();
  const [itemSlugs, ingredientSlugs, ingredientSynonyms, data] =
    await Promise.all([
      loadItemImageSlugs(),
      loadIngredientImageSlugs(),
      loadIngredientSynonyms(),
      adminDb.query({
        lists: {
          $: { fields: ["id", "name", "ownerId", "isMasterTemplate"] },
          items: {
            $: { fields: ["id", "name", "stockPhotoUrl", "fromStock"] },
          },
        },
        recipes: {
          $: { fields: ["id", "name", "ownerId", "photoUrl"] },
          ingredients: {
            $: { fields: ["id", "name", "quantity"] },
          },
        },
        missingImageReports: {
          $: { fields: ["id", "reportKey", "firstSeenAtIso", "active"] },
        },
      }) as Promise<MissingImagesQueryResult>,
    ]);

  const existingReports = data.missingImageReports ?? [];
  const existingByKey = new Map(
    existingReports
      .filter((report) => report.reportKey)
      .map((report) => [report.reportKey as string, report]),
  );

  const reports = collectMissingImageReports({
    lists: data.lists ?? [],
    recipes: data.recipes ?? [],
    itemSlugs,
    ingredientSlugs,
    ingredientSynonyms,
    nowIso: scannedAtIso,
  });
  const activeKeys = new Set(reports.map((report) => report.reportKey));

  const upsertTxs = reports.map((report) => {
    const existing = existingByKey.get(report.reportKey);
    const firstSeenAtIso = existing?.firstSeenAtIso || report.firstSeenAtIso;
    const payload: Omit<MissingImageReportRecord, "id"> = {
      reportKey: report.reportKey,
      ownerId: report.ownerId,
      sourceType: report.sourceType,
      sourceId: report.sourceId,
      sourceName: report.sourceName,
      sourceKind: report.sourceKind,
      itemName: report.itemName,
      normalizedName: report.normalizedName,
      imageKind: report.imageKind,
      sourcePath: report.sourcePath,
      occurrenceCount: report.occurrenceCount,
      active: true,
      firstSeenAtIso,
      lastSeenAtIso: scannedAtIso,
      resolvedAtIso: "",
    };
    return adminDb.tx.missingImageReports[existing?.id ?? report.id].update(payload);
  });

  const resolveTxs = existingReports
    .filter(
      (report) =>
        report.id &&
        report.reportKey &&
        report.active !== false &&
        !activeKeys.has(report.reportKey),
    )
    .map((report) =>
      adminDb.tx.missingImageReports[report.id].update({
        active: false,
        resolvedAtIso: scannedAtIso,
        lastSeenAtIso: scannedAtIso,
      }),
    );

  const allTxs = [...upsertTxs, ...resolveTxs];
  for (const txChunk of chunk(allTxs, 100)) {
    if (txChunk.length > 0) {
      await adminDb.transact(txChunk as Parameters<typeof adminDb.transact>[0]);
    }
  }

  return {
    createdOrUpdated: upsertTxs.length,
    resolved: resolveTxs.length,
    active: reports.length,
    scannedAtIso,
  };
}
