import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { init } from "@instantdb/admin";
import schema from "../../../../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KINDS = new Set([
  "list-icon",
  "profile-avatar",
  "recipe-photo",
  "generated-recipe-photo",
]);

function getAdminDb() {
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!adminToken) return null;
  return init({
    appId: INSTANT_APP_ID,
    adminToken,
    schema,
  });
}

function parseDataUrl(dataUrl: string): {
  mimeType: string;
  bytes: Buffer;
  extension: string;
} {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("Ongeldige data-URL.");
  const mimeType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  const extension = mimeType === "image/png" ? "png" : "jpg";
  if (!mimeType.startsWith("image/")) {
    throw new Error("Alleen afbeeldingsbestanden zijn toegestaan.");
  }
  if (bytes.length > 500_000) {
    throw new Error("Afbeelding is te groot na compressie.");
  }
  return { mimeType, bytes, extension };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      dataUrl?: unknown;
      ownerId?: unknown;
      kind?: unknown;
    };
    const ownerId =
      typeof body.ownerId === "string" ? body.ownerId.trim() : "";
    const kind = typeof body.kind === "string" ? body.kind.trim() : "";
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";

    if (!ownerId) throw new Error("ownerId is verplicht.");
    if (!ALLOWED_KINDS.has(kind)) throw new Error("Ongeldig afbeeldingstype.");
    if (!dataUrl) throw new Error("dataUrl is verplicht.");

    const { mimeType, bytes, extension } = parseDataUrl(dataUrl);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({
        url: dataUrl,
        storageMode: "legacy-data-url",
        assetId: null,
      });
    }

    const assetId = crypto.randomUUID();
    const pathname = `user-images/${ownerId}/${kind}/${assetId}.${extension}`;
    const blob = await put(pathname, bytes, {
      access: "public",
      contentType: mimeType,
    });

    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.transact(
        adminDb.tx.imageAssets[assetId].update({
          ownerId,
          kind,
          url: blob.url,
          storageKey: pathname,
          mimeType,
          size: bytes.length,
          createdAtIso: new Date().toISOString(),
        }),
      );
    }

    return NextResponse.json({
      url: blob.url,
      storageMode: "blob",
      assetId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Afbeelding uploaden is mislukt.",
      },
      { status: 400 },
    );
  }
}
