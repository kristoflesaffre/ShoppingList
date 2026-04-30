import { NextResponse } from "next/server";
import {
  adminAccessIsConfigured,
  isAllowedAdminRequest,
} from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const adminRequest = await isAllowedAdminRequest(req);
  return NextResponse.json({
    isAdmin: adminRequest.allowed,
    configured: adminAccessIsConfigured(),
  });
}
