import { NextRequest } from "next/server";
import { ambienceProjector } from "@/lib/server/ambience-routes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return ambienceProjector(request); }
export async function POST(request: NextRequest) { return ambienceProjector(request); }
