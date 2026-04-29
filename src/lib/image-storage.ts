"use client";

import { fileToAvatarDataUrl } from "@/lib/profile_crypto";

export type UserImageKind =
  | "list-icon"
  | "profile-avatar"
  | "recipe-photo"
  | "generated-recipe-photo";

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
  const dataUrl = await fileToAvatarDataUrl(file);
  return uploadUserImageDataUrl({ dataUrl, ownerId, kind });
}
