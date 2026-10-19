import { NextRequest } from "next/server";
import { broadlinkLocal } from "@/lib/server/broadlink-local";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return broadlinkLocal(request); }
