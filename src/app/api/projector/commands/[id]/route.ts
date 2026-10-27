import { NextRequest } from "next/server";
import { projectorCommandStatus } from "@/lib/server/projector-relay-routes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: { id: string } }) { return projectorCommandStatus(request, params.id); }
