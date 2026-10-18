import { NextRequest, NextResponse } from "next/server";
import { deletePanasonic } from "@/lib/server/panasonic-store";
import { withPanasonic } from "@/lib/server/panasonic-route";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return withPanasonic(request, async session => {
    await deletePanasonic(session.ownerId);
    return NextResponse.json({ configured: true, connected: false });
  }, false);
}
