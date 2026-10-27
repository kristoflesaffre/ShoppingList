import { NextRequest } from "next/server";
import { projectorBridgeRoute } from "@/lib/server/projector-relay-routes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return projectorBridgeRoute(request); }
export async function POST(request: NextRequest) { return projectorBridgeRoute(request); }
