import { NextResponse } from "next/server";
import { init } from "@instantdb/admin";
import schema from "../../../../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminDb() {
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!adminToken) return null;
  return init({
    appId: INSTANT_APP_ID,
    adminToken,
    schema,
  });
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const generationId = params.id?.trim();
    const ownerId = new URL(req.url).searchParams.get("ownerId")?.trim() ?? "";

    if (!generationId || !ownerId) {
      return NextResponse.json({ error: "id en ownerId zijn verplicht." }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: "Server mist INSTANT_APP_ADMIN_TOKEN." },
        { status: 503 },
      );
    }

    const queryResult = await adminDb.query({
      foodImages: {
        $: { where: { ownerId } },
      },
    });

    const rows = queryResult.foodImages ?? [];
    const row = rows.find((x) => x.id === generationId);

    if (!row) {
      return NextResponse.json({ error: "Afbeelding niet gevonden." }, { status: 404 });
    }

    const imageBase64 = asString(row.imageBase64);
    const imageMimeType = asString(row.imageMimeType) || "image/png";

    if (!imageBase64) {
      return NextResponse.json({ error: "Afbeelding is leeg." }, { status: 404 });
    }

    const bytes = Buffer.from(imageBase64, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": imageMimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Afbeelding ophalen is mislukt.",
      },
      { status: 500 },
    );
  }
}
