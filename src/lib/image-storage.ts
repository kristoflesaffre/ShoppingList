"use client";

import {
  fileToAvatarDataUrl,
  fileToRecipeImageDataUrl,
} from "@/lib/profile_crypto";

export type UserImageKind =
  | "list-icon"
  | "profile-avatar"
  | "recipe-photo"
  | "generated-recipe-photo"
  | "gift-photo";

export type StoredUserImage = {
  url: string;
  storageMode: "blob" | "legacy-data-url";
  assetId: string | null;
};

export async function uploadUserImageDataUrl({
  dataUrl,
  ownerId,
  kind,
}: {
  dataUrl: string;
  ownerId: string;
  kind: UserImageKind;
}): Promise<StoredUserImage> {
  const res = await fetch("/api/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, ownerId, kind }),
  });
  const payload = (await res.json().catch(() => null)) as
    | (Partial<StoredUserImage> & { error?: string })
    | null;

  if (!res.ok) {
    throw new Error(payload?.error ?? "Afbeelding uploaden mislukt.");
  }
  if (!payload?.url) {
    throw new Error("Uploadresponse mist een afbeeldings-URL.");
  }

  return {
    url: payload.url,
    storageMode:
      payload.storageMode === "blob" ? "blob" : "legacy-data-url",
    assetId: typeof payload.assetId === "string" ? payload.assetId : null,
  };
}

export async function uploadUserImageFile({
  file,
  ownerId,
  kind,
}: {
  file: File;
  ownerId: string;
  kind: UserImageKind;
}): Promise<StoredUserImage> {
  const dataUrl =
    kind === "recipe-photo" || kind === "generated-recipe-photo"
      ? await fileToRecipeImageDataUrl(file)
      : kind === "gift-photo"
        ? await fileToGiftPhotoDataUrl(file)
        : await fileToAvatarDataUrl(file);
  return uploadUserImageDataUrl({ dataUrl, ownerId, kind });
}

/**
 * Foto van een kado-idee (geplakt of gekozen): hoogstens 900 px, JPEG op wit (de kaart legt de foto met
 * `multiply` op de lijstkleur, dus wit valt weg). Kwaliteit zakt tot het onder de uploadgrens past.
 */
export async function fileToGiftPhotoDataUrl(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  for (const [max, quality] of [[900, 0.86], [900, 0.74], [700, 0.7], [520, 0.66]] as const) {
    const scale = Math.min(max / bitmap.width, max / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length < 900_000) {
      bitmap.close();
      return dataUrl;
    }
  }
  bitmap.close();
  throw new Error("Deze foto is te groot. Kies een kleinere foto.");
}
