import { NextRequest } from "next/server";
import { projectorLocal } from "@/lib/server/projector-routes";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return projectorLocal(request); }
