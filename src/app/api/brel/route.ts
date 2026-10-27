import { NextRequest } from "next/server";
import { brelLocal } from "@/lib/server/brel-local";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return brelLocal(request); }
