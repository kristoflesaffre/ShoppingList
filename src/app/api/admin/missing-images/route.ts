import { NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/server/admin-auth";
import { getInstantAdminDb } from "@/lib/server/instant-admin";
import { scanMissingImages } from "@/lib/server/missing-images-scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const adminUser = await requireAdminUserId(req);
  if (adminUser instanceof NextResponse) return adminUser;

  const adminDb = getInstantAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Server mist INSTANT_APP_ADMIN_TOKEN." },
      { status: 503 },
    );
  }

  const data = await adminDb.query({
    missingImageReports: {},
  });

  return NextResponse.json({
    reports: data.missingImageReports ?? [],
  });
}

export async function POST(req: Request) {
  const adminUser = await requireAdminUserId(req);
  if (adminUser instanceof NextResponse) return adminUser;

  try {
    const result = await scanMissingImages();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Ontbrekende afbeeldingen scannen is mislukt.",
      },
      { status: 500 },
    );
  }
}
