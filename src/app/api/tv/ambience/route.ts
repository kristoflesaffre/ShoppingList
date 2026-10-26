import { NextRequest } from "next/server";
import { ambienceTv } from "@/lib/server/ambience-routes";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) { return ambienceTv(request); }
